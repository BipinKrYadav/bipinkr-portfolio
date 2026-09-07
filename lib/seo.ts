import type { Metadata } from 'next';

import { absoluteUrl, hasLinkedIn, siteConfig } from '@/content/site-config';

interface PageMetaOptions {
  title: string;
  description: string;
  /** Route path, e.g. "/case-studies". Used for the canonical URL. */
  path: string;
  /** Set for case studies so they are typed as articles in Open Graph. */
  type?: 'website' | 'article';
  /** Set true for utility pages that should not be indexed. */
  noIndex?: boolean;
}

/**
 * Builds a complete metadata object for a route: title, description,
 * canonical URL, Open Graph and Twitter cards.
 *
 * The social card image is deliberately not set here — `app/opengraph-image.tsx`
 * generates it at build time and Next applies it to every route below `app/`,
 * for both Open Graph and Twitter.
 */
export function buildMetadata({
  title,
  description,
  path,
  type = 'website',
  noIndex = false,
}: PageMetaOptions): Metadata {
  const url = absoluteUrl(path);

  // The root layout appends "| Bipin Kumar" via its title template. Pages
  // whose title already carries the name (About, Contact, Resume) would
  // otherwise render it twice, so those opt out of the template.
  const pageTitle = title.includes(siteConfig.name) ? { absolute: title } : title;

  return {
    title: pageTitle,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: `${siteConfig.name} — ${siteConfig.role}`,
      locale: 'en_IN',
      type,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: noIndex
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
  };
}

/** Person structured data, rendered once in the root layout. */
export function personSchema() {
  const sameAs = [hasLinkedIn ? siteConfig.linkedinUrl : null].filter(
    (value): value is string => Boolean(value),
  );

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: siteConfig.name,
    url: siteConfig.url,
    jobTitle: siteConfig.role,
    description:
      'Performance marketer working across Meta Ads, Google Ads, lead generation, landing pages and measurement for real estate and local businesses.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: siteConfig.locality,
      addressRegion: siteConfig.region,
      addressCountry: siteConfig.country,
    },
    knowsAbout: [
      'Performance Marketing',
      'Meta Ads',
      'Google Ads',
      'Lead Generation',
      'Landing Pages',
      'Conversion Tracking',
      'Marketing Measurement',
    ],
    ...(sameAs.length > 0 ? { sameAs } : {}),
  };
}

/** WebSite structured data, rendered once in the root layout. */
export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: `${siteConfig.name} — ${siteConfig.role}`,
    url: siteConfig.url,
    inLanguage: 'en-IN',
    publisher: {
      '@type': 'Person',
      name: siteConfig.name,
    },
  };
}

/** BreadcrumbList structured data for nested pages. */
export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Serialises a schema object for a JSON-LD script tag. */
export function jsonLd(schema: object): { __html: string } {
  return { __html: JSON.stringify(schema).replace(/</g, '\\u003c') };
}
