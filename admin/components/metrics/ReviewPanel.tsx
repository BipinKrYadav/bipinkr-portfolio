'use client';

import { useState, type FormEvent } from 'react';

import { buttonClass, Field, inputClass } from '@admin/components/ui/Field';
import { formatDateTime } from '@admin/lib/format-date';
import { verificationStateLabels, verificationStateOf } from '@admin/lib/metrics/changes';
import type { DataResult } from '@admin/lib/metrics/errors';
import {
  EVIDENCE_STATUSES,
  evidenceStatusLabels,
  humanise,
  type EvidenceStatus,
  type MetricRow,
  type MetricVerificationRow,
} from '@admin/lib/metrics/model';
import { displayValue } from '@admin/lib/metrics/values';

import { EvidenceStatusBadge, VerificationBadge } from './MetricBadges';
import { ErrorMessage, SuccessMessage } from './StateMessage';

/**
 * The separate review actions. Evidence status and verification change only
 * through the database functions set_metric_evidence_status and
 * confirm_metric_verification, each with a written reason or note.
 */
export function ReviewPanel({
  metric,
  verification,
  currentValue,
  blockedReason,
  actorLabel,
  onSetStatus,
  onConfirm,
}: {
  metric: MetricRow;
  /** State computed by the database, including changes to formula inputs. */
  verification: MetricVerificationRow | null;
  currentValue: number | null;
  /** Why review actions are unavailable right now, if they are. */
  blockedReason: string | null;
  actorLabel: (userId: string | null) => string;
  onSetStatus: (status: EvidenceStatus, reason: string) => Promise<DataResult<MetricRow>>;
  onConfirm: (note: string) => Promise<DataResult<MetricRow>>;
}) {
  const state = verificationStateOf(verification);
  const staleInputs = verification?.stale_inputs ?? [];

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-[9rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
        <dt className="text-ink-soft">Evidence status</dt>
        <dd>
          <EvidenceStatusBadge status={metric.evidence_status} />
        </dd>
        <dt className="text-ink-soft">Verification</dt>
        <dd>
          <VerificationBadge state={state} />
          <p className="mt-1 text-xs text-ink-soft">{verificationStateLabels[state].description}</p>
        </dd>
        {metric.verified_at ? (
          <>
            <dt className="text-ink-soft">Last source check</dt>
            <dd>
              {formatDateTime(metric.verified_at)} by {actorLabel(metric.verified_by)}
              {metric.verification_source ? <span className="text-ink-faint"> ({humanise(metric.verification_source)})</span> : null}
            </dd>
            <dt className="text-ink-soft">Value when checked</dt>
            <dd>{displayValue(metric, metric.verified_value)}</dd>
            <dt className="text-ink-soft">Status when checked</dt>
            <dd>{metric.verified_status ? evidenceStatusLabels[metric.verified_status] : 'Not graded'}</dd>
          </>
        ) : null}
      </dl>

      {state === 'changed_since_verification' ? (
        <p className="rounded-md border border-[#E2D3B0] bg-[#F8F2E4] px-3 py-2 text-xs text-evidence-reported">
          The previous verification may no longer represent the current value ({displayValue(metric, currentValue)}).
          Check the source again before confirming.
          {staleInputs.length > 0 ? (
            <>
              {' '}Changed since the check:{' '}
              {staleInputs.map((key, index) => (
                <span key={key}>
                  {index > 0 ? ', ' : ''}
                  <code>{key}</code>
                </span>
              ))}
              .
            </>
          ) : null}
        </p>
      ) : null}

      {blockedReason ? (
        <p className="text-xs text-ink-soft" role="status">
          {blockedReason}
        </p>
      ) : (
        <>
          <StatusForm metric={metric} onSetStatus={onSetStatus} />
          <ConfirmForm metric={metric} currentValue={currentValue} onConfirm={onConfirm} />
        </>
      )}
    </div>
  );
}

function StatusForm({
  metric,
  onSetStatus,
}: {
  metric: MetricRow;
  onSetStatus: (status: EvidenceStatus, reason: string) => Promise<DataResult<MetricRow>>;
}) {
  const [status, setStatus] = useState<EvidenceStatus>(metric.evidence_status ?? 'documented');
  const [reason, setReason] = useState('');
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<DataResult<MetricRow> | null>(null);

  const unchanged = status === metric.evidence_status;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (unchanged || !reason.trim()) return;
    setPending(true);
    const outcome = await onSetStatus(status, reason);
    setPending(false);
    setResult(outcome);
    if (outcome.ok) setReason('');
  }

  return (
    <details className="rounded-card border border-line bg-paper">
      <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">Change evidence status</summary>
      <form onSubmit={submit} className="space-y-3 border-t border-line p-3" noValidate>
        <Field id="review-status" label="New evidence status">
          <select id="review-status" value={status} onChange={(event) => setStatus(event.target.value as EvidenceStatus)} className={inputClass}>
            {EVIDENCE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {evidenceStatusLabels[value]}
              </option>
            ))}
          </select>
        </Field>
        <Field id="review-status-reason" label="Reason" required hint="What in the evidence supports this grade.">
          <textarea id="review-status-reason" rows={2} value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass} />
        </Field>
        {result?.ok ? <SuccessMessage title="Evidence status updated" /> : null}
        {result && !result.ok ? <ErrorMessage error={result.error} /> : null}
        <button type="submit" disabled={pending || unchanged || !reason.trim()} className={buttonClass.primary}>
          {pending ? 'Saving…' : 'Set evidence status'}
        </button>
      </form>
    </details>
  );
}

function ConfirmForm({
  metric,
  currentValue,
  onConfirm,
}: {
  metric: MetricRow;
  currentValue: number | null;
  onConfirm: (note: string) => Promise<DataResult<MetricRow>>;
}) {
  const [note, setNote] = useState('');
  const [checked, setChecked] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<DataResult<MetricRow> | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!checked || !note.trim()) return;
    setPending(true);
    const outcome = await onConfirm(note);
    setPending(false);
    setResult(outcome);
    if (outcome.ok) {
      setNote('');
      setChecked(false);
    }
  }

  return (
    <details className="rounded-card border border-line bg-paper">
      <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">Confirm source check</summary>
      <form onSubmit={submit} className="space-y-3 border-t border-line p-3" noValidate>
        <p className="text-xs text-ink-soft">
          Records that you checked the current value and evidence status against the original source. The value and
          status at this moment are stored with your note.
        </p>
        <Field id="review-note" label="Source check note" required hint="Where you checked, e.g. which report, view and column.">
          <textarea id="review-note" rows={2} value={note} onChange={(event) => setNote(event.target.value)} className={inputClass} />
        </Field>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} className="mt-0.5" />
          <span>
            I checked {metric.kind === 'calculated' ? 'the calculated value' : 'the value'}{' '}
            <strong>{displayValue(metric, currentValue)}</strong> against its source.
          </span>
        </label>
        {result?.ok ? <SuccessMessage title="Verification recorded" /> : null}
        {result && !result.ok ? <ErrorMessage error={result.error} /> : null}
        <button type="submit" disabled={pending || !checked || !note.trim()} className={buttonClass.primary}>
          {pending ? 'Saving…' : 'Confirm verification'}
        </button>
      </form>
    </details>
  );
}
