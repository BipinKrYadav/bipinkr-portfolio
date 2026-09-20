'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut } from 'lucide-react';

import { buttonClass } from '@admin/components/ui/Field';
import { LOGIN_PATH } from '@admin/lib/auth/access';
import { hasSession } from '@admin/lib/auth/types';

import { useAuth } from './AuthProvider';

/** Ends the session and returns to the sign-in page. Shown only with a session. */
export function SignOutButton({ variant = 'link' }: { variant?: 'link' | 'button' }) {
  const { state, client } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  if (!hasSession(state)) return null;

  async function signOut() {
    setPending(true);
    await client.signOut();
    setPending(false);
    router.replace(LOGIN_PATH);
  }

  if (variant === 'button') {
    return (
      <button type="button" onClick={signOut} disabled={pending} className={buttonClass.secondary}>
        {pending ? 'Signing out…' : 'Sign out'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={pending}
      className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-accent underline-offset-4 hover:underline disabled:text-ink-faint"
    >
      <LogOut aria-hidden="true" className="h-4 w-4" />
      <span className="sr-only sm:not-sr-only">{pending ? 'Signing out…' : 'Sign out'}</span>
    </button>
  );
}
