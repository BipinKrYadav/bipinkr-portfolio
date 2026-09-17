'use client';

import { Plus, X } from 'lucide-react';

import { buttonClass, inputClass } from '@admin/components/ui/Field';
import {
  emptyFormula,
  FORMULA_FUNCTIONS,
  FORMULA_SLOTS,
  formulaDescriptions,
  isFormulaFunction,
  type FormulaIssue,
} from '@admin/lib/metrics/formula';
import type { MetricRow } from '@admin/lib/metrics/model';

/**
 * Structured editor for the fixed formula list: choose a function, then pick
 * each input from the existing metrics. No free-form expressions.
 */
export function FormulaEditor({
  value,
  onChange,
  selfKey,
  metrics,
  issues,
  disabled,
}: {
  value: unknown;
  onChange: (formula: Record<string, unknown>) => void;
  selfKey: string;
  metrics: readonly MetricRow[];
  issues: readonly FormulaIssue[];
  disabled?: boolean;
}) {
  const record = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  const fn = isFormulaFunction(record.fn) ? record.fn : null;

  const options = metrics
    .filter((metric) => metric.metric_key !== selfKey && !metric.archived_at)
    .map((metric) => metric.metric_key)
    .sort();

  const keyOptions = (current: string) => (
    <>
      <option value="">Choose a metric…</option>
      {current && !options.includes(current) ? <option value={current}>{current} (unavailable)</option> : null}
      {options.map((key) => (
        <option key={key} value={key}>
          {key}
        </option>
      ))}
    </>
  );

  const set = (name: string, input: unknown) => onChange({ ...record, [name]: input });

  return (
    <fieldset className="space-y-3 rounded-card border border-line bg-paper p-3" disabled={disabled}>
      <legend className="px-1 text-xs font-semibold text-ink-soft">Formula</legend>

      <div>
        <label htmlFor="formula-fn" className="mb-1 block text-xs font-semibold text-ink-soft">
          Calculation
        </label>
        <select
          id="formula-fn"
          value={fn ?? ''}
          onChange={(event) => onChange(emptyFormula(event.target.value as (typeof FORMULA_FUNCTIONS)[number]))}
          className={inputClass}
          aria-describedby="formula-fn-hint"
        >
          {fn ? null : <option value="">Choose a calculation…</option>}
          {FORMULA_FUNCTIONS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <p id="formula-fn-hint" className="mt-1 text-xs text-ink-faint">
          {fn ? formulaDescriptions[fn] : 'Only the fixed list of calculations is supported.'}
        </p>
      </div>

      {fn
        ? FORMULA_SLOTS[fn].map((slot) => {
            if (!slot.list) {
              const current = typeof record[slot.name] === 'string' ? (record[slot.name] as string) : '';
              return (
                <div key={slot.name}>
                  <label htmlFor={`formula-${slot.name}`} className="mb-1 block text-xs font-semibold text-ink-soft">
                    {slot.label}
                  </label>
                  <select
                    id={`formula-${slot.name}`}
                    value={current}
                    onChange={(event) => set(slot.name, event.target.value)}
                    className={`${inputClass} font-mono text-xs`}
                  >
                    {keyOptions(current)}
                  </select>
                </div>
              );
            }

            const items = Array.isArray(record[slot.name]) ? (record[slot.name] as string[]) : [];
            return (
              <div key={slot.name} role="group" aria-labelledby={`formula-${slot.name}-label`}>
                <p id={`formula-${slot.name}-label`} className="mb-1 text-xs font-semibold text-ink-soft">
                  {slot.label}
                </p>
                <ul className="space-y-1.5">
                  {items.map((item, index) => (
                    <li key={index} className="flex gap-1.5">
                      <select
                        aria-label={`${slot.label} ${index + 1}`}
                        value={item}
                        onChange={(event) => set(slot.name, items.map((old, i) => (i === index ? event.target.value : old)))}
                        className={`${inputClass} font-mono text-xs`}
                      >
                        {keyOptions(item)}
                      </select>
                      <button
                        type="button"
                        onClick={() => set(slot.name, items.filter((_, i) => i !== index))}
                        className={`${buttonClass.secondary} px-2`}
                      >
                        <X aria-hidden="true" className="h-4 w-4" />
                        <span className="sr-only">Remove {slot.label.toLowerCase()} {index + 1}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => set(slot.name, [...items, ''])} className={`${buttonClass.secondary} mt-1.5 py-1.5 text-xs`}>
                  <Plus aria-hidden="true" className="h-3.5 w-3.5" />
                  Add input
                </button>
              </div>
            );
          })
        : null}

      {issues.length > 0 ? (
        <ul role="alert" className="list-disc space-y-0.5 pl-5 text-xs text-evidence-limitation">
          {issues.map((issue) => (
            <li key={issue.message}>{issue.message}</li>
          ))}
        </ul>
      ) : null}
    </fieldset>
  );
}
