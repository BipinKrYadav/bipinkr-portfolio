'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { Notice } from '@admin/components/ui/Notice';

import { useAuth } from './AuthProvider';

/**
 * Decides what the console may render for the current authentication state.
 *
 * - authenticated: the page.
 * - unconfigured: an interface preview. Nobody is signed in and no backend
 *   data exists to show, so the page structure is visible under a permanent
 *   "Authentication not configured" notice.
 * - every other state: the page is withheld.
 *
 * Screens must load backend data in client components, after this gate —
 * never in server components, whose output is baked into the static build.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { state } = useAuth();

  switch (state.status) {
    case 'authenticated':
      return <>{children}</>;

    case 'unconfigured':
      return (
        <>
          <Notice tone="warning" title="Authentication not configured" className="mb-6">
            {state.reason} This is an interface preview: nobody is signed in, and no metrics, documents, evidence
            or audit data are loaded.
          </Notice>
          {children}
        </>
      );

    case 'loading':
      return (
        <p role="status" className="py-12 text-center text-sm text-ink-soft">
          Checking authentication…
        </p>
      );

    case 'misconfigured':
      return (
        <Notice tone="danger" title="Authentication misconfigured">
          {state.reason} The admin panel is disabled until this is fixed.
        </Notice>
      );

    case 'signed_out':
    case 'mfa_required':
      return (
        <Notice tone="info" title={state.status === 'signed_out' ? 'Sign-in required' : 'Authenticator code required'}>
          <Link href="/login/" className="font-semibold underline underline-offset-2">
            Go to the sign-in page
          </Link>
          .
        </Notice>
      );

    case 'not_authorised':
      return (
        <Notice tone="danger" title="Not authorised">
          {state.identity.email} is signed in but is not an admin.
        </Notice>
      );
  }
}
