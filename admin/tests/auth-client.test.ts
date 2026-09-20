import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { createSupabaseAuthClient, type SupabaseAuthPort, type SupabaseFactor, type SupabaseSession } from '../lib/auth/supabase-auth-client';
import type { AuthState } from '../lib/auth/types';

/**
 * The Supabase auth adapter, against a fake Supabase. No network, no project.
 *
 * The rule under test throughout: a session only becomes `authenticated` when
 * the database returns an admin_users row for it. Nothing the browser holds
 * can produce that state on its own.
 */

const SESSION: SupabaseSession = { access_token: 'access-token-for-tests', user: { id: 'user-1', email: 'owner@example.test' } };
const VERIFIED_TOTP: SupabaseFactor = { id: 'factor-1', status: 'verified', factor_type: 'totp' };

interface FakeOptions {
  session?: SupabaseSession | null;
  sessionError?: { message: string } | null;
  currentLevel?: string | null;
  nextLevel?: string | null;
  factors?: SupabaseFactor[];
  factorsError?: { message: string } | null;
  adminRows?: unknown[];
  adminError?: { message: string; code?: string } | null;
  signInError?: { message: string } | null;
  verifyError?: { message: string } | null;
  enrolError?: { message: string } | null;
  enrolData?: { id: string; totp?: { qr_code?: string; secret?: string; uri?: string } } | null;
}

const ENROLMENT = {
  id: 'factor-new',
  totp: {
    qr_code: 'data:image/svg+xml;utf-8,<svg/>',
    secret: 'FAKESECRETFORTESTS',
    uri: 'otpauth://totp/example',
  },
};

function fakeSupabase(options: FakeOptions = {}) {
  const calls: string[] = [];
  let session = options.session === undefined ? null : options.session;
  let authListener: ((event: string) => void) | null = null;
  let unsubscribed = false;

  const port: SupabaseAuthPort = {
    auth: {
      getSession: async () => {
        calls.push('getSession');
        return { data: { session }, error: options.sessionError ?? null };
      },
      signInWithPassword: async ({ email }) => {
        calls.push(`signInWithPassword:${email}`);
        if (options.signInError) return { error: options.signInError };
        session = options.session ?? SESSION;
        return { error: null };
      },
      signOut: async () => {
        calls.push('signOut');
        session = null;
        return { error: null };
      },
      onAuthStateChange: (callback) => {
        authListener = callback;
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                unsubscribed = true;
              },
            },
          },
        };
      },
      mfa: {
        getAuthenticatorAssuranceLevel: async () => {
          calls.push('getAal');
          return { data: { currentLevel: options.currentLevel ?? 'aal1', nextLevel: options.nextLevel ?? 'aal1' }, error: null };
        },
        listFactors: async () => {
          calls.push('listFactors');
          if (options.factorsError) return { data: null, error: options.factorsError };
          return { data: { totp: options.factors ?? [] }, error: null };
        },
        challengeAndVerify: async ({ factorId, code }) => {
          calls.push(`challengeAndVerify:${factorId}:${code}`);
          return { error: options.verifyError ?? null };
        },
        enroll: async ({ factorType, friendlyName }) => {
          calls.push(`enroll:${factorType}:${friendlyName ?? ''}`);
          if (options.enrolError) return { data: null, error: options.enrolError };
          return { data: options.enrolData === undefined ? ENROLMENT : options.enrolData, error: null };
        },
        unenroll: async ({ factorId }) => {
          calls.push(`unenroll:${factorId}`);
          return { error: null };
        },
      },
    },
    from: (table) => {
      calls.push(`from:${table}`);
      return {
        select: () => ({
          limit: async () => ({ data: options.adminRows ?? [], error: options.adminError ?? null }),
        }),
      };
    },
  };

  return {
    client: createSupabaseAuthClient(port),
    calls,
    fireAuthEvent: (event: string) => authListener?.(event),
    wasUnsubscribed: () => unsubscribed,
  };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('session state', () => {
  test('no session is signed out', async () => {
    const { client } = fakeSupabase();
    assert.deepEqual(await client.getState(), { status: 'signed_out' });
  });

  test('a session that cannot be read is unavailable, never signed in', async () => {
    const { client } = fakeSupabase({ sessionError: { message: 'network down' } });
    const state = await client.getState();
    assert.equal(state.status, 'unavailable');
  });

  test('signed in with no enrolled factor needs MFA setup', async () => {
    const { client } = fakeSupabase({ session: SESSION, currentLevel: 'aal1', nextLevel: 'aal1', factors: [] });
    const state = await client.getState();
    assert.equal(state.status, 'mfa_setup_required');
    assert.equal(state.status === 'mfa_setup_required' ? state.identity.email : '', 'owner@example.test');
  });

  test('signed in with a factor still pending needs the code', async () => {
    const pending = fakeSupabase({ session: SESSION, currentLevel: 'aal1', nextLevel: 'aal2' });
    assert.equal((await pending.client.getState()).status, 'mfa_required');

    const enrolled = fakeSupabase({ session: SESSION, currentLevel: 'aal1', nextLevel: 'aal1', factors: [VERIFIED_TOTP] });
    assert.equal((await enrolled.client.getState()).status, 'mfa_required');
  });

  test('an MFA-verified session is authenticated only when the database returns an admin row', async () => {
    const admin = fakeSupabase({ session: SESSION, currentLevel: 'aal2', nextLevel: 'aal2', adminRows: [{ user_id: 'user-1' }] });
    const state = await admin.client.getState();
    assert.equal(state.status, 'authenticated');
    assert.ok(admin.calls.includes('from:admin_users'), 'the database was asked');

    const outsider = fakeSupabase({ session: SESSION, currentLevel: 'aal2', nextLevel: 'aal2', adminRows: [] });
    assert.equal((await outsider.client.getState()).status, 'not_authorised');

    const denied = fakeSupabase({ session: SESSION, currentLevel: 'aal2', nextLevel: 'aal2', adminError: { message: 'permission denied', code: '42501' } });
    assert.equal((await denied.client.getState()).status, 'not_authorised');
  });

  test('a database failure never becomes authenticated', async () => {
    const { client } = fakeSupabase({
      session: SESSION,
      currentLevel: 'aal2',
      nextLevel: 'aal2',
      adminError: { message: 'upstream timeout', code: '57014' },
    });
    const state = await client.getState();
    assert.equal(state.status, 'unavailable');
  });
});

