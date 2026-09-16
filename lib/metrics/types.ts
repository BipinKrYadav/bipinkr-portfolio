import type { EvidenceKind } from '../../content/types';
import type { MetricFormat } from './format';

/**
 * The canonical metric model.
 *
 * Every evidence-backed figure on the site is one record of this shape, and
 * every place the figure appears renders it from that record. The record
 * carries the number itself (never a pre-formatted string), how it is known,
 * where it came from and, for derived figures, the formula that produces it.
 *
 * `evidenceStatus` is a human judgement. Nothing in the metric system sets,
 * derives, promotes or demotes it: not a formula, not a changed value, not an
 * import. It is whatever was explicitly recorded, and `null` means no grade
 * has been recorded for the figure.
 */

/** Stable identifier: `<dataset>.<entity>.<measure>`, lower_snake_case segments. */
export type MetricId = string;

/**
 * - `raw`          Entered from source evidence.
 * - `calculated`   Derived from other metrics by a fixed formula. Holds no value of its own.
 * - `legacy_fixed` A published figure whose inputs are not stored, so it cannot be
 *                  recalculated. Held exactly as published until the inputs are supplied.
 */
export type MetricKind = 'raw' | 'calculated' | 'legacy_fixed';

export type MetricValueType = 'currency' | 'count' | 'percent' | 'multiple' | 'duration';

export type MetricUnit =
  | 'inr'
  | 'lead'
  | 'form_submission'
  | 'click'
  | 'impression'
  | 'conversion'
  | 'result'
  | 'campaign'
  | 'ad_set'
  | 'ad'
  | 'city'
  | 'objective'
  | 'account'
  | 'conversion_action'
  | 'source'
  | 'percent'
  | 'multiple'
  | 'month';

export type MetricCurrency = 'INR';

/** Where a value originates. */
export type DataOrigin =
  /** Read from an advertising platform's own reporting. */
  | 'platform'
  /** Produced by a formula from other metrics. */
  | 'derived'
  /** Confirmed by the account owner rather than read from an export. */
  | 'owner_confirmed';

export type SourcePlatform = 'meta_ads' | 'google_ads' | 'meta_and_google_ads';

export type SourceType =
  | 'platform_export'
  | 'platform_diagnostics'
  | 'owner_confirmation'
  | 'calculation';

/**
 * How exactly the stored value represents the real figure.
 *
 * - `exact`             The value as recorded.
 * - `lower_bound`       Only a floor is known (published with a "+").
 * - `rounded_published` Published to fewer decimals than the source; the unrounded source value is not stored.
 */
export type ValuePrecision = 'exact' | 'lower_bound' | 'rounded_published';

export interface ReportingPeriod {
  basis: 'not_recorded' | 'campaign_start_year' | 'export_span';
  /** ISO date, when known. */
  start: string | null;
  /** ISO date, when known. */
  end: string | null;
  description: string;
}

/**
 * The closed set of formulas. There is deliberately no expression language:
 * a derived figure can only be one of these, with named inputs.
 *
 * Every formula returns `null` — rendered as "—" — when an input is missing
 * or a denominator is zero, so a missing value never displays as a
 * misleading 0.
 */
export type MetricFormula =
  | { fn: 'ratio'; numerator: MetricId; denominator: MetricId }
  | { fn: 'percent'; part: MetricId; whole: MetricId }
  | { fn: 'sum'; terms: MetricId[] }
  | { fn: 'difference'; minuend: MetricId; subtrahend: MetricId }
  | { fn: 'pct_decrease'; from: MetricId; to: MetricId }
  | { fn: 'pct_increase'; from: MetricId; to: MetricId }
  | { fn: 'multiple'; value: MetricId; base: MetricId }
  | { fn: 'min'; of: MetricId[] }
  | { fn: 'max'; of: MetricId[] }
  | { fn: 'spread'; of: MetricId[] }
  | { fn: 'count'; of: MetricId[] };

interface MetricBase {
  id: MetricId;
  name: string;
  description: string;
  valueType: MetricValueType;
  unit: MetricUnit;
  currency: MetricCurrency | null;
  /** Explicitly recorded grade. Never computed. `null` = not graded. */
  evidenceStatus: EvidenceKind | null;
  dataOrigin: DataOrigin;
  sourcePlatform: SourcePlatform | null;
  sourceType: SourceType;
  /** Non-identifying description of the source. Never an account, campaign or customer ID. */
  sourceReference: string | null;
  reportingPeriod: ReportingPeriod;
  precision: ValuePrecision;
  /** Default display format; individual placements may choose another. */
  displayFormat: MetricFormat;
  notes: string | null;
}

export interface RawMetric extends MetricBase {
  kind: 'raw';
  /** `null` = not recorded (distinct from a recorded zero). */
  value: number | null;
  formula: null;
  legacyMethodNote: null;
}

export interface CalculatedMetric extends MetricBase {
  kind: 'calculated';
  value: null;
  formula: MetricFormula;
  legacyMethodNote: null;
}

export interface LegacyFixedMetric extends MetricBase {
  kind: 'legacy_fixed';
  value: number;
  formula: null;
  /** Why the figure cannot be recalculated, and what would unlock it. */
  legacyMethodNote: string;
}

export type MetricDefinition = RawMetric | CalculatedMetric | LegacyFixedMetric;

/**
 * Wording that restates a metric in words rather than rendering it, so it
 * cannot update automatically. Recorded so a change to the metric can flag
 * the wording for review instead of silently leaving it stale.
 */
export interface LinkedPhrase {
  /** File and export where the wording lives. */
  location: string;
  phrase: string;
  metricIds: MetricId[];
  reason: string;
}
