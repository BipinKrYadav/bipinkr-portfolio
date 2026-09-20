import type { AuthState, AuthStatus } from './types';

/**
 * What the console may render for an authentication state, and where an
 * unauthenticated visitor is sent. Pure and exhaustive, so the rules can be
 * tested without a browser.
 */

export type RouteAccess =
  | { kind: 'loading' }
  /** Render the page. */
  | { kind: 'allow' }
  /** Render the page structure with a notice: no session and no data exist. */
  | { kind: 'preview'; reason: string }
  /** Send the visitor to the sign-in page. */
  | { kind: 'redirect'; to: '/login/'; title: string; reason: string }
  /** Show why the panel is unusable; no redirect would help. */
  | { kind: 'block'; title: string; reason: string };

export const LOGIN_PATH = '/login/';

export function consoleAccess(state: AuthState): RouteAccess {
  switch (state.status) {
    case 'loading':
      return { kind: 'loading' };

    case 'authenticated':
      return { kind: 'allow' };

    // Only possible when the build has no Supabase settings, which a
    // deployable build refuses. Nothing is signed in and no data is loaded.
    case 'unconfigured':
      return { kind: 'preview', reason: state.reason };

    case 'misconfigured':
      return { kind: 'block', title: 'Authentication misconfigured', reason: state.reason };

    case 'unavailable':
      return { kind: 'block', title: 'Cannot verify your session', reason: state.reason };

    case 'signed_out':
      return { kind: 'redirect', to: LOGIN_PATH, title: 'Sign-in required', reason: 'Sign in to use the admin panel.' };

    case 'mfa_required':
      return {
        kind: 'redirect',
        to: LOGIN_PATH,
        title: 'Authenticator code required',
        reason: 'Enter the code from your authenticator app to finish signing in.',
      };

    case 'mfa_setup_required':
      return {
        kind: 'redirect',
        to: LOGIN_PATH,
        title: 'Authenticator app required',
        reason: 'This account has no authenticator app enrolled, so the database refuses the session.',
      };

    case 'not_authorised':
      return {
        kind: 'redirect',
        to: LOGIN_PATH,
        title: 'Not authorised',
        reason: `${state.identity.email} is signed in but is not an admin.`,
      };
  }
}

/** Where the sign-in page should send someone who is already signed in. */
export function loginRedirect(state: AuthState): '/' | null {
  return state.status === 'authenticated' ? '/' : null;
}

export const authStatusLabels: Record<AuthStatus, string> = {
  loading: 'Checking session',
  unconfigured: 'Auth not configured',
  misconfigured: 'Auth misconfigured',
  unavailable: 'Auth unavailable',
  signed_out: 'Signed out',
  mfa_setup_required: 'MFA setup required',
  mfa_required: 'MFA required',
  not_authorised: 'Not authorised',
  authenticated: 'Signed in',
};
