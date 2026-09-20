'use client';

import { useCallback, useEffect, useState } from 'react';

import { buttonClass } from '@admin/components/ui/Field';
import { StatusBadge } from '@admin/components/ui/StatusBadge';
import { formatDateTime } from '@admin/lib/format-date';
import { hasSession, type FactorsResult } from '@admin/lib/auth/types';

import { useAuth } from './AuthProvider';
import { MfaEnrolment } from './MfaEnrolment';

/** The authenticator apps on the signed-in account, and a way to add another. */
export function AuthenticatorFactors() {
  const { state, client } = useAuth();
  const [result, setResult] = useState<FactorsResult | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (!hasSession(state)) {
      setResult(null);
      return;
    }
    setResult(await client.listTotpFactors());
  }, [client, state]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!hasSession(state)) {
    return <span className="text-ink-faint">Available after sign-in</span>;
  }

  // "Could not check" is never rendered as "none enrolled": the two are
  // different facts, and only one of them means a device has to be added.
  const factors = result?.ok ? result.factors : [];
  const verified = factors.filter((factor) => factor.status === 'verified');
  const unverified = factors.filter((factor) => factor.status === 'unverified');

  return (
    <div className="space-y-3">
      {result === null ? (
        <p role="status" className="text-sm text-ink-soft">
          Loading…
        </p>
      ) : !result.ok ? (
        <p role="alert" className="text-sm text-evidence-limitation">
          Could not check which authenticator apps are enrolled. {result.error}
        </p>
      ) : verified.length === 0 ? (
        <p className="text-sm text-evidence-reported">
          No authenticator app is enrolled. The database refuses sessions without a second factor.
        </p>
      ) : (
        <ul className="space-y-1 text-sm">
          {verified.map((factor) => (
            <li key={factor.id} className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-ink">{factor.friendlyName ?? 'Authenticator app'}</span>
              <StatusBadge tone="accent">Verified</StatusBadge>
              <span className="text-xs text-ink-faint">added {formatDateTime(factor.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}

      {unverified.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {unverified.map((factor) => (
            <li key={factor.id} className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-ink">{factor.friendlyName ?? 'Authenticator app'}</span>
              <StatusBadge tone="warning">Unfinished enrolment</StatusBadge>
              <span className="text-xs text-ink-faint">
                started {formatDateTime(factor.createdAt)} — it grants no access until a code confirms it
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {result?.ok && verified.length === 1 ? (
        <p className="text-xs text-evidence-reported">
          Only one device is enrolled. Add a second one, so losing this device does not lock you out.
        </p>
      ) : null}

      {adding ? (
        <MfaEnrolment
          defaultName={verified.length === 0 ? 'Authenticator app' : 'Backup device'}
          onEnrolled={() => {
            setAdding(false);
            void load();
          }}
        />
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={buttonClass.secondary}>
          Add an authenticator app
        </button>
      )}
    </div>
  );
}
