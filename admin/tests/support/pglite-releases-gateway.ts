import type { PGlite, Transaction } from '@electric-sql/pglite';

import { GatewayError } from '../../lib/metrics/errors';
import type { ReleasesGateway } from '../../lib/releases/gateway';
import type { ChangePreview, ReleaseItemRow, ReleaseRow } from '../../lib/releases/model';

import { runAs, type Session } from './database';

/**
 * ReleasesGateway that runs each operation as one transaction under the given
 * session, with the same grants, RLS and release functions the Data API
 * would apply. Rows come back as JSON (snapshot removed, like the column
 * list the real gateway requests). Test use only.
 */
export function createPgliteReleasesGateway(db: PGlite, session: Session): ReleasesGateway {
  async function rows<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    try {
      return await runAs(db, session, async (tx: Transaction) => {
        const result = await tx.query<{ row: T }>(sql, params);
        return result.rows.map((item) => item.row);
      });
    } catch (error) {
      const { code, message } = error as { code?: string; message?: string };
      throw new GatewayError(code ?? 'unknown', message ?? String(error));
    }
  }

  const release = async (sql: string, params: unknown[]): Promise<ReleaseRow> => (await rows<ReleaseRow>(sql, params))[0];

  return {
    listReleases: () => rows<ReleaseRow>("select to_jsonb(r) - 'snapshot' as row from public.releases r order by r.id desc"),

    async getRelease(releaseId) {
      return (await rows<ReleaseRow>("select to_jsonb(r) - 'snapshot' as row from public.releases r where r.id = $1", [releaseId]))[0] ?? null;
    },

    listReleaseItems: (releaseId) =>
      rows<ReleaseItemRow>(
        'select to_jsonb(i) - $2::text as row from public.release_items i where i.release_id = $1 order by i.entity_type, i.id',
        [releaseId, 'created_at'],
      ),

    async getReleaseSnapshot(releaseId) {
      return (await rows<unknown>('select r.snapshot as row from public.releases r where r.id = $1', [releaseId]))[0] ?? null;
    },

    async getReleaseSnapshotText(releaseId) {
      return (await rows<string>('select to_jsonb(public.release_snapshot_text($1)) as row', [releaseId]))[0];
    },

    async previewChanges() {
      return (await rows<ChangePreview>('select public.preview_release_changes() as row'))[0];
    },

    createRelease: (summary) => release("select to_jsonb(r) - 'snapshot' as row from public.create_release($1) r", [summary]),
    createRollbackRelease: (summary) =>
      release("select to_jsonb(r) - 'snapshot' as row from public.create_rollback_release($1) r", [summary]),
    validateRelease: (releaseId, expectedUpdatedAt, schemaIssues) =>
      release("select to_jsonb(r) - 'snapshot' as row from public.validate_release($1, $2::timestamptz, $3::jsonb) r", [
        releaseId,
        expectedUpdatedAt,
        JSON.stringify(schemaIssues),
      ]),
    approveRelease: (releaseId, expectedUpdatedAt, snapshotSha256) =>
      release("select to_jsonb(r) - 'snapshot' as row from public.approve_release($1, $2::timestamptz, $3) r", [
        releaseId,
        expectedUpdatedAt,
        snapshotSha256,
      ]),
    startReleasePublish: (releaseId, expectedUpdatedAt) =>
      release("select to_jsonb(r) - 'snapshot' as row from public.start_release_publish($1, $2::timestamptz) r", [releaseId, expectedUpdatedAt]),
    recordReleaseBuild: (releaseId, expectedUpdatedAt, buildSha256) =>
      release("select to_jsonb(r) - 'snapshot' as row from public.record_release_build($1, $2::timestamptz, $3) r", [
        releaseId,
        expectedUpdatedAt,
        buildSha256,
      ]),
    markReleasePublished: (releaseId, expectedUpdatedAt, deploymentConfirmed) =>
      release("select to_jsonb(r) - 'snapshot' as row from public.mark_release_published($1, $2::timestamptz, $3) r", [
        releaseId,
        expectedUpdatedAt,
        deploymentConfirmed,
      ]),
    recordReleaseFailure: (releaseId, expectedUpdatedAt, stage, message) =>
      release("select to_jsonb(r) - 'snapshot' as row from public.record_release_failure($1, $2::timestamptz, $3, $4) r", [
        releaseId,
        expectedUpdatedAt,
        stage,
        message,
      ]),
    cancelRelease: (releaseId, expectedUpdatedAt, reason) =>
      release("select to_jsonb(r) - 'snapshot' as row from public.cancel_release($1, $2::timestamptz, $3) r", [
        releaseId,
        expectedUpdatedAt,
        reason,
      ]),
  };
}
