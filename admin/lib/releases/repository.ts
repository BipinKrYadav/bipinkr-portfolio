import { fail, ok, toDataError, type DataResult } from '../metrics/errors';

import type { ReleasesGateway } from './gateway';
import { isOpen, SHA256, type ChangePreview, type FailureStage, type ReleaseItemRow, type ReleaseRow } from './model';
import { buildReleaseReview, sha256Hex, snapshotSchemaIssues, type ReleaseReview } from './review';

export interface ReleasesOverview {
  /** Newest first. */
  releases: ReleaseRow[];
  /** The release the live site shows (its snapshot is the published baseline), or null before the baseline import. */
  published: ReleaseRow | null;
  /** The one release between draft and publishing, if any. */
  open: ReleaseRow | null;
  /** Drafts that differ from the published baseline right now. */
  preview: ChangePreview;
  /** Most recent successful publish (published, superseded or rolled back), with its time. */
  lastPublished: ReleaseRow | null;
  /** Most recent failed release, if it is newer than the last publish. */
  recentFailure: ReleaseRow | null;
}

export interface ReleaseDetail {
  release: ReleaseRow;
  /** The release this one was compared with (its base), if any. */
  base: ReleaseRow | null;
  items: ReleaseItemRow[];
  review: ReleaseReview;
  /** This browser's schema check of the frozen snapshot (repeated by validation and by the build). */
  schemaIssues: string[];
}

export interface SnapshotDownload {
  fileName: string;
  text: string;
  sha256: string;
}

export interface ReleasesRepository {
  getOverview(): Promise<DataResult<ReleasesOverview>>;
  getReleaseDetail(releaseId: number): Promise<DataResult<ReleaseDetail>>;
  createRelease(summary: string): Promise<DataResult<ReleaseRow>>;
  createRollbackRelease(summary: string): Promise<DataResult<ReleaseRow>>;
  validateRelease(release: ReleaseRow): Promise<DataResult<ReleaseRow>>;
  approveRelease(detail: ReleaseDetail): Promise<DataResult<ReleaseRow>>;
  startPublish(release: ReleaseRow): Promise<DataResult<ReleaseRow>>;
  recordBuild(release: ReleaseRow, buildSha256: string): Promise<DataResult<ReleaseRow>>;
  markPublished(release: ReleaseRow, deploymentConfirmed: boolean): Promise<DataResult<ReleaseRow>>;
  recordFailure(release: ReleaseRow, stage: FailureStage, message: string): Promise<DataResult<ReleaseRow>>;
  cancelRelease(release: ReleaseRow, reason: string): Promise<DataResult<ReleaseRow>>;
  /** The frozen snapshot exactly as hashed, checked against the recorded SHA-256. */
  downloadSnapshot(release: ReleaseRow): Promise<DataResult<SnapshotDownload>>;
}

/** Database errors, with the release functions' stale-copy refusal reported as a conflict. */
function releaseError(error: unknown) {
  const data = toDataError(error);
  return data.kind === 'validation' && /changed after you opened it|is now published/.test(data.message)
    ? { ...data, kind: 'conflict' as const }
    : data;
}

async function attempt<T>(operation: () => Promise<T>): Promise<DataResult<T>> {
  try {
    return ok(await operation());
  } catch (error) {
    return { ok: false, error: releaseError(error) };
  }
}

const WAS_PUBLISHED = new Set(['published', 'superseded', 'rolled_back']);

/**
 * Release operations for the admin UI. The checks here give earlier, clearer
 * feedback; every rule is enforced again by the database, which has the final
 * word. Nothing here deploys anything: the build and the upload happen
 * outside the admin, and "published" is only ever recorded after the admin
 * confirms the deployment.
 */
