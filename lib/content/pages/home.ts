import * as source from '../../../content/pages/home';
import { documentContent } from '../document';

/** Homepage copy. Snapshot document `homepage`; TypeScript fallback: content/pages/home.ts. */
const content = documentContent('homepage', source);

export const {
  hero,
  intro,
  servicesSection,
  caseStudiesSection,
  howIWork,
  whyWorkWithMe,
  aboutSnippet,
  finalCta,
} = content;

export type { WhyPoint } from '../../../content/pages/home';
