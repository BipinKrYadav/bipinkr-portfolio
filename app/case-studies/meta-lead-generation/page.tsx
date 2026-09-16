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
import { CohortBars } from '@/components/data/CohortBars';
import { DataTable } from '@/components/data/DataTable';
import { MetricGrid } from '@/components/data/MetricCard';
import { EvidenceLabel } from '@/components/ui/EvidenceLabel';
import * as cs from '@/lib/content/case-studies/meta-lead-generation';
import { breadcrumbSchema, buildMetadata, jsonLd } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: cs.summary.title,
  description: cs.summary.metaDescription,
  path: `/case-studies/${cs.summary.slug}`,
  type: 'article',
});

export default function MetaLeadGenerationPage() {
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
        scope="Patna, Bihar"
      />

      <CaseStudyLayout sections={cs.sections} slug={cs.summary.slug}>
        <CaseStudyBody>
          {/* Context */}
          <CaseStudySection id="context" heading="Context">
            <dl className="grid grid-cols-1 gap-x-10 gap-y-0 sm:grid-cols-2">
              {cs.context.map((item) => (
                <div
                  key={item.term}
                  className="flex items-baseline justify-between gap-4 border-b border-line py-3.5"
                >
                  <dt className="text-sm text-ink-faint">{item.term}</dt>
                  <dd className="text-right text-sm font-medium text-ink">{item.value}</dd>
                </div>
              ))}
            </dl>
          </CaseStudySection>

          {/* Methodology */}
          <CaseStudySection id="methodology" heading="How to read this comparison">
            <div className="prose-editorial">
              {cs.methodology.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </CaseStudySection>

          {/* Cohorts */}
          <CaseStudySection id="cohorts" heading="The cohort comparison">
            <CohortBars
              cohorts={cs.cohorts}
              labelPrimary={cs.methodology.labelPrimary}
              labelSecondary={cs.methodology.labelSecondary}
            />

            <ul className="mt-8 space-y-0">
              {cs.cohortObservations.map((observation) => (
                <li
                  key={observation}
                  className="border-b border-line py-3.5 text-[1.0625rem] leading-relaxed text-ink-soft last:border-b-0"
                >
                  {observation}
                </li>
              ))}
            </ul>

            <p className="mt-6 text-[0.9375rem] leading-relaxed text-ink-faint">
              Note the wording. Reported CPL <em>fell</em> across the cohorts — the exports do not
              isolate a cause, and attributing the fall to a single decision would be a claim this
              data cannot carry.
            </p>
          </CaseStudySection>

          {/* Result types */}
          <CaseStudySection id="result-types" heading="What Meta was actually optimising for">
            <div className="prose-editorial mb-8">
              {cs.resultTypesCommentary.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <DataTable {...cs.resultTypesTable} />

            <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.9375rem] leading-relaxed text-ink-soft">
              <EvidenceLabel kind="unverified" size="xs" />
              <span>{cs.resultTypesChipNote}</span>
            </p>
          </CaseStudySection>

          {/* Campaign evidence */}
          <CaseStudySection id="campaigns" heading={cs.campaignsHeading}>
            <p className="prose-editorial mb-8">{cs.campaignsIntro}</p>

            <DataTable {...cs.campaignsTable} />
          </CaseStudySection>

          {/* Variants */}
          <CaseStudySection id="variants" heading="Variant observations">
            <p className="prose-editorial mb-8">{cs.variantsIntro}</p>

            <div className="space-y-4">
              {cs.variantObservations.map((observation) => (
                <div
                  key={observation.campaign}
                  className="rounded-card border border-line bg-paper-raised p-5 sm:p-6"
                >
                  <h3 className="text-micro font-semibold uppercase tracking-[0.11em] text-ink-faint">
                    {observation.campaign}
                  </h3>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {(
                      [
                        ['Original', observation.original],
                        ['Variant', observation.variant],
                      ] as const
                    ).map(([label, data]) => (
                      <div key={label} className="rounded-card bg-paper-sunk px-4 py-3.5">
                        <p className="text-micro uppercase tracking-[0.09em] text-ink-faint">
                          {label}
                        </p>
                        <p className="mt-2 text-sm tabular-nums text-ink">
                          {data.spend} · {data.leads}
                        </p>
                        <p className="mt-1 text-sm tabular-nums text-ink-soft">{data.cpl}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-6 max-w-[66ch] border-l-2 border-line-strong pl-4 text-[0.9375rem] leading-relaxed text-ink-soft">
              {cs.variantNote}
            </p>
          </CaseStudySection>

          {/* Blended */}
          <CaseStudySection id="blended" heading="The conservative blended number">
            <MetricGrid metrics={cs.blendedMetrics} columns={2} size="lg" />

            <div className="prose-editorial mt-8">
              {cs.blendedMethodology.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </CaseStudySection>

          {/* Scale */}
          <CaseStudySection id="scale" heading="Operational scale">
            <p className="prose-editorial mb-8">
              What the account looked like in practice — the structure behind the numbers above.
            </p>

            <dl className="grid grid-cols-2 gap-x-8 gap-y-0 sm:grid-cols-3">
              {cs.operationalScale.map((item) => (
                <div key={item.label} className="border-b border-line py-4">
                  <dt className="sr-only">{item.label}</dt>
                  <dd>
                    <p className="font-serif text-metric-sm tabular-nums text-ink">{item.value}</p>
                    <p className="mt-1 text-xs leading-snug text-ink-faint">{item.label}</p>
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 max-w-[66ch] border-l-2 border-line-strong pl-4 text-[0.9375rem] leading-relaxed text-ink-soft">
              {cs.scaleNote}
            </p>
          </CaseStudySection>

          {/* Limitations */}
          <CaseStudySection id="limitations" heading="What this evidence does not establish">
            <LimitationBlock intro={cs.limitationsIntro} items={cs.limitations} />
          </CaseStudySection>

          {/* Takeaway */}
          <CaseStudySection id="takeaway" heading="Takeaway">
            <InsightBlock kicker="The lesson" heading={cs.takeaway.heading}>
              {cs.takeaway.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </InsightBlock>
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
