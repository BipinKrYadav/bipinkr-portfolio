import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { ContentGateway } from '../lib/content/gateway';
import { documentDetailHref, metricDetailHref } from '../lib/content/links';
import type { LinkedPhraseRow } from '../lib/content/model';
import {
  createContentPostgrestGateway,
  documentPath,
  documentReferencesPath,
  LINKED_PHRASES_PATH,
  revisionContentPath,
  revisionsPath,
} from '../lib/content/postgrest-gateway';
import { createContentRepository, matchLinkedPhrases } from '../lib/content/repository';
import { GatewayError, toDataError } from '../lib/metrics/errors';

/**
 * Document detail (Phase 4.5): request construction, the repository's rules
 * and the phrase matching, with a stubbed fetch. No network, no project.
 */

const URL_BASE = 'https://project-ref.supabase.test';
const REST = `${URL_BASE}/rest/v1`;
const PUBLISHABLE = 'publishable-key-for-tests';

interface Call {
  url: string;
  init: RequestInit;
}
type Reply = { status: number; body: unknown; headers?: Record<string, string> };

/** Answers by URL path (without the REST base), so parallel requests need no fixed order. */
function routedStub(routes: Record<string, Reply>) {
  const calls: Call[] = [];
  const fetchStub = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const path = String(url).slice(REST.length + 1);
    const reply = routes[path];
    if (!reply) throw new Error(`unexpected request: ${path}`);
    return new Response(JSON.stringify(reply.body), { status: reply.status, statusText: 'stub', headers: reply.headers });
  }) as typeof fetch;
  return { calls, fetchStub };
}

const gatewayWith = (fetchStub: typeof fetch, token: string | null = 'user-access-token') =>
  createContentPostgrestGateway({ url: URL_BASE, publishableKey: PUBLISHABLE, getAccessToken: async () => token, fetch: fetchStub });
const headers = (call: Call) => call.init.headers as Record<string, string>;
const counted = (body: unknown[]): Reply => ({ status: 200, body, headers: { 'Content-Range': body.length ? `0-${body.length - 1}/${body.length}` : '*/0' } });

const DOC = {
  id: 'doc-1',
  doc_type: 'case_study',
  slug: 'meta-lead-generation',
  status: 'published',
  schema_version: 1,
  sort_order: 1,
  published_revision_id: 'rev-1',
  updated_at: '2026-09-21T00:00:00Z',
  draft: { summary: { title: 'Private {{label:Real Client|Client A}} copy', order: 1 }, list: [1, 2] },
};
const REVISION = {
  id: 'rev-1',
  document_id: 'doc-1',
  revision_number: 1,
  schema_version: 1,
  change_summary: 'Baseline import from snapshot/baseline.json',
  release_id: null,
  created_at: '2026-09-21T00:00:00Z',
  created_by: null,
};
const REFS = [
  { field_path: 'z.body.0', format: 'integer', metric_id: 'm2', metrics: { metric_key: 're.leads', name: 'Leads', archived_at: null } },
  { field_path: 'a.hero', format: null, metric_id: 'm1', metrics: { metric_key: 're.cpl', name: 'CPL', archived_at: '2026-09-20T00:00:00Z' } },
];
const phrase = (overrides: Partial<LinkedPhraseRow>): LinkedPhraseRow => ({
  id: 'p',
  location: 'loc',
  phrase: 'phrase',
  metric_keys: ['re.cpl'],
  reason: 'why',
  reviewed_at: null,
  reviewed_by: null,
  document_id: null,
  field_path: null,
  updated_at: '2026-09-21T00:00:00Z',
  ...overrides,
});

function detailRoutes(overrides: { doc?: unknown[]; content?: unknown; refs?: Reply } = {}): Record<string, Reply> {
  return {
    [documentPath('case_study', 'meta-lead-generation')]: { status: 200, body: overrides.doc ?? [DOC] },
    [revisionsPath('doc-1')]: { status: 200, body: [REVISION] },
    [revisionContentPath('rev-1')]: { status: 200, body: [{ content: overrides.content ?? { list: [1, 2], summary: { order: 1, title: 'Private {{label:Real Client|Client A}} copy' } } }] },
    [documentReferencesPath('doc-1')]: overrides.refs ?? counted(REFS),
    [LINKED_PHRASES_PATH]: counted([phrase({ id: 'p1', metric_keys: ['re.cpl', 'other.key'] }), phrase({ id: 'p2', metric_keys: ['unrelated.key'] })]),
  };
}

