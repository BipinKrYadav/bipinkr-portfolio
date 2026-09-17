import type { EvidenceKind } from '../../../content/types';
import { METRIC_FORMATS, type MetricFormat } from '../../../lib/metrics/format';
import type {
  DataOrigin,
  MetricKind,
  MetricUnit,
  MetricValueType,
  ReportingPeriod,
  SourcePlatform,
  SourceType,
  ValuePrecision,
} from '../../../lib/metrics/types';

/**
 * Metric rows as stored in public.metrics (supabase/migrations, 3 of 8).
 *
 * The vocabularies reuse the site's metric model (lib/metrics/types.ts); the
 * lists below are checked against those types at compile time and against
 * the database enums by admin/tests.
 */

export type EvidenceStatus = EvidenceKind;
export type ReportingPeriodBasis = ReportingPeriod['basis'];
export type VerificationSource = 'admin_confirmation' | 'legacy_import';
export type { DataOrigin, MetricFormat, MetricKind, MetricUnit, MetricValueType, SourcePlatform, SourceType, ValuePrecision };

export interface MetricRow {
  id: string;
  metric_key: string;
  name: string;
  description: string;
  kind: MetricKind;
  value_type: MetricValueType;
  unit: MetricUnit;
  currency: 'INR' | null;
  value: number | null;
  precision: ValuePrecision;
  display_format: MetricFormat;
  /** Raw JSON from the database; parse with formula.ts before use. */
  formula: unknown;
  evidence_status: EvidenceStatus | null;
  data_origin: DataOrigin;
  source_platform: SourcePlatform | null;
  source_type: SourceType;
  source_reference: string | null;
  attribution_setting: string | null;
  reporting_period_basis: ReportingPeriodBasis;
  reporting_period_start: string | null;
  reporting_period_end: string | null;
  reporting_period_note: string;
  public_note: string | null;
  internal_note: string | null;
  legacy_method_note: string | null;
  verified_by: string | null;
  verified_at: string | null;
  verified_value: number | null;
  verified_status: EvidenceStatus | null;
  verification_source: VerificationSource | null;
  change_reason: null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  archived_at: string | null;
  archived_by: string | null;
}

/**
 * Columns an admin may change through the edit form. Exactly the backend's
 * update grant on public.metrics minus `change_reason` (sent with a save).
 * metric_key, evidence_status, archived_at and every verified_* column are
 * deliberately absent: archiving goes through public.archive_metric(), which
 * stamps database time. Checked against the database by admin/tests.
 */
export const EDITABLE_METRIC_FIELDS = [
  'name',
  'description',
  'kind',
  'value_type',
  'unit',
  'currency',
  'value',
  'precision',
  'display_format',
  'formula',
  'data_origin',
  'source_platform',
  'source_type',
  'source_reference',
  'attribution_setting',
  'reporting_period_basis',
  'reporting_period_start',
  'reporting_period_end',
  'reporting_period_note',
  'public_note',
  'internal_note',
  'legacy_method_note',
] as const satisfies readonly (keyof MetricRow)[];

export type EditableMetricField = (typeof EDITABLE_METRIC_FIELDS)[number];

/** Changing any of these requires a change reason (enforced by the database). */
export const REASON_REQUIRED_FIELDS = ['value', 'kind', 'formula', 'precision'] as const satisfies readonly EditableMetricField[];

export type VerificationState = 'verified_current' | 'changed_since_verification' | 'not_verified';

/**
 * Row of public.metric_verification (migration 9): the database's own
 * verification state, including changes to formula inputs at any depth.
 */
export interface MetricVerificationRow {
  metric_id: string;
  metric_key: string;
  verification_state: VerificationState;
  /** When this metric's own value, kind, formula or precision last changed. */
  figure_changed_at: string | null;
  /** Latest figure change across the metric and everything its formula reads. */
  basis_changed_at: string | null;
  /** Formula inputs (at any depth) whose figure changed after the last source check. */
  stale_inputs: string[];
}

