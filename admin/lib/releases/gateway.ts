import type { ChangePreview, FailureStage, ReleaseItemRow, ReleaseRow } from './model';

/**
 * Every release operation the admin performs. Reads are GETs on
 * public.releases and public.release_items (RLS: MFA-verified admin only).
 * Every change is a call to one database function, which checks admin access,
 * the release's state and its updated_at (optimistic concurrency); the
 * release tables are never written directly. Implementations throw
 * GatewayError and apply no rules.
 */
export interface ReleasesGateway {
  /** Every release, newest first, without snapshots. */
  listReleases(): Promise<ReleaseRow[]>;
  getRelease(releaseId: number): Promise<ReleaseRow | null>;
  listReleaseItems(releaseId: number): Promise<ReleaseItemRow[]>;
  /** The frozen snapshot as JSON, or null when not visible. */
  getReleaseSnapshot(releaseId: number): Promise<unknown | null>;
  /** public.release_snapshot_text: the snapshot exactly as hashed. */
  getReleaseSnapshotText(releaseId: number): Promise<string>;
  /** public.preview_release_changes */
  previewChanges(): Promise<ChangePreview>;

  createRelease(summary: string): Promise<ReleaseRow>;
  createRollbackRelease(summary: string): Promise<ReleaseRow>;
  validateRelease(releaseId: number, expectedUpdatedAt: string, schemaIssues: string[]): Promise<ReleaseRow>;
  approveRelease(releaseId: number, expectedUpdatedAt: string, snapshotSha256: string): Promise<ReleaseRow>;
  startReleasePublish(releaseId: number, expectedUpdatedAt: string): Promise<ReleaseRow>;
  recordReleaseBuild(releaseId: number, expectedUpdatedAt: string, buildSha256: string): Promise<ReleaseRow>;
  markReleasePublished(releaseId: number, expectedUpdatedAt: string, deploymentConfirmed: boolean): Promise<ReleaseRow>;
  recordReleaseFailure(releaseId: number, expectedUpdatedAt: string, stage: FailureStage, message: string): Promise<ReleaseRow>;
  cancelRelease(releaseId: number, expectedUpdatedAt: string, reason: string): Promise<ReleaseRow>;
}
