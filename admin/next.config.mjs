import { PHASE_PRODUCTION_BUILD } from 'next/constants.js';

import { assertNoSecretsInPublicEnv, assertPublicEnvForTarget } from './config/public-env-guard.mjs';

/**
 * Admin panel — a separate static Next.js app (npm run admin:build).
 *
 * Built and deployed independently of the public site: it has its own routes,
 * layout, Tailwind scan paths and output (admin/out). The public site never
 * imports anything from this directory.
 */

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
  experimental: {
    // Lets the admin compile the site's pure metric modules (lib/metrics/formulas.ts
    // and format.ts) instead of keeping a second copy of the formula engine.
    externalDir: true,
  },
};

/** @param {string} phase */
export default function config(phase) {
  // No secret may ever reach the browser bundle, in any phase.
  assertNoSecretsInPublicEnv(process.env);

  // A deployable build (CI, or ADMIN_BUILD_TARGET=deploy) must have the
  // Supabase settings; a local shell build only warns.
  if (phase === PHASE_PRODUCTION_BUILD) {
    const warning = assertPublicEnvForTarget(process.env);
    if (warning) console.warn(`\n⚠  ${warning}\n`);
  }

  return nextConfig;
}
