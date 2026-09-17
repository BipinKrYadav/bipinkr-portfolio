/**
 * Admin panel — a separate static Next.js app (npm run admin:build).
 *
 * Built and deployed independently of the public site: it has its own routes,
 * layout, Tailwind scan paths and output (admin/out). The public site never
 * imports anything from this directory.
 */

/**
 * Anything named NEXT_PUBLIC_* is inlined into browser JavaScript at build
 * time, so a secret in one of those variables would be published. Fail the
 * build before that can happen.
 */
function assertNoSecretsInPublicEnv(env) {
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

  if (problems.length > 0) {
    throw new Error(
      `Refusing to build the admin panel: secrets would be exposed to the browser.\n  ${problems.join('\n  ')}\n` +
        'Only the Supabase URL and publishable (anon) key may be NEXT_PUBLIC_*. Remove the value and rotate the key.',
    );
  }
}

assertNoSecretsInPublicEnv(process.env);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
