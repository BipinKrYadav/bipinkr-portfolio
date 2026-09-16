import { Linkedin, Mail, MessageCircle } from 'lucide-react';
import type { Metadata } from 'next';

import { RecruiterCTA } from '@/components/blocks/RecruiterCTA';
import { ContactForm } from '@/components/contact/ContactForm';
import { WhatsAppButton } from '@/components/contact/WhatsAppButton';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { auditOffer, contactContent, formCopy, recruiterCta } from '@/lib/content/pages/contact';
import {
  hasEmail,
  hasLinkedIn,
  hasWhatsApp,
  mailtoLink,
  siteConfig,
} from '@/content/site-config';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Contact Bipin Kumar | Performance Marketing',
  description:
    'Request a free ad audit or start a WhatsApp conversation about your Meta Ads, Google Ads, landing page or tracking setup.',
  path: '/contact',
});

export default function ContactPage() {
  const email = mailtoLink('Free Ad Audit enquiry');
  const hasAnyDirectContact = hasEmail || hasLinkedIn || hasWhatsApp;

  return (
    <>
      <section className="border-b border-line bg-paper-sunk pb-section-sm pt-16 sm:pt-20">
        <Container>
          <div className="max-w-3xl">
            <p className="eyebrow-label">{contactContent.eyebrow}</p>
            <h1 className="mt-5 font-serif text-display-lg text-ink">{contactContent.h1}</h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-soft">{contactContent.intro}</p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                href="#audit-form"
                size="lg"
                analyticsEvent="audit_cta_click"
                analyticsProps={{ location: 'contact' }}
              >
                {contactContent.primaryCta}
              </Button>
              <WhatsAppButton size="lg" location="contact" />
            </div>

            <p className="mt-7 max-w-[66ch] text-sm text-ink-faint">{contactContent.responseNote}</p>
          </div>
        </Container>
      </section>

      {/* What the audit covers */}
      <Section spacing="compact">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <h2 className="font-serif text-display-md text-ink">{auditOffer.heading}</h2>
            <p className="mt-5 text-[1.0625rem] leading-relaxed text-ink-soft">{auditOffer.body}</p>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-faint">
              {auditOffer.disclaimer}
            </p>
          </div>

          <div className="lg:col-span-7">
            <dl className="space-y-0">
              {auditOffer.covers.map((item) => (
                <div key={item.title} className="border-b border-line py-5 first:pt-0">
                  <dt className="text-base font-semibold text-ink">{item.title}</dt>
                  <dd className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">
                    {item.body}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 rounded-card border border-line-strong bg-paper-sunk p-6">
              <h3 className="text-micro font-semibold uppercase tracking-[0.11em] text-ink-faint">
                {auditOffer.boundaries.heading}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {auditOffer.boundaries.items.map((item) => (
                  <li key={item} className="text-sm leading-relaxed text-ink-soft">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* Form */}
      <Section id="audit-form" tone="sunk" bordered>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <h2 className="font-serif text-display-sm text-ink">{formCopy.heading}</h2>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-ink-soft">{formCopy.body}</p>

            {/* Direct alternatives */}
            {hasAnyDirectContact ? (
              <div className="mt-10 border-t border-line pt-6">
                <h3 className="text-micro font-semibold uppercase tracking-[0.11em] text-ink-faint">
                  Or reach me directly
                </h3>
                <ul className="mt-4 space-y-3">
                  {hasWhatsApp ? (
                    <li>
                      <WhatsAppButton
                        variant="ghost"
                        location="contact"
                        label="WhatsApp"
                      />
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

                  {hasLinkedIn ? (
                    <li>
                      <Button
                        href={siteConfig.linkedinUrl}
                        external
                        variant="ghost"
                        analyticsEvent="linkedin_click"
                        analyticsProps={{ location: 'contact' }}
                        leadingIcon={<Linkedin aria-hidden="true" className="h-4 w-4" />}
                      >
                        LinkedIn
                      </Button>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : (
              <div className="mt-10 flex gap-3 border-t border-line pt-6">
                <MessageCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
                <p className="text-sm leading-relaxed text-ink-faint">
                  Direct contact routes appear here once they are configured. The form below is the
                  reliable way to reach me in the meantime.
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-8">
            <ContactForm />
          </div>
        </div>
      </Section>

      {/* Recruiter */}
      <Section spacing="compact" bordered>
        <RecruiterCTA heading={recruiterCta.heading} body={recruiterCta.body} location="contact" />
      </Section>
    </>
  );
}
