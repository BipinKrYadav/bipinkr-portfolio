/**
 * Public Supabase settings for the admin panel.
 *
 * Only two values may ever reach the browser: the project URL and the
 * publishable (anon) key. Both are designed to be public; data stays protected
 * by RLS, which requires an allow-listed admin with an MFA-verified session.
 * The service-role key, database password and JWT secret must never be set
 * here — next.config.mjs fails the build if one is, and this check refuses
 * them again at runtime.
 *
 * The `process.env.NEXT_PUBLIC_*` reads must stay literal member expressions
 * so Next.js can inline them.
 */

export type AuthConfig =
  | { status: 'unconfigured'; missing: string[] }
  | { status: 'misconfigured'; problem: string }
  | { status: 'configured'; url: string; publishableKey: string };

export function readAuthConfig(): AuthConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

  const missing = [
    url ? null : 'NEXT_PUBLIC_SUPABASE_URL',
    publishableKey ? null : 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  ].filter((name): name is string => name !== null);
  if (missing.length > 0) return { status: 'unconfigured', missing };

  const keyProblem = unsafeKeyProblem(publishableKey);
  if (keyProblem) return { status: 'misconfigured', problem: keyProblem };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { status: 'misconfigured', problem: 'The Supabase URL is not a valid URL.' };
  }
  const local = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  if (parsed.protocol !== 'https:' && !local) {
    return { status: 'misconfigured', problem: 'The Supabase URL must use HTTPS.' };
  }

  return { status: 'configured', url: parsed.origin, publishableKey };
}

/** Describes why a key must not be used in the browser, or null if it looks publishable. */
function unsafeKeyProblem(key: string): string | null {
  if (key.startsWith('sb_secret_')) {
    return 'A Supabase secret key was supplied. Remove it and rotate it.';
  }
  const payload = key.startsWith('eyJ') ? key.split('.')[1] : undefined;
  if (payload) {
    try {
      const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: unknown };
      if (claims.role !== 'anon') {
        return 'The key is not a publishable (anon) key. Remove it and rotate it.';
      }
    } catch {
      return 'The key could not be read.';
    }
  }
  return null;
}
