import * as source from '../../../content/case-studies';
import type { CaseStudySummary } from '../../../content/types';
import { documentContent } from '../document';
import * as crossChannel from './cross-channel-real-estate';
import * as measurementAudit from './measurement-audit';
import * as metaLeadGen from './meta-lead-generation';
import * as preschool from './preschool-google-ads';

/**
 * Case study index, related links and reading order. Snapshot document
 * `caseStudyIndex` plus each case study's summary; TypeScript fallback:
 * content/case-studies/index.ts.
 */
const content = documentContent('caseStudyIndex', source);

export const { caseStudyRelated, caseStudyIndexContent } = content;

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

export type { CaseStudyRelated } from '../../../content/case-studies';