export interface MetricVersionRow {
  id: number;
  metric_id: string;
  change_kind: 'insert' | 'update' | 'evidence_status_changed' | 'verification_confirmed' | 'archived';
  reason: string | null;
  old_row: Partial<MetricRow> | null;
  new_row: Partial<MetricRow>;
  release_id: number | null;
  changed_at: string;
  changed_by: string | null;
}

export interface EvidenceLinkRow {
  metric_id: string;
  evidence_file_id: string;
  locator: string | null;
  created_at: string;
  created_by: string | null;
  evidence_files: {
    original_filename: string;
    description: string;
    mime_type: string;
    byte_size: number;
    sha256: string;
    contains_personal_data: boolean;
    retention_review_at: string | null;
    archived_at: string | null;
  } | null;
}

export interface DocumentReferenceRow {
  document_id: string;
  field_path: string;
  documents: { doc_type: string; slug: string } | null;
}

export interface LinkedPhraseRow {
  id: string;
  location: string;
  phrase: string;
  reviewed_at: string | null;
}

// ---------------------------------------------------------------------------
// Vocabularies. `Complete` fails to compile if a list misses a member of its type.
// ---------------------------------------------------------------------------

type Complete<Union extends string, List extends readonly Union[]> = [Exclude<Union, List[number]>] extends [never]
  ? List
  : never;

const list =
  <Union extends string>() =>
  <const List extends readonly Union[]>(values: List & Complete<Union, List>): List =>
    values;

export const METRIC_KINDS = list<MetricKind>()(['raw', 'calculated', 'legacy_fixed']);
export const VALUE_TYPES = list<MetricValueType>()(['currency', 'count', 'percent', 'multiple', 'duration']);
export const METRIC_UNITS = list<MetricUnit>()([
  'inr', 'lead', 'form_submission', 'click', 'impression', 'conversion', 'result', 'campaign', 'ad_set', 'ad',
  'city', 'objective', 'account', 'conversion_action', 'source', 'percent', 'multiple', 'month',
]);
export const PRECISIONS = list<ValuePrecision>()(['exact', 'lower_bound', 'rounded_published']);
export const DATA_ORIGINS = list<DataOrigin>()(['platform', 'derived', 'owner_confirmed']);
export const SOURCE_PLATFORMS = list<SourcePlatform>()(['meta_ads', 'google_ads', 'meta_and_google_ads']);
export const SOURCE_TYPES = list<SourceType>()(['platform_export', 'platform_diagnostics', 'owner_confirmation', 'calculation']);
export const PERIOD_BASES = list<ReportingPeriodBasis>()(['not_recorded', 'campaign_start_year', 'export_span']);
export const EVIDENCE_STATUSES = list<EvidenceStatus>()([
  'documented', 'verified', 'calculated', 'reported', 'unverified', 'limitation', 'recommendation',
]);
export const DISPLAY_FORMATS: readonly MetricFormat[] = METRIC_FORMATS;

/** Labels matching the public site's evidence chips. */
export const evidenceStatusLabels: Record<EvidenceStatus, string> = {
  documented: 'Documented',
  verified: 'Verified',
  calculated: 'Calculated',
  reported: 'Reported',
  unverified: 'Not independently verified',
  limitation: 'Limitation',
  recommendation: 'Recommendation',
};

export const kindLabels: Record<MetricKind, string> = {
  raw: 'Raw',
  calculated: 'Calculated',
  legacy_fixed: 'Legacy fixed',
};

export const precisionLabels: Record<ValuePrecision, string> = {
  exact: 'Exact',
  lower_bound: 'Lower bound',
  rounded_published: 'Rounded as published',
};

export const sourcePlatformLabels: Record<SourcePlatform, string> = {
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  meta_and_google_ads: 'Meta and Google Ads',
};

/** Human label for a snake_case vocabulary value. */
export function humanise(value: string): string {
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export const unitLabel = (unit: string): string => (unit === 'inr' ? 'INR' : humanise(unit));
