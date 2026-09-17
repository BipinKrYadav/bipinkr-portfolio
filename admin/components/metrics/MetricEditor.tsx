'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';

import { buttonClass, Field, inputClass } from '@admin/components/ui/Field';
import { diffMetric, draftFromMetric, reasonRequiredFields, type MetricDraft } from '@admin/lib/metrics/changes';
import type { DataResult } from '@admin/lib/metrics/errors';
import { emptyFormula, validateFormula } from '@admin/lib/metrics/formula';
import {
  DATA_ORIGINS,
  DISPLAY_FORMATS,
  humanise,
  kindLabels,
  METRIC_KINDS,
  METRIC_UNITS,
  PERIOD_BASES,
  precisionLabels,
  PRECISIONS,
  SOURCE_PLATFORMS,
  sourcePlatformLabels,
  SOURCE_TYPES,
  unitLabel,
  VALUE_TYPES,
  type MetricKind,
  type MetricRow,
} from '@admin/lib/metrics/model';
import type { MetricDetail } from '@admin/lib/metrics/repository';

import { FormulaEditor } from './FormulaEditor';
import { ErrorMessage } from './StateMessage';

type Nullable = 'currency' | 'source_platform' | 'source_reference' | 'attribution_setting' | 'reporting_period_start' | 'reporting_period_end' | 'public_note' | 'internal_note' | 'legacy_method_note';

/**
 * Edit form for the fields the backend lets an admin change. The metric key,
 * evidence status and verification record are not part of it.
 */
