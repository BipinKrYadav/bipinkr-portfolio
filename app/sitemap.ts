import type { MetadataRoute } from 'next';

import { articles } from '@/content/blog';
import { caseStudySlugs } from '@/content/case-studies';
import { absoluteUrl } from '@/content/site-config';

// Required by `output: 'export'` — emitted as a static file at build time.
export const dynamic = 'force-static';

/**
 * Generated statically at build time and emitted as /sitemap.xml in the
 * export, so it works on Hostinger with no server.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticRoutes: { path: string; priority: number; changeFrequency: 'monthly' | 'yearly' }[] = [
    { path: '/', priority: 1, changeFrequency: 'monthly' },
    { path: '/case-studies', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/services', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/free-ad-audit', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/blog', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/about', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/contact', priority: 0.8, changeFrequency: 'yearly' },
    { path: '/resume', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/how-this-site-is-tracked', priority: 0.4, changeFrequency: 'monthly' },
    { path: '/privacy', priority: 0.2, changeFrequency: 'yearly' },
    // /thank-you is deliberately absent: it is noindex, and a visitor
    // arriving there from search would convert nothing.
  ];

  const caseStudyRoutes = caseStudySlugs.map((slug) => ({
    url: absoluteUrl(`/case-studies/${slug}/`),
    lastModified,
    changeFrequency: 'monthly' as const,
    priority: 0.85,
  }));

  /**
   * Articles carry their own dateModified rather than the build timestamp,
   * so an unchanged article does not claim to have been updated on every
   * deploy.
   */
  const articleRoutes = articles.map((article) => ({
    url: absoluteUrl(`/blog/${article.slug}/`),
    lastModified: new Date(`${article.dateModified}T00:00:00Z`),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [
    ...staticRoutes.map((route) => ({
      url: absoluteUrl(route.path === '/' ? '/' : `${route.path}/`),
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
    })),
    ...caseStudyRoutes,
    ...articleRoutes,
  ];
}
