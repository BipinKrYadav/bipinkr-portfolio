/**
 * Row shapes the admin will read from the Supabase backend, mirroring
 * supabase/migrations. Only the columns the current screens need; nothing
 * here fetches data yet.
 */

export type EvidenceStatus =
  | 'documented'
  | 'verified'
  | 'calculated'
  | 'reported'
  | 'unverified'
  | 'limitation'
  | 'recommendation';

export type MetricKind = 'raw' | 'calculated' | 'legacy_fixed';
export type ValuePrecision = 'exact' | 'lower_bound' | 'rounded_published';

export interface MetricRow {
  id: string;
  metric_key: string;
  value: number | null;
  kind: MetricKind;
  unit: string;
  precision: ValuePrecision;
  evidence_status: EvidenceStatus | null;
  verified_value: number | null;
  verified_at: string | null;
  updated_at: string;
  archived_at: string | null;
}

export type ReleaseKind = 'publish' | 'rollback';
export type ReleaseStatus =
  | 'validating'
  | 'queued'
  | 'building'
  | 'built'
  | 'deploying'
  | 'live'
  | 'failed'
  | 'superseded';

export interface ReleaseRow {
  id: number;
  kind: ReleaseKind;
  status: ReleaseStatus;
  summary: string;
  created_at: string;
  live_at: string | null;
  failed_at: string | null;
  failure_stage: string | null;
}

export interface AuditLogRow {
  id: number;
  occurred_at: string;
  actor_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
}

/** Labels for evidence statuses, matching the public site's evidence chips. */
export const evidenceStatusLabels: Record<EvidenceStatus, string> = {
  documented: 'Documented',
  verified: 'Verified',
  calculated: 'Calculated',
  reported: 'Reported',
  unverified: 'Not independently verified',
  limitation: 'Limitation',
  recommendation: 'Recommendation',
};

export type VerificationState = 'verified_current' | 'changed_since_verification' | 'not_verified';

/** Derived from the verification record; the database never changes it automatically. */
export function verificationState(metric: Pick<MetricRow, 'value' | 'verified_value' | 'verified_at'>): VerificationState {
  if (metric.verified_at === null) return 'not_verified';
  return metric.value === metric.verified_value ? 'verified_current' : 'changed_since_verification';
}

export const verificationStateLabels: Record<VerificationState, { label: string; description: string }> = {
  verified_current: {
    label: 'Verified at current value',
    description: 'An admin confirmed this value against its source, and it has not changed since.',
  },
  changed_since_verification: {
    label: 'Changed since verification',
    description: 'The value differs from the value that was last confirmed. It needs a new source check.',
  },
  not_verified: {
    label: 'Not verified',
    description: 'No source check has been recorded.',
  },
};
