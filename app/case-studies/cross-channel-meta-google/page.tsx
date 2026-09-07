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
import { EvidenceLabel } from '@/components/ui/EvidenceLabel';
import * as cs from '@/content/case-studies/cross-channel-meta-google';
import { breadcrumbSchema, buildMetadata, jsonLd } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: cs.summary.title,
  description: cs.summary.metaDescription,
  path: `/case-studies/${cs.summary.slug}`,
  type: 'article',
});

export default function CrossChannelPage() {
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
            <div className="prose-editorial mb-8">
              {cs.contextIntro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

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

          {/* Meta */}
          <CaseStudySection id="meta" heading="Meta — two campaigns, 191 verified leads">
            <DataTable {...cs.metaTable} />

            <div className="prose-editorial mt-8">
              {cs.metaCommentary.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </CaseStudySection>

          {/* Google */}
          <CaseStudySection id="google" heading="Google — three Search campaigns, 773 clicks">
            <DataTable {...cs.googleTable} />

            <MetricGrid metrics={cs.googleMetrics} columns={3} size="sm" className="mt-8" />

            <p className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-2 text-[0.9375rem] leading-relaxed text-ink-soft">
              <EvidenceLabel kind="unverified" size="xs" />
              <span>
                Every figure above describes traffic, not outcomes. No lead count appears in this
                section because the account cannot supply a trustworthy one.
              </span>
            </p>
          </CaseStudySection>

          {/* Side by side */}
          <CaseStudySection id="comparison" heading="The two channels side by side">
            <ComparisonBlock
              panels={cs.channelPanels.map((panel) => ({
                title: panel.channel,
                headlineValue: panel.outcomeValue,
                headlineLabel: panel.outcomeLabel,
                headlineEvidence: panel.outcomeEvidence,
                rows: [{ term: 'Spend', value: panel.spend }, ...panel.rows],
                caveat: panel.caveat,
              }))}
              caution={cs.comparisonCaution}
            />
          </CaseStudySection>

          {/* Limitation */}
          <CaseStudySection id="limitation" heading="Why there is no cross-channel CPL here">
            <div className="prose-editorial">
              {cs.limitationBody.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            {/* The inflated rates, shown plainly. */}
            <div className="mt-8 rounded-card border border-[#E2D3B0] bg-[#F8F2E4] p-6">
              <p className="text-micro font-semibold uppercase tracking-[0.11em] text-evidence-reported">
                Reported Google conversion rates in this dataset
              </p>
              <ul className="mt-4 flex flex-wrap gap-3">
                {cs.inflatedRates.map((rate) => (
                  <li
                    key={rate}
                    className="rounded-card border border-[#E2D3B0] bg-paper-raised px-4 py-2.5 font-serif text-metric-sm tabular-nums text-evidence-reported"
                  >
                    {rate}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[0.875rem] leading-relaxed text-ink-soft">
                A conversion rate is conversions divided by clicks. These figures cannot be
                reconciled with the recorded click volume, and the exports alone do not establish
                why.
              </p>
            </div>

            {/* The rules that follow from it. */}
            <dl className="mt-8 space-y-0">
              {cs.limitationRules.map((item) => (
                <div key={item.rule} className="border-b border-line py-4">
                  <dt className="text-sm font-semibold text-ink">{item.rule}</dt>
                  <dd className="mt-1 text-sm text-ink-soft">{item.reason}</dd>
                </div>
              ))}
            </dl>

            <InsightBlock className="mt-10" kicker="Central insight" heading={cs.centralInsight} />
          </CaseStudySection>

          {/* Limitations */}
          <CaseStudySection id="limitations" heading="What this evidence does not establish">
            <LimitationBlock
              intro={cs.limitationsIntro}
              items={cs.limitations}
              closing={cs.limitationsClosing}
            />
          </CaseStudySection>

          {/* Takeaway */}
          <CaseStudySection id="takeaway" heading="Takeaway">
            <h3 className="font-serif text-2xl leading-snug text-ink">{cs.takeaway.heading}</h3>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-card border border-line bg-paper-raised p-6">
                <p className="text-micro font-semibold uppercase tracking-[0.11em] text-accent">
                  Comparable today
                </p>
                <ul className="mt-4">
                  {cs.takeaway.comparable.map((item) => (
                    <li
                      key={item}
                      className="border-b border-line py-2.5 text-sm text-ink-soft last:border-b-0"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-card border border-line-strong bg-paper-sunk p-6">
                <p className="text-micro font-semibold uppercase tracking-[0.11em] text-ink-faint">
                  Not comparable yet
                </p>
                <ul className="mt-4">
                  {cs.takeaway.notComparable.map((item) => (
                    <li
                      key={item}
                      className="border-b border-line py-2.5 text-sm text-ink-soft last:border-b-0"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="prose-editorial mt-8">
              {cs.takeaway.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
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
