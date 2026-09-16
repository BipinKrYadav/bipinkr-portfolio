import type { EvidenceKind, Metric } from '../../content/types';
import { formatValue, type FormatOptions, type MetricFormat } from './format';
import { getMetric, metricValue } from './registry';
import type { MetricId } from './types';

/**
 * Public API for rendering canonical metrics.
 *
 *   canonical metric → formatter → content → component
 *
 * Content modules never type an evidence-backed number. They ask for it by
 * id, in the format the placement needs, and every placement of the same
 * metric therefore shows the same underlying value.
 */

export { EMPTY_VALUE } from './format';
export type { FormatOptions, MetricFormat } from './format';
export { formulaDescriptions } from './formulas';
export { allMetrics, directDependents, getMetric, metricValue } from './registry';
export type * from './types';

/** A metric as display text. Missing values render as "—". */
export function fmt(id: MetricId, format?: MetricFormat, options?: FormatOptions): string {
  const metric = getMetric(id);
  return formatValue(
    metricValue(id),
    format ?? metric.displayFormat,
    metric.precision === 'lower_bound',
    options,
  );
}

/** The metric's recorded evidence grade, as the chip components expect it. */
export function evidenceOf(id: MetricId): EvidenceKind | undefined {
  return getMetric(id).evidenceStatus ?? undefined;
}

interface MetricDisplayOptions extends FormatOptions {
  format?: MetricFormat;
  note?: string;
}

/**
 * A single metric as a card, hero or grid figure.
 *
 * The evidence chip always comes from the registry — there is deliberately
 * no override — so a figure cannot carry one grade in one place and another
 * grade somewhere else.
 */
export function metric(id: MetricId, label: string, options: MetricDisplayOptions = {}): Metric {
  const { format, note, ...formatOptions } = options;
  const display: Metric = { value: fmt(id, format, formatOptions), label };
  if (note) display.note = note;
  const evidence = evidenceOf(id);
  if (evidence) display.evidence = evidence;
  return display;
}

/** A single metric as a labelled row, e.g. in a comparison panel. */
export function metricRow(term: string, id: MetricId, format?: MetricFormat) {
  return { term, value: fmt(id, format), evidence: evidenceOf(id) };
}

interface MetricPairOptions {
  /** Defaults to " → ". */
  separator?: string;
  format?: MetricFormat;
  /**
   * The chip for the combined figure. Required when the two metrics carry
   * different grades, because there is no honest default for that case.
   */
  evidence?: EvidenceKind;
}

/** Two metrics shown as one figure, e.g. "77 → 1,540" or "171 vs 0". */
export function metricPair(
  firstId: MetricId,
  secondId: MetricId,
  label: string,
  options: MetricPairOptions = {},
): Metric {
  const first = evidenceOf(firstId);
  const second = evidenceOf(secondId);

  if (!options.evidence && first !== second) {
    throw new Error(
      `metricPair(${firstId}, ${secondId}): the metrics carry different evidence grades (${first ?? 'none'} / ${second ?? 'none'}); state the combined grade explicitly.`,
    );
  }

  const display: Metric = {
    value: `${fmt(firstId, options.format)}${options.separator ?? ' → '}${fmt(secondId, options.format)}`,
    label,
  };
  const evidence = options.evidence ?? first;
  if (evidence) display.evidence = evidence;
  return display;
}