describe('sign in', () => {
  test('a wrong password gives a generic message that does not reveal the account', async () => {
    const { client } = fakeSupabase({ signInError: { message: 'Invalid login credentials' } });
    const result = await client.signInWithPassword('owner@example.test', 'wrong-password');
    assert.deepEqual(result, { ok: false, error: 'Email or password is incorrect.' });
  });

  test('a successful password step publishes the new state and never goes straight to authenticated', async () => {
    const fake = fakeSupabase({ session: SESSION, currentLevel: 'aal1', nextLevel: 'aal2' });
    const seen: AuthState[] = [];
    fake.client.subscribe((state) => seen.push(state));

    const result = await fake.client.signInWithPassword('owner@example.test', 'correct-password');
    assert.deepEqual(result, { ok: true });
    assert.deepEqual(seen.map((state) => state.status), ['mfa_required']);
  });
});

describe('second factor', () => {
  test('verifying uses the enrolled factor and publishes the resulting state', async () => {
    const fake = fakeSupabase({
      session: SESSION,
      currentLevel: 'aal2',
      nextLevel: 'aal2',
      factors: [VERIFIED_TOTP],
      adminRows: [{ user_id: 'user-1' }],
    });
    const seen: AuthState[] = [];
    fake.client.subscribe((state) => seen.push(state));

    assert.deepEqual(await fake.client.verifyTotp('123456'), { ok: true });
    assert.ok(fake.calls.includes('challengeAndVerify:factor-1:123456'));
    assert.deepEqual(seen.map((state) => state.status), ['authenticated']);
  });

  test('a rejected code is reported without changing the state', async () => {
    const fake = fakeSupabase({ session: SESSION, factors: [VERIFIED_TOTP], verifyError: { message: 'Invalid TOTP code entered' } });
    const result = await fake.client.verifyTotp('000000');
    assert.equal(result.ok, false);
    assert.match(result.ok ? '' : result.error, /code was not accepted/i);
  });

  test('without an enrolled factor there is nothing to verify', async () => {
    const fake = fakeSupabase({ session: SESSION, factors: [] });
    const result = await fake.client.verifyTotp('123456');
    assert.equal(result.ok, false);
    assert.match(result.ok ? '' : result.error, /no authenticator app/i);
  });
});

