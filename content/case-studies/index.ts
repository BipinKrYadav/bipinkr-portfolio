import * as crossChannel from './cross-channel-meta-google';
import * as measurementAudit from './measurement-audit';
import * as metaLeadGen from './meta-lead-generation';
import * as preschool from './preschool-google-ads';
import type { CaseStudySummary } from '../types';

/**
 * Ordered list of case study summaries, used by the homepage section, the
 * case study index, breadcrumbs, "next case study" links and the sitemap.
 *
 * Each case study page imports its own module directly for the full
 * dataset; this index only carries what a card needs.
 */
export const caseStudies: CaseStudySummary[] = [
  metaLeadGen.summary,
  measurementAudit.summary,
  preschool.summary,
  crossChannel.summary,
].sort((a, b) => a.order - b.order);

export const caseStudySlugs = caseStudies.map((study) => study.slug);

export function getCaseStudy(slug: string): CaseStudySummary | undefined {
  return caseStudies.find((study) => study.slug === slug);
}

/** The next case study in reading order, wrapping around at the end. */
export function getNextCaseStudy(slug: string): CaseStudySummary {
  const index = caseStudies.findIndex((study) => study.slug === slug);
  return caseStudies[(index + 1) % caseStudies.length];
}

export const caseStudyIndexContent = {
  eyebrow: 'Case Studies',
  heading: 'Selected Campaign Evidence',
  subheading:
    'Real campaign data, decisions and limitations — not polished numbers without context.',
  intro: [
    'Each case study below is built from documented campaign exports. Where the evidence supports a conclusion, it is stated plainly. Where it does not, that is stated just as plainly.',
    'You will find cost per lead, spend, clicks and campaign structure. You will not find revenue figures, qualified-lead counts or return on ad spend, because the available evidence does not establish them.',
  ],
};
