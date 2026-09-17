import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { GatewayError, toDataError } from '../lib/metrics/errors';
import { createPostgrestGateway } from '../lib/metrics/postgrest-gateway';

/**
 * Request construction and error handling of the Supabase Data API gateway,
 * with a stubbed fetch. No network and no Supabase project involved.
 */

const URL_BASE = 'https://project-ref.supabase.test';
const PUBLISHABLE = 'publishable-key-for-tests';

interface Call {
  url: string;
  init: RequestInit;
}

function stub(responses: Array<{ status: number; body: unknown } | Error>) {
  const calls: Call[] = [];
  const fetchStub = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const next = responses.shift();
    if (!next) throw new Error('unexpected request');
    if (next instanceof Error) throw next;
    return new Response(next.body === null ? '' : JSON.stringify(next.body), { status: next.status, statusText: 'stub' });
  }) as typeof fetch;
  return { calls, fetchStub };
}

const gatewayWith = (fetchStub: typeof fetch, token: string | null = 'user-access-token') =>
  createPostgrestGateway({ url: `${URL_BASE}/`, publishableKey: PUBLISHABLE, getAccessToken: async () => token, fetch: fetchStub });

const headers = (call: Call) => call.init.headers as Record<string, string>;

describe('PostgREST gateway', () => {
  test('never sends a request without a signed-in session', async () => {
    const { calls, fetchStub } = stub([]);
    const error = await gatewayWith(fetchStub, null).listMetrics().catch((caught: unknown) => caught);
    assert.ok(error instanceof GatewayError);
    assert.equal(toDataError(error).kind, 'unauthenticated');
    assert.equal(calls.length, 0);
  });

  test("uses the publishable key and the admin's own token, never a service key", async () => {
    const { calls, fetchStub } = stub([{ status: 200, body: [] }]);
    await gatewayWith(fetchStub).listMetrics();
    assert.equal(calls[0].url, `${URL_BASE}/rest/v1/metrics?select=*&order=metric_key.asc`);
    assert.equal(headers(calls[0]).apikey, PUBLISHABLE);
    assert.equal(headers(calls[0]).Authorization, 'Bearer user-access-token');
    assert.ok(!JSON.stringify(calls[0].init).includes('service_role'));
  });

  test('updates one metric with optimistic concurrency and returns the representation', async () => {
    const row = { id: 'm1', metric_key: 'a.b.c', value: 2 };
    const { calls, fetchStub } = stub([{ status: 200, body: [row] }]);
    const updated = await gatewayWith(fetchStub).updateMetric('m1', '2026-09-17T10:00:00.123456+00:00', { value: 2, change_reason: 'why' });
    assert.deepEqual(updated, row);
    assert.equal(calls[0].init.method, 'PATCH');
    assert.equal(calls[0].url, `${URL_BASE}/rest/v1/metrics?id=eq.m1&updated_at=eq.2026-09-17T10%3A00%3A00.123456%2B00%3A00`);
    assert.equal(headers(calls[0]).Prefer, 'return=representation');
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), { value: 2, change_reason: 'why' });
  });

  test('an update that matches no row returns null', async () => {
    const { fetchStub } = stub([{ status: 200, body: [] }]);
    assert.equal(await gatewayWith(fetchStub).updateMetric('m1', 't', { description: 'x' }), null);
  });

  test('review actions call the database functions with named arguments', async () => {
    const { calls, fetchStub } = stub([
      { status: 200, body: { id: 'm1' } },
      { status: 200, body: { id: 'm1' } },
    ]);
    const gateway = gatewayWith(fetchStub);
    await gateway.setEvidenceStatus('m1', 'verified', 'reason');
    await gateway.confirmVerification('m1', 'note');
    assert.equal(calls[0].url, `${URL_BASE}/rest/v1/rpc/set_metric_evidence_status`);
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), { p_metric_id: 'm1', p_status: 'verified', p_reason: 'reason' });
    assert.equal(calls[1].url, `${URL_BASE}/rest/v1/rpc/confirm_metric_verification`);
    assert.deepEqual(JSON.parse(String(calls[1].init.body)), { p_metric_id: 'm1', p_note: 'note' });
  });

  test('archiving calls archive_metric with no timestamp; the database sets the time', async () => {
    const { calls, fetchStub } = stub([{ status: 200, body: { id: 'm1', archived_at: '2026-09-17T10:00:00.123456+00:00' } }]);
    await gatewayWith(fetchStub).archiveMetric('m1', 'Withdrawn');
    assert.equal(calls[0].url, `${URL_BASE}/rest/v1/rpc/archive_metric`);
    assert.equal(calls[0].init.method, 'POST');
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), { p_metric_id: 'm1', p_reason: 'Withdrawn' });
    assert.ok(!String(calls[0].init.body).includes('archived_at'));
  });

  test('verification state is read from the database view', async () => {
    const { calls, fetchStub } = stub([
      { status: 200, body: [] },
      { status: 200, body: [] },
    ]);
    const gateway = gatewayWith(fetchStub);
    await gateway.listVerification();
    assert.equal(await gateway.getVerification('m1'), null);
    assert.equal(calls[0].url, `${URL_BASE}/rest/v1/metric_verification?select=*`);
    assert.equal(calls[1].url, `${URL_BASE}/rest/v1/metric_verification?select=*&metric_id=eq.m1`);
  });

  test('linked phrases are found by array containment on the metric key', async () => {
    const { calls, fetchStub } = stub([{ status: 200, body: [] }]);
    await gatewayWith(fetchStub).listLinkedPhrases('audit.unreliable_share');
    assert.equal(
      calls[0].url,
      `${URL_BASE}/rest/v1/linked_phrases?select=id,location,phrase,reviewed_at&metric_keys=cs.%7B%22audit.unreliable_share%22%7D`,
    );
  });

  test('database errors keep their SQLSTATE; network failures are reported as unavailable', async () => {
    const { fetchStub } = stub([
      { status: 403, body: { code: '42501', message: 'permission denied for table metrics' } },
      { status: 400, body: { code: 'P0001', message: 'Changing the value of a.b.c requires change_reason' } },
      new TypeError('fetch failed'),
    ]);
    const gateway = gatewayWith(fetchStub);
    const denied = await gateway.listMetrics().catch((caught: unknown) => caught);
    const invalid = await gateway.updateMetric('m1', 't', { value: 1 }).catch((caught: unknown) => caught);
    const offline = await gateway.listMetrics().catch((caught: unknown) => caught);
    assert.equal(toDataError(denied).kind, 'permission_denied');
    assert.deepEqual(toDataError(invalid), { kind: 'validation', message: 'Changing the value of a.b.c requires change_reason' });
    assert.equal(toDataError(offline).kind, 'unavailable');
  });
});
