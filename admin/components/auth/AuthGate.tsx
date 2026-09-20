'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { Notice } from '@admin/components/ui/Notice';
import { consoleAccess } from '@admin/lib/auth/access';

import { useAuth } from './AuthProvider';

/**
 * Protects every console page. Anyone without an admin session is sent to
 * /login/ and never sees a page body; the database refuses their requests as
 * well, so this is convenience rather than the security boundary.
 *
 * Screens must load backend data in client components, after this gate — never
 * in server components, whose output is baked into the static build.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { state } = useAuth();
  const router = useRouter();
  const access = consoleAccess(state);
  const redirectTo = access.kind === 'redirect' ? access.to : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  switch (access.kind) {
    case 'allow':
      return <>{children}</>;

    case 'preview':
      return (
        <>
          <Notice tone="warning" title="Authentication not configured" className="mb-6">
            {access.reason} This is an interface preview: nobody is signed in, and no metrics, documents, evidence
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

    case 'redirect':
      return (
        <Notice tone="info" title={access.title}>
          {access.reason} Taking you to the sign-in page…
        </Notice>
      );

    case 'block':
      return (
        <Notice tone="danger" title={access.title}>
          {access.reason}
        </Notice>
      );
  }
}
