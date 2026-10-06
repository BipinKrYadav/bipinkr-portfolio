import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import { GatewayError } from '../lib/metrics/errors';
import type { ReleasesGateway } from '../lib/releases/gateway';
import { completedStep, PUBLISH_STEPS, type ReleaseItemRow } from '../lib/releases/model';
import { createReleasesPostgrestGateway, RELEASES_PATH } from '../lib/releases/postgrest-gateway';
import { buildReleaseReview, countTokens, documentsOf, sha256Hex, snapshotSchemaIssues, valueAt } from '../lib/releases/review';
import { ROOT } from './support/database';

/**
 * Pure release rules (review model, schema check, publishing steps) and the
 * release gateway's requests with a stubbed fetch. No database, no network.
 */

const baselineText = readFileSync(join(ROOT, 'snapshot', 'baseline.json'), 'utf8');
const baseline = JSON.parse(baselineText) as Record<string, unknown>;

describe('release review model', () => {
  const before = {
    metrics: [
      { id: 'f.a.spend', name: 'Spend', kind: 'raw', value: 100, formula: null, evidenceStatus: 'documented' },
      { id: 'f.a.cpl', name: 'CPL', kind: 'calculated', value: null, formula: { fn: 'ratio', numerator: 'f.a.spend', denominator: 'f.a.leads' } },
    ],
    documents: {
      homepage: { type: 'homepage', slug: 'home', content: { hero: { h1: 'Old', proof: '{{metric:f.a.spend}} spent' } } },
      caseStudies: { one: { type: 'case_study', slug: 'one', content: { title: 'Case' } } },
    },
  };
  const after = {
    ...before,
    metrics: [{ ...before.metrics[0], value: 120, evidenceStatus: 'verified' }, before.metrics[1]],
    documents: {
      ...before.documents,
      homepage: { type: 'homepage', slug: 'home', content: { hero: { h1: 'New', proof: '{{metric:f.a.spend}} spent' } } },
    },
  };
  const items: ReleaseItemRow[] = [
    {
      id: 1, release_id: 2, entity_type: 'metric', entity_id: 'm', metric_version_id: 9, document_revision_id: null,
      diff: { entityKey: 'f.a.spend', change: 'changed', fields: ['evidenceStatus', 'value'], before: before.metrics[0], after: after.metrics[0] },
    },
    {
      id: 2, release_id: 2, entity_type: 'document', entity_id: 'd', metric_version_id: null, document_revision_id: 'r',
      diff: { entityKey: 'homepage/home', change: 'changed', fields: ['content.hero.h1'], before: null, after: null },
    },
  ];

  test('metric changes carry before and after values per field, and the calculated metrics that follow', () => {
    const review = buildReleaseReview(items, before, after);
    assert.deepEqual(review.metrics[0].fields.map((field) => [field.path, field.before, field.after]), [
      ['evidenceStatus', 'documented', 'verified'],
      ['value', 100, 120],
    ]);
    assert.deepEqual(review.metrics[0].dependents, ['f.a.cpl']);
    assert.ok(review.warnings.some((warning) => warning.includes('evidence status')));
    assert.ok(review.warnings.some((warning) => warning.includes('f.a.cpl')));
  });

  test('document changes resolve each path in both snapshots, and count protected tokens', () => {
    const review = buildReleaseReview(items, before, after);
    assert.deepEqual(review.documents[0].fields.map((field) => [field.path, field.before, field.after]), [['hero.h1', 'Old', 'New']]);
    assert.deepEqual(review.documents[0].tokens, { before: 1, after: 1 });
    assert.equal(review.documents[0].revisionId, 'r');
  });

  test('a change in the number of protected tokens is a warning', () => {
    const tokenless = { ...after, documents: { ...after.documents, homepage: { type: 'homepage', slug: 'home', content: { hero: { h1: 'New', proof: 'spent' } } } } };
    assert.ok(buildReleaseReview(items, before, tokenless).warnings.some((warning) => warning.includes('protected tokens')));
  });

  test('helpers: paths, tokens and documents', () => {
    assert.equal(valueAt({ a: [{ b: 'x' }] }, 'a.0.b'), 'x');
    assert.equal(valueAt({ a: 1 }, 'a.b.c'), undefined);
    assert.equal(countTokens({ $metricValue: 'a.b.c', text: '{{metric:a.b}} and {{label:x|y}}', pair: { $pair: { first: 'a.b', second: 'c.d' } } }), 4);
    assert.deepEqual([...documentsOf(baseline).keys()].length, 10);
  });
});

