import { ArrowRight, Minus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { WhatsAppButton } from '@/components/contact/WhatsAppButton';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { caseStudies } from '@/lib/content/case-studies';
import { proofMethodologyNote, proofMetrics } from '@/lib/content/proof-strip';
import { ProofStrip } from '@/components/blocks/ProofStrip';
import {
  auditFaq,
  auditPageContent,
  boundaries,
  evidenceNote,
  process,
  reviewAreas,
} from '@/content/pages/free-ad-audit';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Free Ad Audit — Meta & Google Ads Review',
  description:
    'A free review of your Meta or Google Ads account: campaign structure, spend, conversion tracking and measurement inconsistencies. An initial assessment, not a performance guarantee.',
  path: '/free-ad-audit',
});

export default function FreeAdAuditPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-line bg-paper-sunk pb-section-sm pt-16 sm:pt-20">
        <Container>
          <div className="max-w-3xl">
            <p className="eyebrow-label">{auditPageContent.eyebrow}</p>
            <h1 className="mt-5 font-serif text-display-lg text-ink">{auditPageContent.h1}</h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-soft">{auditPageContent.intro}</p>
            <p className="mt-5 max-w-[66ch] text-[1.0625rem] leading-relaxed text-ink-soft">
              {auditPageContent.secondaryIntro}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                href="/contact"
                size="lg"
                analyticsEvent="audit_cta_click"
                analyticsProps={{ location: 'free_ad_audit' }}
                trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
              >
                {auditPageContent.primaryCta}
              </Button>
              <WhatsAppButton size="lg" location="free_ad_audit" />
            </div>

            <p className="mt-7 max-w-[66ch] text-sm text-ink-faint">
              {auditPageContent.responseNote}
            </p>
          </div>
        </Container>
      </section>

      {/* What gets reviewed */}
      <Section>
        <h2 className="font-serif text-display-md text-ink">What the audit reviews</h2>

        <dl className="mt-10 grid grid-cols-1 gap-x-12 gap-y-0 lg:grid-cols-2">
          {reviewAreas.map((area) => (
            <div key={area.title} className="border-b border-line py-5">
              <dt className="text-base font-semibold text-ink">{area.title}</dt>
              <dd className="mt-2 max-w-[66ch] text-[0.9375rem] leading-relaxed text-ink-soft">
                {area.body}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* Boundaries — what it is not */}
      <Section tone="sunk" bordered spacing="compact">
        <h2 className="font-serif text-display-sm text-ink">{boundaries.heading}</h2>
        <p className="mt-4 max-w-[66ch] text-[1.0625rem] leading-relaxed text-ink-soft">
          {boundaries.intro}
        </p>

        <ul className="mt-8 max-w-3xl">
          {boundaries.items.map((item) => (
            <li
              key={item}
              className="flex gap-3 border-b border-line py-3.5 text-[0.9375rem] leading-relaxed text-ink-soft"
            >
              <Minus aria-hidden="true" className="mt-1.5 h-3.5 w-3.5 shrink-0 text-ink-faint" />
              <span className="max-w-[66ch]">{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* How it works */}
      <Section bordered>
        <h2 className="font-serif text-display-md text-ink">How it works</h2>

        <ol className="mt-12 grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-3">
          {process.map((step) => (
            <li key={step.number} className="border-t border-line pt-6">
              <p className="font-serif text-sm tabular-nums text-ink-faint">{step.number}</p>
              <h3 className="mt-3 text-base font-semibold text-ink">{step.title}</h3>
              <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Evidence — what this looks like in practice */}
      <Section tone="sunk" bordered>
        <h2 className="font-serif text-display-md text-ink">{evidenceNote.heading}</h2>
        <p className="mt-5 max-w-[66ch] text-[1.0625rem] leading-relaxed text-ink-soft">
          {evidenceNote.body}
        </p>

        <ProofStrip metrics={proofMetrics} note={proofMethodologyNote} className="mt-12" />

        <ul className="mt-10 grid grid-cols-1 gap-x-10 sm:grid-cols-2">
          {caseStudies.map((study) => (
            <li key={study.slug} className="border-b border-line">
              <Link
                href={`/case-studies/${study.slug}`}
                className="flex min-h-[2.75rem] items-center justify-between gap-4 py-3.5 text-[0.9375rem] text-accent underline-offset-4 hover:underline"
              >
                {study.cardTitle}
                <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {/* FAQ — visible on the page, so schema would be appropriate later */}
      <Section bordered spacing="compact">
        <h2 className="font-serif text-display-sm text-ink">Common questions</h2>

        <dl className="mt-8 max-w-3xl">
          {auditFaq.map((item) => (
            <div key={item.question} className="border-b border-line py-5">
              <dt className="text-base font-semibold text-ink">{item.question}</dt>
              <dd className="mt-2 max-w-[66ch] text-[0.9375rem] leading-relaxed text-ink-soft">
                {item.answer}
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* Where to go next */}
      <Section tone="night">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <h2 className="font-serif text-display-md text-ink-inverse">
              Ready when you are.
            </h2>
            <p className="mt-5 max-w-[66ch] text-[1.0625rem] leading-relaxed text-ink-inverse/70">
              Send over whatever you have. If WhatsApp is easier than a form, use that instead —
              both reach me directly.
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                href="/contact"
                size="lg"
                variant="primaryOnDark"
                analyticsEvent="audit_cta_click"
                analyticsProps={{ location: 'free_ad_audit_final' }}
                trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
              >
                {auditPageContent.primaryCta}
              </Button>
              <WhatsAppButton
                size="lg"
                variant="secondaryOnDark"
                location="free_ad_audit_final"
              />
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-8 border-t border-night-line pt-6">
              <Button
                href="/services"
                variant="secondaryOnDark"
                size="sm"
                trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
              >
                Services
              </Button>
              <Button
                href="/blog"
                variant="secondaryOnDark"
                size="sm"
                trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
              >
                Insights
              </Button>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