describe('authenticator enrolment', () => {
  test('starting enrolment returns the one-time QR code and secret Supabase generated', async () => {
    const fake = fakeSupabase({ session: SESSION, currentLevel: 'aal1', nextLevel: 'aal1' });
    const result = await fake.client.startTotpEnrolment('Backup device');
    assert.ok(result.ok, result.ok ? '' : result.error);
    assert.deepEqual(result.ok ? result.enrolment : null, {
      factorId: 'factor-new',
      qrCode: ENROLMENT.totp.qr_code,
      secret: ENROLMENT.totp.secret,
      uri: ENROLMENT.totp.uri,
    });
    assert.ok(fake.calls.includes('enroll:totp:Backup device'), 'the chosen name is passed to Supabase');
  });

  test('enrolment never writes the secret to browser storage', async () => {
    const writes: string[] = [];
    const stub = {
      getItem: () => null,
      setItem: (key: string) => writes.push(key),
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    };
    const globals = globalThis as unknown as { localStorage?: unknown; sessionStorage?: unknown };
    const [previousLocal, previousSession] = [globals.localStorage, globals.sessionStorage];
    globals.localStorage = stub;
    globals.sessionStorage = stub;
    try {
      const fake = fakeSupabase({ session: SESSION, currentLevel: 'aal2', nextLevel: 'aal2', adminRows: [{ user_id: 'user-1' }] });
      const started = await fake.client.startTotpEnrolment('Phone');
      assert.ok(started.ok);
      await fake.client.confirmTotpEnrolment('factor-new', '123456');
      assert.deepEqual(writes, [], 'nothing was written to storage by the admin');
    } finally {
      globals.localStorage = previousLocal;
      globals.sessionStorage = previousSession;
    }
  });

  test('a duplicate name and a disabled-MFA project are reported in plain words', async () => {
    const duplicate = fakeSupabase({ session: SESSION, enrolError: { message: 'A factor with the friendly name already exists' } });
    const first = await duplicate.client.startTotpEnrolment('Phone');
    assert.match(first.ok ? '' : first.error, /already enrolled/i);

    const disabled = fakeSupabase({ session: SESSION, enrolError: { message: 'MFA is disabled for this project' } });
    const second = await disabled.client.startTotpEnrolment('Phone');
    assert.match(second.ok ? '' : second.error, /not enabled for this Supabase project/i);
  });

  test('incomplete enrolment data is refused rather than shown half-built', async () => {
    const fake = fakeSupabase({ session: SESSION, enrolData: { id: 'factor-new', totp: { secret: 'only-secret' } } });
    const result = await fake.client.startTotpEnrolment('Phone');
    assert.equal(result.ok, false);
  });

  test('confirming enrolment verifies that factor and lifts the session to admin access', async () => {
    const fake = fakeSupabase({ session: SESSION, currentLevel: 'aal2', nextLevel: 'aal2', adminRows: [{ user_id: 'user-1' }] });
    const seen: AuthState[] = [];
    fake.client.subscribe((state) => seen.push(state));

    assert.deepEqual(await fake.client.confirmTotpEnrolment('factor-new', '123456'), { ok: true });
    assert.ok(fake.calls.includes('challengeAndVerify:factor-new:123456'));
    assert.deepEqual(seen.map((state) => state.status), ['authenticated']);
  });

  test('a wrong code during enrolment does not enrol anything', async () => {
    const fake = fakeSupabase({ session: SESSION, verifyError: { message: 'Invalid TOTP code entered' } });
    const seen: AuthState[] = [];
    fake.client.subscribe((state) => seen.push(state));

    const result = await fake.client.confirmTotpEnrolment('factor-new', '000000');
    assert.equal(result.ok, false);
    assert.match(result.ok ? '' : result.error, /not accepted/i);
    assert.deepEqual(seen, [], 'no state change was published');
  });

  test('an abandoned enrolment is removed', async () => {
    const fake = fakeSupabase({ session: SESSION });
    await fake.client.cancelTotpEnrolment('factor-new');
    assert.ok(fake.calls.includes('unenroll:factor-new'));
  });

  test('enrolled factors are listed with their name, state and date', async () => {
    const fake = fakeSupabase({
      session: SESSION,
      factors: [
        { id: 'factor-1', status: 'verified', friendly_name: 'Phone', created_at: '2026-09-19T10:00:00Z' },
        { id: 'factor-2', status: 'unverified', friendly_name: null, created_at: null },
      ],
    });
    assert.deepEqual(await fake.client.listTotpFactors(), {
      ok: true,
      factors: [
        { id: 'factor-1', friendlyName: 'Phone', status: 'verified', createdAt: '2026-09-19T10:00:00Z' },
        { id: 'factor-2', friendlyName: null, status: 'unverified', createdAt: null },
      ],
    });
  });

  test('an account with no factors is reported as an empty list, not as a failure', async () => {
    const fake = fakeSupabase({ session: SESSION, factors: [] });
    assert.deepEqual(await fake.client.listTotpFactors(), { ok: true, factors: [] });
  });

  test('a failed check is reported as a failure, never as "no factors"', async () => {
    const fake = fakeSupabase({ session: SESSION, factorsError: { message: 'network unreachable' } });
    const result = await fake.client.listTotpFactors();
    assert.equal(result.ok, false);
    assert.match(result.ok ? '' : result.error, /network unreachable/);
  });

  test('confirming an enrolment never unenrols the factor it just verified', async () => {
    const fake = fakeSupabase({ session: SESSION });
    const started = await fake.client.startTotpEnrolment('Phone');
    assert.ok(started.ok);
    assert.ok(started.ok && (await fake.client.confirmTotpEnrolment(started.enrolment.factorId, '123456')).ok);
    assert.ok(!fake.calls.some((call) => call.startsWith('unenroll:')));
  });
});