describe('snapshot schema check (the same one the site build runs)', () => {
  test('the published baseline passes', () => {
    assert.deepEqual(snapshotSchemaIssues(baseline), []);
  });

  test('an unknown field, a missing metric and a malformed token are reported', () => {
    const broken = structuredClone(baseline) as { documents: { homepage: { content: Record<string, unknown> } }; metrics: unknown[] };
    broken.documents.homepage.content.unexpected = 'x';
    assert.ok(snapshotSchemaIssues(broken).some((issue) => issue.includes('unexpected')));

    const missing = structuredClone(baseline) as { metrics: { id: string }[] };
    missing.metrics = missing.metrics.slice(1);
    assert.ok(snapshotSchemaIssues(missing).some((issue) => issue.includes('unknown metric')));
  });

  test('SHA-256 is lowercase hex of the UTF-8 text', async () => {
    assert.equal(await sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    assert.equal(await sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('publishing steps', () => {
  test('the sequence is fixed and in order', () => {
    assert.deepEqual(PUBLISH_STEPS.map((step) => step.key), ['save', 'create', 'validate', 'review', 'confirm', 'build', 'verify', 'published']);
  });

  test('each status maps to the last completed step', () => {
    const at = (status: Parameters<typeof completedStep>[0]['status'], build_sha256: string | null = null) =>
      completedStep({ status, build_sha256, approved_at: null });
    assert.equal(at('draft'), 'create');
    assert.equal(at('review'), 'validate');
    assert.equal(at('approved'), 'review');
    assert.equal(at('publishing'), 'confirm');
    assert.equal(at('publishing', 'a'.repeat(64)), 'verify');
    assert.equal(at('published'), 'published');
  });
});

describe('release gateway requests', () => {
  const URL_BASE = 'https://project-ref.supabase.test';

  function stub(replies: { status: number; body: unknown }[]) {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchStub = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      const next = replies.shift();
      if (!next) throw new Error('unexpected request');
      return new Response(JSON.stringify(next.body), { status: next.status });
    }) as typeof fetch;
    return { calls, fetchStub };
  }
  const gatewayWith = (fetchStub: typeof fetch, token: string | null = 'user-access-token') =>
    createReleasesPostgrestGateway({ url: URL_BASE, publishableKey: 'publishable', getAccessToken: async () => token, fetch: fetchStub });

  test('never sends a request without a signed-in session', async () => {
    const { calls, fetchStub } = stub([]);
    for (const operation of [
      (g: ReleasesGateway) => g.listReleases(),
      (g: ReleasesGateway) => g.createRelease('x'),
      (g: ReleasesGateway) => g.markReleasePublished(1, '2026-09-24T00:00:00Z', true),
    ]) {
      const error = await operation(gatewayWith(fetchStub, null)).catch((caught: unknown) => caught);
      assert.ok(error instanceof GatewayError);
      assert.equal(error.code, 'unauthenticated');
    }
    assert.equal(calls.length, 0);
  });

  test('reads never request the snapshot with the list; changes are RPCs with the admin token', async () => {
    const { calls, fetchStub } = stub([
      { status: 200, body: [] },
      { status: 200, body: { id: 3, status: 'review' } },
    ]);
    const gateway = gatewayWith(fetchStub);
    await gateway.listReleases();
    await gateway.validateRelease(3, '2026-09-24T00:00:00.000001+00:00', ['issue']);
    assert.equal(calls[0].url, `${URL_BASE}/rest/v1/${RELEASES_PATH}`);
    assert.ok(!calls[0].url.includes('snapshot,') && !calls[0].url.includes(',snapshot&'), 'the list never selects the snapshot column');
    assert.equal(calls[1].init.method, 'POST');
    assert.ok(calls[1].url.startsWith(`${URL_BASE}/rest/v1/rpc/validate_release?select=`));
    assert.deepEqual(JSON.parse(String(calls[1].init.body)), {
      p_release_id: 3,
      p_expected_updated_at: '2026-09-24T00:00:00.000001+00:00',
      p_schema_issues: ['issue'],
    });
    const headers = calls[1].init.headers as Record<string, string>;
    assert.equal(headers.Authorization, 'Bearer user-access-token');
    assert.equal(headers.apikey, 'publishable');
  });

  test('database refusals come back as GatewayError with the SQLSTATE', async () => {
    const { fetchStub } = stub([{ status: 400, body: { code: 'P0001', message: 'There are no draft changes to release' } }]);
    const error = await gatewayWith(fetchStub).createRelease('x').catch((caught: unknown) => caught);
    assert.ok(error instanceof GatewayError);
    assert.equal(error.code, 'P0001');
  });
});
