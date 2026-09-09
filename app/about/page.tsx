import { ArrowRight, Linkedin } from 'lucide-react';
import type { Metadata } from 'next';

import { CTASection } from '@/components/blocks/CTASection';
import { ProofStrip } from '@/components/blocks/ProofStrip';
import { RecruiterCTA } from '@/components/blocks/RecruiterCTA';
import { FlowDiagram } from '@/components/data/FlowDiagram';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { proofMethodologyNote, proofMetrics } from '@/content/metrics';
import {
  aboutContent,
  approach,
  beyondRealEstate,
  capabilities,
  currentFocus,
  experience,
  measurementLesson,
  principles,
  realEstateFocus,
  recruiterSection,
} from '@/content/pages/about';
import { hasLinkedIn, siteConfig } from '@/content/site-config';
import { funnelNodes } from '@/content/services';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'About Bipin Kumar | Performance Marketer',
  description:
    'Bipin Kumar is a performance marketer in Patna working across Meta Ads, Google Ads, lead generation, landing pages and measurement for real estate and local businesses.',
  path: '/about',
});

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-line bg-paper-sunk pb-section-sm pt-16 sm:pt-20">
        <Container>
          <div className="max-w-3xl">
            <p className="eyebrow-label">{aboutContent.eyebrow}</p>
            <h1 className="mt-5 font-serif text-display-lg text-ink">{aboutContent.h1}</h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-soft">{aboutContent.intro}</p>
            <p className="mt-5 text-[1.0625rem] leading-relaxed text-ink-soft">
              {aboutContent.secondaryIntro}
            </p>

            {/*
              Recruiters land here first and would otherwise have to reach the
              footer to find LinkedIn. Rendered only when the URL is actually
              configured — never a placeholder or a guessed profile.
            */}
            {hasLinkedIn ? (
              <Button
                href={siteConfig.linkedinUrl}
                external
                variant="ghost"
                className="mt-4"
                analyticsEvent="linkedin_click"
                analyticsProps={{ location: 'about' }}
                leadingIcon={<Linkedin aria-hidden="true" className="h-4 w-4" />}
              >
                Connect with me on LinkedIn
              </Button>
            ) : null}
          </div>
        </Container>
      </section>

      {/* Approach */}
      <Section>
        <SectionHeading
          eyebrow={approach.eyebrow}
          heading={approach.heading}
          subheading={approach.body[0]}
        />
        <FlowDiagram nodes={funnelNodes} layout="chain" className="mt-12" />
        <p className="mt-8 max-w-2xl text-[1.0625rem] leading-relaxed text-ink-soft">
          {approach.body[1]}
        </p>
      </Section>

      {/* Evidence snapshot */}
      <Section tone="sunk" spacing="compact" bordered aria-labelledby="evidence-heading">
        <h2 id="evidence-heading" className="font-serif text-display-sm text-ink">
          Evidence snapshot
        </h2>
        <ProofStrip metrics={proofMetrics} note={proofMethodologyNote} className="mt-10" />
      </Section>

      {/* Experience */}
      <Section bordered>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="eyebrow-label">{experience.eyebrow}</p>
            <h2 className="mt-4 font-serif text-display-md text-ink">{experience.heading}</h2>
          </div>
          <div className="lg:col-span-7">
            <div className="prose-editorial">
              {experience.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-8">
              <Button
                href="/case-studies"
                variant="ghost"
                trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
              >
                Read the case studies
              </Button>
              <Button
                href="/services"
                variant="ghost"
                trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
              >
                See what I work on
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* Real estate focus */}
      <Section tone="sunk" bordered>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="eyebrow-label">{realEstateFocus.eyebrow}</p>
            <h2 className="mt-4 font-serif text-display-md text-ink">{realEstateFocus.heading}</h2>
            <p className="mt-5 text-[1.0625rem] leading-relaxed text-ink-soft">
              {realEstateFocus.body}
            </p>
          </div>

          <div className="lg:col-span-7">
            <ul className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              {realEstateFocus.items.map((item) => (
                <li key={item} className="border-b border-line py-3 text-sm text-ink-soft">
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 rounded-card border border-line bg-paper-raised p-6">
              <h3 className="text-micro font-semibold uppercase tracking-[0.11em] text-ink-faint">
                {beyondRealEstate.heading}
              </h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
                {beyondRealEstate.body}
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Capabilities */}
      <Section bordered>
        <SectionHeading
          eyebrow="Capabilities"
          heading="Core capabilities"
          subheading="What I actually do, described without inflation."
        />

        <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((capability) => {
            const Icon = capability.icon;
            return (
              <div key={capability.title} className="border-t border-line pt-6">
                <Icon aria-hidden="true" className="h-5 w-5 text-accent" />
                <h3 className="mt-4 text-base font-semibold text-ink">{capability.title}</h3>
                <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">
                  {capability.body}
                </p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Principles */}
      <Section tone="night">
        <SectionHeading
          eyebrow={principles.eyebrow}
          heading={principles.heading}
          tone="dark"
        />

        <ol className="mt-12 grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-3">
          {principles.items.map((principle) => (
            <li key={principle.number} className="border-t border-night-line pt-6">
              <p className="font-serif text-sm tabular-nums text-ink-inverse/45">
                {principle.number}
              </p>
              <h3 className="mt-3 font-serif text-xl text-ink-inverse">{principle.title}</h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-inverse/70">
                {principle.body}
              </p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Measurement lesson */}
      <Section>
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="eyebrow-label">{measurementLesson.eyebrow}</p>
            <h2 className="mt-4 font-serif text-display-md text-ink">
              {measurementLesson.heading}
            </h2>
          </div>

          <div className="lg:col-span-7">
            <div className="prose-editorial">
              {measurementLesson.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <blockquote className="mt-8 border-l-2 border-accent pl-5">
              <p className="font-serif text-display-sm leading-snug text-ink">
                {measurementLesson.pullQuote}
              </p>
            </blockquote>

            <Button
              href={measurementLesson.ctaHref}
              variant="ghost"
              className="mt-6"
              trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
            >
              {measurementLesson.ctaLabel}
            </Button>
          </div>
        </div>
      </Section>

      {/* Current focus */}
      <Section tone="sunk" bordered>
        <SectionHeading eyebrow={currentFocus.eyebrow} heading={currentFocus.heading} />

        <div className="mt-12 grid grid-cols-1 gap-x-12 gap-y-10 lg:grid-cols-3">
          {currentFocus.items.map((item) => (
            <div key={item.title} className="border-t border-line pt-6">
              <h3 className="text-base font-semibold text-ink">{item.title}</h3>
              <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Recruiter */}
      <Section spacing="compact" bordered>
        <RecruiterCTA
          heading={recruiterSection.heading}
          body={recruiterSection.body}
          location="about"
        />
      </Section>

      <CTASection
        eyebrow="Next step"
        heading="Want a second opinion on your campaigns?"
        body="Send me what you have. I will review the setup, the measurement and the obvious opportunity areas, and tell you plainly what your data supports."
        note="An initial assessment based on the information you provide — not a guarantee of performance."
        location="about"
      />
    </>
  );
}
