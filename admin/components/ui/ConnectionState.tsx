'use client';

import { useId } from 'react';

import { useBackendConnection } from '@admin/components/auth/AuthProvider';

/** Table body row describing why no records are shown. */
export function ConnectionStateRow({ colSpan, emptyMessage }: { colSpan: number; emptyMessage: string }) {
  const connection = useBackendConnection();

  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center">
        {connection.status === 'loading' ? (
          <p role="status" className="text-sm text-ink-soft">
            Loading…
          </p>
        ) : (
          <div role="status" className="mx-auto max-w-md space-y-1">
            <p className="text-sm font-semibold text-ink">No records shown</p>
            <p className="text-xs text-ink-soft">{connection.reason}</p>
            <p className="text-xs text-ink-faint">{emptyMessage}</p>
          </div>
        )}
      </td>
    </tr>
  );
}

/**
 * Summary card for a figure that comes from the backend. Shows an explicit
 * loading or "no data" state; it never displays a number it was not given.
 */
export function StatCard({ label, description }: { label: string; description: string }) {
  const connection = useBackendConnection();
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col rounded-card border border-line bg-paper-raised p-4">
      <h2 id={headingId} className="text-xs font-semibold text-ink-soft">
        {label}
      </h2>
      <p className="mt-2 text-2xl font-semibold leading-none text-line-strong" aria-hidden="true">
        —
      </p>
      <p role="status" className="mt-2 text-xs font-medium text-ink-faint">
        {connection.status === 'loading' ? 'Loading…' : 'No data: backend not connected'}
      </p>
      <p className="mt-3 border-t border-line pt-3 text-xs text-ink-soft">{description}</p>
    </section>
  );
}
