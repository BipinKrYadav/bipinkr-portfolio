import { formulaDescriptions, formulaInputs } from '../../../lib/metrics/formulas';
import type { MetricFormula } from '../../../lib/metrics/types';

/**
 * Formula handling for the editor. The supported functions are the site's
 * fixed formula engine (lib/metrics/formulas.ts); there is no expression
 * language. These checks give immediate feedback — the database repeats every
 * one of them and remains the authority.
 */

export type FormulaFunction = MetricFormula['fn'];

export const FORMULA_FUNCTIONS = Object.keys(formulaDescriptions) as FormulaFunction[];
export { formulaDescriptions };

export interface FormulaSlot {
  name: string;
  label: string;
  /** A list of inputs rather than a single one. */
  list: boolean;
}

const single = (name: string, label: string): FormulaSlot => ({ name, label, list: false });
const many = (name: string, label: string): FormulaSlot => ({ name, label, list: true });

export const FORMULA_SLOTS: Record<FormulaFunction, readonly FormulaSlot[]> = {
  ratio: [single('numerator', 'Numerator'), single('denominator', 'Denominator')],
  percent: [single('part', 'Part'), single('whole', 'Whole')],
  sum: [many('terms', 'Terms')],
  difference: [single('minuend', 'Minuend'), single('subtrahend', 'Subtrahend')],
  pct_decrease: [single('from', 'From'), single('to', 'To')],
  pct_increase: [single('from', 'From'), single('to', 'To')],
  multiple: [single('value', 'Value'), single('base', 'Base')],
  min: [many('of', 'Inputs')],
  max: [many('of', 'Inputs')],
  spread: [many('of', 'Inputs')],
  count: [many('of', 'Rows')],
};

const METRIC_KEY = /^[a-z0-9_]+(\.[a-z0-9_]+){1,5}$/;

export function isFormulaFunction(value: unknown): value is FormulaFunction {
  return typeof value === 'string' && (FORMULA_FUNCTIONS as string[]).includes(value);
}

/** A formula with the right slots for `fn` and no inputs chosen yet. */
export function emptyFormula(fn: FormulaFunction): Record<string, unknown> {
  const formula: Record<string, unknown> = { fn };
  for (const slot of FORMULA_SLOTS[fn]) formula[slot.name] = slot.list ? [] : '';
  return formula;
}

export type FormulaIssueCode =
  | 'unsupported'
  | 'malformed'
  | 'missing_input'
  | 'unknown_input'
  | 'archived_input'
  | 'self_reference'
  | 'cycle';

export interface FormulaIssue {
  code: FormulaIssueCode;
  message: string;
}

/** Returns the formula if it has exactly the shape of a supported function, else null. */
export function parseFormula(value: unknown): MetricFormula | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (!isFormulaFunction(record.fn)) return null;

  const slots = FORMULA_SLOTS[record.fn];
  const expectedKeys = ['fn', ...slots.map((slot) => slot.name)].sort();
  if (JSON.stringify(Object.keys(record).sort()) !== JSON.stringify(expectedKeys)) return null;

  for (const slot of slots) {
    const input = record[slot.name];
    if (slot.list) {
      if (!Array.isArray(input) || input.length === 0 || !input.every((key) => typeof key === 'string' && METRIC_KEY.test(key))) {
        return null;
      }
    } else if (typeof input !== 'string' || !METRIC_KEY.test(input)) {
      return null;
    }
  }
  return value as MetricFormula;
}

export interface FormulaContextMetric {
  metric_key: string;
  formula: unknown;
  archived_at: string | null;
}

/**
 * Checks a proposed formula for `selfKey` against the other metrics: supported
 * function, every input present, inputs exist and are active, no
 * self-reference, no circular dependency.
 */
export function validateFormula(
  value: unknown,
  selfKey: string,
  metrics: ReadonlyMap<string, FormulaContextMetric>,
): FormulaIssue[] {
  if (typeof value !== 'object' || value === null || !isFormulaFunction((value as { fn?: unknown }).fn)) {
    return [{ code: 'unsupported', message: 'Choose one of the supported calculations.' }];
  }

  const record = value as Record<string, unknown>;
  const fn = record.fn as FormulaFunction;
  const issues: FormulaIssue[] = [];

  for (const slot of FORMULA_SLOTS[fn]) {
    const input = record[slot.name];
    if (slot.list) {
      if (!Array.isArray(input) || input.length === 0) {
        issues.push({ code: 'missing_input', message: `${slot.label}: add at least one input.` });
      } else if (input.some((key) => !key)) {
        issues.push({ code: 'missing_input', message: `${slot.label}: choose a metric for every input, or remove the empty one.` });
      }
    } else if (!input) {
      issues.push({ code: 'missing_input', message: `${slot.label} is required.` });
    }
  }
  if (issues.length > 0) return issues;

  const formula = parseFormula(value);
  if (!formula) {
    return [{ code: 'malformed', message: 'Every input must be a metric key, with no extra fields.' }];
  }

  const inputs = formulaInputs(formula);
  if (inputs.includes(selfKey)) {
    issues.push({ code: 'self_reference', message: 'A formula cannot read its own metric.' });
  }
  for (const key of new Set(inputs)) {
    if (key === selfKey) continue;
    const input = metrics.get(key);
    if (!input) issues.push({ code: 'unknown_input', message: `${key} does not exist.` });
    else if (input.archived_at) issues.push({ code: 'archived_input', message: `${key} is archived.` });
  }
  if (issues.length > 0) return issues;

  if (readsMetric(inputs, selfKey, metrics)) {
    issues.push({ code: 'cycle', message: 'This formula would create a circular dependency.' });
  }
  return issues;
}

/** True if following formulas from `start` ever reaches `target`. */
function readsMetric(start: readonly string[], target: string, metrics: ReadonlyMap<string, FormulaContextMetric>): boolean {
  const seen = new Set<string>();
  const queue = [...start];
  while (queue.length > 0) {
    const key = queue.shift() as string;
    if (key === target) return true;
    if (seen.has(key)) continue;
    seen.add(key);
    const formula = parseFormula(metrics.get(key)?.formula);
    if (formula) queue.push(...formulaInputs(formula));
  }
  return false;
}

/** One-line description, e.g. "ratio(numerator: a.b.c, denominator: a.b.d)". */
export function describeFormula(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const formula = parseFormula(value);
  if (!formula) return 'Unsupported formula';
  const record = formula as unknown as Record<string, unknown>;
  const parts = FORMULA_SLOTS[formula.fn].map((slot) => {
    const input = record[slot.name];
    return `${slot.name}: ${Array.isArray(input) ? `[${input.join(', ')}]` : String(input)}`;
  });
  return `${formula.fn}(${parts.join(', ')})`;
}

/** Metrics that read `key` in their formula (active metrics only). */
export function dependentMetrics(key: string, metrics: Iterable<FormulaContextMetric>): string[] {
  const dependents: string[] = [];
  for (const metric of metrics) {
    if (metric.archived_at || metric.metric_key === key) continue;
    const formula = parseFormula(metric.formula);
    if (formula && formulaInputs(formula).includes(key)) dependents.push(metric.metric_key);
  }
  return dependents.sort();
}
