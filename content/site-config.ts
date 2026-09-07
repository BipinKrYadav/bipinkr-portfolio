/**
 * Central site configuration.
 *
 * Everything an operator needs to change lives here or in `.env.local`.
 * Nothing in this file is invented: values that are not known yet are left
 * as empty strings, and every component that consumes them is written to
 * hide the feature rather than render a broken link or a fake detail.
 */

/**
 * IMPORTANT — every `process.env.NEXT_PUBLIC_*` below MUST be written as a
 * literal member expression.
 *
 * Next.js inlines these values at build time by textual substitution. A
 * computed lookup (`process.env[key]`) is invisible to that substitution, so
 * it resolves on the server during prerender but is `undefined` in the
 * browser — where `process` does not exist at all. The symptom is nasty:
 * values appear correct in the static HTML and then vanish on hydration,
 * because a client component re-evaluates them and gets nothing.
 *
 * Do not refactor these into a lookup helper.
 */
const clean = (value: string | undefined, fallback = ''): string =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;

const raw = {
  siteUrl: clean(process.env.NEXT_PUBLIC_SITE_URL, 'https://bipinkr.in'),
  email: clean(process.env.NEXT_PUBLIC_CONTACT_EMAIL),
  linkedinUrl: clean(process.env.NEXT_PUBLIC_LINKEDIN_URL),
  whatsappNumber: clean(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER),
  formEndpoint: clean(process.env.NEXT_PUBLIC_FORM_ENDPOINT),
  resumeFile: clean(process.env.NEXT_PUBLIC_RESUME_FILE, 'bipin-kumar-resume.pdf'),
};

/** Digits only, no "+", spaces or dashes. Empty until configured. */
const rawWhatsApp = raw.whatsappNumber.replace(/[^\d]/g, '');

export const siteConfig = {
  name: 'Bipin Kumar',
  shortName: 'Bipin Kumar',
  role: 'Performance Marketer',
  headline: 'Performance Marketing · Meta Ads · Google Ads',
  domain: 'bipinkr.in',
  url: raw.siteUrl.replace(/\/$/, ''),
  location: 'Patna, India',
  locality: 'Patna',
  region: 'Bihar',
  country: 'India',

  /** Contact details. Empty = the corresponding UI is not rendered. */
  email: raw.email,
  linkedinUrl: raw.linkedinUrl,
  whatsappNumber: rawWhatsApp,

  /** Contact form POST target. Empty = form shows a setup notice. */
  formEndpoint: raw.formEndpoint,

  /** Resume asset in /public/documents/. */
  resumeFile: raw.resumeFile,

  /**
   * Tracking is configured in `lib/tracking/config.ts` (GTM, GA4, Google
   * Ads, Meta Pixel), not here. With no IDs set, no tracking script loads
   * and the site makes no third-party request.
   */

  /** Positioning — used for metadata, structured data and the footer. */
  disciplines: ['Meta Ads', 'Google Ads', 'Landing Pages', 'Measurement'],
  focusIndustries: ['Real estate', 'Local businesses', 'Education'],
} as const;

export type SiteConfig = typeof siteConfig;

export const resumePath = `/documents/${siteConfig.resumeFile}`;

export const hasEmail = siteConfig.email.length > 0;
export const hasLinkedIn = siteConfig.linkedinUrl.length > 0;
export const hasWhatsApp = siteConfig.whatsappNumber.length >= 8;
export const hasFormEndpoint = siteConfig.formEndpoint.length > 0;

/** Default prefilled WhatsApp message, per the brief. */
export const whatsappMessage =
  'Hi Bipin, I found your portfolio and would like to discuss my Meta/Google Ads campaign.';

/**
 * Builds a wa.me link, or returns null when no number is configured so
 * callers can omit the button entirely instead of linking nowhere.
 */
export function whatsappLink(message: string = whatsappMessage): string | null {
  if (!hasWhatsApp) return null;
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export function mailtoLink(subject = 'Free Ad Audit enquiry'): string | null {
  if (!hasEmail) return null;
  return `mailto:${siteConfig.email}?subject=${encodeURIComponent(subject)}`;
}

/** Absolute URL helper for canonicals, sitemap and Open Graph. */
export function absoluteUrl(path = '/'): string {
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${siteConfig.url}${suffix}`;
}
