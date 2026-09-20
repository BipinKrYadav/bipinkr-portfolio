import type { AdminAuthClient, AuthResult, AuthState, EnrolmentResult, FactorsResult, TotpFactorSummary } from './types';

/**
 * Supabase Auth adapter.
 *
 * The state it reports is decided by the database, not by anything held in the
 * browser: a session only becomes `authenticated` when public.admin_users
 * returns a row, and that row is visible only to an allow-listed user with an
 * MFA-verified session (private.is_admin()). A tampered local session cannot
 * produce access, because every read and write is re-checked by RLS.
 */

/** The part of the Supabase client this adapter uses, so tests can supply a fake. */
export interface SupabaseAuthPort {
  auth: {
    getSession(): Promise<{ data: { session: SupabaseSession | null }; error: { message: string } | null }>;
    signInWithPassword(credentials: { email: string; password: string }): Promise<{ error: { message: string; status?: number } | null }>;
    signOut(): Promise<{ error: { message: string } | null }>;
    onAuthStateChange(callback: (event: string) => void): { data: { subscription: { unsubscribe(): void } } };
    mfa: {
      getAuthenticatorAssuranceLevel(): Promise<{
        data: { currentLevel: string | null; nextLevel: string | null } | null;
        error: { message: string } | null;
      }>;
      listFactors(): Promise<{ data: { totp?: SupabaseFactor[] } | null; error: { message: string } | null }>;
      challengeAndVerify(params: { factorId: string; code: string }): Promise<{ error: { message: string } | null }>;
      enroll(params: { factorType: 'totp'; friendlyName?: string }): Promise<{
        data: { id: string; totp?: { qr_code?: string; secret?: string; uri?: string } } | null;
        error: { message: string } | null;
      }>;
      unenroll(params: { factorId: string }): Promise<{ error: { message: string } | null }>;
    };
  };
  from(table: string): {
    select(columns: string): {
      limit(count: number): PromiseLike<{ data: unknown[] | null; error: { message: string; code?: string } | null }>;
    };
  };
}

export interface SupabaseSession {
  access_token: string;
  user: { id: string; email?: string | null };
}

export interface SupabaseFactor {
  id: string;
  status: string;
  factor_type?: string;
  friendly_name?: string | null;
  created_at?: string | null;
}

/** A code that the authenticator app produced is either right or wrong; say so plainly. */
function codeError(message: string): string {
  if (/invalid|incorrect|expired/i.test(message)) return 'That code was not accepted. Try the current code from your app.';
  if (/rate limit|too many requests/i.test(message)) return 'Too many attempts. Wait a moment and try again.';
  return message;
}

function enrolmentError(message: string): string {
  if (/friendly name/i.test(message)) return 'An authenticator with that name is already enrolled. Choose another name.';
  if (/mfa.*(disabled|not enabled)|totp.*(disabled|not enabled)/i.test(message)) {
    return 'Multi-factor authentication is not enabled for this Supabase project.';
  }
  if (/maximum.*factors|too many factors/i.test(message)) return 'This account already has the maximum number of authenticators.';
  if (/rate limit|too many requests/i.test(message)) return 'Too many attempts. Wait a moment and try again.';
  return message;
}

/** Sign-in failures are reported without revealing whether an account exists. */
function signInError(message: string): string {
  if (/invalid login credentials|invalid email or password/i.test(message)) return 'Email or password is incorrect.';
  if (/email not confirmed/i.test(message)) return 'This account has not been confirmed yet.';
  if (/rate limit|too many requests/i.test(message)) return 'Too many attempts. Wait a moment and try again.';
  return message;
}

