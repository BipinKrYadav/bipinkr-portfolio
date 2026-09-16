import * as source from '../../../content/case-studies/measurement-audit';
import { caseStudyContent } from '../document';

/** Snapshot document `caseStudies.measurement-audit`; TypeScript fallback: content/case-studies/measurement-audit.ts. */
const content = caseStudyContent('measurement-audit', source);

export const {
  summary,
  sections,
  heroMetrics,
  situation,
  situationNote,
  auditChecks,
  scaleFlow,
  failureModes,
  failureModesNote,
  campaignTypes,
  campaignTypesIntro,
  campaignTypesCaution,
  lesson,
  limitationsIntro,
  limitations,
  limitationsClosing,
} = content;

export type { CampaignTypeCard, FailureMode } from '../../../content/case-studies/measurement-audit';
