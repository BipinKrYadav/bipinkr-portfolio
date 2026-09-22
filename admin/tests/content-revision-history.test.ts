import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { DocumentRevisionRow } from '../lib/content/model';
import {
  createContentPostgrestGateway,
  documentPath,
  documentReferencesPath,
  LINKED_PHRASES_PATH,
  revisionContentPath,
  revisionsPath,
} from '../lib/content/postgrest-gateway';
import { createContentRepository } from '../lib/content/repository';
import { GatewayError, toDataError } from '../lib/metrics/errors';

/**
 * Revision history on the document detail page (Phase 4.6): the one revision
 * request the detail already makes, and what the repository does with it.
 * Stubbed fetch; no network, no project.
 */

const URL_BASE = 'https://project-ref.supabase.test';
const REST = `${URL_BASE}/rest/v1`;
const PUBLISHABLE = 'publishable-key-for-tests';

interface Call {
  url: string;
  init: RequestInit;
}
type Reply = { status: number; body: unknown; headers?: Record<string, string> };

function routedStub(routes: Record<string, Reply>) {
  const calls: Call[] = [];
  const fetchStub = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const reply = routes[String(url).slice(REST.length + 1)];
    if (!reply) throw new Error(`unexpected request: ${String(url)}`);
    return new Response(JSON.stringify(reply.body), { status: reply.status, statusText: 'stub', headers: reply.headers });
  }) as typeof fetch;
  return { calls, fetchStub };
}

const gatewayWith = (fetchStub: typeof fetch, token: string | null = 'user-access-token') =>
  createContentPostgrestGateway({ url: URL_BASE, publishableKey: PUBLISHABLE, getAccessToken: async () => token, fetch: fetchStub });
const headers = (call: Call) => call.init.headers as Record<string, string>;
const counted = (body: unknown[]): Reply => ({ status: 200, body, headers: { 'Content-Range': body.length ? `0-${body.length - 1}/${body.length}` : '*/0' } });

const revision = (n: number, overrides: Partial<DocumentRevisionRow> = {}): DocumentRevisionRow => ({
  id: `rev-${n}`,
  document_id: 'doc-1',
  revision_number: n,
  schema_version: 1,
  change_summary: `Change ${n}`,
  release_id: null,
  created_at: `2026-09-2${n}T00:00:00Z`,
  created_by: null,
  ...overrides,
});

const doc = (publishedRevisionId: string | null) => ({
  id: 'doc-1',
  doc_type: 'about',
  slug: 'about',
  status: publishedRevisionId ? 'published' : 'draft',
  schema_version: 1,
  sort_order: 0,
  published_revision_id: publishedRevisionId,
  updated_at: '2026-09-21T00:00:00Z',
  draft: { secret: 'Private {{label:Real Client|Client A}} draft copy' },
});

function detailRoutes(revisions: unknown, publishedRevisionId: string | null = 'rev-2', revisionsReply?: Reply): Record<string, Reply> {
  const routes: Record<string, Reply> = {
    [documentPath('about', 'about')]: { status: 200, body: [doc(publishedRevisionId)] },
    [revisionsPath('doc-1')]: revisionsReply ?? { status: 200, body: revisions },
    [documentReferencesPath('doc-1')]: counted([]),
    [LINKED_PHRASES_PATH]: counted([]),
  };
  if (publishedRevisionId) {
    routes[revisionContentPath(publishedRevisionId)] = { status: 200, body: [{ content: { secret: 'Private {{label:Real Client|Client A}} revision copy' } }] };
  }
  return routes;
}

const detailOf = async (routes: Record<string, Reply>) => {
  const stub = routedStub(routes);
  return { result: await createContentRepository(gatewayWith(stub.fetchStub)).getDocumentDetail('about', 'about'), calls: stub.calls };
};