export function createReleasesRepository(gateway: ReleasesGateway): ReleasesRepository {
  /** Fetches the snapshot text and proves it is the one the release recorded. */
  async function verifiedSnapshot(release: ReleaseRow): Promise<DataResult<{ text: string; json: unknown }>> {
    const text = await attempt(() => gateway.getReleaseSnapshotText(release.id));
    if (!text.ok) return text;
    const sha256 = await sha256Hex(text.data);
    if (sha256 !== release.snapshot_sha256) {
      return fail('conflict', `The snapshot of release ${release.id} does not match its recorded SHA-256. Reload before continuing.`);
    }
    return ok({ text: text.data, json: JSON.parse(text.data) as unknown });
  }

  return {
    async getOverview() {
      return attempt(async () => {
        const [releases, preview] = await Promise.all([gateway.listReleases(), gateway.previewChanges()]);
        const lastPublished =
          [...releases]
            .filter((release) => WAS_PUBLISHED.has(release.status) && release.live_at)
            .sort((a, b) => Date.parse(b.live_at ?? '') - Date.parse(a.live_at ?? ''))[0] ?? null;
        const failure = releases.find((release) => release.status === 'failed') ?? null;
        return {
          releases,
          published: releases.find((release) => release.status === 'published') ?? null,
          open: releases.find(isOpen) ?? null,
          preview,
          lastPublished,
          recentFailure:
            failure && (!lastPublished || Date.parse(failure.failed_at ?? '') > Date.parse(lastPublished.live_at ?? '')) ? failure : null,
        };
      });
    },

    async getReleaseDetail(releaseId) {
      if (!Number.isInteger(releaseId) || releaseId <= 0) return fail('not_found', 'No release was selected.');
      const loaded = await attempt(async () => {
        const release = await gateway.getRelease(releaseId);
        if (!release) return null;
        const [items, after, base, before] = await Promise.all([
          gateway.listReleaseItems(release.id),
          gateway.getReleaseSnapshot(release.id),
          release.base_release_id ? gateway.getRelease(release.base_release_id) : Promise.resolve(null),
          release.base_release_id ? gateway.getReleaseSnapshot(release.base_release_id) : Promise.resolve(null),
        ]);
        return {
          release,
          base,
          items,
          review: buildReleaseReview(items, before, after),
          schemaIssues: after === null ? ['The snapshot could not be read.'] : snapshotSchemaIssues(after),
        };
      });
      if (!loaded.ok) return loaded;
      return loaded.data ? ok(loaded.data) : fail('not_found', `No release ${releaseId}.`);
    },

    async createRelease(summary) {
      if (!summary.trim()) return fail('validation', 'Describe what this release publishes.');
      return attempt(() => gateway.createRelease(summary.trim()));
    },

    async createRollbackRelease(summary) {
      if (!summary.trim()) return fail('validation', 'Say why the published release is being rolled back.');
      return attempt(() => gateway.createRollbackRelease(summary.trim()));
    },

    async validateRelease(release) {
      if (release.status !== 'draft') return fail('validation', 'Only a draft release can be validated.');
      // The schema check runs on the exact snapshot the database froze.
      const snapshot = await verifiedSnapshot(release);
      if (!snapshot.ok) return snapshot;
      const issues = snapshotSchemaIssues(snapshot.data.json).slice(0, 50);
      return attempt(() => gateway.validateRelease(release.id, release.updated_at, issues));
    },

    async approveRelease(detail) {
      const { release } = detail;
      if (release.status !== 'review') return fail('validation', 'Only a release in review can be approved.');
      if (!release.validation?.passed) return fail('validation', 'This release has not passed validation.');
      // Approves exactly the snapshot this review was built from.
      return attempt(() => gateway.approveRelease(release.id, release.updated_at, release.snapshot_sha256));
    },

    async startPublish(release) {
      if (release.status !== 'approved') return fail('validation', 'Only an approved release can start publishing.');
      return attempt(() => gateway.startReleasePublish(release.id, release.updated_at));
    },

    async recordBuild(release, buildSha256) {
      const sha = buildSha256.trim().toLowerCase();
      if (!SHA256.test(sha)) return fail('validation', 'Paste the 64-character SHA-256 that npm run release:build printed.');
      if (release.status !== 'publishing') return fail('validation', 'A build can be recorded only while the release is publishing.');
      return attempt(() => gateway.recordReleaseBuild(release.id, release.updated_at, sha));
    },

    async markPublished(release, deploymentConfirmed) {
      if (release.status !== 'publishing') return fail('validation', 'Only a publishing release can be marked published.');
      if (!release.build_sha256) return fail('validation', 'Record the verified build first.');
      if (!deploymentConfirmed) return fail('validation', 'Confirm that you deployed the verified build.');
      return attempt(() => gateway.markReleasePublished(release.id, release.updated_at, true));
    },

    async recordFailure(release, stage, message) {
      if (release.status !== 'publishing') return fail('validation', 'Only a publishing release can be recorded as failed.');
      if (!message.trim()) return fail('validation', 'Describe what failed.');
      return attempt(() => gateway.recordReleaseFailure(release.id, release.updated_at, stage, message.trim()));
    },

    async cancelRelease(release, reason) {
      if (!['draft', 'review', 'approved'].includes(release.status)) {
        return fail('validation', 'Only a draft, in-review or approved release can be cancelled.');
      }
      if (!reason.trim()) return fail('validation', 'A reason is required to cancel a release.');
      return attempt(() => gateway.cancelRelease(release.id, release.updated_at, reason.trim()));
    },

    async downloadSnapshot(release) {
      const snapshot = await verifiedSnapshot(release);
      if (!snapshot.ok) return snapshot;
      return ok({
        fileName: `release-${release.id}.snapshot.json`,
        text: snapshot.data.text,
        sha256: release.snapshot_sha256,
      });
    },
  };
}
