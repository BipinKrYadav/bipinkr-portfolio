import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import type { ContentGateway } from '../lib/content/gateway';
import { DOCUMENT_LIST_COLUMNS } from '../lib/content/model';
import { createContentPostgrestGateway, totalFromContentRange } from '../lib/content/postgrest-gateway';
import { createContentRepository } from '../lib/content/repository';
import { GatewayError, toDataError } from '../lib/metrics/errors';

/**
 * Request construction, error handling and counting of the read-only content
 * gateway, with a stubbed fetch. No network and no Supabase project involved.
 */

const URL_BASE = 'https://project-ref.supabase.test';
const PUBLISHABLE = 'publishable-key-for-tests';
const REST = `${URL_BASE}/rest/v1`;

interface Call {
  url: string;
  init: RequestInit;
}

type Reply = { status: number; body: unknown; headers?: Record<string, string> } | Error;

function stub(responses: Reply[]) {
  const calls: Call[] = [];
  const fetchStub = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = responses.shift();
    if (!next) throw new Error('unexpected request');
    if (next instanceof Error) throw next;
    return new Response(next.body === null ? '' : JSON.stringify(next.body), {
      status: next.status,
      statusText: 'stub',
      headers: next.headers,
    });
  }) as typeof fetch;
  return { calls, fetchStub };
}

const gatewayWith = (fetchStub: typeof fetch, token: string | null = 'user-access-token') =>
  createContentPostgrestGateway({ url: `${URL_BASE}/`, publishableKey: PUBLISHABLE, getAccessToken: async () => token, fetch: fetchStub });

const headers = (call: Call) => call.init.headers as Record<string, string>;

const DOCUMENTS_URL =
  `${URL_BASE}/rest/v1/documents?select=id,doc_type,slug,status,schema_version,sort_order,published_revision_id,updated_at` +
  '&order=doc_type.asc,sort_order.asc,slug.asc';
const REFS_URL = `${URL_BASE}/rest/v1/document_metric_refs?select=document_id`;

