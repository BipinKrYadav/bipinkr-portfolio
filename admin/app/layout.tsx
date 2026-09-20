import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import type { ReactNode } from 'react';

import './globals.css';

import { AuthProvider } from '@admin/components/auth/AuthProvider';

const sans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: {
    default: 'Admin · bipinkr.in',
    template: '%s · Admin · bipinkr.in',
  },
  // The admin is never indexed, cached or followed (robots.txt disallows it too).
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
  referrer: 'no-referrer',
  formatDetection: { telephone: false, email: false, address: false },
  icons: { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }] },
};

export const viewport: Viewport = {
  themeColor: '#17191C',
  width: 'device-width',
  initialScale: 1,
};

/**
 * Same-origin only, apart from this project's own Supabase API: no
 * third-party scripts (no GTM, GA4 or Meta Pixel can load), no other external
 * connections, no framing of other origins' content. 'unsafe-inline' is
 * required by the Next.js static export bootstrap scripts.
 *
 * connect-src names the exact Supabase origin from the build settings — never
 * a wildcard — so the panel can only talk to its own project.
 */
const development = process.env.NODE_ENV === 'development';

function supabaseOrigin(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) return '';
  try {
    return ` ${new URL(url).origin}`;
  } catch {
    return '';
  }
}

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  `connect-src 'self'${supabaseOrigin()}${development ? ' ws: wss:' : ''}`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" className={sans.variable}>
      <head>
        <meta httpEquiv="Content-Security-Policy" content={contentSecurityPolicy} />
      </head>
      <body data-app="bipinkr-admin">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
