'use client';

import { StatusBadge } from '@admin/components/ui/StatusBadge';

import { useAuth } from './AuthProvider';

/**
 * The email of the account that is signed in right now, read from live auth
 * state. Nothing here is hardcoded: an empty or absent session says so.
 */
export function SignedInAccount() {
  const { state } = useAuth();

  switch (state.status) {
    case 'loading':
      return (
        <span role="status" className="text-ink-soft">
          Checking…
        </span>
      );
    case 'mfa_setup_required':
    case 'mfa_required':
    case 'not_authorised':
    case 'authenticated':
      return state.identity.email ? (
        <span className="[overflow-wrap:anywhere]">{state.identity.email}</span>
      ) : (
        <span className="text-ink-faint">Signed in (no email on this account)</span>
      );
    default:
      return <span className="text-ink-faint">No session</span>;
  }
}

/**
 * What the auth adapter is actually doing in this build, rather than a fixed
 * label: whether Supabase Auth is wired up, and whether it can be reached.
 */
export function AuthAdapterStatus() {
  const { state } = useAuth();

  switch (state.status) {
    case 'loading':
      return <StatusBadge>Starting…</StatusBadge>;
    case 'unconfigured':
      return <StatusBadge tone="warning">Supabase Auth adapter, not configured in this build</StatusBadge>;
    case 'misconfigured':
      return <StatusBadge tone="danger">Supabase Auth adapter, settings rejected</StatusBadge>;
    case 'unavailable':
      return <StatusBadge tone="danger">Supabase Auth adapter, Supabase not reachable</StatusBadge>;
    default:
      return <StatusBadge tone="accent">Supabase Auth adapter, connected</StatusBadge>;
  }
}
