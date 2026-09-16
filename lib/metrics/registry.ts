import { linkedPhrases } from '../../content/evidence/linked-phrases';
import { metricDefinitions } from '../../content/evidence/metrics';
import { evaluateFormula, formulaInputs } from './formulas';
import type { MetricDefinition, MetricId } from './types';

/**
 * The resolved registry.
 *
 * Built once per build, validated on load. Any structural problem — a
 * duplicate id, a formula pointing at a metric that does not exist, a
 * circular formula, a legacy figure with no explanation — throws, which fails
 * the build rather than shipping a page with a wrong or missing number.
 */

const ID_PATTERN = /^[a-z0-9_]+(\.[a-z0-9_]+){1,5}$/;

function buildIndex(definitions: readonly MetricDefinition[]): Map<MetricId, MetricDefinition> {
  const index = new Map<MetricId, MetricDefinition>();
  const problems: string[] = [];

  for (const metric of definitions) {
    if (!ID_PATTERN.test(metric.id)) problems.push(`${metric.id}: id must be <dataset>.<entity>.<measure> in lower_snake_case`);
    if (index.has(metric.id)) problems.push(`${metric.id}: duplicate id`);
    index.set(metric.id, metric);

    if (!metric.name.trim() || !metric.description.trim()) problems.push(`${metric.id}: name and description are required`);
    if ((metric.valueType === 'currency') !== (metric.currency === 'INR')) {
      problems.push(`${metric.id}: currency must be set exactly when valueType is currency`);
    }

    // The types already encode these rules, but the registry will later be
    // loaded from data the compiler never sees, so they are checked at runtime
    // against an untyped view of the record.
    const record = metric as unknown as Record<string, unknown>;
    const id = String(record.id);
    switch (record.kind) {
      case 'raw':
        if (record.formula !== null || record.legacyMethodNote !== null) problems.push(`${id}: raw metrics carry a value only`);
        if (record.value !== null && typeof record.value !== 'number') problems.push(`${id}: value must be a number or null`);
        break;
      case 'calculated':
        if (record.value !== null || record.formula === null) problems.push(`${id}: calculated metrics carry a formula and no value`);
        if (record.dataOrigin !== 'derived' || record.sourceType !== 'calculation') problems.push(`${id}: calculated metrics must be derived by calculation`);
        break;
      case 'legacy_fixed':
        if (typeof record.value !== 'number' || typeof record.legacyMethodNote !== 'string' || !record.legacyMethodNote.trim()) {
          problems.push(`${id}: legacy figures need a numeric value and a method note`);
        }
        break;
      default:
        problems.push(`${id}: unknown kind ${String(record.kind)}`);
    }
  }

  for (const metric of definitions) {
    if (metric.kind !== 'calculated') continue;
    const inputs = formulaInputs(metric.formula);
    if (inputs.length === 0) problems.push(`${metric.id}: formula has no inputs`);
    for (const input of inputs) {
      if (!index.has(input)) problems.push(`${metric.id}: formula input ${input} does not exist`);
      if (input === metric.id) problems.push(`${metric.id}: formula reads itself`);
    }
  }

  // Circular formulas.
  const state = new Map<MetricId, 'visiting' | 'done'>();
  const visit = (id: MetricId, path: MetricId[]) => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'visiting') {
      problems.push(`circular formula: ${[...path, id].join(' → ')}`);
      return;
    }
    state.set(id, 'visiting');
    const metric = index.get(id);
    if (metric?.kind === 'calculated') {
      for (const input of formulaInputs(metric.formula)) {
        if (index.has(input)) visit(input, [...path, id]);
      }
    }
    state.set(id, 'done');
  };
  for (const id of index.keys()) visit(id, []);

  for (const phrase of linkedPhrases) {
    for (const id of phrase.metricIds) {
      if (!index.has(id)) problems.push(`linked phrase "${phrase.phrase}" (${phrase.location}) references unknown metric ${id}`);
    }
  }

  if (problems.length > 0) {
    throw new Error(`Metric registry is invalid:\n  - ${problems.join('\n  - ')}`);
  }

  return index;
}

const index = buildIndex(metricDefinitions);
const valueCache = new Map<MetricId, number | null>();

export function getMetric(id: MetricId): MetricDefinition {
  const metric = index.get(id);
  if (!metric) throw new Error(`Unknown metric id: ${id}`);
  return metric;
}

/** The metric's numeric value: stored for raw and legacy figures, computed for calculated ones. */
export function metricValue(id: MetricId): number | null {
  if (valueCache.has(id)) return valueCache.get(id) ?? null;
  const metric = getMetric(id);
  const value =
    metric.kind === 'calculated' ? evaluateFormula(metric.formula, metricValue) : metric.value;
  valueCache.set(id, value);
  return value;
}

export function allMetrics(): readonly MetricDefinition[] {
  return metricDefinitions;
}

/** Metrics whose formula reads the given metric directly. */
export function directDependents(id: MetricId): MetricId[] {
  return metricDefinitions
    .filter((metric) => metric.kind === 'calculated' && formulaInputs(metric.formula).includes(id))
    .map((metric) => metric.id);
}
