'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Lock } from 'lucide-react';

import { buttonClass, Field, inputClass } from '@admin/components/ui/Field';
import { diffMetric, draftFromMetric, reasonRequiredFields, type MetricDraft } from '@admin/lib/metrics/changes';
import type { DataResult } from '@admin/lib/metrics/errors';
import { validateFormula } from '@admin/lib/metrics/formula';
import {
  DATA_ORIGINS,
  humanise,
  kindLabels,
  PERIOD_BASES,
  precisionLabels,
  PRECISIONS,
  SOURCE_PLATFORMS,
  sourcePlatformLabels,
  SOURCE_TYPES,
  unitLabel,
  type MetricRow,
} from '@admin/lib/metrics/model';
import type { MetricDetail } from '@admin/lib/metrics/repository';

import { FormulaEditor } from './FormulaEditor';
import { ErrorMessage } from './StateMessage';

type Nullable = 'source_platform' | 'source_reference' | 'attribution_setting' | 'reporting_period_start' | 'reporting_period_end' | 'public_note' | 'internal_note' | 'legacy_method_note';

/**
 * Edit form for the fields the backend lets an admin change. The metric key,
 * evidence status and verification record are not part of it, and the
 * structural fields (kind, value type, unit, currency, display format) are
 * shown locked (Phase 5B). Every save needs a change summary and becomes a
 * new draft version; nothing is published from here.
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
  const reasonMissing = !reason.trim();
  const formulaIssues = useMemo(
    () =>
      metric.kind === 'calculated' && 'formula' in patch
        ? validateFormula(draft.formula, metric.metric_key, new Map(metrics.map((item) => [item.metric_key, item])))
        : [],
    [draft, patch, metric.kind, metric.metric_key, metrics],
  );

  useEffect(() => onDirtyChange(changed.length > 0), [changed.length, onDirtyChange]);

  const readOnly = metric.archived_at !== null;

  const update = <K extends keyof MetricDraft>(field: K, value: MetricDraft[K]) => {
    setResult(null);
    setDraft((current) => ({ ...current, [field]: value }));
  };
  const updateNullable = (field: Nullable, value: string) => update(field, (value === '' ? null : value) as never);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (changed.length === 0 || reasonMissing || formulaIssues.length > 0) return;
    setSaving(true);
    const saved = await onSave(draft, reason);
    setSaving(false);
    setResult(saved);
    if (saved.ok) setReason('');
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

        <Group
          title="Locked fields"
          description="What the number is and how every page formats it. Fixed like the metric key: a different kind of number is a new metric."
        >
          <LockedFacts
            items={[
              ['Kind', kindLabels[metric.kind]],
              ['Value type', humanise(metric.value_type)],
              ['Unit', unitLabel(metric.unit)],
              ['Currency', metric.currency ?? 'None'],
              ['Display format', metric.display_format],
            ]}
          />
        </Group>

        <Group title="Figure">
          <Field id="metric-value" label="Value" hint={metric.kind === 'calculated' ? 'Calculated metrics store no value.' : 'Leave empty if not recorded.'}>
            <input
              id="metric-value"
              type="number"
              step="any"
              inputMode="decimal"
              value={draft.value ?? ''}
              disabled={metric.kind === 'calculated'}
              onChange={(event) => update('value', event.target.value === '' ? null : Number(event.target.value))}
              className={inputClass}
            />
          </Field>
          <Field id="metric-precision" label="Precision">
            {select('precision', PRECISIONS, (value) => precisionLabels[value as keyof typeof precisionLabels])}
          </Field>
        </Group>

        {metric.kind === 'calculated' ? (
          <FormulaEditor
            value={draft.formula}
            onChange={(formula) => update('formula', formula)}
            selfKey={metric.metric_key}
            metrics={metrics}
            issues={formulaIssues}
          />
        ) : null}
        {metric.kind === 'legacy_fixed' ? (
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
            label="Change summary"
            required
            hint="Required for every edit. Recorded with the new version in the version history."
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

          <p className="text-xs text-ink-soft">Saving creates a new draft version. It does not publish anything to the live site.</p>

          {result && !result.ok ? <ErrorMessage error={result.error} /> : null}

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={saving || changed.length === 0 || reasonMissing || formulaIssues.length > 0} className={buttonClass.primary}>
              {saving ? 'Saving…' : 'Save draft'}
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

function LockedFacts({ items }: { items: readonly [string, string][] }) {
  return (
    <dl className="grid gap-3 sm:col-span-2 sm:grid-cols-3">
      {items.map(([term, value]) => (
        <div key={term} className="min-w-0 rounded-card border border-line bg-paper-sunk px-3 py-2">
          <dt className="flex items-center gap-1 text-xs text-ink-soft">
            <Lock aria-hidden="true" className="h-3 w-3" />
            {term}
          </dt>
          <dd className="mt-0.5 text-sm text-ink [overflow-wrap:anywhere]">{value}</dd>
        </div>
      ))}
    </dl>
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
