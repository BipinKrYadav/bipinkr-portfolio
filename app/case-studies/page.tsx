import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';

import { CaseStudyCard } from '@/components/blocks/CaseStudyCard';
import { CTASection } from '@/components/blocks/CTASection';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { EvidenceLabel } from '@/components/ui/EvidenceLabel';
import { Section } from '@/components/ui/Section';
import { caseStudies, caseStudyIndexContent } from '@/content/case-studies';
import { proofMethodologyNote } from '@/content/metrics';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Performance Marketing Case Studies',
  description:
    'Explore Meta and Google Ads case studies covering lead generation, campaign analysis, measurement and performance diagnosis.',
  path: '/case-studies',
});

/** The evidence vocabulary, explained once on the index page. */
const legend = [
  { kind: 'documented' as const, text: 'Present in the campaign exports as-is.' },
  { kind: 'verified' as const, text: 'Recorded by the platform in its own results column.' },
  { kind: 'calculated' as const, text: 'Derived arithmetically from documented figures.' },
  { kind: 'reported' as const, text: 'Platform-reported, not independently corroborated.' },
  { kind: 'limitation' as const, text: 'A boundary of what the evidence supports.' },
];

export default function CaseStudiesPage() {
  return (
    <>
      <section className="border-b border-line bg-paper-sunk pb-section-sm pt-16 sm:pt-20">
        <Container>
          <div className="max-w-3xl">
            <p className="eyebrow-label">{caseStudyIndexContent.eyebrow}</p>
            <h1 className="mt-5 font-serif text-display-lg text-ink">
              {caseStudyIndexContent.heading}
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-soft">
              {caseStudyIndexContent.subheading}
            </p>

            <div className="prose-editorial mt-8">
              {caseStudyIndexContent.intro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <Button
              href="/services"
              variant="ghost"
              className="mt-4"
              trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
            >
              See the services behind this work
            </Button>
          </div>
        </Container>
      </section>

      <Section>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* h2: on this page the cards are the top-level content under the h1. */}
          {caseStudies.map((study) => (
            <CaseStudyCard key={study.slug} study={study} headingLevel="h2" />
          ))}
        </div>
      </Section>

      {/* Evidence legend */}
      <Section tone="sunk" spacing="compact" bordered aria-labelledby="legend-heading">
        <h2 id="legend-heading" className="font-serif text-display-sm text-ink">
          How to read the labels
        </h2>
        <p className="mt-4 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-soft">
          Every figure across these case studies carries a label saying how it is known. The
          distinction between a recorded platform result and a confirmed business outcome is the
          whole point, so the labels are not decoration.
        </p>

        <dl className="mt-8 grid grid-cols-1 gap-x-10 gap-y-0 sm:grid-cols-2">
          {legend.map((item) => (
            <div
              key={item.kind}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5 border-b border-line py-3.5"
            >
              <dt>
                <EvidenceLabel kind={item.kind} size="xs" />
              </dt>
              <dd className="text-sm text-ink-soft">{item.text}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-8 max-w-[66ch] border-l-2 border-line-strong pl-4 text-[0.875rem] leading-relaxed text-ink-faint">
          {proofMethodologyNote}
        </p>
      </Section>

      <CTASection
        eyebrow="Next step"
        heading="Want this level of scrutiny on your own account?"
        body="Send me your campaign setup and reporting. I will review the structure, the measurement and the obvious opportunity areas, and tell you plainly what your data supports."
        note="An initial assessment based on the information you provide — not a guarantee of performance."
        location="case_studies_index"
      />
    </>
  );
}
