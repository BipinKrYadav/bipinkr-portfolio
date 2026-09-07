import type { MetadataRoute } from 'next';

import { absoluteUrl } from '@/content/site-config';

// Required by `output: 'export'` — emitted as a static file at build time.
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  };
}
