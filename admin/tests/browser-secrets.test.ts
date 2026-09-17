import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';

import { findPublicEnvSecrets } from '../config/public-env-guard.mjs';
import { readAuthConfig } from '../lib/auth/config';
import { createAuthClient } from '../lib/auth/client';

/**
 * No service-role or secret key can reach the browser bundle: the build
 * guard refuses it, and the runtime config refuses it again. Values here are
 * fabricated test strings, not credentials.
 */

const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
const fakeJwt = (role: string) => `${base64url({ alg: 'none' })}.${base64url({ role })}.signature`;

const ENV_NAMES = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] as const;
afterEach(() => {
  for (const name of ENV_NAMES) delete process.env[name];
});

describe('build-time guard', () => {
  test('refuses secret keys, service-role JWTs and secret-looking variable names', () => {
    assert.equal(findPublicEnvSecrets({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: `sb_secret_${'x'.repeat(20)}` }).length, 1);
    assert.equal(findPublicEnvSecrets({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: fakeJwt('service_role') }).length, 1);
    assert.equal(findPublicEnvSecrets({ NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY: 'anything' }).length, 1);
    assert.equal(findPublicEnvSecrets({ SUPABASE_SERVICE_ROLE_KEY: fakeJwt('service_role') }).length, 0, 'server-only names are not inlined');
  });

  test('allows the URL and a publishable or anon key', () => {
    assert.deepEqual(
      findPublicEnvSecrets({
        NEXT_PUBLIC_SUPABASE_URL: 'https://project-ref.supabase.test',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: `sb_publishable_${'x'.repeat(20)}`,
      }),
      [],
    );
    assert.deepEqual(findPublicEnvSecrets({ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: fakeJwt('anon') }), []);
  });
});

describe('runtime configuration', () => {
  test('a secret or service-role key makes authentication misconfigured, and no session is ever reported', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project-ref.supabase.test';
    for (const key of [`sb_secret_${'x'.repeat(20)}`, fakeJwt('service_role')]) {
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = key;
      assert.equal(readAuthConfig().status, 'misconfigured');
      const client = createAuthClient();
      assert.equal((await client.getState()).status, 'misconfigured');
      assert.equal(await client.getAccessToken(), null);
    }
  });

  test('without settings, authentication is not configured and sign-in fails explicitly', async () => {
    const client = createAuthClient();
    assert.equal((await client.getState()).status, 'unconfigured');
    assert.equal(await client.getAccessToken(), null);
    const attempt = await client.signInWithPassword('owner@example.test', 'not-a-real-password');
    assert.equal(attempt.ok, false);
  });
});
