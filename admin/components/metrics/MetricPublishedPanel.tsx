'use client';

import Link from 'next/link';
import { useState } from 'react';

import { Surface } from '@admin/components/ui/Panel';
import { buttonClass, Field, inputClass } from '@admin/components/ui/Field';
import type { DataError, DataResult } from '@admin/lib/metrics/errors';
import { humanise, type MetricRow } from '@admin/lib/metrics/model';
import type { MetricDetail } from '@admin/lib/metrics/repository';

import { PublishedStateBadge, publishedStateLabels } from './MetricBadges';
import { ErrorMessage } from './StateMessage';

/**
 * Draft vs published for one metric, and the deliberate way back: "Reset to
 * published" saves the published values as a new draft version (with a
 * summary). It removes no history and publishes nothing.
 */
export function MetricPublishedPanel({
  detail,
  blockedReason,
  onReset,
}: {
  detail: MetricDetail;
  blockedReason: string | null;
  onReset: (summary: string) => Promise<DataResult<MetricRow>>;
}) {
  const { published, publishedSource, publishedMetric } = detail;
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<DataError | null>(null);
  const canReset = published.state === 'differs' && publishedMetric !== null && !detail.metric.archived_at;

  async function reset() {
    setBusy(true);
    setError(null);
    const result = await onReset(summary);
    setBusy(false);
    if (result.ok) setSummary('');
    else setError(result.error);
  }

  return (
    <Surface className="space-y-2 p-3 text-sm">
      <PublishedStateBadge state={published} />
      <p className="text-ink-soft">{publishedStateLabels[published.state].description}</p>
      {published.state === 'differs' ? (
        <p className="text-ink">
          <span className="text-ink-soft">Differs in: </span>
          {published.fields.map(humanise).join(', ')}
        </p>
      ) : null}
      <p className="text-xs text-ink-faint">
        {publishedSource.kind === 'release' ? (
          <>
            Compared with{' '}
            <Link href={`/releases/detail/?id=${publishedSource.releaseId}`} className="text-accent hover:underline">
              release {publishedSource.releaseId}
            </Link>
            , the published release.
          </>
        ) : (
          'No release is recorded as published yet; compared with the snapshot this admin build was made from.'
        )}{' '}
        Drafts reach the site only through{' '}
        <Link href="/releases/" className="text-accent hover:underline">
          Releases
        </Link>
        .
      </p>

      {canReset ? (
        <details className="border-t border-line pt-2">
          <summary className="cursor-pointer text-xs font-semibold text-ink-soft">Reset draft to published</summary>
          <div className="mt-2 space-y-2">
            <p className="text-xs text-ink-soft">
              Writes the published name, description, figure, source and reporting period back into the draft as a new
              version. The evidence status, verification record and admin-only notes are not changed.
            </p>
            <Field id="metric-reset-summary" label="Change summary" required>
              <input id="metric-reset-summary" value={summary} onChange={(event) => setSummary(event.target.value)} className={inputClass} />
            </Field>
            {blockedReason ? <p className="text-xs text-ink-soft">{blockedReason}</p> : null}
            {error ? <ErrorMessage error={error} /> : null}
            <button type="button" disabled={busy || !summary.trim() || !!blockedReason} onClick={() => void reset()} className={buttonClass.secondary}>
              {busy ? 'Resetting…' : 'Reset to published'}
            </button>
          </div>
        </details>
      ) : null}
    </Surface>
  );
}
