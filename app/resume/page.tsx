import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { Download, FileText, Linkedin } from 'lucide-react';
import type { Metadata } from 'next';

import { CTASection } from '@/components/blocks/CTASection';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { Section } from '@/components/ui/Section';
import { resumeContent } from '@/content/pages/legal';
import { hasLinkedIn, resumePath, siteConfig } from '@/content/site-config';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Resume | Bipin Kumar, Performance Marketer',
  description:
    'Resume for Bipin Kumar — performance marketer working across Meta Ads, Google Ads, lead generation, landing pages and measurement.',
  path: '/resume',
});

/**
 * Checked at build time, not in the browser: the export either contains the
 * PDF or it does not, and the page renders the matching state. This avoids
 * shipping an embed that resolves to a 404 for every visitor.
 */
const resumeExists = existsSync(
  join(process.cwd(), 'public', 'documents', siteConfig.resumeFile),
);

export default function ResumePage() {
  return (
    <>
      <section className="border-b border-line bg-paper-sunk pb-section-sm pt-16 sm:pt-20">
        <Container>
          <div className="max-w-3xl">
            <p className="eyebrow-label">{resumeContent.eyebrow}</p>
            <h1 className="mt-5 font-serif text-display-lg text-ink">{resumeContent.h1}</h1>
            <p className="mt-6 text-lg leading-relaxed text-ink-soft">{resumeContent.intro}</p>
            <p className="mt-5 text-[1.0625rem] leading-relaxed text-ink-soft">
              {resumeContent.secondaryIntro}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              {resumeExists ? (
                <Button
                  href={resumePath}
                  download
                  size="lg"
                  analyticsEvent="resume_click"
                  analyticsProps={{ location: 'resume' }}
                  leadingIcon={<Download aria-hidden="true" className="h-4 w-4" />}
                >
                  {resumeContent.downloadLabel}
                </Button>
              ) : null}

              {hasLinkedIn ? (
                <Button
                  href={siteConfig.linkedinUrl}
                  external
                  size="lg"
                  variant={resumeExists ? 'secondary' : 'primary'}
                  analyticsEvent="linkedin_click"
                  analyticsProps={{ location: 'resume' }}
                  leadingIcon={<Linkedin aria-hidden="true" className="h-4 w-4" />}
                >
                  {resumeContent.linkedinLabel}
                </Button>
              ) : null}
            </div>
          </div>
        </Container>
      </section>

      {/* At a glance */}
      <Section spacing="compact">
        <h2 className="font-serif text-display-sm text-ink">{resumeContent.highlights.heading}</h2>

        <dl className="mt-8 grid grid-cols-1 gap-x-12 gap-y-0 sm:grid-cols-2">
          {resumeContent.highlights.items.map((item) => (
            <div key={item.title} className="border-b border-line py-5">
              <dt className="text-base font-semibold text-ink">{item.title}</dt>
              <dd className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">{item.body}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* Preview or placeholder */}
      <Section tone="sunk" bordered spacing="compact">
        <h2 className="font-serif text-display-sm text-ink">{resumeContent.previewHeading}</h2>

        {resumeExists ? (
          <div className="mt-8 overflow-hidden rounded-card border border-line bg-paper-raised">
            <object
              data={resumePath}
              type="application/pdf"
              className="h-[70vh] min-h-[32rem] w-full"
              aria-label="Resume preview"
            >
              {/* Rendered by browsers with no inline PDF viewer, including most mobile browsers. */}
              <div className="p-8">
                <p className="text-[1.0625rem] leading-relaxed text-ink-soft">
                  Your browser cannot display the PDF inline.
                </p>
                <Button
                  href={resumePath}
                  download
                  className="mt-5"
                  analyticsEvent="resume_click"
                  analyticsProps={{ location: 'resume' }}
                  leadingIcon={<Download aria-hidden="true" className="h-4 w-4" />}
                >
                  {resumeContent.downloadLabel}
                </Button>
              </div>
            </object>
          </div>
        ) : (
          <div className="mt-8 rounded-card border border-dashed border-line-strong bg-paper-raised p-8 sm:p-12">
            <FileText aria-hidden="true" className="h-6 w-6 text-ink-faint" />
            <h3 className="mt-4 font-serif text-xl text-ink">
              {resumeContent.placeholder.heading}
            </h3>
            <p className="mt-3 max-w-xl text-[0.9375rem] leading-relaxed text-ink-soft">
              {resumeContent.placeholder.fallback}
            </p>

            {/* Setup guidance for the operator; stripped from production builds. */}
            {process.env.NODE_ENV === 'development' ? (
              <p className="mt-5 max-w-xl border-l-2 border-line-strong pl-4 text-sm leading-relaxed text-ink-faint">
                {resumeContent.placeholder.body}
              </p>
            ) : null}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button href="/case-studies" variant="secondary">
                Read the case studies
              </Button>
              <Button href="/about" variant="secondary">
                About my approach
              </Button>
            </div>
          </div>
        )}
      </Section>

      <CTASection
        eyebrow="Hiring or engaging"
        heading="Happy to talk about a role or a campaign."
        body="If you are hiring, the case studies show how I think. If you have an account that needs reviewing, send it over."
        location="resume"
      />
    </>
  );
}
