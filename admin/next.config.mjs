import { assertNoSecretsInPublicEnv } from './config/public-env-guard.mjs';

/**
 * Admin panel — a separate static Next.js app (npm run admin:build).
 *
 * Built and deployed independently of the public site: it has its own routes,
 * layout, Tailwind scan paths and output (admin/out). The public site never
 * imports anything from this directory.
 */

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
  experimental: {
    // Lets the admin compile the site's pure metric modules (lib/metrics/formulas.ts
    // and format.ts) instead of keeping a second copy of the formula engine.
    externalDir: true,
  },
};

export default nextConfig;
