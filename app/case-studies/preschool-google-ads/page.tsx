import type { Metadata } from 'next';

import { CaseStudyHero } from '@/components/blocks/CaseStudyHero';
import {
  CaseStudyBody,
  CaseStudyLayout,
  CaseStudySection,
} from '@/components/blocks/CaseStudyLayout';
import { CTASection } from '@/components/blocks/CTASection';
import { CaseStudyView } from '@/components/tracking/CaseStudyView';
import { LimitationBlock } from '@/components/blocks/LimitationBlock';
import { FlowDiagram } from '@/components/data/FlowDiagram';
import { MetricGrid } from '@/components/data/MetricCard';
import { StateComparison } from '@/components/data/StateComparison';
import { EvidenceLabel } from '@/components/ui/EvidenceLabel';
import * as cs from '@/lib/content/case-studies/preschool-google-ads';
import { breadcrumbSchema, buildMetadata, jsonLd } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: cs.summary.title,
  description: cs.summary.metaDescription,
  path: `/case-studies/${cs.summary.slug}`,
  type: 'article',
});

export default function PreschoolGoogleAdsPage() {
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
        scope={cs.heroScope}
      />

      <CaseStudyLayout sections={cs.sections} slug={cs.summary.slug}>
        <CaseStudyBody>
          {/* Terminology */}
          <CaseStudySection id="terminology" heading="One word, defined precisely">
            <div className="prose-editorial mb-8">
              {cs.intro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <div className="rounded-card border border-line bg-paper-raised p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-serif text-xl text-ink">{cs.terminology.term}</h3>
                <EvidenceLabel kind="verified" size="xs" />
              </div>

              <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink">
                {cs.terminology.definition}
              </p>

              <p className="mt-6 text-micro font-semibold uppercase tracking-[0.11em] text-ink-faint">
                It does not mean
              </p>
              <ul className="mt-3 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                {cs.terminology.excludes.map((item) => (
                  <li
                    key={item}
                    className="border-b border-line py-2.5 text-sm text-ink-soft last:border-b-0"
                  >
                    {item}
                  </li>
                ))}
              </ul>

              <p className="mt-6 border-t border-line pt-5 text-[0.9375rem] leading-relaxed text-ink-soft">
                {cs.terminology.note}
              </p>
            </div>
          </CaseStudySection>

          {/* Accounts */}
          {cs.accounts.map((account) => (
            <CaseStudySection
              key={account.id}
              id={account.id}
              heading={`Account ${account.letter} — ${account.name}`}
            >
              <MetricGrid metrics={account.metrics} columns={2} size="sm" />

              <div className="prose-editorial mt-8">
                {account.intro.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>

              {/* Campaign breakdown */}
              <div className="mt-8 space-y-3">
                {account.campaigns.map((campaign) => (
                  <div
                    key={campaign.campaign}
                    className="rounded-card border border-line bg-paper-raised p-5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <h3 className="text-sm font-semibold text-ink">{campaign.campaign}</h3>
                      {campaign.flag ? (
                        <span className="rounded-pill border border-[#E2D3B0] bg-[#F8F2E4] px-2.5 py-0.5 text-micro font-semibold uppercase tracking-[0.08em] text-evidence-reported">
                          {campaign.flag}
                        </span>
                      ) : null}
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                      {(
                        [
                          ['Spend', campaign.spend],
                          ['Clicks', campaign.clicks],
                          ['CPC', campaign.cpc ?? '—'],
                          ['Recorded conversions', campaign.conversions],
                        ] as const
                      ).map(([term, value]) => (
                        <div key={term}>
                          <dt className="text-micro uppercase tracking-[0.09em] text-ink-faint">
                            {term}
                          </dt>
                          <dd className="mt-1 text-sm font-medium tabular-nums text-ink">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>

              {account.diagnostics ? (
                <div className="mt-8">
                  <h3 className="text-micro font-semibold uppercase tracking-[0.11em] text-ink-faint">
                    Conversion action diagnostics
                  </h3>
                  <MetricGrid
                    metrics={account.diagnostics}
                    columns={2}
                    size="sm"
                    className="mt-4"
                  />
                </div>
              ) : null}

              {/* The 171 vs 0 visual belongs to Account A. */}
              {account.id === 'account-a' ? (
                <StateComparison
                  className="mt-8"
                  heading={cs.pmaxNote.heading}
                  reported={{
                    value: cs.pmaxNote.reported.value,
                    label: cs.pmaxNote.reported.label,
                    evidence: 'reported',
                  }}
                  recorded={{
                    value: cs.pmaxNote.recorded.value,
                    label: cs.pmaxNote.recorded.label,
                    evidence: 'verified',
                  }}
                  caution={cs.pmaxNote.caution}
                />
              ) : null}

              {account.note ? (
                <p className="mt-6 text-[0.875rem] leading-relaxed text-ink-faint">
                  {account.note}
                </p>
              ) : null}

              {account.caution ? (
                <p className="mt-6 max-w-[66ch] border-l-2 border-line-strong pl-4 text-[0.9375rem] leading-relaxed text-ink-soft">
                  {account.caution}
                </p>
              ) : null}
            </CaseStudySection>
          ))}

          {/* Checks */}
          <CaseStudySection id="checks" heading="What I checked">
            <ul className="grid grid-cols-1 gap-x-10 gap-y-0 sm:grid-cols-2">
              {cs.checks.map((check) => (
                <li key={check} className="border-b border-line py-3.5 text-sm text-ink-soft">
                  {check}
                </li>
              ))}
            </ul>
          </CaseStudySection>

          {/* Diagnosis */}
          <CaseStudySection id="diagnosis" heading="Where the chain breaks">
            <div className="prose-editorial mb-8">
              {cs.diagnosisIntro.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>

            <FlowDiagram nodes={cs.diagnosisChain} layout="stack" note={cs.diagnosisNote} />
          </CaseStudySection>

          {/* Limitations */}
          <CaseStudySection id="limitations" heading="What this diagnosis does not establish">
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
