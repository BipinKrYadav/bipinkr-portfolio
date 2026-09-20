import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { authStatusLabels, consoleAccess, loginRedirect, LOGIN_PATH } from '../lib/auth/access';
import { hasSession, type AuthState, type AuthStatus } from '../lib/auth/types';

/** Protected-route rules: who sees a console page, and who is sent to sign in. */

const identity = { userId: 'user-1', email: 'owner@example.test' };

const states: Record<AuthStatus, AuthState> = {
  loading: { status: 'loading' },
  unconfigured: { status: 'unconfigured', reason: 'Settings are not set.' },
  misconfigured: { status: 'misconfigured', reason: 'A secret key was supplied.' },
  unavailable: { status: 'unavailable', reason: 'network down' },
  signed_out: { status: 'signed_out' },
  mfa_setup_required: { status: 'mfa_setup_required', identity },
  mfa_required: { status: 'mfa_required', identity },
  not_authorised: { status: 'not_authorised', identity },
  authenticated: { status: 'authenticated', identity },
};

describe('console pages', () => {
  test('only an authenticated admin sees a page', () => {
    const allowed = Object.values(states).filter((state) => consoleAccess(state).kind === 'allow');
    assert.deepEqual(allowed.map((state) => state.status), ['authenticated']);
  });

  test('every signed-in state short of admin access is sent to the sign-in page', () => {
    for (const status of ['signed_out', 'mfa_setup_required', 'mfa_required', 'not_authorised'] as const) {
      const access = consoleAccess(states[status]);
      assert.equal(access.kind, 'redirect', status);
      assert.equal(access.kind === 'redirect' ? access.to : null, LOGIN_PATH, status);
      assert.equal(access.kind === 'redirect' ? access.to : null, '/login/', status);
    }
  });

  test('a failure to verify the session blocks the page instead of allowing it', () => {
    for (const status of ['misconfigured', 'unavailable'] as const) {
      assert.equal(consoleAccess(states[status]).kind, 'block', status);
    }
  });

  test('a build with no settings shows the data-less interface preview', () => {
    assert.equal(consoleAccess(states.unconfigured).kind, 'preview');
  });

  test('the state is still being resolved', () => {
    assert.equal(consoleAccess(states.loading).kind, 'loading');
  });

  test('every state is handled, and no state both allows and redirects', () => {
    for (const [status, state] of Object.entries(states)) {
      const access = consoleAccess(state);
      assert.ok(['loading', 'allow', 'preview', 'redirect', 'block'].includes(access.kind), status);
    }
  });
});

describe('sign-in page', () => {
  test('an authenticated admin is sent to the dashboard', () => {
    assert.equal(loginRedirect(states.authenticated), '/');
  });

  test('everyone else stays on the sign-in page', () => {
    for (const [status, state] of Object.entries(states)) {
      if (status === 'authenticated') continue;
      assert.equal(loginRedirect(state), null, status);
    }
  });
});

describe('session helpers', () => {
  test('a session exists for signed-in states only', () => {
    assert.deepEqual(
      Object.values(states).filter(hasSession).map((state) => state.status),
      ['mfa_setup_required', 'mfa_required', 'not_authorised', 'authenticated'],
    );
  });

  test('every status has a label', () => {
    for (const status of Object.keys(states) as AuthStatus[]) {
      assert.ok(authStatusLabels[status], status);
    }
  });
});
