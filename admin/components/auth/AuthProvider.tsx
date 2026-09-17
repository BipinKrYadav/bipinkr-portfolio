'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { createAuthClient } from '@admin/lib/auth/client';
import type { AdminAuthClient, AuthState } from '@admin/lib/auth/types';

interface AuthContextValue {
  state: AuthState;
  client: AdminAuthClient;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createAuthClient);
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    client.getState().then((next) => {
      if (active) setState(next);
    });
    const unsubscribe = client.subscribe((next) => {
      if (active) setState(next);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [client]);

  return <AuthContext.Provider value={{ state, client }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

export type BackendConnection = { status: 'loading' } | { status: 'unavailable'; reason: string };

/**
 * Whether backend data can be shown. Nothing loads data yet, so every settled
 * state is `unavailable` with the specific reason — screens never invent values.
 */
export function useBackendConnection(): BackendConnection {
  const { state } = useAuth();

  switch (state.status) {
    case 'loading':
      return { status: 'loading' };
    case 'unconfigured':
      return { status: 'unavailable', reason: 'Authentication not configured, so no backend data can be loaded.' };
    case 'misconfigured':
      return { status: 'unavailable', reason: 'Authentication is misconfigured, so no backend data can be loaded.' };
    case 'signed_out':
    case 'mfa_required':
      return { status: 'unavailable', reason: 'Sign in with your authenticator code to load data.' };
    case 'not_authorised':
      return { status: 'unavailable', reason: 'This account is not an admin.' };
    case 'authenticated':
      return { status: 'unavailable', reason: 'Data loading has not been built yet.' };
  }
}
