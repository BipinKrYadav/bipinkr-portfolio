/**
 * Authentication boundary for the admin panel.
 *
 * The UI depends only on these types; `supabase-auth-client.ts` implements
 * `AdminAuthClient` against Supabase Auth.
 *
 * Rules the adapter keeps — they mirror the database (docs/admin-backend.md):
 *   * `authenticated` only when the database itself says so: a readable
 *     public.admin_users row, whose RLS policy is private.is_admin(), i.e. an
 *     allow-listed user with an MFA-verified (aal2) session. Client-side role
 *     state is never trusted on its own.
 *   * Password accepted but no second factor yet → `mfa_required`, never
 *     `authenticated`.
 *   * Signed in with no enrolled factor → `mfa_setup_required`: the database
 *     refuses aal1 sessions, so the panel cannot show data either way.
 *   * Signed in, MFA-verified, but not allow-listed → `not_authorised`.
 *   * If the state cannot be established (network, API failure) → `unavailable`.
 *     Never fall back to a more permissive state.
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
  /** Supabase could not be reached or answered with an error. Blocks the panel. */
  | { status: 'unavailable'; reason: string }
  | { status: 'signed_out' }
  /** Signed in, but no authenticator app is enrolled yet. */
  | { status: 'mfa_setup_required'; identity: AdminIdentity }
  /** Signed in with an enrolled factor; the code has not been given yet. */
  | { status: 'mfa_required'; identity: AdminIdentity }
  | { status: 'not_authorised'; identity: AdminIdentity }
  | { status: 'authenticated'; identity: AdminIdentity };

export type AuthStatus = AuthState['status'];

/** States that mean a person is signed in, whatever their level of access. */
export const SESSION_STATUSES = ['mfa_setup_required', 'mfa_required', 'not_authorised', 'authenticated'] as const;

export const hasSession = (state: AuthState): boolean =>
  (SESSION_STATUSES as readonly string[]).includes(state.status);

export type AuthResult = { ok: true } | { ok: false; error: string };

/**
 * One-time enrolment data from Supabase for a new authenticator app.
 *
 * The QR code, secret and URI are shown once and held only in component state.
 * They are never written to our database, to storage, or to a log: Supabase
 * keeps the factor, and the code the app generates is the only thing sent back.
 */
export interface TotpEnrolment {
  factorId: string;
  /** SVG data URI to render as an image. */
  qrCode: string;
  /** Typed into an authenticator app when the QR code cannot be scanned. */
  secret: string;
  uri: string;
}

export type EnrolmentResult = { ok: true; enrolment: TotpEnrolment } | { ok: false; error: string };

export interface TotpFactorSummary {
  id: string;
  friendlyName: string | null;
  status: 'verified' | 'unverified';
  createdAt: string | null;
}

/**
 * "No factors" and "could not check" are different answers, and the screens
 * must never show the first when the second is true.
 */
export type FactorsResult = { ok: true; factors: TotpFactorSummary[] } | { ok: false; error: string };

export interface AdminAuthClient {
  /** Current state, resolved from the stored session and from the database. */
  getState(): Promise<AuthState>;
  /** Step 1: email and password. Success moves to an MFA state, never straight to `authenticated`. */
  signInWithPassword(email: string, password: string): Promise<AuthResult>;
  /** Step 2: TOTP code from the enrolled authenticator app. */
  verifyTotp(code: string): Promise<AuthResult>;
  /** Authenticator apps on the account, verified or still being enrolled. */
  listTotpFactors(): Promise<FactorsResult>;
  /** Begins enrolment and returns the one-time QR code and secret to display. */
  startTotpEnrolment(friendlyName: string): Promise<EnrolmentResult>;
  /** Confirms enrolment with a code from the app; on success the session reaches aal2. */
  confirmTotpEnrolment(factorId: string, code: string): Promise<AuthResult>;
  /** Removes a factor that was started but never confirmed. */
  cancelTotpEnrolment(factorId: string): Promise<void>;
  signOut(): Promise<void>;
  /**
   * Access token for the current session, used as the bearer token for
   * database requests. Null when there is no session. What the token may
   * actually read or write is decided by the database, not here.
   */
  getAccessToken(): Promise<string | null>;
  /** Notifies on every state change. Returns an unsubscribe function. */
  subscribe(listener: (state: AuthState) => void): () => void;
}
