import {
  archiveBlockerMessages,
  archiveBlockers,
  diffMetric,
  requiresChangeReason,
  versionEntries,
  type ArchiveBlockers,
  type MetricDraft,
  type VersionEntry,
} from './changes';
import { fail, ok, toDataError, type DataResult } from './errors';
import { validateFormula } from './formula';
import type { MetricsGateway } from './gateway';
import type { EvidenceLinkRow, EvidenceStatus, MetricRow, MetricVerificationRow } from './model';
import { comparePublished, type PublishedBaselineIndex, type PublishedState } from './published-baseline';
import { snapshotReferencesFor, type SnapshotReferenceIndex } from './snapshot-references';

export interface MetricsOverview {
  metrics: MetricRow[];
  /** Database verification state, by metric id. */
  verification: Record<string, MetricVerificationRow>;
}

export interface MetricDetail {
  metric: MetricRow;
  /** Every metric, for formula inputs, dependants and current values. */
  metrics: MetricRow[];
  verification: MetricVerificationRow | null;
  versions: VersionEntry[];
  evidence: EvidenceLinkRow[];
  blockers: ArchiveBlockers;
  /** The working copy against the published snapshot (the live site). */
  published: PublishedState;
}

export interface MetricsRepository {
  listMetrics(): Promise<DataResult<MetricsOverview>>;
  getMetricDetail(metricKey: string): Promise<DataResult<MetricDetail>>;
  saveMetric(detail: MetricDetail, draft: MetricDraft, changeReason: string): Promise<DataResult<MetricRow>>;
  setEvidenceStatus(metric: MetricRow, status: EvidenceStatus, reason: string): Promise<DataResult<MetricRow>>;
  confirmVerification(metric: MetricRow, note: string): Promise<DataResult<MetricRow>>;
  archiveMetric(detail: MetricDetail, reason: string): Promise<DataResult<MetricRow>>;
}

async function attempt<T>(operation: () => Promise<T>): Promise<DataResult<T>> {
  try {
    return ok(await operation());
  } catch (error) {
    return { ok: false, error: toDataError(error) };
  }
}

/**
 * Metric operations for the admin UI. Checks here only give earlier, clearer
 * feedback; the database enforces every rule again and has the final word —
 * except for uses in the published snapshot, which the database does not
 * record yet. `snapshotReferences` is required so that check is never
 * dropped by accident; pass the build-time index from lib/snapshot-catalog.ts.
 * `publishedBaseline` (same source) is what "published" means for a metric:
 * saving never publishes, it only makes the working copy differ from it.
 */
export function createMetricsRepository(
  gateway: MetricsGateway,
  snapshotReferences: SnapshotReferenceIndex,
  publishedBaseline: PublishedBaselineIndex,
): MetricsRepository {
  return {
    listMetrics: () =>
      attempt(async () => {
        const [metrics, verification] = await Promise.all([gateway.listMetrics(), gateway.listVerification()]);
        return { metrics, verification: Object.fromEntries(verification.map((row) => [row.metric_id, row])) };
      }),

    async getMetricDetail(metricKey) {
      const loaded = await attempt(async () => {
        const [metric, metrics] = await Promise.all([gateway.getMetricByKey(metricKey), gateway.listMetrics()]);
        if (!metric) return null;
        const [verification, versions, evidence, documentReferences, linkedPhrases] = await Promise.all([
          gateway.getVerification(metric.id),
          gateway.listVersions(metric.id),
          gateway.listEvidenceLinks(metric.id),
          gateway.listDocumentReferences(metric.id),
          gateway.listLinkedPhrases(metric.metric_key),
        ]);
        return {
          metric,
          metrics,
          verification,
          versions: versionEntries(versions),
          evidence,
          blockers: archiveBlockers(
            metric,
            metrics,
            documentReferences,
            linkedPhrases,
            snapshotReferencesFor(snapshotReferences, metric.metric_key),
          ),
          published: comparePublished(metric, publishedBaseline),
        };
      });
      if (!loaded.ok) return loaded;
      return loaded.data ? ok(loaded.data) : fail('not_found', `No metric with the key ${metricKey}.`);
    },

    async saveMetric(detail, draft, changeReason) {
      if (detail.metric.archived_at) return fail('validation', 'This metric is archived and cannot be edited.');
      const patch = diffMetric(detail.metric, draft);
      if (Object.keys(patch).length === 0) return fail('validation', 'There are no changes to save.');

      const reason = changeReason.trim();
      if (requiresChangeReason(patch) && !reason) {
        return fail('validation', 'A change summary is required for every metric edit.');
      }

      if ('formula' in patch && detail.metric.kind === 'calculated') {
        const context = new Map(detail.metrics.map((metric) => [metric.metric_key, metric]));
        const issues = validateFormula(draft.formula, detail.metric.metric_key, context);
        if (issues.length > 0) {
          return fail('validation', 'The formula cannot be saved.', issues.map((issue) => issue.message));
        }
      }

      const metric = detail.metric;
      const result = await attempt(() =>
        gateway.updateMetric(metric.id, metric.updated_at, { ...patch, change_reason: reason }),
      );
      if (!result.ok) return result;
      if (result.data) return ok(result.data);

      // No row matched: changed by someone else, or no longer visible.
      const current = await attempt(() => gateway.getMetricByKey(metric.metric_key));
      if (current.ok && current.data) {
        return fail('conflict', 'This metric changed after you opened it. Reload to see the latest version, then reapply your edit.');
      }
      return fail('not_found', 'This metric no longer exists or you cannot access it.');
    },

    async setEvidenceStatus(metric, status, reason) {
      if (!reason.trim()) return fail('validation', 'A reason is required to change the evidence status.');
      if (metric.evidence_status === status) return fail('validation', 'The metric already has this evidence status.');
      return attempt(() => gateway.setEvidenceStatus(metric.id, status, reason.trim()));
    },

    async confirmVerification(metric, note) {
      if (!note.trim()) return fail('validation', 'Describe the source check before confirming verification.');
      return attempt(() => gateway.confirmVerification(metric.id, note.trim()));
    },

    async archiveMetric(detail, reason) {
      if (detail.metric.archived_at) return fail('validation', 'This metric is already archived.');
      const blockers = archiveBlockerMessages(detail.blockers);
      if (blockers.length > 0) {
        return fail('validation', 'This metric is still referenced and cannot be archived.', blockers);
      }
      // No timestamp is sent: the database records its own time.
      return attempt(() => gateway.archiveMetric(detail.metric.id, reason.trim() || null));
    },
  };
}