export function MetricEditor({
  detail,
  onSave,
  onDirtyChange,
}: {
  detail: MetricDetail;
  onSave: (draft: MetricDraft, reason: string) => Promise<DataResult<MetricRow>>;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { metric, metrics } = detail;
  const [draft, setDraft] = useState<MetricDraft>(() => draftFromMetric(metric));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<DataResult<MetricRow> | null>(null);

  useEffect(() => {
    setDraft(draftFromMetric(metric));
    setReason('');
  }, [metric]);

  const patch = useMemo(() => diffMetric(metric, draft), [metric, draft]);
  const changed = Object.keys(patch);
  const reasonFields = reasonRequiredFields(patch);
  const reasonMissing = reasonFields.length > 0 && !reason.trim();
  const formulaIssues = useMemo(
    () =>
      draft.kind === 'calculated' && 'formula' in patch
        ? validateFormula(draft.formula, metric.metric_key, new Map(metrics.map((item) => [item.metric_key, item])))
        : [],
    [draft, patch, metric.metric_key, metrics],
  );

  useEffect(() => onDirtyChange(changed.length > 0), [changed.length, onDirtyChange]);

  const readOnly = metric.archived_at !== null;

  const update = <K extends keyof MetricDraft>(field: K, value: MetricDraft[K]) => {
    setResult(null);
    setDraft((current) => ({ ...current, [field]: value }));
  };
  const updateNullable = (field: Nullable, value: string) => update(field, (value === '' ? null : value) as never);

  const changeKind = (kind: MetricKind) => {
    setResult(null);
    setDraft((current) => ({
      ...current,
      kind,
      value: kind === 'calculated' ? null : current.value,
      formula: kind === 'calculated' ? (current.formula ?? emptyFormula('ratio')) : null,
      legacy_method_note: kind === 'legacy_fixed' ? current.legacy_method_note : null,
    }));
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (changed.length === 0 || reasonMissing || formulaIssues.length > 0) return;
    setSaving(true);
    const saved = await onSave(draft, reason);
    setSaving(false);
    setResult(saved);
  }

  const select = (id: keyof MetricDraft, options: readonly string[], label: (value: string) => string, nullable = false): ReactNode => (
    <select
      id={`metric-${id}`}
      value={(draft[id] as string | null) ?? ''}
      onChange={(event) => (nullable ? updateNullable(id as Nullable, event.target.value) : update(id, event.target.value as never))}
      className={inputClass}
    >
      {nullable ? <option value="">None</option> : null}
      {options.map((option) => (
        <option key={option} value={option}>
          {label(option)}
        </option>
      ))}
    </select>
  );

  const text = (id: keyof MetricDraft, nullable: boolean, multiline = false): ReactNode => {
    const props = {
      id: `metric-${id}`,
      value: (draft[id] as string | null) ?? '',
      onChange: (event: { target: { value: string } }) =>
        nullable ? updateNullable(id as Nullable, event.target.value) : update(id, event.target.value as never),
      className: inputClass,
    };
    return multiline ? <textarea rows={3} {...props} /> : <input type={id.includes('period_start') || id.includes('period_end') ? 'date' : 'text'} {...props} />;
  };

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Edit metric" className="space-y-5">
      <fieldset disabled={readOnly || saving} className="space-y-5">
        <legend className="sr-only">Metric fields</legend>

        <Group title="Figure">
          <Field id="metric-kind" label="Kind">
            <select id="metric-kind" value={draft.kind} onChange={(event) => changeKind(event.target.value as MetricKind)} className={inputClass}>
              {METRIC_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kindLabels[kind]}
                </option>
              ))}
            </select>
          </Field>
          <Field id="metric-value" label="Value" hint={draft.kind === 'calculated' ? 'Calculated metrics store no value.' : 'Leave empty if not recorded.'}>
            <input
              id="metric-value"
              type="number"
              step="any"
              inputMode="decimal"
              value={draft.value ?? ''}
              disabled={draft.kind === 'calculated'}
              onChange={(event) => update('value', event.target.value === '' ? null : Number(event.target.value))}
              className={inputClass}
            />
          </Field>
          <Field id="metric-precision" label="Precision">
            {select('precision', PRECISIONS, (value) => precisionLabels[value as keyof typeof precisionLabels])}
          </Field>
          <Field id="metric-value_type" label="Value type">
            {select('value_type', VALUE_TYPES, humanise)}
          </Field>
          <Field id="metric-unit" label="Unit">
            {select('unit', METRIC_UNITS, unitLabel)}
          </Field>
          <Field id="metric-currency" label="Currency" hint="INR for currency values only.">
            {select('currency', ['INR'], (value) => value, true)}
          </Field>
          <Field id="metric-display_format" label="Display format">
            {select('display_format', DISPLAY_FORMATS, (value) => value)}
          </Field>
        </Group>

        {draft.kind === 'calculated' ? (
          <FormulaEditor
            value={draft.formula}
            onChange={(formula) => update('formula', formula)}
            selfKey={metric.metric_key}
            metrics={metrics}
            issues={formulaIssues}
          />
        ) : null}
        {draft.kind === 'legacy_fixed' ? (
          <Field id="metric-legacy_method_note" label="Legacy method note" hint="Why the figure cannot be recalculated, and what would unlock it.">
            {text('legacy_method_note', true, true)}
          </Field>
        ) : null}

        <Group title="Description">
          <Field id="metric-name" label="Name">
            {text('name', false)}
          </Field>
          <Field id="metric-description" label="Description" className="sm:col-span-2">
            {text('description', false, true)}
          </Field>
          <Field id="metric-public_note" label="Public note" className="sm:col-span-2">
            {text('public_note', true, true)}
          </Field>
        </Group>

        <Group title="Source" description="Source reference, attribution and internal notes are private and never published.">
          <Field id="metric-data_origin" label="Data origin">
            {select('data_origin', DATA_ORIGINS, humanise)}
          </Field>
          <Field id="metric-source_type" label="Source type">
            {select('source_type', SOURCE_TYPES, humanise)}
          </Field>
          <Field id="metric-source_platform" label="Source platform">
            {select('source_platform', SOURCE_PLATFORMS, (value) => sourcePlatformLabels[value as keyof typeof sourcePlatformLabels], true)}
          </Field>
          <Field id="metric-source_reference" label="Source reference (private)" hint="Describe the source. Never paste account, campaign or customer IDs.">
            {text('source_reference', true)}
          </Field>
          <Field id="metric-attribution_setting" label="Attribution setting (private)">
            {text('attribution_setting', true)}
          </Field>
          <Field id="metric-internal_note" label="Internal note (private)" className="sm:col-span-2">
            {text('internal_note', true, true)}
          </Field>
        </Group>

        <Group title="Reporting period">
          <Field id="metric-reporting_period_basis" label="Basis">
            {select('reporting_period_basis', PERIOD_BASES, humanise)}
          </Field>
          <Field id="metric-reporting_period_start" label="Start">
            {text('reporting_period_start', true)}
          </Field>
          <Field id="metric-reporting_period_end" label="End">
            {text('reporting_period_end', true)}
          </Field>
          <Field id="metric-reporting_period_note" label="Period note" className="sm:col-span-2">
            {text('reporting_period_note', false, true)}
          </Field>
        </Group>
      </fieldset>

      {readOnly ? (
        <p className="text-sm text-ink-soft">Archived metrics are read-only here.</p>
      ) : (
        <div className="space-y-3 rounded-card border border-line bg-paper-sunk p-3">
          <p className="text-xs text-ink-soft" role="status">
            {changed.length === 0 ? 'No unsaved changes.' : `Changed: ${changed.map(humanise).join(', ')}.`}
          </p>

          {reasonFields.length > 0 && metric.verified_at ? (
            <p className="text-xs font-medium text-evidence-reported">
              This metric has a recorded source check. After saving, that check no longer covers the current figure and
              the metric shows as changed since verification. Nothing is re-verified automatically.
            </p>
          ) : null}

          <Field
            id="metric-change-reason"
            label="Change reason"
            required={reasonFields.length > 0}
            hint={
              reasonFields.length > 0
                ? `Required because ${reasonFields.map(humanise).join(', ').toLowerCase()} changed. Recorded in the version history.`
                : 'Optional for this change. Recorded in the version history when given.'
            }
          >
            <textarea
              id="metric-change-reason"
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              aria-invalid={reasonMissing && changed.length > 0}
              aria-describedby="metric-change-reason-hint"
              className={inputClass}
              disabled={saving}
            />
          </Field>

          {result && !result.ok ? <ErrorMessage error={result.error} /> : null}

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving || changed.length === 0 || reasonMissing || formulaIssues.length > 0} className={buttonClass.primary}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              type="button"
              disabled={saving || changed.length === 0}
              onClick={() => {
                setDraft(draftFromMetric(metric));
                setReason('');
                setResult(null);
              }}
              className={buttonClass.secondary}
            >
              Discard changes
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

function Group({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-sm font-semibold text-ink">{title}</legend>
      {description ? <p className="mt-0.5 text-xs text-ink-soft">{description}</p> : null}
      <div className="mt-2 grid gap-3 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
