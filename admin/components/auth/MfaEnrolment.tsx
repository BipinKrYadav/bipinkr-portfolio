'use client';

import { useState, type FormEvent } from 'react';

import { buttonClass, Field, inputClass } from '@admin/components/ui/Field';
import { Notice } from '@admin/components/ui/Notice';
import type { TotpEnrolment } from '@admin/lib/auth/types';

import { useAuth } from './AuthProvider';

/**
 * Enrols an authenticator app (TOTP) with Supabase Auth.
 *
 * Supabase generates and keeps the secret. The QR code and secret it returns
 * are held in this component's state for as long as the form is open, shown
 * once, and dropped when enrolment finishes or is cancelled. They are never
 * written to our database, to browser storage, or to a log — the only thing
 * sent back is the six-digit code the app produces.
 *
 * On success the session becomes MFA-verified (aal2), which is what the
 * database requires before it will show an admin anything.
 */
export function MfaEnrolment({ onEnrolled, defaultName = 'Authenticator app' }: { onEnrolled?: () => void; defaultName?: string }) {
  const { client } = useAuth();
  const [enrolment, setEnrolment] = useState<TotpEnrolment | null>(null);
  const [name, setName] = useState(defaultName);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  // Nothing here ever unenrols a factor on its own: only the Cancel button
  // below does, and only for an enrolment the person abandoned. An automatic
  // cleanup once deleted a factor moments after it was verified, because the
  // effect's cleanup ran with a stale "not finished yet" value.
  // An abandoned enrolment simply stays unverified, which grants no access.

  async function start() {
    setPending(true);
    setError(null);
    const result = await client.startTotpEnrolment(name);
    setPending(false);
    if (result.ok) setEnrolment(result.enrolment);
    else setError(result.error);
  }

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrolment) return;
    const code = String(new FormData(event.currentTarget).get('enrolment-code') ?? '');
    setPending(true);
    setError(null);
    const result = await client.confirmTotpEnrolment(enrolment.factorId, code);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
    setEnrolment(null);
    onEnrolled?.();
  }

  async function cancel() {
    if (!enrolment) return;
    const factorId = enrolment.factorId;
    setEnrolment(null);
    setError(null);
    await client.cancelTotpEnrolment(factorId);
  }

  if (done) {
    return (
      <Notice tone="success" title="Authenticator enrolled">
        Your session is now verified with a second factor. Enrol a second device as well, so losing one phone does not
        lock you out.
      </Notice>
    );
  }

  if (!enrolment) {
    return (
      <div className="space-y-3">
        <Field id="factor-name" label="Name for this authenticator" hint="For example: phone, or backup phone.">
          <input id="factor-name" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} disabled={pending} />
        </Field>
        {error ? (
          <p role="alert" className="text-sm text-evidence-limitation">
            {error}
          </p>
        ) : null}
        <button type="button" onClick={start} disabled={pending || !name.trim()} className={buttonClass.primary}>
          {pending ? 'Starting…' : 'Set up authenticator app'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-soft">
        <li>Open your authenticator app and scan this code.</li>
        <li>Enter the six-digit code it shows.</li>
      </ol>

      <div className="flex flex-wrap items-start gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element -- a data URI from Supabase, not an optimisable asset */}
        <img
          src={enrolment.qrCode}
          alt="QR code for enrolling this account in your authenticator app"
          width={180}
          height={180}
          className="rounded-card border border-line bg-white p-2"
        />
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold text-ink-soft">Cannot scan? Enter this key instead</p>
          <code className="block max-w-xs rounded-md border border-line bg-paper px-2 py-1 font-mono text-xs [overflow-wrap:anywhere]">
            {enrolment.secret}
          </code>
          <p className="text-xs text-evidence-reported">
            Anyone with this key can generate your codes. Do not photograph, paste or save it anywhere; it disappears
            when you finish.
          </p>
        </div>
      </div>

      <form onSubmit={confirm} noValidate className="space-y-3">
        <Field id="enrolment-code" label="Six-digit code" required>
          <input
            id="enrolment-code"
            name="enrolment-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            className={inputClass}
            disabled={pending}
          />
        </Field>
        {error ? (
          <p role="alert" className="text-sm text-evidence-limitation">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={pending} className={buttonClass.primary}>
            {pending ? 'Verifying…' : 'Verify and enrol'}
          </button>
          <button type="button" onClick={cancel} disabled={pending} className={buttonClass.secondary}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
