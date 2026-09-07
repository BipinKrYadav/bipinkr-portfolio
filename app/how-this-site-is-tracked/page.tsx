import { ArrowRight, Minus } from 'lucide-react';
import type { Metadata } from 'next';

import { CTASection } from '@/components/blocks/CTASection';
import { DataTable } from '@/components/data/DataTable';
import { FlowDiagram } from '@/components/data/FlowDiagram';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import {
  chainNote,
  distinction,
  distinctionTable,
  statusNote,
  steps,
  trackingChain,
  trackingPageContent,
  whatIsNotCollected,
  whyItMatters,
} from '@/content/pages/tracking';
import {
  consentRequired,
  hasGa4,
  hasGoogleAds,
  hasGtm,
  hasMetaPixel,
  trackingEnabled,
} from '@/lib/tracking/config';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'How this site is tracked',
  description:
    'A plain explanation of the measurement setup on bipinkr.in: consent, tag management, the events recorded, and why a platform conversion is not the same thing as a business outcome.',
  path: '/how-this-site-is-tracked',
});

/**
 * Live status rows, read from the build-time configuration.
 * This is what keeps the page from making a claim that has gone stale.
 */
const statusRows: { label: string; value: string; active: boolean }[] = [
  { label: statusNote.labels.gtm, value: hasGtm ? statusNote.active : statusNote.inactive, active: hasGtm },
  { label: statusNote.labels.ga4, value: hasGa4 ? statusNote.active : statusNote.inactive, active: hasGa4 },
  {
    label: statusNote.labels.googleAds,
    value: hasGoogleAds ? statusNote.active : statusNote.inactive,
    active: hasGoogleAds,
  },
  {
    label: statusNote.labels.metaPixel,
    value: hasMetaPixel ? statusNote.active : statusNote.inactive,
    active: hasMetaPixel,
  },
  {
    label: statusNote.labels.consent,
    value: consentRequired ? statusNote.consentOn : statusNote.consentOff,
    active: consentRequired,
  },
];

export default function HowThisSiteIsTrackedPage() {
  return (
    <>
      <section className="border-b border-line bg-paper-sunk pb-section-sm pt-16 sm:pt-20">
        <Container>
          <div className="max-w-3xl">
            <p className="eyebrow-label">{trackingPageContent.eyebrow}</p>
            <h1 className="mt-5 font-serif text-display-lg text-ink">{trackingPageContent.h1}</h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-soft">
              {trackingPageContent.intro}
            </p>
            <p className="mt-5 text-[1.0625rem] leading-relaxed text-ink-soft">
              {trackingPageContent.secondaryIntro}
            </p>
          </div>
        </Container>
      </section>

      {/* The chain */}
      <Section>
        <h2 className="font-serif text-display-md text-ink">Visit to outcome, end to end</h2>
        <FlowDiagram nodes={trackingChain} layout="chain" className="mt-10" note={chainNote} />
      </Section>

      {/* Step by step */}
      <Section tone="sunk" bordered>
        <h2 className="font-serif text-display-md text-ink">What actually happens</h2>

        <ol className="mt-12 grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-2">
          {steps.map((step) => (
            <li key={step.number} className="border-t border-line pt-6">
              <p className="font-serif text-sm tabular-nums text-ink-faint">{step.number}</p>
              <h3 className="mt-3 text-lg font-semibold text-ink">{step.title}</h3>
              <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* The distinction — the point of the page */}
      <Section bordered>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="eyebrow-label">The important part</p>
            <h2 className="mt-4 font-serif text-display-md text-ink">{distinction.heading}</h2>
          </div>

          <div className="lg:col-span-7">
            <div className="prose-editorial">
              {distinction.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </div>

        <DataTable {...distinctionTable} className="mt-12" />
      </Section>

      {/* Not collected */}
      <Section tone="sunk" bordered spacing="compact">
        <h2 className="font-serif text-display-sm text-ink">{whatIsNotCollected.heading}</h2>

        <ul className="mt-8 grid grid-cols-1 gap-x-12 sm:grid-cols-2">
          {whatIsNotCollected.items.map((item) => (
            <li
              key={item}
              className="flex items-center gap-2.5 border-b border-line py-3 text-sm text-ink-soft"
            >
              <Minus aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
              {item}
            </li>
          ))}
        </ul>

        <p className="mt-8 max-w-3xl border-l-2 border-line-strong pl-4 text-[0.9375rem] leading-relaxed text-ink-soft">
          {whatIsNotCollected.closing}
        </p>
      </Section>

      {/* Live status */}
      <Section bordered spacing="compact">
        <h2 className="font-serif text-display-sm text-ink">{statusNote.heading}</h2>
        <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-ink-faint">
          {statusNote.intro}
        </p>

        <p className="mt-6 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-soft">
          {trackingEnabled ? statusNote.activeBody : statusNote.inactiveBody}
        </p>

        <dl className="mt-8 max-w-2xl">
          {statusRows.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 border-b border-line py-3.5"
            >
              <dt className="text-sm text-ink-soft">{row.label}</dt>
              <dd>
                <span
                  className={
                    row.active
                      ? 'inline-flex items-center rounded-pill border border-accent-line bg-accent-soft px-2.5 py-0.5 text-micro font-semibold uppercase tracking-[0.08em] text-evidence-verified'
                      : 'inline-flex items-center rounded-pill border border-line-strong bg-paper-sunk px-2.5 py-0.5 text-micro font-semibold uppercase tracking-[0.08em] text-ink-faint'
                  }
                >
                  {row.value}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* Why */}
      <Section tone="night">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <h2 className="font-serif text-display-md text-ink-inverse">{whyItMatters.heading}</h2>
          </div>

          <div className="lg:col-span-7">
            <div className="space-y-5 text-[1.0625rem] leading-relaxed text-ink-inverse/70">
              {whyItMatters.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <Button
              href={whyItMatters.ctaHref}
              variant="secondaryOnDark"
              className="mt-8"
              trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
            >
              {whyItMatters.ctaLabel}
            </Button>
          </div>
        </div>
      </Section>

      <CTASection
        eyebrow="Next step"
        heading="Not sure whether your conversion data is trustworthy?"
        body="That is the first thing I check in any account, before touching a budget. Send me what you have and I will tell you what it supports."
        note="An initial assessment based on the information you provide — not a guarantee of performance."
        location="tracking"
      />
    </>
  );
}
