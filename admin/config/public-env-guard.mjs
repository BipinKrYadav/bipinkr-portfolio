/**
 * Build-time environment checks for the admin panel.
 *
 * 1. Anything named NEXT_PUBLIC_* is inlined into browser JavaScript at build
 *    time, so a secret in one of those variables would be published. Every
 *    admin build fails if one is present.
 * 2. A build meant for deployment must have the Supabase settings. Without
 *    them the panel can only show its "Authentication not configured" shell,
 *    which must never be what gets deployed.
 */

/** The only Supabase values that may reach the browser. */
export const REQUIRED_PUBLIC_ENV = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];

/**
 * @param {Record<string, string | undefined>} env
 * @returns {string[]} problems found (empty when safe)
 */
export function findPublicEnvSecrets(env) {
  const problems = [];

  for (const [name, rawValue] of Object.entries(env)) {
    if (!name.startsWith('NEXT_PUBLIC_')) continue;
    const value = String(rawValue ?? '').trim();

    if (/SERVICE|SECRET|PRIVATE|PASSWORD|JWT/i.test(name)) {
      problems.push(`${name}: variable name suggests a server-only secret`);
    }
    if (/^sb_secret_/.test(value)) {
      problems.push(`${name}: contains a Supabase secret key`);
    }
    const payload = value.split('.')[1];
    if (value.startsWith('eyJ') && payload) {
      try {
        const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (claims.role && claims.role !== 'anon') {
          problems.push(`${name}: contains a JWT with role "${claims.role}"`);
        }
      } catch {
        // Not a decodable JWT; nothing to check.
      }
    }
  }

  return problems;
}

/** @param {Record<string, string | undefined>} env */
export function assertNoSecretsInPublicEnv(env) {
  const problems = findPublicEnvSecrets(env);
  if (problems.length > 0) {
    throw new Error(
      `Refusing to build the admin panel: secrets would be exposed to the browser.\n  ${problems.join('\n  ')}\n` +
        'Only the Supabase URL and publishable (anon) key may be NEXT_PUBLIC_*. Remove the value and rotate the key.',
    );
  }
}

/**
 * A build is treated as deployable when it runs in CI, or when the builder
 * says so with ADMIN_BUILD_TARGET=deploy. Local builds without that are
 * shell-only builds, used for checks and screenshots.
 *
 * @param {Record<string, string | undefined>} env
 */
export function isDeployBuild(env) {
  return env.ADMIN_BUILD_TARGET === 'deploy' || env.CI === 'true';
}

/**
 * Supabase settings missing from a build.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {string[]}
 */
export function missingRequiredPublicEnv(env) {
  return REQUIRED_PUBLIC_ENV.filter((name) => String(env[name] ?? '').trim() === '');
}

/**
 * Fails a deployable build whose Supabase settings are missing, and returns a
 * warning for a shell build so it is never mistaken for a deployable one.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {string | null} warning to show, if any
 */
export function assertPublicEnvForTarget(env) {
  const missing = missingRequiredPublicEnv(env);
  if (missing.length === 0) return null;

  if (isDeployBuild(env)) {
    throw new Error(
      `Refusing to build the admin panel for deployment: ${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} not set.\n` +
        'Without them the panel can only render its "Authentication not configured" shell, which must not be deployed.\n' +
        'Set the Supabase URL and publishable (anon) key, or build without ADMIN_BUILD_TARGET=deploy for a shell build.',
    );
  }

  return (
    `Admin shell build: ${missing.join(' and ')} not set, so the panel will show "Authentication not configured" and load no data. ` +
    'Not for deployment.'
  );
}
