'use client';

import { useState, type FormEvent } from 'react';

import { buttonClass, Field, inputClass } from '@admin/components/ui/Field';
import { formatDateTime } from '@admin/lib/format-date';
import { archiveBlockerMessages } from '@admin/lib/metrics/changes';
import type { DataResult } from '@admin/lib/metrics/errors';
import type { MetricRow } from '@admin/lib/metrics/model';
import type { MetricDetail } from '@admin/lib/metrics/repository';

import { ErrorMessage } from './StateMessage';

/** Archiving only; metrics are never deleted. The database re-checks every blocker. */
export function ArchivePanel({
  detail,
  blockedReason,
  actorLabel,
  onArchive,
}: {
  detail: MetricDetail;
  blockedReason: string | null;
  actorLabel: (userId: string | null) => string;
  onArchive: (reason: string) => Promise<DataResult<MetricRow>>;
}) {
  const { metric } = detail;
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<DataResult<MetricRow> | null>(null);

  if (metric.archived_at) {
    return (
      <p className="text-sm text-ink-soft">
        Archived {formatDateTime(metric.archived_at)} by {actorLabel(metric.archived_by)}. It stays in the database with its
        full history.
      </p>
    );
  }

  const blockers = archiveBlockerMessages(detail.blockers);

  if (blockers.length > 0) {
    return (
      <div className="space-y-2 text-sm">
        <p className="font-medium text-ink">This metric cannot be archived while it is referenced:</p>
        <ul className="list-disc space-y-0.5 pl-5 text-xs text-ink-soft">
          {blockers.map((blocker) => (
            <li key={blocker}>{blocker}</li>
          ))}
        </ul>
        <p className="text-xs text-ink-faint">Remove these references first. The database enforces the same rule.</p>
      </div>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmed) return;
    setPending(true);
    const outcome = await onArchive(reason);
    setPending(false);
    setResult(outcome);
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <p className="text-xs text-ink-soft">
        Archiving hides the metric from formulas and new references. Nothing is deleted, and its history is kept.
      </p>
      {blockedReason ? (
        <p className="text-xs text-ink-soft" role="status">
          {blockedReason}
        </p>
      ) : (
        <>
          <Field id="archive-reason" label="Reason" hint="Optional. Recorded in the version history.">
            <textarea id="archive-reason" rows={2} value={reason} onChange={(event) => setReason(event.target.value)} className={inputClass} />
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5" />
            <span>Archive {metric.metric_key}</span>
          </label>
          {result && !result.ok ? <ErrorMessage error={result.error} /> : null}
          <button type="submit" disabled={pending || !confirmed} className={buttonClass.danger}>
            {pending ? 'Archiving…' : 'Archive metric'}
          </button>
        </>
      )}
    </form>
  );
}
