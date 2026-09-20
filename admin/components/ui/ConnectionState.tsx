'use client';

import { useId } from 'react';

import { useAuth, useBackendConnection } from '@admin/components/auth/AuthProvider';
import { StatusBadge } from '@admin/components/ui/StatusBadge';

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
 * Whether the database is reachable for this session.
 *
 * No query is made for this badge. A session only becomes `authenticated`
 * after the database has answered a real RLS-protected read of
 * public.admin_users, so "Connected" here reports something already proven
 * rather than something assumed. Before sign-in nothing has been proven, and
 * the badge says so instead of guessing either way.
 */
export function DatabaseStatusBadge() {
  const { state } = useAuth();

  switch (state.status) {
    case 'loading':
      return <StatusBadge>Checking…</StatusBadge>;
    case 'authenticated':
      return <StatusBadge tone="accent">Connected</StatusBadge>;
    case 'not_authorised':
      return <StatusBadge tone="danger">Connected, but this account is not an admin</StatusBadge>;
    case 'unavailable':
      return <StatusBadge tone="danger">Could not be reached</StatusBadge>;
    case 'unconfigured':
      return <StatusBadge tone="warning">Not configured in this build</StatusBadge>;
    case 'misconfigured':
      return <StatusBadge tone="danger">Settings rejected</StatusBadge>;
    default:
      return <StatusBadge>Checked after sign-in</StatusBadge>;
  }
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
      {/* The reason is the one the connection itself gives, as the table rows do:
          "not built yet" and "cannot be reached" must not read the same. */}
      <p role="status" className="mt-2 text-xs font-medium text-ink-faint">
        {connection.status === 'loading' ? 'Loading…' : connection.reason}
      </p>
      <p className="mt-3 border-t border-line pt-3 text-xs text-ink-soft">{description}</p>
    </section>
  );
}
