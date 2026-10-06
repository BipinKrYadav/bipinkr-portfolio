import { GatewayError } from '../metrics/errors';

import type { ReleasesGateway } from './gateway';
import { RELEASE_COLUMNS, type ChangePreview, type ReleaseItemRow, type ReleaseRow } from './model';

export interface ReleasesPostgrestGatewayOptions {
  /** Supabase project origin, e.g. https://<project>.supabase.co */
  url: string;
  /** Publishable (anon) key. Never the service-role key. */
  publishableKey: string;
  /** The signed-in admin's access token, or null without an MFA-verified session. */
  getAccessToken: () => Promise<string | null>;
  fetch?: typeof fetch;
}

const COLUMNS = RELEASE_COLUMNS.join(',');
const eq = (value: number) => `eq.${encodeURIComponent(String(value))}`;

export const RELEASES_PATH = `releases?select=${COLUMNS}&order=id.desc`;
export const releasePath = (releaseId: number) => `releases?select=${COLUMNS}&id=${eq(releaseId)}`;
export const releaseItemsPath = (releaseId: number) =>
  `release_items?select=id,release_id,entity_type,entity_id,metric_version_id,document_revision_id,diff&release_id=${eq(releaseId)}&order=entity_type.asc,id.asc`;
export const releaseSnapshotPath = (releaseId: number) => `releases?select=snapshot&id=${eq(releaseId)}`;
/** RPCs return the release row; `select` keeps the snapshot out of the response. */
export const rpcPath = (name: string) => `rpc/${name}?select=${COLUMNS}`;

/**
 * ReleasesGateway over the Supabase Data API (PostgREST). Same rules as the
 * other gateways: every request carries the admin's own access token, so the
 * database applies RLS, grants and the release functions' checks as that
 * user, and nothing is sent without a token. Reads are GETs; every change is
 * a POST to one release function.
 */
export function createReleasesPostgrestGateway(options: ReleasesPostgrestGatewayOptions): ReleasesGateway {
  const base = `${options.url.replace(/\/+$/, '')}/rest/v1`;
  const fetchImpl = options.fetch ?? fetch;

  async function send<T>(path: string, init: { method: 'GET' | 'POST'; body?: unknown }): Promise<T> {
    // No token, no request: checked before anything is built or sent.
    const token = await options.getAccessToken();
    if (!token) throw new GatewayError('unauthenticated', 'No signed-in admin session.', 401);

    let response: Response;
    try {
      response = await fetchImpl(`${base}/${path}`, {
        method: init.method,
        headers: {
          apikey: options.publishableKey,
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        cache: 'no-store',
      });
    } catch {
      throw new GatewayError('network', 'The database could not be reached.');
    }

    const text = await response.text();
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      throw new GatewayError(String(response.status), 'The database returned an unreadable response.', response.status);
    }
    if (!response.ok) {
      const body = (payload ?? {}) as { code?: string; message?: string };
      throw new GatewayError(body.code ?? String(response.status), body.message ?? response.statusText, response.status);
    }
    return payload as T;
  }

  const get = <T>(path: string) => send<T>(path, { method: 'GET' });
  const rpc = <T>(path: string, body: Record<string, unknown>) => send<T>(path, { method: 'POST', body });
  const releaseRpc = async (name: string, body: Record<string, unknown>): Promise<ReleaseRow> => {
    const result = await rpc<ReleaseRow | ReleaseRow[]>(rpcPath(name), body);
    return Array.isArray(result) ? result[0] : result;
  };

  return {
    listReleases: () => get<ReleaseRow[]>(RELEASES_PATH),
    getRelease: async (releaseId) => (await get<ReleaseRow[]>(releasePath(releaseId)))[0] ?? null,
    listReleaseItems: (releaseId) => get<ReleaseItemRow[]>(releaseItemsPath(releaseId)),
    getReleaseSnapshot: async (releaseId) => (await get<{ snapshot: unknown }[]>(releaseSnapshotPath(releaseId)))[0]?.snapshot ?? null,
    getReleaseSnapshotText: (releaseId) => rpc<string>('rpc/release_snapshot_text', { p_release_id: releaseId }),
    previewChanges: () => rpc<ChangePreview>('rpc/preview_release_changes', {}),

    createRelease: (summary) => releaseRpc('create_release', { p_summary: summary }),
    createRollbackRelease: (summary) => releaseRpc('create_rollback_release', { p_summary: summary }),
    validateRelease: (releaseId, expectedUpdatedAt, schemaIssues) =>
      releaseRpc('validate_release', { p_release_id: releaseId, p_expected_updated_at: expectedUpdatedAt, p_schema_issues: schemaIssues }),
    approveRelease: (releaseId, expectedUpdatedAt, snapshotSha256) =>
      releaseRpc('approve_release', { p_release_id: releaseId, p_expected_updated_at: expectedUpdatedAt, p_snapshot_sha256: snapshotSha256 }),
    startReleasePublish: (releaseId, expectedUpdatedAt) =>
      releaseRpc('start_release_publish', { p_release_id: releaseId, p_expected_updated_at: expectedUpdatedAt }),
    recordReleaseBuild: (releaseId, expectedUpdatedAt, buildSha256) =>
      releaseRpc('record_release_build', { p_release_id: releaseId, p_expected_updated_at: expectedUpdatedAt, p_build_sha256: buildSha256 }),
    markReleasePublished: (releaseId, expectedUpdatedAt, deploymentConfirmed) =>
      releaseRpc('mark_release_published', {
        p_release_id: releaseId,
        p_expected_updated_at: expectedUpdatedAt,
        p_deployment_confirmed: deploymentConfirmed,
      }),
    recordReleaseFailure: (releaseId, expectedUpdatedAt, stage, message) =>
      releaseRpc('record_release_failure', { p_release_id: releaseId, p_expected_updated_at: expectedUpdatedAt, p_stage: stage, p_message: message }),
    cancelRelease: (releaseId, expectedUpdatedAt, reason) =>
      releaseRpc('cancel_release', { p_release_id: releaseId, p_expected_updated_at: expectedUpdatedAt, p_reason: reason }),
  };
}
