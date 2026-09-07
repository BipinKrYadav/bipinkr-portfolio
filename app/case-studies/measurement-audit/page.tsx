import type { Metadata } from 'next';

import { CaseStudyHero } from '@/components/blocks/CaseStudyHero';
import {
  CaseStudyBody,
  CaseStudyLayout,
  CaseStudySection,
} from '@/components/blocks/CaseStudyLayout';
import { CTASection } from '@/components/blocks/CTASection';
import { CaseStudyView } from '@/components/tracking/CaseStudyView';
import { InsightBlock } from '@/components/blocks/InsightBlock';
import { LimitationBlock } from '@/components/blocks/LimitationBlock';
import { ComparisonBlock } from '@/components/data/ComparisonBlock';
import { DataTable } from '@/components/data/DataTable';
import { MetricGrid } from '@/components/data/MetricCard';
import { ScaleFunnel } from '@/components/data/ScaleFunnel';
import * as cs from '@/content/case-studies/measurement-audit';
import { breadcrumbSchema, buildMetadata, jsonLd } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: cs.summary.title,
  description: cs.summary.metaDescription,
  path: `/case-studies/${cs.summary.slug}`,
  type: 'article',
});

export default function MeasurementAuditPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd(
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Case Studies', path: '/case-studies' },
            { name: cs.summary.cardTitle, path: `/case-studies/${cs.summary.slug}` },
          ]),
        )}
      />

      <CaseStudyView slug={cs.summary.slug} title={cs.summary.cardTitle} />

      <CaseStudyHero
        title={cs.summary.title}
        subtitle={cs.summary.subtitle}
        industry={cs.summary.industry}
        platform={cs.summary.platform}
        metrics={cs.heroMetrics}
      />

      <CaseStudyLayout sections={cs.sections} slug={cs.summary.slug}>
        <CaseStudyBody>
          {/* Situation */}
          <CaseStudySection id="situation" heading="The situation">
            <div className="prose-editorial">
              {cs.situation.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <p className="mt-6 max-w-[66ch] border-l-2 border-line-strong pl-4 text-[0.9375rem] leading-relaxed text-ink-soft">
              {cs.situationNote}
            </p>
          </CaseStudySection>

          {/* Checks */}
          <CaseStudySection id="checks" heading="What I checked">
            <p className="prose-editorial mb-8">
              Eight questions, asked of every account before any of its numbers were used to justify
              a decision.
            </p>

            <ol className="grid grid-cols-1 gap-x-10 gap-y-0 sm:grid-cols-2">
              {cs.auditChecks.map((check, index) => (
                <li key={check.title} className="border-b border-line py-4">
                  <div className="flex gap-3">
                    <span className="font-serif text-sm tabular-nums text-ink-faint">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-ink">{check.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                        {check.description}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </CaseStudySection>

          {/* Scale */}
          <CaseStudySection id="scale" heading="The scale of the issue">
            <ScaleFunnel
              steps={cs.scaleFlow}
              note="The middle figure is the sum of the three affected areas set out below. It is spend where the reporting could not be trusted — not spend that was necessarily wasted, which is a different and unproven claim."
            />
          </CaseStudySection>

          {/* Failure modes */}
          <CaseStudySection id="failure-modes" heading="Four failure modes">
            <div className="space-y-12">
              {cs.failureModes.map((mode) => (
                <article key={mode.number} className="border-t border-line pt-8 first:border-t-0 first:pt-0">
                  <div className="flex items-baseline gap-3">
                    <span className="font-serif text-sm tabular-nums text-ink-faint">
                      {mode.number}
                    </span>
                    <h3 className="font-serif text-2xl leading-snug text-ink">{mode.title}</h3>
                  </div>

                  <p className="mt-3 text-[0.9375rem] font-medium text-ink-soft">{mode.summary}</p>

                  <div className="prose-editorial mt-5">
                    {mode.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>

                  {mode.metrics ? (
                    <MetricGrid
                      metrics={mode.metrics}
                      columns={mode.metrics.length >= 4 ? 4 : 2}
                      size="sm"
                      className="mt-7"
                    />
                  ) : null}

                  {mode.table ? <DataTable {...mode.table} className="mt-7" /> : null}

                  <p className="mt-6 rounded-card border border-[#E2D3B0] bg-[#F8F2E4] px-4 py-3.5 text-[0.9375rem] leading-relaxed text-ink-soft">
                    {mode.caution}
                  </p>
                </article>
              ))}
            </div>

            <p className="mt-10 max-w-[66ch] border-l-2 border-line-strong pl-4 text-[0.9375rem] leading-relaxed text-ink-soft">
              {cs.failureModesNote}
            </p>
          </CaseStudySection>

          {/* Campaign types */}
          <CaseStudySection id="campaign-types" heading="Two campaign types, two measurement states">
            <ComparisonBlock
              intro={cs.campaignTypesIntro}
              panels={cs.campaignTypes.map((type) => ({
                title: type.name,
                rows: type.rows,
              }))}
              caution={cs.campaignTypesCaution}
            />
          </CaseStudySection>

          {/* Lesson */}
          <CaseStudySection id="lesson" heading="The central lesson">
            <InsightBlock kicker="The first decision" heading={cs.lesson.heading}>
              {cs.lesson.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </InsightBlock>
          </CaseStudySection>

          {/* Limitations */}
          <CaseStudySection id="limitations" heading="What this review does not establish">
            <LimitationBlock
              intro={cs.limitationsIntro}
              items={cs.limitations}
              closing={cs.limitationsClosing}
            />
          </CaseStudySection>
        </CaseStudyBody>
      </CaseStudyLayout>

      <CTASection
        heading={cs.summary.cta.heading}
        body={cs.summary.cta.body}
        location="case_study"
      />
    </>
  );
}
