import type { MetricFormula, MetricId } from './types';

/**
 * The fixed formula engine.
 *
 * Formulas compute from unrounded inputs; rounding happens only when a value
 * is formatted for display. Any missing input, or a zero denominator, yields
 * `null` so the figure renders as "—" rather than as a false zero.
 */

type Resolve = (id: MetricId) => number | null;

const divide = (numerator: number | null, denominator: number | null): number | null =>
  numerator === null || denominator === null || denominator === 0 ? null : numerator / denominator;

function all(ids: MetricId[], resolve: Resolve): number[] | null {
  const values = ids.map(resolve);
  return values.some((value) => value === null) ? null : (values as number[]);
}

/** Every metric a formula reads, in declaration order. */
export function formulaInputs(formula: MetricFormula): MetricId[] {
  switch (formula.fn) {
    case 'ratio':
      return [formula.numerator, formula.denominator];
    case 'percent':
      return [formula.part, formula.whole];
    case 'sum':
      return formula.terms;
    case 'difference':
      return [formula.minuend, formula.subtrahend];
    case 'pct_decrease':
    case 'pct_increase':
      return [formula.from, formula.to];
    case 'multiple':
      return [formula.value, formula.base];
    case 'min':
    case 'max':
    case 'spread':
    case 'count':
      return formula.of;
  }
}

export function evaluateFormula(formula: MetricFormula, resolve: Resolve): number | null {
  switch (formula.fn) {
    case 'ratio':
      return divide(resolve(formula.numerator), resolve(formula.denominator));

    case 'percent': {
      const share = divide(resolve(formula.part), resolve(formula.whole));
      return share === null ? null : share * 100;
    }

    case 'sum': {
      const values = all(formula.terms, resolve);
      return values === null ? null : values.reduce((total, value) => total + value, 0);
    }

    case 'difference': {
      const minuend = resolve(formula.minuend);
      const subtrahend = resolve(formula.subtrahend);
      return minuend === null || subtrahend === null ? null : minuend - subtrahend;
    }

    case 'pct_decrease': {
      const from = resolve(formula.from);
      const to = resolve(formula.to);
      const change = from === null || to === null ? null : divide(from - to, from);
      return change === null ? null : change * 100;
    }

    case 'pct_increase': {
      const from = resolve(formula.from);
      const to = resolve(formula.to);
      const change = from === null || to === null ? null : divide(to - from, from);
      return change === null ? null : change * 100;
    }

    case 'multiple':
      return divide(resolve(formula.value), resolve(formula.base));

    case 'min': {
      const values = all(formula.of, resolve);
      return values === null ? null : Math.min(...values);
    }

    case 'max': {
      const values = all(formula.of, resolve);
      return values === null ? null : Math.max(...values);
    }

    case 'spread': {
      const values = all(formula.of, resolve);
      return values === null ? null : divide(Math.max(...values), Math.min(...values));
    }

    case 'count':
      // Counts the rows listed, not their values: a row whose value was not
      // recorded is still a row.
      return formula.of.length;
  }
}

/** Plain-language description of each formula, for documentation and the future admin. */
export const formulaDescriptions: Record<MetricFormula['fn'], string> = {
  ratio: 'numerator ÷ denominator (e.g. CPL = spend ÷ leads, CPC = spend ÷ clicks)',
  percent: 'part ÷ whole × 100 (e.g. CTR = clicks ÷ impressions × 100)',
  sum: 'term + term + …',
  difference: 'minuend − subtrahend',
  pct_decrease: '(from − to) ÷ from × 100',
  pct_increase: '(to − from) ÷ from × 100',
  multiple: 'value ÷ base, shown as “×”',
  min: 'smallest of the inputs',
  max: 'largest of the inputs',
  spread: 'largest ÷ smallest of the inputs',
  count: 'number of listed rows',
};
