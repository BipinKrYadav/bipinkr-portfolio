import type { BadgeTone } from '@admin/components/ui/StatusBadge';

/**
 * Releases as stored in public.releases and public.release_items
 * (supabase/migrations/20260924000100_release_publishing.sql).
 *
 * A release is a frozen snapshot of the public site's content, assembled by
 * the database from the current drafts. The snapshot of the one published
 * release is the published baseline. Rows are changed only by the release
 * functions (RPCs); the admin never writes these tables directly.
 */

export type ReleaseKind = 'publish' | 'rollback';
export type ReleaseStatus =
  | 'draft'
  | 'review'
  | 'approved'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled'
  | 'superseded'
  | 'rolled_back';
export type ReleaseOrigin = 'admin' | 'baseline_import';
export type FailureStage = 'build' | 'deploy' | 'deploy_verify';

export interface ValidationCheck {
  code: string;
  label: string;
  ok: boolean;
  details: string[];
}

export interface ValidationReport {
  passed: boolean;
  checkedAt: string;
  snapshotSha256: string;
  checks: ValidationCheck[];
}

/** A release row without its snapshot (requested separately, only where needed). */
export interface ReleaseRow {
  id: number;
  kind: ReleaseKind;
  status: ReleaseStatus;
  origin: ReleaseOrigin;
  summary: string;
  snapshot_sha256: string;
  base_release_id: number | null;
  previous_release_id: number | null;
  rollback_of: number | null;
  restores_release_id: number | null;
  document_revisions: Record<string, string>;
  validation: ValidationReport | null;
  validated_at: string | null;
  validated_by: string | null;
  approved_at: string | null;
  approved_by: string | null;
  publish_started_at: string | null;
  publish_started_by: string | null;
  build_sha256: string | null;
  built_at: string | null;
  deployment_confirmed_at: string | null;
  deployment_confirmed_by: string | null;
  live_at: string | null;
  failed_at: string | null;
  failure_stage: string | null;
  failure_message: string | null;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancel_reason: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

/** Every release column except the snapshot, exactly as requested from the Data API. */
export const RELEASE_COLUMNS = [
  'id', 'kind', 'status', 'origin', 'summary', 'snapshot_sha256', 'base_release_id', 'previous_release_id',
  'rollback_of', 'restores_release_id', 'document_revisions', 'validation', 'validated_at', 'validated_by',
  'approved_at', 'approved_by', 'publish_started_at', 'publish_started_by', 'build_sha256', 'built_at',
  'deployment_confirmed_at', 'deployment_confirmed_by', 'live_at', 'failed_at', 'failure_stage', 'failure_message',
  'cancelled_at', 'cancelled_by', 'cancel_reason', 'created_at', 'created_by', 'updated_at', 'updated_by',
] as const satisfies readonly (keyof ReleaseRow)[];

export type ItemChange = 'added' | 'changed' | 'removed';

export interface ReleaseItemRow {
  id: number;
  release_id: number;
  entity_type: 'metric' | 'document' | 'linked_phrases';
  entity_id: string;
  metric_version_id: number | null;
  document_revision_id: string | null;
  diff: {
    entityKey: string;
    change: ItemChange;
    fields: string[];
    /** Metrics only: the published and the release projection. */
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
  };
}

/** public.preview_release_changes(): what a release created now would contain. */
export interface ChangePreview {
  baseReleaseId: number | null;
  items: { entityType: ReleaseItemRow['entity_type']; entityKey: string; change: ItemChange; fields: string[] }[];
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export const releaseStatusLabels: Record<ReleaseStatus, { label: string; tone: BadgeTone; description: string }> = {
  draft: { label: 'Draft', tone: 'neutral', description: 'Created from the drafts. Validate it to continue.' },
  review: { label: 'In review', tone: 'info', description: 'Validation passed. Review the changes, then approve.' },
  approved: { label: 'Approved', tone: 'info', description: 'Approved for publishing. Confirm publish to start the build.' },
  publishing: {
    label: 'Publishing',
    tone: 'warning',
    description: 'Build and deploy in progress, outside the admin. Record the verified build, then confirm the deployment.',
  },
  published: { label: 'Published', tone: 'accent', description: 'The live site shows this release. Its snapshot is the published baseline.' },
  failed: { label: 'Failed', tone: 'danger', description: 'Publishing stopped at a recorded stage. The live site was not changed.' },
  cancelled: { label: 'Cancelled', tone: 'neutral', description: 'Stopped before publishing. Nothing was published.' },
  superseded: { label: 'Superseded', tone: 'neutral', description: 'Was published; a later release replaced it.' },
  rolled_back: { label: 'Rolled back', tone: 'warning', description: 'Was published, then undone by a rollback release.' },
};

export const OPEN_STATUSES: readonly ReleaseStatus[] = ['draft', 'review', 'approved', 'publishing'];
export const isOpen = (release: Pick<ReleaseRow, 'status'>) => OPEN_STATUSES.includes(release.status);

/**
 * The required sequence. Save Draft happens on the metric and document
 * screens; every other step is a separate, recorded action on the release.
 */
export const PUBLISH_STEPS = [
  { key: 'save', label: 'Save draft', description: 'Edit metrics and documents. Saving never publishes.' },
  { key: 'create', label: 'Create release', description: 'Freeze the current drafts into a snapshot.' },
  { key: 'validate', label: 'Validate', description: 'Database and schema checks. Failures block publishing.' },
  { key: 'review', label: 'Review changes', description: 'Every changed metric and document, before and after.' },
  { key: 'confirm', label: 'Confirm publish', description: 'Approve this exact snapshot, then start publishing.' },
  { key: 'build', label: 'Build', description: 'npm run release:build with the downloaded snapshot (manual).' },
  { key: 'verify', label: 'Verify build', description: 'Record the SHA-256 the verified build printed.' },
  { key: 'published', label: 'Mark published', description: 'After deploying the build yourself, confirm it here.' },
] as const;

export type PublishStepKey = (typeof PUBLISH_STEPS)[number]['key'];

/**
 * How far a release has come along PUBLISH_STEPS (the last completed step).
 * Written as comparisons rather than a switch: the static-output test rejects
 * a minified `case"draft":`, which looks like a serialised document draft.
 */
export function completedStep(release: Pick<ReleaseRow, 'status' | 'build_sha256' | 'approved_at'>): PublishStepKey {
  const { status } = release;
  if (status === 'draft' || status === 'cancelled') return 'create';
  if (status === 'review') return 'validate';
  if (status === 'approved') return 'review';
  if (status === 'publishing' || status === 'failed') return release.build_sha256 ? 'verify' : 'confirm';
  return 'published';
}

export const SHA256 = /^[0-9a-f]{64}$/;

export const FAILURE_STAGES: readonly { value: FailureStage; label: string }[] = [
  { value: 'build', label: 'Build (release:build failed or its checks did not pass)' },
  { value: 'deploy', label: 'Deploy (the upload to the host failed)' },
  { value: 'deploy_verify', label: 'Deploy verification (the live site does not show this release)' },
];
