import { readAuthConfig } from './config';
import { createSupabaseAuthClient } from './supabase-auth-client';
import { asAuthPort, getSupabaseClient } from './supabase-client';
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
    // Not "no factors": this build cannot check at all, and says so.
    listTotpFactors: async () => ({ ok: false, error }),
    startTotpEnrolment: async () => ({ ok: false, error }),
    confirmTotpEnrolment: async () => ({ ok: false, error }),
    cancelTotpEnrolment: async () => undefined,
    signOut: async () => undefined,
    getAccessToken: async () => null,
    subscribe: () => () => undefined,
  };
}

/**
 * The auth client for this build: the Supabase adapter when the settings are
 * present and safe, otherwise a client that reports exactly why it cannot
 * sign anyone in.
 */
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

  return createSupabaseAuthClient(asAuthPort(getSupabaseClient(config.url, config.publishableKey)));
}