describe('document detail requests', () => {
  test('exact PostgREST paths and selects, with encoded values', () => {
    assert.equal(
      documentPath('case_study', 'meta-lead-generation'),
      'documents?select=id,doc_type,slug,status,schema_version,sort_order,published_revision_id,updated_at,draft&doc_type=eq.case_study&slug=eq.meta-lead-generation',
    );
    assert.equal(
      revisionsPath('doc-1'),
      'document_revisions?select=id,document_id,revision_number,schema_version,change_summary,release_id,created_at,created_by&document_id=eq.doc-1&order=revision_number.desc',
    );
    assert.equal(revisionContentPath('rev-1'), 'document_revisions?select=content&id=eq.rev-1');
    assert.equal(
      documentReferencesPath('doc-1'),
      'document_metric_refs?select=field_path,format,metric_id,metrics(metric_key,name,archived_at)&document_id=eq.doc-1&order=field_path.asc',
    );
    assert.equal(
      LINKED_PHRASES_PATH,
      'linked_phrases?select=id,location,phrase,metric_keys,reason,reviewed_at,reviewed_by,document_id,field_path,updated_at&order=location.asc,phrase.asc',
    );
    assert.equal(documentPath('a&b', 'c,d'), 'documents?select=id,doc_type,slug,status,schema_version,sort_order,published_revision_id,updated_at,draft&doc_type=eq.a%26b&slug=eq.c%2Cd');
  });

  test('never sends a request without a signed-in session', async () => {
    const { calls, fetchStub } = routedStub({});
    const gateway = gatewayWith(fetchStub, null);
    const operations: ((g: ContentGateway) => Promise<unknown>)[] = [
      (g) => g.getDocument('case_study', 'x'),
      (g) => g.listRevisions('d'),
      (g) => g.getRevisionContent('r'),
      (g) => g.listDocumentReferences('d'),
      (g) => g.listLinkedPhrases(),
    ];
    for (const operation of operations) {
      const error = await operation(gateway).catch((caught: unknown) => caught);
      assert.ok(error instanceof GatewayError);
      assert.equal(toDataError(error).kind, 'unauthenticated');
    }
    assert.equal(calls.length, 0);
  });

  test('every detail request is a GET with the publishable key and the admin token, never cached', async () => {
    const { calls, fetchStub } = routedStub(detailRoutes());
    const result = await createContentRepository(gatewayWith(fetchStub)).getDocumentDetail('case_study', 'meta-lead-generation');
    assert.ok(result.ok, result.ok ? '' : result.error.message);
    assert.equal(calls.length, 5);
    for (const call of calls) {
      assert.equal(call.init.method, 'GET');
      assert.equal(call.init.body, undefined);
      assert.equal(call.init.cache, 'no-store');
      assert.equal(headers(call).apikey, PUBLISHABLE);
      assert.equal(headers(call).Authorization, 'Bearer user-access-token');
    }
    const counts = calls.filter((call) => headers(call).Prefer === 'count=exact').map((call) => call.url.slice(REST.length + 1).split('?')[0]);
    assert.deepEqual(counts.sort(), ['document_metric_refs', 'linked_phrases']);
  });
});

