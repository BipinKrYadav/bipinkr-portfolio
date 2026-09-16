import * as source from '../../../content/case-studies/meta-lead-generation';
import { caseStudyContent } from '../document';

/** Snapshot document `caseStudies.meta-lead-generation`; TypeScript fallback: content/case-studies/meta-lead-generation.ts. */
const content = caseStudyContent('meta-lead-generation', source);

export const {
  summary,
  campaignsHeading,
  sections,
  heroMetrics,
  context,
  methodology,
  cohorts,
  cohortObservations,
  resultTypesTable,
  resultTypesChipNote,
  resultTypesCommentary,
  campaignsIntro,
  campaignsTable,
  variantsIntro,
  variantObservations,
  variantNote,
  blendedMetrics,
  blendedMethodology,
  operationalScale,
  scaleNote,
  limitationsIntro,
  limitations,
  takeaway,
} = content;

export type { Cohort, ScaleItem, VariantObservation } from '../../../content/case-studies/meta-lead-generation';
