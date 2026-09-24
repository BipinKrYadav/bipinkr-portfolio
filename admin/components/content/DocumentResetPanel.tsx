'use client';

import Link from 'next/link';
import { useState } from 'react';

import { ErrorMessage } from '@admin/components/metrics/StateMessage';
import { buttonClass, Field, inputClass } from '@admin/components/ui/Field';
import type { DocumentListRow } from '@admin/lib/content/model';
import type { DocumentDetail } from '@admin/lib/content/repository';
import type { DataError, DataResult } from '@admin/lib/metrics/errors';

/**
 * Publishing goes through Releases; the only draft-level action here is the
 * deliberate way back. "Reset draft to published" saves the published
 * revision's content as the draft: a new revision with a summary, so no
 * history is removed and nothing is published.
 */
export function DocumentResetPanel({
  detail,
  blockedReason,
  onReset,
}: {
  detail: DocumentDetail;
  blockedReason: string | null;
  onReset: (summary: string) => Promise<DataResult<DocumentListRow>>;
}) {
  const [summary, setSummary] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<DataError | null>(null);
  const canReset = detail.draftMatchesPublished === false && detail.document.published_revision_id !== null;

  async function reset() {
    setBusy(true);
    setError(null);
    const result = await onReset(summary);
    setBusy(false);
    if (result.ok) setSummary('');
    else setError(result.error);
  }

  return (
    <div className="space-y-2 border-t border-line px-3 py-2 text-xs">
      <p className="text-ink-soft">
        Draft changes reach the public site only through{' '}
        <Link href="/releases/" className="font-semibold text-accent hover:underline">
          Releases
        </Link>
        .
      </p>
      {canReset ? (
        <details>
          <summary className="cursor-pointer font-semibold text-ink-soft">Reset draft to published</summary>
          <div className="mt-2 space-y-2">
            <p className="text-ink-soft">
              Replaces the draft with the published revision&apos;s content, saved as a new revision. Earlier revisions are kept.
            </p>
            <Field id="document-reset-summary" label="Change summary" required>
              <input id="document-reset-summary" value={summary} onChange={(event) => setSummary(event.target.value)} className={inputClass} />
            </Field>
            {blockedReason ? <p className="text-ink-soft">{blockedReason}</p> : null}
            {error ? <ErrorMessage error={error} /> : null}
            <button type="button" disabled={busy || !summary.trim() || !!blockedReason} onClick={() => void reset()} className={buttonClass.secondary}>
              {busy ? 'Resetting…' : 'Reset to published'}
            </button>
          </div>
        </details>
      ) : null}
    </div>
  );
}
