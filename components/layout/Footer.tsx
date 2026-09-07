import Link from 'next/link';
import { Linkedin, Mail } from 'lucide-react';

import { WhatsAppButton } from '@/components/contact/WhatsAppButton';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { footerNav, legalNav, PRIMARY_CTA } from '@/content/navigation';
import { hasEmail, hasLinkedIn, mailtoLink, siteConfig } from '@/content/site-config';

export function Footer() {
  const year = new Date().getFullYear();
  const email = mailtoLink('Enquiry from bipinkr.in');

  return (
    <footer className="border-t border-line bg-paper-sunk">
      <Container className="py-section-sm">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Identity */}
          <div className="lg:col-span-5">
            <p className="font-serif text-xl font-semibold tracking-tight text-ink">
              {siteConfig.name}
            </p>
            <p className="mt-3 text-sm font-medium text-ink-soft">Performance Marketing</p>
            <p className="mt-1 text-sm text-ink-faint">{siteConfig.disciplines.join(' · ')}</p>
            <p className="mt-4 text-sm text-ink-faint">{siteConfig.location}</p>
          </div>

          {/* Navigation */}
          <nav aria-label="Footer" className="lg:col-span-3">
            <h2 className="text-micro font-semibold uppercase tracking-[0.11em] text-ink-faint">
              Explore
            </h2>
            {/*
              `inline-flex` + `min-h-[2.75rem]` gives each link a 44px touch
              target. The previous 17px-tall links with 10px gaps failed
              WCAG 2.2 SC 2.5.8 (24×24 minimum) on touch devices.
            */}
            <ul className="mt-2">
              {footerNav.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="inline-flex min-h-[2.75rem] items-center rounded-sm text-sm text-ink-soft underline-offset-4 transition-colors hover:text-ink hover:underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Connect */}
          <div className="lg:col-span-4">
            <h2 className="text-micro font-semibold uppercase tracking-[0.11em] text-ink-faint">
              Connect
            </h2>

            {hasLinkedIn || hasEmail || siteConfig.whatsappNumber ? (
              <ul className="mt-4 space-y-2.5">
                {hasLinkedIn ? (
                  <li>
                    <Button
                      href={siteConfig.linkedinUrl}
                      external
                      variant="ghost"
                      analyticsEvent="linkedin_click"
                      analyticsProps={{ location: 'footer' }}
                      leadingIcon={<Linkedin aria-hidden="true" className="h-4 w-4" />}
                    >
                      LinkedIn
                    </Button>
                  </li>
                ) : null}

                {hasEmail && email ? (
                  <li>
                    <Button
                      href={email}
                      variant="ghost"
                      leadingIcon={<Mail aria-hidden="true" className="h-4 w-4" />}
                    >
                      {siteConfig.email}
                    </Button>
                  </li>
                ) : null}

                <li>
                  <WhatsAppButton variant="ghost" location="footer" label="WhatsApp" />
                </li>
              </ul>
            ) : (
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-faint">
                Contact links appear here once configured. Use the contact page in the meantime.
              </p>
            )}

            <Button
              href={PRIMARY_CTA.href}
              size="sm"
              className="mt-6"
              analyticsEvent="audit_cta_click"
              analyticsProps={{ location: 'footer' }}
            >
              {PRIMARY_CTA.label}
            </Button>
          </div>
        </div>

        {/* Legal line */}
        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-faint">
            © {year} {siteConfig.name}
          </p>

          <ul className="flex flex-wrap items-center gap-x-5">
            {legalNav.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="inline-flex min-h-[2.75rem] items-center rounded-sm text-xs text-ink-faint underline-offset-4 transition-colors hover:text-ink-soft hover:underline"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
