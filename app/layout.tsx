import type { Metadata, Viewport } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';

import './globals.css';

import { MobileCtaBar } from '@/components/blocks/MobileCtaBar';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { TrackingProvider } from '@/components/tracking/TrackingProvider';
import { ConsentDefaults, TrackingScripts } from '@/components/tracking/TrackingScripts';
import { siteConfig } from '@/content/site-config';
import { jsonLd, personSchema, websiteSchema } from '@/lib/seo';

/**
 * Fonts are self-hosted by next/font — no request ever leaves the visitor's
 * browser for a font file, which keeps the privacy page honest and removes
 * a render-blocking third-party round trip.
 */
const sans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const serif = Source_Serif_4({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
  weight: ['400', '600'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} | ${siteConfig.role} | Meta & Google Ads`,
    template: `%s | ${siteConfig.name}`,
  },
  description:
    'Performance marketer focused on Meta Ads, Google Ads, lead generation, landing pages and measurement for real estate and local businesses.',
  applicationName: `${siteConfig.name} — ${siteConfig.role}`,
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  keywords: [
    'performance marketer',
    'Meta Ads',
    'Google Ads',
    'lead generation',
    'real estate marketing',
    'conversion tracking',
    'Patna',
  ],
  alternates: { canonical: siteConfig.url },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/favicon.svg' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#FBFAF7',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${sans.variable} ${serif.variable}`}>
      <head>
        {/* Must be the first script on the page — see ConsentDefaults. */}
        <ConsentDefaults />
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(personSchema())} />
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(websiteSchema())} />
      </head>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-card focus:bg-ink focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-ink-inverse"
        >
          Skip to content
        </a>

        <Header />

        <main id="main" className="flex-1">
          {children}
        </main>

        <Footer />

        {/* Small-screen CTA. Delete this line to remove it entirely. */}
        <MobileCtaBar />

        <TrackingProvider />
        <TrackingScripts />
      </body>
    </html>
  );
}
