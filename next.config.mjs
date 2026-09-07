/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static HTML export — deployable to Hostinger (or any static host) with no Node runtime.
  output: 'export',

  // Emits /about/index.html instead of /about.html so Apache serves clean URLs on Hostinger.
  trailingSlash: true,

  // next/image optimisation needs a server; static export ships the raw files instead.
  images: {
    unoptimized: true,
  },

  reactStrictMode: true,

  // Fail the build on type errors rather than shipping a broken export.
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
