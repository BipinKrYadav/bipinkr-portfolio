'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';

import { buttonClass, inputClass } from '@admin/components/ui/Field';
import { Notice } from '@admin/components/ui/Notice';
import { loginRedirect } from '@admin/lib/auth/access';

import { useAuth } from './AuthProvider';
import { MfaEnrolment } from './MfaEnrolment';
import { SignOutButton } from './SignOutButton';

/**
 * Two-step sign-in: email and password, then the authenticator code. The form
 * only ever calls the auth client, and is disabled whenever sign-in is not
 * possible. Errors are deliberately generic, so they cannot be used to find
 * out which email addresses exist.
 */
export function LoginPanel() {
  const { state, client } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const destination = loginRedirect(state);
  useEffect(() => {
    if (destination) router.replace(destination);
  }, [destination, router]);

  const needsCode = state.status === 'mfa_required';
  const needsEnrolment = state.status === 'mfa_setup_required';
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

      {needsEnrolment ? (
        <>
          <MfaEnrolment />
          <SignOutButton variant="button" />
          <p className="text-xs leading-relaxed text-ink-faint">
            Supabase holds the secret for your authenticator app. It is shown once here and stored nowhere else.
          </p>
        </>
      ) : (
        <>
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
                className={`${inputClass} mt-1`}
              />
            </div>
          ) : (
            <>
              <div>
                <label htmlFor="email" className="text-sm font-medium text-ink">
                  Email
                </label>
                <input id="email" name="email" type="email" autoComplete="username" required className={`${inputClass} mt-1`} />
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
                  className={`${inputClass} mt-1`}
                />
              </div>
            </>
          )}

          <button type="submit" className={`${buttonClass.primary} w-full`}>
            {pending ? 'Checking…' : needsCode ? 'Verify code' : 'Sign in'}
          </button>
        </fieldset>

        {error ? (
          <p id="login-error" role="alert" className="mt-3 text-sm text-evidence-limitation">
            {error}
          </p>
        ) : null}
      </form>

      <SignOutButton variant="button" />

      <p className="text-xs leading-relaxed text-ink-faint">
        Access requires an allow-listed admin account and a code from an authenticator app. Sessions without the
        second factor are refused by the database.
      </p>
        </>
      )}
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

    case 'unavailable':
      return (
        <Notice tone="danger" title="Cannot reach Supabase">
          {state.reason} Sign-in is unavailable until the connection works again.
        </Notice>
      );

    case 'mfa_required':
      return (
        <Notice tone="info" title="Authenticator code required">
          Enter the current code for {state.identity.email}.
        </Notice>
      );

    case 'mfa_setup_required':
      return (
        <Notice tone="warning" title="Authenticator app required">
          {state.identity.email} has no authenticator app enrolled. The database refuses sessions without a second
          factor, so enrol one before using the panel.
        </Notice>
      );

    case 'not_authorised':
      return (
        <Notice tone="danger" title="Not authorised">
          {state.identity.email} is signed in but is not an admin.
        </Notice>
      );

    case 'authenticated':
      return (
        <Notice tone="success" title="Signed in">
          Signed in as {state.identity.email}.{' '}
          <Link href="/" className="font-semibold underline underline-offset-2">
            Open the dashboard
          </Link>
          .
        </Notice>
      );

    case 'signed_out':
      return null;
  }
}
