'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';

import { Notice } from '@admin/components/ui/Notice';

import { useAuth } from './AuthProvider';

const inputClass =
  'mt-1 block w-full rounded-md border border-line-strong bg-paper-raised px-3 py-2 text-sm text-ink placeholder:text-ink-faint disabled:cursor-not-allowed disabled:bg-paper-sunk disabled:text-ink-faint';

/**
 * Two-step sign-in (password, then authenticator code). The form submits only
 * to the auth client, and is disabled whenever sign-in is not possible.
 */
export function LoginPanel() {
  const { state, client } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const needsCode = state.status === 'mfa_required';
  const canSubmit = state.status === 'signed_out' || needsCode;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;

    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    const result = needsCode
      ? await client.verifyTotp(String(form.get('code') ?? ''))
      : await client.signInWithPassword(String(form.get('email') ?? ''), String(form.get('password') ?? ''));
    setPending(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <div className="space-y-5">
      <StateNotice />

      <form onSubmit={handleSubmit} noValidate aria-describedby={error ? 'login-error' : undefined}>
        <fieldset disabled={!canSubmit || pending} className="space-y-4">
          <legend className="sr-only">{needsCode ? 'Authenticator code' : 'Email and password'}</legend>

          {needsCode ? (
            <div>
              <label htmlFor="code" className="text-sm font-medium text-ink">
                Authenticator code
              </label>
              <input
                id="code"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                className={inputClass}
              />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="email" className="text-sm font-medium text-ink">
                  Email
                </label>
                <input id="email" name="email" type="email" autoComplete="username" required className={inputClass} />
              </div>
              <div>
                <label htmlFor="password" className="text-sm font-medium text-ink">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className={inputClass}
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-ink px-4 py-2.5 text-sm font-semibold text-ink-inverse hover:bg-night-raised disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-ink-soft"
          >
            {pending ? 'Checking…' : needsCode ? 'Verify code' : 'Sign in'}
          </button>
        </fieldset>

        {error ? (
          <p id="login-error" role="alert" className="mt-3 text-sm text-evidence-limitation">
            {error}
          </p>
        ) : null}
      </form>

      <p className="text-xs leading-relaxed text-ink-faint">
        Access requires an allow-listed admin account and a code from an authenticator app. Sessions without the
        second factor are refused by the database.
      </p>
    </div>
  );
}

function StateNotice() {
  const { state } = useAuth();

  switch (state.status) {
    case 'loading':
      return (
        <p role="status" className="text-sm text-ink-soft">
          Checking authentication…
        </p>
      );
    case 'unconfigured':
      return (
        <Notice tone="warning" title="Authentication not configured">
          {state.reason} Sign-in is disabled: no account can sign in to this build.{' '}
          <Link href="/" className="font-semibold underline underline-offset-2">
            View the interface preview
          </Link>
          .
        </Notice>
      );
    case 'misconfigured':
      return (
        <Notice tone="danger" title="Authentication misconfigured">
          {state.reason}
        </Notice>
      );
    case 'not_authorised':
      return (
        <Notice tone="danger" title="Not authorised">
          {state.identity.email} is not an admin.
        </Notice>
      );
    case 'authenticated':
      return (
        <Notice tone="info" title="Signed in">
          Signed in as {state.identity.email}.{' '}
          <Link href="/" className="font-semibold underline underline-offset-2">
            Open the dashboard
          </Link>
          .
        </Notice>
      );
    case 'signed_out':
    case 'mfa_required':
      return null;
  }
}