describe('revision history request', () => {
  test('exact URL, ordered by revision_number desc, with the document id encoded', () => {
    assert.equal(
      revisionsPath('doc-1'),
      'document_revisions?select=id,document_id,revision_number,schema_version,change_summary,release_id,created_at,created_by&document_id=eq.doc-1&order=revision_number.desc',
    );
    assert.equal(
      revisionsPath('a b&c=d'),
      'document_revisions?select=id,document_id,revision_number,schema_version,change_summary,release_id,created_at,created_by&document_id=eq.a%20b%26c%3Dd&order=revision_number.desc',
    );
    assert.ok(!revisionsPath('x').includes('content'), 'the history never selects revision content');
  });

  test('GET only, never cached, with the publishable key and the admin token', async () => {
    const { calls, fetchStub } = routedStub({ [revisionsPath('doc-1')]: { status: 200, body: [revision(1)] } });
    assert.deepEqual(await gatewayWith(fetchStub).listRevisions('doc-1'), [revision(1)]);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `${REST}/${revisionsPath('doc-1')}`);
    assert.equal(calls[0].init.method, 'GET');
    assert.equal(calls[0].init.body, undefined);
    assert.equal(calls[0].init.cache, 'no-store');
    assert.equal(headers(calls[0]).apikey, PUBLISHABLE);
    assert.equal(headers(calls[0]).Authorization, 'Bearer user-access-token');
  });

  test('no request without a token', async () => {
    const { calls, fetchStub } = routedStub({});
    const error = await gatewayWith(fetchStub, null).listRevisions('doc-1').catch((caught: unknown) => caught);
    assert.ok(error instanceof GatewayError);
    assert.equal(toDataError(error).kind, 'unauthenticated');
    assert.equal(calls.length, 0);
  });

  test('the detail makes exactly one revision-metadata request and adds none for the history', async () => {
    const { result, calls } = await detailOf(detailRoutes([revision(2), revision(1)]));
    assert.ok(result.ok);
    assert.equal(calls.filter((call) => call.url.includes(`/${revisionsPath('doc-1')}`)).length, 1);
    assert.equal(calls.filter((call) => call.url.includes('select=content')).length, 1, 'only the Phase 4.5 draft comparison reads content');
  });
});

describe('revision history in the repository', () => {
  test('all revisions resolve, newest first, whatever order they arrive in', async () => {
    const { result } = await detailOf(detailRoutes([revision(1), revision(3), revision(2)], 'rev-3'));
    assert.ok(result.ok);
    assert.deepEqual(result.data.revisions.map((row) => row.revision_number), [3, 2, 1]);
    assert.deepEqual(result.data.revisions[0], revision(3));
  });

  test('the published revision is the one published_revision_id names, even when it is not the newest', async () => {
    const { result } = await detailOf(detailRoutes([revision(3), revision(2), revision(1)], 'rev-2'));
    assert.ok(result.ok);
    assert.equal(result.data.publishedRevision?.id, 'rev-2');
    assert.equal(result.data.publishedRevisionMissing, false);
  });

  test('no published revision: nothing is marked published and nothing is missing', async () => {
    const { result, calls } = await detailOf(detailRoutes([revision(1)], null));
    assert.ok(result.ok);
    assert.equal(result.data.publishedRevision, null);
    assert.equal(result.data.publishedRevisionMissing, false);
    assert.deepEqual(result.data.revisions.map((row) => row.id), ['rev-1']);
    assert.ok(!calls.some((call) => call.url.includes('select=content')));
  });

  test('a published_revision_id that matches no returned revision is reported, not invented', async () => {
    const { result } = await detailOf(detailRoutes([revision(2), revision(1)], 'rev-9'));
    assert.ok(result.ok);
    assert.equal(result.data.publishedRevision, null);
    assert.equal(result.data.publishedRevisionMissing, true);
    assert.deepEqual(result.data.revisions.map((row) => row.id), ['rev-2', 'rev-1']);
  });

  test('a null created_by stays null for the UI to label, never a made-up name', async () => {
    const { result } = await detailOf(detailRoutes([revision(1, { created_by: null }), revision(2, { created_by: '00000000-0000-4000-8000-000000000001' })]));
    assert.ok(result.ok);
    assert.deepEqual(result.data.revisions.map((row) => row.created_by), ['00000000-0000-4000-8000-000000000001', null]);
  });

  test('an empty history is returned as empty', async () => {
    const { result } = await detailOf(detailRoutes([], null));
    assert.ok(result.ok);
    assert.deepEqual(result.data.revisions, []);
  });

  test('a failed history read is an error, never an empty history', async () => {
    const { result } = await detailOf(detailRoutes(null, 'rev-1', { status: 500, body: { code: 'XX000', message: 'internal error' } }));
    assert.equal(result.ok, false);
    assert.equal(result.ok ? null : result.error.kind, 'unknown');

    const denied = await detailOf(detailRoutes(null, 'rev-1', { status: 403, body: { code: '42501', message: 'denied' } }));
    assert.equal(denied.result.ok ? null : denied.result.error.kind, 'permission_denied');
  });

  test('revision content never reaches the UI model', async () => {
    const { result } = await detailOf(detailRoutes([revision(2), revision(1)]));
    assert.ok(result.ok);
    for (const row of result.data.revisions) assert.ok(!('content' in row));

    // Phase 5A: the admin editor receives the current draft, and only the draft.
    const { draft, ...rest } = result.data;
    assert.deepEqual(draft, doc('rev-2').draft);
    assert.doesNotMatch(JSON.stringify(rest), /"content"|"draft"|\{\{label:|Real Client|revision copy|draft copy/);
    // Revision content stays out of the whole model, the draft included.
    assert.doesNotMatch(JSON.stringify(result.data), /"content"|revision copy/);
  });
});