export function createSupabaseAuthClient(supabase: SupabaseAuthPort): AdminAuthClient {
  const listeners = new Set<(state: AuthState) => void>();
  let subscription: { unsubscribe(): void } | null = null;

  async function resolveState(): Promise<AuthState> {
    const session = await supabase.auth.getSession();
    if (session.error) return { status: 'unavailable', reason: session.error.message };
    if (!session.data.session) return { status: 'signed_out' };

    const user = session.data.session.user;
    const identity = { userId: user.id, email: user.email ?? '' };

    const assurance = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error) return { status: 'unavailable', reason: assurance.error.message };

    if (assurance.data?.currentLevel !== 'aal2') {
      // An enrolled factor means the code is still to come; no factor means
      // enrolment has to happen first. The database refuses both.
      if (assurance.data?.nextLevel === 'aal2') return { status: 'mfa_required', identity };
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) return { status: 'unavailable', reason: factors.error.message };
      const enrolled = (factors.data?.totp ?? []).some((factor) => factor.status === 'verified');
      return enrolled ? { status: 'mfa_required', identity } : { status: 'mfa_setup_required', identity };
    }

    // The database is the authority on who is an admin: this row is readable
    // only when private.is_admin() holds for the caller.
    const membership = await supabase.from('admin_users').select('user_id').limit(1);
    if (membership.error) {
      // A permission error is an answer: this session is not an admin.
      if (membership.error.code === '42501') return { status: 'not_authorised', identity };
      return { status: 'unavailable', reason: membership.error.message };
    }
    return (membership.data?.length ?? 0) > 0 ? { status: 'authenticated', identity } : { status: 'not_authorised', identity };
  }

  async function publish(): Promise<AuthState> {
    const state = await resolveState();
    for (const listener of listeners) listener(state);
    return state;
  }

  return {
    getState: resolveState,

    async signInWithPassword(email, password): Promise<AuthResult> {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: signInError(error.message) };
      await publish();
      return { ok: true };
    },

    async verifyTotp(code): Promise<AuthResult> {
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) return { ok: false, error: factors.error.message };
      const factor = (factors.data?.totp ?? []).find((item) => item.status === 'verified');
      if (!factor) return { ok: false, error: 'No authenticator app is enrolled for this account.' };

      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
      if (error) return { ok: false, error: codeError(error.message) };
      await publish();
      return { ok: true };
    },

    /**
     * A failure is reported as a failure. Returning an empty list here would
     * tell the person no authenticator is enrolled, which is a different fact
     * and could lead them to enrol a duplicate or doubt a working one.
     */
    async listTotpFactors(): Promise<FactorsResult> {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) return { ok: false, error: error.message };
      const factors: TotpFactorSummary[] = (data?.totp ?? []).map((factor) => ({
        id: factor.id,
        friendlyName: factor.friendly_name ?? null,
        status: factor.status === 'verified' ? 'verified' : 'unverified',
        createdAt: factor.created_at ?? null,
      }));
      return { ok: true, factors };
    },

    /**
     * Supabase generates and keeps the secret; this returns its one-time
     * enrolment data for display. Nothing here is stored by the admin.
     */
    async startTotpEnrolment(friendlyName): Promise<EnrolmentResult> {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: friendlyName.trim() || undefined });
      if (error) return { ok: false, error: enrolmentError(error.message) };
      if (!data?.id || !data.totp?.secret || !data.totp.qr_code) {
        return { ok: false, error: 'Supabase did not return enrolment data for this authenticator.' };
      }
      return {
        ok: true,
        enrolment: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri ?? '' },
      };
    },

    /** Confirms the new factor. On success Supabase raises the session to aal2. */
    async confirmTotpEnrolment(factorId, code): Promise<AuthResult> {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
      if (error) return { ok: false, error: codeError(error.message) };
      await publish();
      return { ok: true };
    },

    async cancelTotpEnrolment(factorId) {
      await supabase.auth.mfa.unenroll({ factorId });
      await publish();
    },

    async signOut() {
      await supabase.auth.signOut();
      await publish();
    },

    async getAccessToken() {
      const { data, error } = await supabase.auth.getSession();
      if (error) return null;
      return data.session?.access_token ?? null;
    },

    subscribe(listener) {
      listeners.add(listener);
      subscription ??= supabase.auth.onAuthStateChange(() => {
        // Supabase warns against awaiting its calls inside this callback.
        queueMicrotask(() => {
          void publish();
        });
      }).data.subscription;

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          subscription?.unsubscribe();
          subscription = null;
        }
      };
    },
  };
}
