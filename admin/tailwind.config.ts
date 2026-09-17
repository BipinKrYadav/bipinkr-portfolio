import type { Config } from 'tailwindcss';

import publicSiteConfig from '../tailwind.config';

/**
 * Reuses the public site's design tokens (colours, type, radii) as a preset,
 * but scans only admin files. The public site's Tailwind config does not scan
 * this directory, so admin classes can never change the public CSS.
 */
const config: Config = {
  presets: [publicSiteConfig],
  content: {
    relative: true,
    files: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  },
};

export default config;
