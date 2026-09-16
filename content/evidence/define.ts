import type { MetricFormat } from '../../lib/metrics/format';
import type {
  CalculatedMetric,
  DataOrigin,
  LegacyFixedMetric,
  MetricFormula,
  MetricId,
  MetricUnit,
  MetricValueType,
  RawMetric,
  ReportingPeriod,
  SourcePlatform,
  SourceType,
  ValuePrecision,
} from '../../lib/metrics/types';
import type { EvidenceKind } from '../types';

/**
 * Helpers for declaring canonical metrics.
 *
 * They only fill in the fields shared by every metric from one source, so
 * each definition stays readable. The records they return are complete and
 * explicit — the same shape a future database export will hold.
 */

export interface SourceProfile {
  dataOrigin: DataOrigin;
  sourcePlatform: SourcePlatform | null;
  sourceType: SourceType;
  sourceReference: string | null;
  reportingPeriod: ReportingPeriod;
}

export const PERIOD_NOT_RECORDED: ReportingPeriod = {
  basis: 'not_recorded',
  start: null,
  end: null,
  description: 'Not recorded in the repository. To be entered from the source when the figure is next checked.',
};

export function cohortPeriod(year: number): ReportingPeriod {
  return {
    basis: 'campaign_start_year',
    start: null,
    end: null,
    description: `Campaigns started in ${year} that recorded results. Exact dates are not recorded in the repository.`,
  };
}

interface CommonInput {
  id: MetricId;
  name: string;
  description: string;
  valueType: MetricValueType;
  unit: MetricUnit;
  displayFormat: MetricFormat;
  /** Copied from the grade already published or recorded for this figure. `null` = none recorded. */
  evidenceStatus: EvidenceKind | null;
  notes?: string;
  reportingPeriod?: ReportingPeriod;
}

const common = (source: SourceProfile, input: CommonInput) => ({
  id: input.id,
  name: input.name,
  description: input.description,
  valueType: input.valueType,
  unit: input.unit,
  currency: input.valueType === 'currency' ? ('INR' as const) : null,
  evidenceStatus: input.evidenceStatus,
  dataOrigin: source.dataOrigin,
  sourcePlatform: source.sourcePlatform,
  sourceType: source.sourceType,
  sourceReference: source.sourceReference,
  reportingPeriod: input.reportingPeriod ?? source.reportingPeriod,
  displayFormat: input.displayFormat,
  notes: input.notes ?? null,
});

export function raw(
  source: SourceProfile,
  input: CommonInput & { value: number | null; precision?: ValuePrecision },
): RawMetric {
  return {
    ...common(source, input),
    kind: 'raw',
    value: input.value,
    precision: input.precision ?? 'exact',
    formula: null,
    legacyMethodNote: null,
  };
}

export function legacyFixed(
  source: SourceProfile,
  input: CommonInput & { value: number; legacyMethodNote: string; precision?: ValuePrecision },
): LegacyFixedMetric {
  return {
    ...common(source, input),
    kind: 'legacy_fixed',
    value: input.value,
    precision: input.precision ?? 'exact',
    formula: null,
    legacyMethodNote: input.legacyMethodNote,
  };
}

export function calculated(
  source: Pick<SourceProfile, 'sourcePlatform' | 'reportingPeriod'>,
  input: CommonInput & { formula: MetricFormula },
): CalculatedMetric {
  return {
    ...common(
      {
        dataOrigin: 'derived',
        sourcePlatform: source.sourcePlatform,
        sourceType: 'calculation',
        sourceReference: null,
        reportingPeriod: source.reportingPeriod,
      },
      input,
    ),
    kind: 'calculated',
    value: null,
    precision: 'exact',
    formula: input.formula,
    legacyMethodNote: null,
  };
}
