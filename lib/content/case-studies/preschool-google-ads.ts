import * as source from '../../../content/case-studies/preschool-google-ads';
import { caseStudyContent } from '../document';

/** Snapshot document `caseStudies.preschool-google-ads`; TypeScript fallback: content/case-studies/preschool-google-ads.ts. */
const content = caseStudyContent('preschool-google-ads', source);

export const {
  summary,
  sections,
  heroScope,
  heroMetrics,
  intro,
  terminology,
  accounts,
  checks,
  diagnosisIntro,
  diagnosisChain,
  diagnosisNote,
  pmaxNote,
  limitationsIntro,
  limitations,
  limitationsClosing,
} = content;

export type { AccountBlock, AccountCampaign } from '../../../content/case-studies/preschool-google-ads';
