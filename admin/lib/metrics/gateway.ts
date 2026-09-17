import type {
  DocumentReferenceRow,
  EditableMetricField,
  EvidenceLinkRow,
  EvidenceStatus,
  LinkedPhraseRow,
  MetricRow,
  MetricVerificationRow,
  MetricVersionRow,
} from './model';

/**
 * The only operations the metrics screens perform against the backend. Each
 * maps to one Data API request made with the signed-in admin's session, so
 * RLS, column grants, triggers and the database functions apply to every
 * call. Implementations throw GatewayError; they never apply business rules.
 */

export type MetricUpdate = Partial<Pick<MetricRow, EditableMetricField>> & {
  /** Required by the database when value, kind, formula or precision change. */
  change_reason?: string;
};

export interface MetricsGateway {
  listMetrics(): Promise<MetricRow[]>;
  getMetricByKey(metricKey: string): Promise<MetricRow | null>;
  /** public.metric_verification for every visible metric. */
  listVerification(): Promise<MetricVerificationRow[]>;
  getVerification(metricId: string): Promise<MetricVerificationRow | null>;
  listVersions(metricId: string): Promise<MetricVersionRow[]>;
  listEvidenceLinks(metricId: string): Promise<EvidenceLinkRow[]>;
  listDocumentReferences(metricId: string): Promise<DocumentReferenceRow[]>;
  listLinkedPhrases(metricKey: string): Promise<LinkedPhraseRow[]>;
  /**
   * Updates one metric if it still has `expectedUpdatedAt` (optimistic
   * concurrency). Returns the updated row, or null when no row matched.
   */
  updateMetric(metricId: string, expectedUpdatedAt: string, update: MetricUpdate): Promise<MetricRow | null>;
  /** public.set_metric_evidence_status */
  setEvidenceStatus(metricId: string, status: EvidenceStatus, reason: string): Promise<MetricRow>;
  /** public.confirm_metric_verification */
  confirmVerification(metricId: string, note: string): Promise<MetricRow>;
  /** public.archive_metric — the database sets the archive time. */
  archiveMetric(metricId: string, reason: string | null): Promise<MetricRow>;
}
