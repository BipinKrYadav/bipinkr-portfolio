import type { Metadata } from 'next';

import { CTASection } from '@/components/blocks/CTASection';
import { ProcessSteps } from '@/components/blocks/ProcessSteps';
import { ServiceCard } from '@/components/blocks/ServiceCard';
import { FlowDiagram } from '@/components/data/FlowDiagram';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import {
  funnelContent,
  funnelNodes,
  processSteps,
  services,
  servicesCta,
  servicesPageContent,
} from '@/content/services';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Meta Ads, Google Ads & Performance Marketing Services',
  description:
    'Performance marketing services across Meta Ads, Google Ads, conversion-focused landing pages and tracking & measurement for real estate and local businesses.',
  path: '/services',
});

export default function ServicesPage() {
  return (
    <>
      <section className="border-b border-line bg-paper-sunk pb-section-sm pt-16 sm:pt-20">
        <Container>
          <div className="max-w-3xl">
            <p className="eyebrow-label">{servicesPageContent.eyebrow}</p>
            <h1 className="mt-5 font-serif text-display-lg text-ink">{servicesPageContent.h1}</h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-soft">
              {servicesPageContent.intro}
            </p>
            <p className="mt-5 text-[1.0625rem] leading-relaxed text-ink-soft">
              {servicesPageContent.secondaryIntro}
            </p>
          </div>
        </Container>
      </section>

      {/* The four services in full */}
      <Section>
        <div className="space-y-16">
          {services.map((service, index) => (
            <ServiceCard
              key={service.slug}
              service={service}
              variant="full"
              headingLevel="h2"
              index={index}
            />
          ))}
        </div>
      </Section>

      {/* Funnel */}
      <Section tone="night">
        <SectionHeading
          eyebrow={funnelContent.eyebrow}
          heading={funnelContent.heading}
          subheading={funnelContent.body}
          tone="dark"
        />
        <FlowDiagram nodes={funnelNodes} layout="chain" tone="dark" className="mt-12" />
      </Section>

      {/* Process */}
      <Section bordered>
        <SectionHeading
          eyebrow="Process"
          heading="How the work runs"
          subheading="Five steps, in this order. Each one exists because skipping it makes the next unreliable."
        />
        <ProcessSteps steps={processSteps} className="mt-12" />
      </Section>

      <CTASection heading={servicesCta.heading} body={servicesCta.body} location="services" />
    </>
  );
}
