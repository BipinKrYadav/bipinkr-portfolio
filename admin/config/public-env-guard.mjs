/**
 * Anything named NEXT_PUBLIC_* is inlined into browser JavaScript at build
 * time, so a secret in one of those variables would be published. The admin
 * build calls this before anything else and fails if one is present.
 */

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
