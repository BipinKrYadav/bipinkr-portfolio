import { ArrowRight, Minus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import {
  CaseStudyBody,
  CaseStudySection,
} from '@/components/blocks/CaseStudyLayout';
import { CTASection } from '@/components/blocks/CTASection';
import { InsightBlock } from '@/components/blocks/InsightBlock';
import { TableOfContents } from '@/components/blocks/TableOfContents';
import { ComparisonBlock } from '@/components/data/ComparisonBlock';
import { DataTable } from '@/components/data/DataTable';
import { MetricGrid } from '@/components/data/MetricCard';
import { StateComparison } from '@/components/data/StateComparison';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { EvidenceLabel } from '@/components/ui/EvidenceLabel';
import { Section } from '@/components/ui/Section';
import * as article from '@/content/blog/google-ads-conversion-tracking';
import { articleSchema, breadcrumbSchema, buildMetadata, jsonLd } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: article.summary.title,
  description: article.summary.description,
  path: `/blog/${article.summary.slug}`,
  type: 'article',
});

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default function GoogleAdsConversionTrackingPage() {
  const { summary } = article;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          articleSchema({
            headline: summary.title,
            description: summary.description,
            path: `/blog/${summary.slug}`,
            datePublished: summary.datePublished,
            dateModified: summary.dateModified,
          }),
        )}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Insights', path: '/blog' },
            { name: summary.cardTitle, path: `/blog/${summary.slug}` },
          ]),
        )}
      />

      {/* Hero */}
      <header className="border-b border-line bg-paper-sunk pb-section-sm pt-8">
        <Container>
          <Breadcrumbs
            items={[
              { name: 'Home', path: '/' },
              { name: 'Insights', path: '/blog' },
            ]}
            current={summary.cardTitle}
          />

          <div className="mt-10 max-w-4xl">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-micro uppercase tracking-[0.11em] text-ink-faint">
              <span>{summary.theme}</span>
              <span aria-hidden="true" className="text-line-strong">
                ·
              </span>
              <span>{summary.readingMinutes} min read</span>
              <span aria-hidden="true" className="text-line-strong">
                ·
              </span>
              <time dateTime={summary.datePublished}>{formatDate(summary.datePublished)}</time>
            </div>

            <h1 className="mt-5 font-serif text-display-lg text-ink">{summary.title}</h1>

            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft">
              {summary.description}
            </p>

            <p className="mt-6 text-sm text-ink-faint">By Bipin Kumar · Performance Marketer</p>
          </div>
        </Container>
      </header>

      {/* Mobile section nav */}
      <div className="lg:hidden">
        <Container>
          <TableOfContents sections={article.sections} variant="inline" />
        </Container>
      </div>

      <div className="py-section-sm">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            <aside className="hidden lg:col-span-3 lg:block">
              <TableOfContents sections={article.sections} variant="sidebar" />
            </aside>

            <div className="lg:col-span-9 xl:col-span-8">
              <CaseStudyBody>
                {/* 1. Introduction */}
                <CaseStudySection id="introduction" heading="Introduction">
                  <div className="prose-editorial">
                    {article.intro.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </CaseStudySection>

                {/* 2. The problem */}
                <CaseStudySection
                  id="the-problem"
                  heading="A precise number is not the same as a reliable one"
                >
                  <MetricGrid metrics={article.spendMetrics} columns={3} size="sm" />
                  <div className="prose-editorial mt-8">
                    {article.problem.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </CaseStudySection>

                {/* 3. What I checked */}
                <CaseStudySection
                  id="what-i-checked"
                  heading="What I checked before trusting the numbers"
                >
                  <ol className="grid grid-cols-1 gap-x-10 gap-y-0 sm:grid-cols-2">
                    {article.checks.map((check, index) => (
                      <li key={check.title} className="border-b border-line py-4">
                        <div className="flex gap-3">
                          <span className="font-serif text-sm tabular-nums text-ink-faint">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <h3 className="text-sm font-semibold text-ink">{check.title}</h3>
                            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                              {check.body}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>

                  <p className="mt-6 max-w-[66ch] border-l-2 border-line-strong pl-4 text-[0.9375rem] leading-relaxed text-ink-soft">
                    {article.checksNote}{' '}
                    <Link
                      href="/case-studies/measurement-audit"
                      className="text-accent underline decoration-accent-line underline-offset-4 hover:decoration-accent"
                    >
                      That audit is written up here
                    </Link>
                    .
                  </p>
                </CaseStudySection>

                {/* 4. PMax vs Search */}
                <CaseStudySection
                  id="pmax-vs-search"
                  heading="An example: two campaign types, two measurement states"
                >
                  <ComparisonBlock
                    intro={article.comparisonIntro}
                    panels={article.comparisonPanels}
                    caution={article.comparisonCaution}
                  />

                  <StateComparison
                    className="mt-10"
                    heading={article.pmaxState.heading}
                    reported={{
                      value: article.pmaxState.reported.value,
                      label: article.pmaxState.reported.label,
                      evidence: 'reported',
                    }}
                    recorded={{
                      value: article.pmaxState.recorded.value,
                      label: article.pmaxState.recorded.label,
                      evidence: 'verified',
                    }}
                    caution={article.pmaxState.caution}
                  />
                </CaseStudySection>

                {/* 5. Three columns */}
                <CaseStudySection
                  id="three-columns"
                  heading="Clicks, reported leads and recorded conversions are three different things"
                >
                  <p className="prose-editorial">{article.threeColumnsIntro}</p>

                  <dl className="mt-6">
                    {article.threeColumnsTerms.map((item) => (
                      <div key={item.term} className="border-b border-line py-4">
                        <dt className="text-sm font-semibold text-ink">{item.term}</dt>
                        <dd className="mt-1.5 max-w-[66ch] text-[0.9375rem] leading-relaxed text-ink-soft">
                          {item.body}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <p className="prose-editorial mt-6">{article.threeColumnsClosing}</p>

                  <DataTable {...article.threeColumnsTable} className="mt-8" />
                </CaseStudySection>

                {/* 6. Verified conversion */}
                <CaseStudySection
                  id="verified-conversion"
                  heading="What a “verified conversion” means here"
                >
                  <div className="rounded-card border border-line bg-paper-raised p-6 sm:p-8">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-serif text-xl text-ink">{article.verifiedMeaning.term}</h3>
                      <EvidenceLabel kind="verified" size="xs" />
                    </div>

                    <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink">
                      {article.verifiedMeaning.definition}
                    </p>

                    <p className="mt-6 text-micro font-semibold uppercase tracking-[0.11em] text-ink-faint">
                      It does not mean
                    </p>
                    <ul className="mt-3 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                      {article.verifiedMeaning.excludes.map((item) => (
                        <li
                          key={item}
                          className="border-b border-line py-2.5 text-sm text-ink-soft last:border-b-0"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>

                    <p className="mt-6 border-t border-line pt-5 text-[0.9375rem] leading-relaxed text-ink-soft">
                      {article.verifiedMeaning.note}
                    </p>
                  </div>
                </CaseStudySection>

                {/* 7. What this does not confirm */}
                <CaseStudySection id="not-confirmed" heading="What this data does not confirm">
                  <div className="rounded-card border border-line-strong bg-paper-sunk p-6 sm:p-8">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-serif text-display-sm text-ink">The evidence ceiling</h3>
                      <EvidenceLabel kind="limitation" />
                    </div>

                    <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-soft">
                      {article.notConfirmedIntro}
                    </p>

                    <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2">
                      {article.notConfirmed.map((item) => (
                        <li
                          key={item}
                          className="flex items-center gap-2.5 border-b border-line py-2.5 text-sm text-ink-soft"
                        >
                          <Minus aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                          {item}
                        </li>
                      ))}
                    </ul>

                    <p className="mt-6 border-t border-line pt-5 text-[0.9375rem] leading-relaxed text-ink-soft">
                      {article.notConfirmedClosing}
                    </p>
                  </div>
                </CaseStudySection>

                {/* 8. Checklist */}
                <CaseStudySection
                  id="checklist"
                  heading="A practical Google Ads measurement checklist"
                >
                  <ol className="space-y-0">
                    {article.checklist.map((item, index) => (
                      <li key={item.title} className="border-b border-line py-4">
                        <div className="flex gap-3">
                          <span className="font-serif text-sm tabular-nums text-ink-faint">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{item.body}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>

                  <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.9375rem] leading-relaxed text-ink-soft">
                    <EvidenceLabel kind="recommendation" size="xs" />
                    <span>
                      These are actions to take, not results observed. Nothing here is a claim about
                      what they produced.
                    </span>
                  </p>
                </CaseStudySection>

                {/* 9. Before scaling */}
                <CaseStudySection
                  id="before-scaling"
                  heading="What I would fix before scaling any of this"
                >
                  <div className="prose-editorial">
                    {article.beforeScaling.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>

                  <div className="mt-8 flex flex-wrap items-center gap-x-8">
                    <Button
                      href="/services/#tracking-measurement"
                      variant="ghost"
                      trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
                    >
                      How I approach tracking &amp; measurement
                    </Button>
                    <Button
                      href="/services/#google-ads"
                      variant="ghost"
                      trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
                    >
                      Google Ads &amp; search acquisition
                    </Button>
                  </div>
                </CaseStudySection>

                {/* 10. Takeaway */}
                <CaseStudySection id="takeaway" heading="The takeaway">
                  <InsightBlock kicker="The takeaway" heading={article.takeaway.heading}>
                    {article.takeaway.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </InsightBlock>
                </CaseStudySection>
              </CaseStudyBody>
            </div>
          </div>
        </Container>
      </div>

      {/* 12. Related case studies */}
      <Section tone="sunk" bordered spacing="compact" aria-labelledby="related-heading">
        <h2
          id="related-heading"
          className="text-micro font-semibold uppercase tracking-[0.11em] text-ink-faint"
        >
          Related case studies
        </h2>

        <div className="mt-6 grid grid-cols-1 gap-x-12 gap-y-6 sm:grid-cols-2">
          {article.relatedCaseStudies.map((item) => (
            <div key={item.slug}>
              <Link
                href={`/case-studies/${item.slug}`}
                className="inline-flex min-h-[2.75rem] items-center gap-1.5 text-[0.9375rem] text-accent underline-offset-4 hover:underline"
              >
                {item.label}
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              </Link>
              <p className="mt-1 max-w-[66ch] text-sm leading-relaxed text-ink-soft">
                {item.reason}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 border-t border-line pt-6">
          <Button
            href="/blog"
            variant="ghost"
            trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
          >
            All insights
          </Button>
        </div>
      </Section>

      {/* 11. CTA */}
      <CTASection
        eyebrow="Next step"
        heading="Not sure whether your conversion data is trustworthy?"
        body="Send me your campaign setup and reporting. I will review the structure, the measurement and the obvious opportunity areas, and tell you plainly what your data supports."
        note="An initial assessment based on the information you provide — not a guarantee of performance."
        location="blog_article"
      />
    </>
  );
}
