import { ArrowRight, ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';

import { CaseStudyCard } from '@/components/blocks/CaseStudyCard';
import { CTASection } from '@/components/blocks/CTASection';
import { ProcessSteps } from '@/components/blocks/ProcessSteps';
import { ProofStrip } from '@/components/blocks/ProofStrip';
import { ServiceCard } from '@/components/blocks/ServiceCard';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { caseStudies } from '@/content/case-studies';
import { proofMethodologyNote, proofMetrics } from '@/content/metrics';
import { PRIMARY_CTA } from '@/content/navigation';
import {
  aboutSnippet,
  caseStudiesSection,
  finalCta,
  hero,
  howIWork,
  intro,
  servicesSection,
  whyWorkWithMe,
} from '@/content/pages/home';
import { processSteps, services } from '@/content/services';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Bipin Kumar | Performance Marketer | Meta & Google Ads',
  description:
    'Performance marketer focused on Meta Ads, Google Ads, lead generation, landing pages and measurement for real estate and local businesses.',
  path: '/',
});

export default function HomePage() {
  return (
    <>
      {/* 1. Hero */}
      <section className="border-b border-line bg-paper pb-section-sm pt-16 sm:pt-24">
        <Container>
          <div className="max-w-4xl">
            <p className="eyebrow-label">{hero.eyebrow}</p>

            <h1 className="mt-5 font-serif text-display-xl text-ink">{hero.h1}</h1>

            <p className="mt-7 max-w-2xl text-lg leading-relaxed text-ink-soft sm:text-xl sm:leading-relaxed">
              {hero.subheadline}
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                href={PRIMARY_CTA.href}
                size="lg"
                analyticsEvent="audit_cta_click"
                analyticsProps={{ location: 'hero' }}
                trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
              >
                {hero.primaryCta}
              </Button>

              <Button href="/case-studies" size="lg" variant="secondary">
                {hero.secondaryCta}
              </Button>
            </div>

            <p className="mt-8 text-sm text-ink-faint">{hero.trustLine}</p>
          </div>
        </Container>
      </section>

      {/* 2. Proof strip */}
      <Section tone="sunk" spacing="compact" aria-labelledby="proof-heading">
        <h2 id="proof-heading" className="sr-only">
          Documented campaign evidence
        </h2>
        <ProofStrip metrics={proofMetrics} note={proofMethodologyNote} />
      </Section>

      {/* 3. Intro / problem statement */}
      <Section>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <p className="eyebrow-label">{intro.eyebrow}</p>
            <h2 className="mt-4 font-serif text-display-md text-ink">{intro.heading}</h2>
          </div>

          <div className="lg:col-span-6">
            <div className="prose-editorial">
              {intro.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            {/* The chain, rendered as an inline typographic sequence. */}
            <ol className="mt-8 flex flex-wrap items-center gap-x-1.5 gap-y-2 border-y border-line py-5">
              {intro.chain.map((step, index) => (
                <li key={step} className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-ink">{step}</span>
                  {index < intro.chain.length - 1 ? (
                    <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 text-line-strong" />
                  ) : null}
                </li>
              ))}
            </ol>

            <p className="mt-8 text-[1.0625rem] leading-relaxed text-ink-soft">{intro.closing}</p>
          </div>
        </div>
      </Section>

      {/* 4. Services */}
      <Section tone="sunk" bordered>
        <SectionHeading
          eyebrow={servicesSection.eyebrow}
          heading={servicesSection.heading}
          subheading={servicesSection.subheading}
          action={
            <Button href="/services" variant="secondary" size="sm">
              {servicesSection.cta}
            </Button>
          }
        />

        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((service) => (
            <ServiceCard key={service.slug} service={service} />
          ))}
        </div>
      </Section>

      {/* 5. Selected case studies */}
      <Section bordered>
        <SectionHeading
          eyebrow={caseStudiesSection.eyebrow}
          heading={caseStudiesSection.heading}
          subheading={caseStudiesSection.subheading}
          action={
            <Button href="/case-studies" variant="secondary" size="sm">
              {caseStudiesSection.cta}
            </Button>
          }
        />

        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {caseStudies.map((study) => (
            <CaseStudyCard key={study.slug} study={study} />
          ))}
        </div>
      </Section>

      {/* 6. How I work */}
      <Section tone="night">
        <SectionHeading
          eyebrow={howIWork.eyebrow}
          heading={howIWork.heading}
          subheading={howIWork.subheading}
          tone="dark"
        />
        <ProcessSteps steps={processSteps} tone="dark" className="mt-12" />
      </Section>

      {/* 7. Why work with me */}
      <Section>
        <SectionHeading
          eyebrow={whyWorkWithMe.eyebrow}
          heading={whyWorkWithMe.heading}
          subheading={whyWorkWithMe.subheading}
        />

        <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-10 sm:grid-cols-2">
          {whyWorkWithMe.points.map((point) => {
            const Icon = point.icon;
            return (
              <div key={point.title} className="border-t border-line pt-6">
                <Icon aria-hidden="true" className="h-5 w-5 text-accent" />
                <h3 className="mt-4 text-lg font-semibold text-ink">{point.title}</h3>
                <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">
                  {point.body}
                </p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 8. About snippet */}
      <Section tone="sunk" bordered>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="eyebrow-label">{aboutSnippet.eyebrow}</p>
            <h2 className="mt-4 font-serif text-display-md text-ink">{aboutSnippet.heading}</h2>
          </div>

          <div className="lg:col-span-7">
            <div className="prose-editorial">
              {aboutSnippet.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <Button
              href="/about"
              variant="ghost"
              className="mt-6"
              trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
            >
              {aboutSnippet.cta}
            </Button>
          </div>
        </div>
      </Section>

      {/* 9. Final CTA */}
      <CTASection
        eyebrow={finalCta.eyebrow}
        heading={finalCta.heading}
        body={finalCta.body}
        note={finalCta.note}
        location="home_final"
      />
    </>
  );
}
