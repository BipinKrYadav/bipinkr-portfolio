/**
 * Authentication boundary for the admin panel.
 *
 * The UI depends only on these types. A Supabase Auth adapter (a later phase)
 * implements `AdminAuthClient`; until then the panel uses the unavailable
 * client, which never reports a session.
 *
 * Rules any adapter must keep — they mirror the database (docs/admin-backend.md):
 *   * `authenticated` only for a user in public.admin_users whose session is
 *     MFA-verified (aal2). A readable admin_users row is exactly that test,
 *     because its RLS policy uses private.is_admin().
 *   * Password accepted but no TOTP yet → `mfa_required`, never `authenticated`.
 *   * Signed in but not allow-listed → `not_authorised`.
 *   * Only the Supabase URL and publishable (anon) key may reach the browser.
 */

export interface AdminIdentity {
  userId: string;
  email: string;
}

export type AuthState =
  | { status: 'loading' }
  /** No usable Supabase Auth connection in this build. */
  | { status: 'unconfigured'; reason: string }
  /** Settings present but unsafe or invalid (e.g. a secret key). Blocks the panel. */
  | { status: 'misconfigured'; reason: string }
  | { status: 'signed_out' }
  | { status: 'mfa_required'; identity: AdminIdentity }
  | { status: 'not_authorised'; identity: AdminIdentity }
  | { status: 'authenticated'; identity: AdminIdentity };

export type AuthStatus = AuthState['status'];

export type AuthResult = { ok: true } | { ok: false; error: string };

export interface AdminAuthClient {
  /** Current state, resolved from the stored session. */
  getState(): Promise<AuthState>;
  /** Step 1: email and password. Success moves to `mfa_required`. */
  signInWithPassword(email: string, password: string): Promise<AuthResult>;
  /** Step 2: TOTP code from the enrolled authenticator app. */
  verifyTotp(code: string): Promise<AuthResult>;
  signOut(): Promise<void>;
  /**
   * Access token for the current MFA-verified admin session, used as the
   * bearer token for database requests. Null whenever there is no such session.
   */
  getAccessToken(): Promise<string | null>;
  /** Notifies on every state change. Returns an unsubscribe function. */
  subscribe(listener: (state: AuthState) => void): () => void;
}