describe('content gateway requests', () => {
  test('never sends a request without a signed-in session', async () => {
    const { calls, fetchStub } = stub([]);
    for (const operation of [
      (g: ContentGateway) => g.listDocuments(),
      (g: ContentGateway) => g.listReferenceDocumentIds(),
      (g: ContentGateway) => g.saveDocumentDraft('doc-1', '2026-09-21T00:00:00Z', { title: 'x' }, 'test'),
    ]) {
      const error = await operation(gatewayWith(fetchStub, null)).catch((caught: unknown) => caught);
      assert.ok(error instanceof GatewayError);
      assert.equal(toDataError(error).kind, 'unauthenticated');
    }
    assert.equal(calls.length, 0);
  });

  test('lists documents with the exact columns and order, never the draft', async () => {
    const { calls, fetchStub } = stub([{ status: 200, body: [] }]);
    await gatewayWith(fetchStub).listDocuments();
    assert.equal(calls[0].url, DOCUMENTS_URL);
    assert.ok(!calls[0].url.includes('draft') && !calls[0].url.includes('content') && !calls[0].url.includes('*'));
    assert.deepEqual([...DOCUMENT_LIST_COLUMNS], ['id', 'doc_type', 'slug', 'status', 'schema_version', 'sort_order', 'published_revision_id', 'updated_at']);
  });

  test("uses the publishable key and the admin's own token, GET only, never cached", async () => {
    const { calls, fetchStub } = stub([
      { status: 200, body: [] },
      { status: 200, body: [], headers: { 'Content-Range': '*/0' } },
    ]);
    const gateway = gatewayWith(fetchStub);
    await gateway.listDocuments();
    await gateway.listReferenceDocumentIds();
    for (const call of calls) {
      assert.equal(call.init.method, 'GET');
      assert.equal(call.init.body, undefined);
      assert.equal(call.init.cache, 'no-store');
      assert.equal(headers(call).apikey, PUBLISHABLE);
      assert.equal(headers(call).Authorization, 'Bearer user-access-token');
      assert.ok(!JSON.stringify(call.init).includes('service_role'));
    }
  });

  test('reads reference document ids with an exact count', async () => {
    const { calls, fetchStub } = stub([{ status: 200, body: [{ document_id: 'd1' }, { document_id: 'd1' }], headers: { 'Content-Range': '0-1/2' } }]);
    const result = await gatewayWith(fetchStub).listReferenceDocumentIds();
    assert.equal(calls[0].url, REFS_URL);
    assert.equal(headers(calls[0]).Prefer, 'count=exact');
    assert.deepEqual(result, { rows: [{ document_id: 'd1' }, { document_id: 'd1' }], total: 2 });
  });

  test('Content-Range totals are parsed strictly', () => {
    assert.equal(totalFromContentRange('0-321/322'), 322);
    assert.equal(totalFromContentRange('*/0'), 0);
    assert.equal(totalFromContentRange('0-9/*'), null);
    assert.equal(totalFromContentRange(null), null);
    assert.equal(totalFromContentRange('garbage'), null);
  });

  test('saves a draft through the dedicated RPC, not a direct document update', async () => {
    const { calls, fetchStub } = stub([{ status: 200, body: {
      id: 'doc-1',
      doc_type: 'homepage',
      slug: 'home',
      status: 'published',
      schema_version: 1,
      sort_order: 0,
      published_revision_id: 'rev-1',
      updated_at: '2026-09-22T00:00:00Z',
    } }]);
    const gateway = gatewayWith(fetchStub);
    const saved = await gateway.saveDocumentDraft('doc-1', '2026-09-21T00:00:00Z', { title: 'x' }, 'Editorial copy update');
    assert.equal(saved.id, 'doc-1');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, REST + '/rpc/save_document_draft');
    assert.equal(calls[0].init.method, 'POST');
    assert.equal(calls[0].init.cache, 'no-store');
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), {
      p_document_id: 'doc-1',
      p_expected_updated_at: '2026-09-21T00:00:00Z',
      p_draft: { title: 'x' },
      p_change_summary: 'Editorial copy update',
    });
    assert.equal(headers(calls[0]).apikey, PUBLISHABLE);
    assert.equal(headers(calls[0]).Authorization, 'Bearer user-access-token');
  });

  test('database errors keep their SQLSTATE; network failures are reported as unavailable', async () => {
    const denied = stub([{ status: 403, body: { code: '42501', message: 'permission denied for table documents' } }]);
    const deniedError = await gatewayWith(denied.fetchStub).listDocuments().catch((caught: unknown) => caught);
    assert.ok(deniedError instanceof GatewayError);
    assert.equal(deniedError.code, '42501');
    assert.equal(toDataError(deniedError).kind, 'permission_denied');

    const expired = stub([{ status: 401, body: { code: 'PGRST301', message: 'JWT expired' } }]);
    assert.equal(toDataError(await gatewayWith(expired.fetchStub).listDocuments().catch((caught: unknown) => caught)).kind, 'unauthenticated');

    const offline = stub([new TypeError('fetch failed')]);
    const offlineError = await gatewayWith(offline.fetchStub).listDocuments().catch((caught: unknown) => caught);
    assert.ok(offlineError instanceof GatewayError);
    assert.equal(offlineError.code, 'network');
    assert.equal(toDataError(offlineError).kind, 'unavailable');
  });
});

describe('content repository', () => {
  const doc = (id: string, slug: string) => ({
    id,
    doc_type: 'case_study' as const,
    slug,
    status: 'published' as const,
    schema_version: 1,
    sort_order: 0,
    published_revision_id: `r-${id}`,
    updated_at: '2026-09-21T00:00:00Z',
  });

  test('counts references per document on the client; a document without references counts 0', async () => {
    const { fetchStub } = stub([
      { status: 200, body: [doc('d1', 'a'), doc('d2', 'b')] },
      { status: 200, body: [{ document_id: 'd1' }, { document_id: 'd1' }, { document_id: 'd1' }], headers: { 'Content-Range': '0-2/3' } },
    ]);
    const result = await createContentRepository(gatewayWith(fetchStub)).listDocuments();
    assert.ok(result.ok);
    assert.deepEqual(result.data.map((entry) => [entry.slug, entry.referenceCount]), [['a', 3], ['b', 0]]);
  });

  test('a capped reference response is refused rather than shown as low counts', async () => {
    const { fetchStub } = stub([
      { status: 200, body: [doc('d1', 'a')] },
      { status: 200, body: [{ document_id: 'd1' }], headers: { 'Content-Range': '0-0/322' } },
    ]);
    const result = await createContentRepository(gatewayWith(fetchStub)).listDocuments();
    assert.equal(result.ok ? null : result.error.kind, 'unavailable');
    assert.match(result.ok ? '' : result.error.message, /Only 1 of 322 metric references/);
  });

  test('an error from either read becomes a readable DataError', async () => {
    const { fetchStub } = stub([
      { status: 403, body: { code: '42501', message: 'permission denied' } },
      { status: 200, body: [], headers: { 'Content-Range': '*/0' } },
    ]);
    const result = await createContentRepository(gatewayWith(fetchStub)).listDocuments();
    assert.equal(result.ok ? null : result.error.kind, 'permission_denied');
  });
});
