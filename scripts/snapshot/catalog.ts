import type { z } from 'zod';

import {
  aboutContentSchema,
  caseStudyIndexContentSchema,
  contactContentSchema,
  crossChannelRealEstateContentSchema,
  homepageContentSchema,
  measurementAuditContentSchema,
  metaLeadGenerationContentSchema,
  preschoolGoogleAdsContentSchema,
  proofStripContentSchema,
  servicesContentSchema,
} from '../../lib/snapshot/schema';

/**
 * Which TypeScript module each snapshot document comes from.
 *
 * The keys copied from a module are exactly the keys of its content schema,
 * so the schema is the single definition of what a document contains.
 */

export interface DocumentSource {
  /** Location in snapshot.documents. */
  path: [string] | ['caseStudies', string];
  type: string;
  slug: string;
  schema: z.ZodObject;
  load: () => Promise<Record<string, unknown>>;
}

export const DOCUMENT_SOURCES: DocumentSource[] = [
  { path: ['proofStrip'], type: 'proof_strip', slug: 'proof-strip', schema: proofStripContentSchema, load: () => import('../../content/metrics') },
  { path: ['homepage'], type: 'homepage', slug: 'home', schema: homepageContentSchema, load: () => import('../../content/pages/home') },
  { path: ['about'], type: 'about', slug: 'about', schema: aboutContentSchema, load: () => import('../../content/pages/about') },
  { path: ['services'], type: 'services', slug: 'services', schema: servicesContentSchema, load: () => import('../../content/services') },
  { path: ['contact'], type: 'contact', slug: 'contact', schema: contactContentSchema, load: () => import('../../content/pages/contact') },
  { path: ['caseStudyIndex'], type: 'case_study_index', slug: 'case-studies', schema: caseStudyIndexContentSchema, load: () => import('../../content/case-studies') },
  {
    path: ['caseStudies', 'meta-lead-generation'],
    type: 'case_study',
    slug: 'meta-lead-generation',
    schema: metaLeadGenerationContentSchema,
    load: () => import('../../content/case-studies/meta-lead-generation'),
  },
  {
    path: ['caseStudies', 'measurement-audit'],
    type: 'case_study',
    slug: 'measurement-audit',
    schema: measurementAuditContentSchema,
    load: () => import('../../content/case-studies/measurement-audit'),
  },
  {
    path: ['caseStudies', 'preschool-google-ads'],
    type: 'case_study',
    slug: 'preschool-google-ads',
    schema: preschoolGoogleAdsContentSchema,
    load: () => import('../../content/case-studies/preschool-google-ads'),
  },
  {
    path: ['caseStudies', 'cross-channel-real-estate'],
    type: 'case_study',
    slug: 'cross-channel-real-estate',
    schema: crossChannelRealEstateContentSchema,
    load: () => import('../../content/case-studies/cross-channel-real-estate'),
  },
];

/** The module exports a document is built from, in schema order. */
export function pickContent(module: Record<string, unknown>, schema: z.ZodObject): Record<string, unknown> {
  const content: Record<string, unknown> = {};
  for (const key of Object.keys(schema.shape)) {
    if (!(key in module)) throw new Error(`Module is missing export "${key}" required by the document schema`);
    content[key] = module[key];
  }
  return content;
}