describe('document detail repository', () => {
  test('resolves the document, its published revision metadata and sorted references', async () => {
    const { fetchStub } = routedStub(detailRoutes());
    const result = await createContentRepository(gatewayWith(fetchStub)).getDocumentDetail('case_study', 'meta-lead-generation');
    assert.ok(result.ok);
    assert.equal(result.data.document.slug, 'meta-lead-generation');
    assert.deepEqual(result.data.publishedRevision, REVISION);
    assert.equal(result.data.hasDraft, true);
    assert.equal(result.data.draftMatchesPublished, true, 'key order differs, content is equal');
    assert.deepEqual(
      result.data.references.map((ref) => [ref.fieldPath, ref.metricKey, ref.metricName, ref.format, ref.archivedAt]),
      [
        ['a.hero', 're.cpl', 'CPL', null, '2026-09-20T00:00:00Z'],
        ['z.body.0', 're.leads', 'Leads', 'integer', null],
      ],
    );
  });

  test('raw draft and revision content never leave the repository', async () => {
    const { fetchStub } = routedStub(detailRoutes());
    const result = await createContentRepository(gatewayWith(fetchStub)).getDocumentDetail('case_study', 'meta-lead-generation');
    assert.ok(result.ok);
    const serialised = JSON.stringify(result.data);
    assert.ok(!('draft' in result.data.document));
    assert.doesNotMatch(serialised, /"draft"|"content"|\{\{label:|Real Client|Private/);
  });

  test('a changed draft is reported as different; no published revision means nothing to compare', async () => {
    const changed = routedStub(detailRoutes({ content: { list: [1, 2, 3], summary: { order: 1 } } }));
    const differs = await createContentRepository(gatewayWith(changed.fetchStub)).getDocumentDetail('case_study', 'meta-lead-generation');
    assert.ok(differs.ok);
    assert.equal(differs.data.draftMatchesPublished, false);

    const unpublished = routedStub(detailRoutes({ doc: [{ ...DOC, status: 'draft', published_revision_id: null }] }));
    const none = await createContentRepository(gatewayWith(unpublished.fetchStub)).getDocumentDetail('case_study', 'meta-lead-generation');
    assert.ok(none.ok);
    assert.equal(none.data.draftMatchesPublished, null);
    assert.equal(none.data.publishedRevision, null);
    assert.ok(!unpublished.calls.some((call) => call.url.includes('select=content')), 'no content is read without a published revision');
  });

  test('an unknown document is not found; an impossible type or slug is refused without a request', async () => {
    const empty = routedStub(detailRoutes({ doc: [] }));
    const missing = await createContentRepository(gatewayWith(empty.fetchStub)).getDocumentDetail('case_study', 'meta-lead-generation');
    assert.equal(missing.ok ? null : missing.error.kind, 'not_found');

    const none = routedStub({});
    for (const [type, slug] of [['not_a_type', 'home'], ['homepage', 'Bad Slug'], ['homepage', ''], ['homepage', '../x']]) {
      const result = await createContentRepository(gatewayWith(none.fetchStub)).getDocumentDetail(type, slug);
      assert.equal(result.ok ? null : result.error.kind, 'not_found', `${type}/${slug}`);
    }
    assert.equal(none.calls.length, 0);
  });

  test('a capped reference response is refused rather than shown as a short list', async () => {
    const { fetchStub } = routedStub(detailRoutes({ refs: { status: 200, body: REFS, headers: { 'Content-Range': '0-1/87' } } }));
    const result = await createContentRepository(gatewayWith(fetchStub)).getDocumentDetail('case_study', 'meta-lead-generation');
    assert.equal(result.ok ? null : result.error.kind, 'unavailable');
    assert.match(result.ok ? '' : result.error.message, /Only 2 of 87 metric references/);
  });

  test('database errors become readable DataErrors', async () => {
    const { fetchStub } = routedStub({ [documentPath('case_study', 'meta-lead-generation')]: { status: 403, body: { code: '42501', message: 'denied' } } });
    const result = await createContentRepository(gatewayWith(fetchStub)).getDocumentDetail('case_study', 'meta-lead-generation');
    assert.equal(result.ok ? null : result.error.kind, 'permission_denied');
  });
});

describe('linked phrase matching', () => {
  test('attached phrases and metric-matched phrases are told apart; unrelated ones are left out', () => {
    const matches = matchLinkedPhrases('doc-1', new Set(['re.cpl', 're.leads']), [
      phrase({ id: 'matched', metric_keys: ['re.cpl', 'x.y'] }),
      phrase({ id: 'unrelated', metric_keys: ['x.y'] }),
      phrase({ id: 'attached', metric_keys: ['x.y'], document_id: 'doc-1', field_path: 'summary.title' }),
      phrase({ id: 'other-doc', metric_keys: ['re.leads'], document_id: 'doc-2' }),
    ]);
    assert.deepEqual(
      matches.map((match) => [match.id, match.relation, match.matchedKeys]),
      [
        ['attached', 'attached', []],
        ['matched', 'metric_matched', ['re.cpl']],
        ['other-doc', 'metric_matched', ['re.leads']],
      ],
    );
  });
});

describe('links', () => {
  test('document and metric links are encoded', () => {
    assert.equal(documentDetailHref('case_study', 'meta-lead-generation'), '/content/detail/?type=case_study&slug=meta-lead-generation');
    assert.equal(metricDetailHref('re.cohort_2025.cpl'), '/metrics/detail/?key=re.cohort_2025.cpl');
    assert.equal(documentDetailHref('a b', 'c&d=e'), '/content/detail/?type=a%20b&slug=c%26d%3De');
    assert.equal(metricDetailHref('a&b#c'), '/metrics/detail/?key=a%26b%23c');
  });
});
