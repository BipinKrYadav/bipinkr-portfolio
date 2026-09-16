import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

import { WhatsAppButton } from '@/components/contact/WhatsAppButton';
import { LeadConversion } from '@/components/tracking/LeadConversion';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { caseStudies } from '@/lib/content/case-studies';
import { thankYouContent } from '@/lib/content/pages/contact';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Thank you',
  description: 'Your ad audit request has been received.',
  path: '/thank-you',
  // A confirmation page has no search value and should never appear in
  // results — a visitor landing here from Google would convert nothing.
  noIndex: true,
});

/** Header block, rendered in whichever state applies. */
function Intro({ eyebrow, h1, body }: { eyebrow: string; h1: string; body: string }) {
  return (
    <div className="max-w-3xl">
      <p className="eyebrow-label">{eyebrow}</p>
      <h1 className="mt-5 font-serif text-display-lg text-ink">{h1}</h1>
      <p className="mt-6 text-lg leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

export default function ThankYouPage() {
  const { confirmed, direct } = thankYouContent;

  return (
    <>
      <section className="border-b border-line bg-paper-sunk pb-section-sm pt-16 sm:pt-20">
        <Container>
          {/*
            This component fires `generate_lead` — once, and only for a
            submission the form endpoint confirmed. It also decides which of
            the two copy states below is shown.
          */}
          <LeadConversion
            confirmed={
              <>
                <Intro {...confirmed} />
                <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <WhatsAppButton
                    size="lg"
                    location="thank_you"
                    message={thankYouContent.whatsappMessage}
                  />
                  <Button href="/case-studies" size="lg" variant="secondary">
                    Read the case studies
                  </Button>
                </div>
                <p className="mt-7 max-w-xl text-sm text-ink-faint">
                  {thankYouContent.whatsappPrompt}
                </p>
              </>
            }
            direct={
              <>
                <Intro {...direct} />
                <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    href="/contact"
                    size="lg"
                    analyticsEvent="audit_cta_click"
                    analyticsProps={{ location: 'thank_you' }}
                    trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
                  >
                    Get a Free Ad Audit
                  </Button>
                  <Button href="/case-studies" size="lg" variant="secondary">
                    Read the case studies
                  </Button>
                </div>
              </>
            }
          />
        </Container>
      </section>

      {/* What happens next — useful in both states, so rendered unconditionally. */}
      <Section spacing="compact">
        <h2 className="font-serif text-display-sm text-ink">
          {thankYouContent.nextSteps.heading}
        </h2>

        <ol className="mt-10 grid grid-cols-1 gap-x-12 gap-y-8 lg:grid-cols-3">
          {thankYouContent.nextSteps.steps.map((step) => (
            <li key={step.number} className="border-t border-line pt-6">
              <p className="font-serif text-sm tabular-nums text-ink-faint">{step.number}</p>
              <h3 className="mt-3 text-base font-semibold text-ink">{step.title}</h3>
              <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Keep the visitor reading rather than dead-ending the page. */}
      <Section tone="sunk" bordered spacing="compact">
        <h2 className="font-serif text-display-sm text-ink">
          {thankYouContent.meanwhile.heading}
        </h2>
        <p className="mt-4 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-soft">
          {thankYouContent.meanwhile.body}
        </p>

        <ul className="mt-8 grid grid-cols-1 gap-x-10 sm:grid-cols-2">
          {caseStudies.map((study) => (
            <li key={study.slug}>
              <Button
                href={`/case-studies/${study.slug}`}
                variant="ghost"
                className="w-full justify-between border-b border-line py-3.5 text-left"
                trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />}
              >
                {study.cardTitle}
              </Button>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
