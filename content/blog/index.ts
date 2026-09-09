import * as googleAdsConversionTracking from './google-ads-conversion-tracking';
import type { BlogArticleSummary } from '../types';

/**
 * The article registry.
 *
 * Newest first. Each article page imports its own module directly for the
 * full content; this index carries only what a card, the sitemap and the
 * "next article" link need.
 *
 * There are deliberately no per-theme routes. A theme is a label, not a
 * page — see the note on `BlogTheme` in `content/types.ts`.
 */
export const articles: BlogArticleSummary[] = [googleAdsConversionTracking.summary].sort(
  (a, b) => b.datePublished.localeCompare(a.datePublished),
);

export const articleSlugs = articles.map((article) => article.slug);

export function getArticle(slug: string): BlogArticleSummary | undefined {
  return articles.find((article) => article.slug === slug);
}

/**
 * The next article in reading order, or null when this is the only one.
 * Returning null keeps the "next" block from linking an article to itself.
 */
export function getNextArticle(slug: string): BlogArticleSummary | null {
  if (articles.length < 2) return null;
  const index = articles.findIndex((article) => article.slug === slug);
  return articles[(index + 1) % articles.length];
}

export const blogIndexContent = {
  eyebrow: 'Insights',
  heading: 'Performance Marketing Insights',
  subheading:
    'Practical lessons from real campaign data, measurement audits, lead generation, and performance marketing.',
  intro: [
    'Every article here is built from campaign data I can actually show you, and carries the same evidence labels and stated limitations as the case studies.',
    'Where the data supports a conclusion, I draw it. Where it does not, I say so — which is why you will find no revenue figures, no return-on-ad-spend claims and no qualified-lead counts anywhere on this site.',
  ],
  themesHeading: 'What I write about',
  themes: [
    { name: 'Meta Ads', description: 'Campaign structure, lead forms, creative testing and cost per result.' },
    { name: 'Google Ads', description: 'Search and Performance Max, campaign structure and search-term analysis.' },
    { name: 'Tracking & Measurement', description: 'Conversion definitions, tracking integrity and what platform data can support.' },
    { name: 'Real Estate Marketing', description: 'Residential lead generation, cost per lead and funnel thinking.' },
    { name: 'Lead Generation', description: 'What happens between the click and a lead the business actually wants.' },
  ],
  emptyState:
    'More articles are in progress. Each one waits until there is documented campaign evidence behind it.',
};
