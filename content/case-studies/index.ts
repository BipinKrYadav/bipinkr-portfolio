import { fmt } from '@/lib/metrics';

import * as crossChannel from './cross-channel-real-estate';
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

/**
 * Related links shown at the foot of each case study.
 *
 * Two rules govern this map:
 *
 * 1. A case study links to a service only where it genuinely evidences that
 *    service. Nothing links to Landing Pages, because no case study documents
 *    landing page results.
 * 2. `caseStudy` never repeats whatever `getNextCaseStudy()` already returns,
 *    so the reader is never offered the same destination twice.
 */
export interface CaseStudyRelated {
  services: { href: string; label: string }[];
  caseStudy?: { slug: string; label: string; reason: string };
}

export const caseStudyRelated: Record<string, CaseStudyRelated> = {
  'meta-lead-generation': {
    services: [{ href: '/services/#meta-ads', label: 'Meta Ads & Lead Generation' }],
    caseStudy: {
      slug: 'cross-channel-real-estate',
      label: 'Cross-Channel Meta + Google Ads',
      reason: 'The same real estate market, measured across two platforms.',
    },
  },
  'measurement-audit': {
    services: [{ href: '/services/#tracking-measurement', label: 'Tracking & Measurement' }],
    caseStudy: {
      slug: 'meta-lead-generation',
      label: 'Scaling Meta Lead Generation in Patna',
      reason: 'The Meta lead campaigns whose spend this audit examined.',
    },
  },
  'preschool-google-ads': {
    services: [{ href: '/services/#google-ads', label: 'Google Ads & Search Acquisition' }],
    caseStudy: {
      slug: 'measurement-audit',
      label: 'Auditing My Own Ad Accounts',
      reason: `The wider audit these ${fmt('pre.accounts', 'words')} preschool accounts sit inside.`,
    },
  },
  'cross-channel-real-estate': {
    services: [
      { href: '/services/#meta-ads', label: 'Meta Ads & Lead Generation' },
      { href: '/services/#google-ads', label: 'Google Ads & Search Acquisition' },
    ],
    caseStudy: {
      slug: 'measurement-audit',
      label: 'Auditing My Own Ad Accounts',
      reason: 'Where the unreliable Google conversion reporting is documented.',
    },
  },
};

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