describe('session lifecycle', () => {
  test('signing out clears the session and publishes signed out', async () => {
    const fake = fakeSupabase({ session: SESSION, currentLevel: 'aal2', nextLevel: 'aal2', adminRows: [{ user_id: 'user-1' }] });
    assert.equal((await fake.client.getState()).status, 'authenticated');

    const seen: AuthState[] = [];
    fake.client.subscribe((state) => seen.push(state));
    await fake.client.signOut();

    assert.ok(fake.calls.includes('signOut'));
    assert.deepEqual(seen.map((state) => state.status), ['signed_out']);
    assert.equal(await fake.client.getAccessToken(), null);
  });

  test('the access token comes from the stored session', async () => {
    const withSession = fakeSupabase({ session: SESSION });
    assert.equal(await withSession.client.getAccessToken(), 'access-token-for-tests');

    const without = fakeSupabase();
    assert.equal(await without.client.getAccessToken(), null);

    const broken = fakeSupabase({ sessionError: { message: 'network down' } });
    assert.equal(await broken.client.getAccessToken(), null);
  });

  test('a Supabase auth event (such as a token refresh) re-resolves the state', async () => {
    const fake = fakeSupabase({ session: SESSION, currentLevel: 'aal2', nextLevel: 'aal2', adminRows: [{ user_id: 'user-1' }] });
    const seen: AuthState[] = [];
    const unsubscribe = fake.client.subscribe((state) => seen.push(state));

    fake.fireAuthEvent('TOKEN_REFRESHED');
    await flush();
    assert.deepEqual(seen.map((state) => state.status), ['authenticated']);

    unsubscribe();
    assert.equal(fake.wasUnsubscribed(), true);
  });
});
