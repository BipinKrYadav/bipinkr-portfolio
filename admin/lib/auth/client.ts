import { readAuthConfig } from './config';
import type { AdminAuthClient, AuthState } from './types';

type UnavailableState = Extract<AuthState, { status: 'unconfigured' | 'misconfigured' }>;

/**
 * A client that has no session and cannot create one. Every sign-in attempt
 * fails with an explicit error; it never reports success.
 */
export function createUnavailableAuthClient(state: UnavailableState): AdminAuthClient {
  const error =
    state.status === 'misconfigured'
      ? `Authentication is misconfigured. ${state.reason}`
      : `Authentication not configured. ${state.reason}`;

  return {
    getState: async () => state,
    signInWithPassword: async () => ({ ok: false, error }),
    verifyTotp: async () => ({ ok: false, error }),
    signOut: async () => undefined,
    getAccessToken: async () => null,
    subscribe: () => () => undefined,
  };
}

export function createAuthClient(): AdminAuthClient {
  const config = readAuthConfig();

  if (config.status === 'unconfigured') {
    return createUnavailableAuthClient({
      status: 'unconfigured',
      reason: `${config.missing.join(' and ')} ${config.missing.length > 1 ? 'are' : 'is'} not set.`,
    });
  }
  if (config.status === 'misconfigured') {
    return createUnavailableAuthClient({ status: 'misconfigured', reason: config.problem });
  }

  // Settings are present, but the Supabase Auth adapter is not part of this
  // build. Report that plainly rather than pretending a session exists.
  return createUnavailableAuthClient({
    status: 'unconfigured',
    reason: 'Supabase settings are present, but the Supabase Auth adapter has not been built yet.',
  });
}
