import type { EvidenceKind, Metric } from '../../content/types';
import { evidenceToken, metricToken } from '../content/token-grammar';
import { formatValue, type FormatOptions, type MetricFormat } from './format';
import { getMetric, metricValue as resolvedValue } from './registry';
import { isTokenMode } from './render-mode';
import type { MetricId } from './types';

/**
 * Public API for rendering canonical metrics.
 *
 *   canonical metric → formatter → content → component
 *
 * Content modules never type an evidence-backed number. They ask for it by
 * id, in the format the placement needs, and every placement of the same
 * metric therefore shows the same underlying value.
 *
 * In token mode (used only by the snapshot exporter) the same calls return
 * references instead of values — see ./render-mode.ts.
 */

export { EMPTY_VALUE, METRIC_FORMATS } from './format';
export type { FormatOptions, MetricFormat } from './format';
export { formulaDescriptions } from './formulas';
export { allMetrics, directDependents, getMetric } from './registry';
export type * from './types';

/** A metric's numeric value (unrounded). */
export function metricValue(id: MetricId): number | null {
  if (isTokenMode()) {
    getMetric(id);
    return { $metricValue: id } as unknown as number | null;
  }
  return resolvedValue(id);
}

/** A metric as display text. Missing values render as "—". */
export function fmt(id: MetricId, format?: MetricFormat, options?: FormatOptions): string {
  const metric = getMetric(id);
  if (isTokenMode()) return metricToken(id, format, options);
  return formatValue(
    resolvedValue(id),
    format ?? metric.displayFormat,
    metric.precision === 'lower_bound',
    options,
  );
}

/** The metric's recorded evidence grade, as the chip components expect it. */
export function evidenceOf(id: MetricId): EvidenceKind | undefined {
  const metric = getMetric(id);
  if (isTokenMode()) return evidenceToken(id) as EvidenceKind;
  return metric.evidenceStatus ?? undefined;
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

export interface MetricPairOptions {
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
  const first = getMetric(firstId).evidenceStatus ?? undefined;
  const second = getMetric(secondId).evidenceStatus ?? undefined;

  if (!options.evidence && first !== second) {
    throw new Error(
      `metricPair(${firstId}, ${secondId}): the metrics carry different evidence grades (${first ?? 'none'} / ${second ?? 'none'}); state the combined grade explicitly.`,
    );
  }

  const value = `${fmt(firstId, options.format)}${options.separator ?? ' → '}${fmt(secondId, options.format)}`;

  if (isTokenMode()) {
    // Stored as a reference so the grade check above runs again at build time.
    const pair: Record<string, unknown> = { first: firstId, second: secondId };
    if (options.separator !== undefined) pair.separator = options.separator;
    if (options.format !== undefined) pair.format = options.format;
    if (options.evidence !== undefined) pair.evidence = options.evidence;
    return { $pair: pair, label, value } as unknown as Metric;
  }

  const display: Metric = { value, label };
  const evidence = options.evidence ?? first;
  if (evidence) display.evidence = evidence;
  return display;
}
