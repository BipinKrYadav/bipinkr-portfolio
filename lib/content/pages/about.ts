import * as source from '../../../content/pages/about';
import { documentContent } from '../document';

/** About page copy. Snapshot document `about`; TypeScript fallback: content/pages/about.ts. */
const content = documentContent('about', source);

export const {
  aboutContent,
  approach,
  experience,
  realEstateFocus,
  beyondRealEstate,
  capabilities,
  principles,
  measurementLesson,
  currentFocus,
  recruiterSection,
} = content;

export type { Capability } from '../../../content/pages/about';
