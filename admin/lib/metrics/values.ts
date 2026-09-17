import { EMPTY_VALUE, formatValue } from '../../../lib/metrics/format';
import { evaluateFormula } from '../../../lib/metrics/formulas';

import { parseFormula } from './formula';
import type { MetricRow } from './model';

type ValueSource = Pick<MetricRow, 'metric_key' | 'kind' | 'value' | 'formula'>;

/**
 * Current value of every metric: stored values as they are, calculated
 * metrics evaluated by the site's formula engine from the current inputs.
 * A missing input, zero denominator or circular reference yields null.
 */
export function resolveValues(metrics: readonly ValueSource[]): Map<string, number | null> {
  const byKey = new Map(metrics.map((metric) => [metric.metric_key, metric]));
  const resolved = new Map<string, number | null>();
  const inProgress = new Set<string>();

  const resolve = (key: string): number | null => {
    if (resolved.has(key)) return resolved.get(key) ?? null;
    const metric = byKey.get(key);
    if (!metric || inProgress.has(key)) return null;

    inProgress.add(key);
    const formula = metric.kind === 'calculated' ? parseFormula(metric.formula) : null;
    const value = metric.kind === 'calculated' ? (formula ? evaluateFormula(formula, resolve) : null) : metric.value;
    inProgress.delete(key);
    resolved.set(key, value);
    return value;
  };

  for (const metric of metrics) resolve(metric.metric_key);
  return resolved;
}

/** Formats a value the way the public site does. */
export function displayValue(metric: Pick<MetricRow, 'display_format' | 'precision'>, value: number | null): string {
  return value === null ? EMPTY_VALUE : formatValue(value, metric.display_format, metric.precision === 'lower_bound', { lowerBoundMarker: true });
}
