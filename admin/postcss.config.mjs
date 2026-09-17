import { fileURLToPath } from 'node:url';

/**
 * Tailwind looks for its config in the working directory, which is the
 * repository root when running `npm run admin:build`. Point it at the admin
 * config explicitly so the public site's config and scan paths are never used.
 */
/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: { config: fileURLToPath(new URL('./tailwind.config.ts', import.meta.url)) },
    autoprefixer: {},
  },
};

export default config;
