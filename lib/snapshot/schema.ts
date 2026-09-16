import { z } from 'zod';

import { ICON_NAMES } from '../content/icon-names';
import { EVIDENCE_TOKEN, hasOnlyKnownTokens, METRIC_ID } from '../content/token-grammar';
import { METRIC_FORMATS } from '../metrics/format';
import type { LinkedPhrase, PublicMetricDefinition } from '../metrics/types';

/**
 * Strict schemas for the content snapshot.
 *
 * Every object is strict: an unknown key — including any private field that
 * should never have left the source — fails validation and fails the build.
 */

export const SNAPSHOT_SCHEMA_VERSION = 1;

/* ------------------------------------------------------------------ */
/* Metrics                                                             */
/* ------------------------------------------------------------------ */

const metricId = z.string().regex(METRIC_ID, 'must be <dataset>.<entity>.<measure> in lower_snake_case');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be an ISO date (YYYY-MM-DD)');

export const evidenceKindSchema = z.enum([
  'documented',
  'verified',
  'calculated',
  'reported',
  'unverified',
  'limitation',
  'recommendation',
]);

const formulaSchema = z.discriminatedUnion('fn', [
  z.strictObject({ fn: z.literal('ratio'), numerator: metricId, denominator: metricId }),
  z.strictObject({ fn: z.literal('percent'), part: metricId, whole: metricId }),
  z.strictObject({ fn: z.literal('sum'), terms: z.array(metricId).min(1) }),
  z.strictObject({ fn: z.literal('difference'), minuend: metricId, subtrahend: metricId }),
  z.strictObject({ fn: z.literal('pct_decrease'), from: metricId, to: metricId }),
  z.strictObject({ fn: z.literal('pct_increase'), from: metricId, to: metricId }),
  z.strictObject({ fn: z.literal('multiple'), value: metricId, base: metricId }),
  z.strictObject({ fn: z.literal('min'), of: z.array(metricId).min(1) }),
  z.strictObject({ fn: z.literal('max'), of: z.array(metricId).min(1) }),
  z.strictObject({ fn: z.literal('spread'), of: z.array(metricId).min(1) }),
  z.strictObject({ fn: z.literal('count'), of: z.array(metricId).min(1) }),
]);

const reportingPeriodSchema = z.strictObject({
  basis: z.enum(['not_recorded', 'campaign_start_year', 'export_span']),
  start: isoDate.nullable(),
  end: isoDate.nullable(),
  description: z.string().min(1),
});

const metricBase = {
  id: metricId,
  name: z.string().min(1),
  description: z.string().min(1),
  valueType: z.enum(['currency', 'count', 'percent', 'multiple', 'duration']),
  unit: z.enum([
    'inr', 'lead', 'form_submission', 'click', 'impression', 'conversion', 'result', 'campaign',
    'ad_set', 'ad', 'city', 'objective', 'account', 'conversion_action', 'source', 'percent',
    'multiple', 'month',
  ]),
  currency: z.literal('INR').nullable(),
  evidenceStatus: evidenceKindSchema.nullable(),
  dataOrigin: z.enum(['platform', 'derived', 'owner_confirmed']),
  sourcePlatform: z.enum(['meta_ads', 'google_ads', 'meta_and_google_ads']).nullable(),
  sourceType: z.enum(['platform_export', 'platform_diagnostics', 'owner_confirmation', 'calculation']),
  reportingPeriod: reportingPeriodSchema,
  precision: z.enum(['exact', 'lower_bound', 'rounded_published']),
  displayFormat: z.enum(METRIC_FORMATS),
};

export const publicMetricSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...metricBase,
    kind: z.literal('raw'),
    value: z.number().nullable(),
    formula: z.null(),
    legacyMethodNote: z.null(),
  }),
  z.strictObject({
    ...metricBase,
    kind: z.literal('calculated'),
    value: z.null(),
    formula: formulaSchema,
    legacyMethodNote: z.null(),
  }),
  z.strictObject({
    ...metricBase,
    kind: z.literal('legacy_fixed'),
    value: z.number(),
    formula: z.null(),
    legacyMethodNote: z.string().min(1),
  }),
]);

export const linkedPhraseSchema = z.strictObject({
  location: z.string().min(1),
  phrase: z.string().min(1),
  metricIds: z.array(metricId).min(1),
  reason: z.string().min(1),
});

/** Keeps the schemas and the TypeScript model in step: compile fails if they drift. */
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const metricSchemaMatchesModel: Same<z.infer<typeof publicMetricSchema>, PublicMetricDefinition> = true;
const phraseSchemaMatchesModel: Same<z.infer<typeof linkedPhraseSchema>, LinkedPhrase> = true;
void metricSchemaMatchesModel;
void phraseSchemaMatchesModel;

/* ------------------------------------------------------------------ */
/* Media                                                               */
/* ------------------------------------------------------------------ */

export const mediaAssetSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]{8,64}$/),
  kind: z.enum(['profile', 'thumbnail', 'case_study_image', 'screenshot', 'og', 'site', 'document']),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  alt: z.string(),
  version: z.number().int().positive(),
});

/* ------------------------------------------------------------------ */
/* Content building blocks                                             */
/* ------------------------------------------------------------------ */

/** Copy that may contain metric and label tokens. */
const text = z.string().refine(hasOnlyKnownTokens, 'contains a malformed or unknown {{…}} token');
/** Copy that must stay fixed text: editorial titles, H1s, slugs, links. */
const fixedText = z.string().refine((value) => !value.includes('{{'), 'tokens are not allowed in this field');
const texts = z.array(text);
const evidenceField = z.union([evidenceKindSchema, z.string().regex(EVIDENCE_TOKEN)]);

const metricDisplay = z.strictObject({
  value: text,
  label: text,
  note: text.optional(),
  evidence: evidenceField.optional(),
});

const metricPairDisplay = z.strictObject({
  $pair: z.strictObject({
    first: metricId,
    second: metricId,
    separator: z.string().optional(),
    format: z.enum(METRIC_FORMATS).optional(),
    evidence: evidenceKindSchema.optional(),
  }),
  label: text,
});

const figure = z.union([metricDisplay, metricPairDisplay]);
const figures = z.array(figure);
const metricValueRef = z.strictObject({ $metricValue: metricId });
const iconRef = z.strictObject({ $icon: z.enum(ICON_NAMES) });

const flowNode = z.strictObject({
  label: text,
  note: text.optional(),
  state: z.enum(['ok', 'uncertain', 'unknown']).optional(),
});

const dataTable = z.strictObject({
  caption: text.optional(),
  columns: z.array(
    z.strictObject({
      key: z.string().min(1),
      header: text,
      numeric: z.boolean().optional(),
      width: z.string().optional(),
    }),
  ),
  rows: z.array(z.record(z.string(), text)),
  footRow: z.record(z.string(), text).optional(),
  note: text.optional(),
});

const section = z.strictObject({ id: fixedText, navLabel: text, heading: text });
const termValue = z.strictObject({ term: text, value: text });
const titleBody = z.strictObject({ title: text, body: text });
const numbered = z.strictObject({ number: fixedText, title: text, body: text });
const headingBody = z.strictObject({ heading: text, body: text });
const headingParagraphs = z.strictObject({ heading: text, body: texts });

const caseStudySummary = z.strictObject({
  slug: fixedText,
  title: fixedText,
  cardTitle: fixedText,
  subtitle: text,
  cardDescription: text,
  metaDescription: text,
  industry: text,
  platform: text,
  cardMetrics: figures,
  cta: headingBody,
  order: z.number().int(),
});

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

function documentSchema<Type extends string, Slug extends string, Content extends z.ZodType>(
  type: Type,
  slug: Slug,
  content: Content,
) {
  return z.strictObject({
    type: z.literal(type),
    slug: z.literal(slug),
    status: z.literal('published'),
    schemaVersion: z.literal(SNAPSHOT_SCHEMA_VERSION),
    content,
  });
}

export const proofStripContentSchema = z.strictObject({
  proofMetrics: figures,
  proofMethodologyNote: text,
});

export const homepageContentSchema = z.strictObject({
  hero: z.strictObject({
    eyebrow: text,
    h1: fixedText,
    subheadline: text,
    primaryCta: text,
    secondaryCta: text,
    trustLine: text,
  }),
  intro: z.strictObject({ eyebrow: text, heading: text, body: texts, chain: texts, closing: text }),
  servicesSection: z.strictObject({ eyebrow: text, heading: text, subheading: text, cta: text }),
  caseStudiesSection: z.strictObject({ eyebrow: text, heading: text, subheading: text, cta: text }),
  howIWork: z.strictObject({ eyebrow: text, heading: text, subheading: text }),
  whyWorkWithMe: z.strictObject({
    eyebrow: text,
    heading: text,
    subheading: text,
    points: z.array(z.strictObject({ title: text, body: text, icon: iconRef })),
  }),
  aboutSnippet: z.strictObject({ eyebrow: text, heading: text, body: texts, cta: text }),
  finalCta: z.strictObject({ eyebrow: text, heading: text, body: text, note: text }),
});

export const aboutContentSchema = z.strictObject({
  aboutContent: z.strictObject({ eyebrow: text, h1: fixedText, intro: text, secondaryIntro: text }),
  approach: z.strictObject({ eyebrow: text, heading: text, body: texts }),
  experience: z.strictObject({ eyebrow: text, heading: text, body: texts }),
  realEstateFocus: z.strictObject({ eyebrow: text, heading: text, body: text, items: texts }),
  beyondRealEstate: headingBody,
  capabilities: z.array(z.strictObject({ title: text, body: text, icon: iconRef })),
  principles: z.strictObject({ eyebrow: text, heading: text, items: z.array(numbered) }),
  measurementLesson: z.strictObject({
    eyebrow: text,
    heading: text,
    body: texts,
    pullQuote: text,
    ctaLabel: text,
    ctaHref: fixedText,
  }),
  currentFocus: z.strictObject({ eyebrow: text, heading: text, items: z.array(titleBody) }),
  recruiterSection: headingBody,
});

export const servicesContentSchema = z.strictObject({
  services: z.array(
    z.strictObject({
      slug: fixedText,
      title: text,
      summary: text,
      description: text,
      includes: texts,
      bestFor: texts.optional(),
      principle: text.optional(),
      evidence: z.strictObject({ slug: fixedText, label: text }).optional(),
      icon: iconRef,
    }),
  ),
  servicesPageContent: z.strictObject({ eyebrow: text, h1: fixedText, intro: text, secondaryIntro: text }),
  funnelNodes: z.array(flowNode),
  funnelContent: z.strictObject({ eyebrow: text, heading: text, body: text }),
  processSteps: z.array(z.strictObject({ number: fixedText, title: text, description: text })),
  servicesCta: headingBody,
});

export const contactContentSchema = z.strictObject({
  contactContent: z.strictObject({
    eyebrow: text,
    h1: fixedText,
    intro: text,
    primaryCta: text,
    secondaryCta: text,
    responseNote: text,
  }),
  auditOffer: z.strictObject({
    heading: text,
    body: text,
    disclaimer: text,
    covers: z.array(titleBody),
    boundaries: z.strictObject({ heading: text, items: texts }),
  }),
  thankYouContent: z.strictObject({
    confirmed: z.strictObject({ eyebrow: text, h1: fixedText, body: text }),
    direct: z.strictObject({ eyebrow: text, h1: fixedText, body: text }),
    nextSteps: z.strictObject({ heading: text, steps: z.array(numbered) }),
    meanwhile: headingBody,
    whatsappPrompt: text,
    whatsappMessage: text,
  }),
  recruiterCta: headingBody,
});

export const caseStudyIndexContentSchema = z.strictObject({
  caseStudyRelated: z.record(
    z.string(),
    z.strictObject({
      services: z.array(z.strictObject({ href: fixedText, label: text })),
      caseStudy: z.strictObject({ slug: fixedText, label: text, reason: text }).optional(),
    }),
  ),
  caseStudyIndexContent: z.strictObject({ eyebrow: text, heading: text, subheading: text, intro: texts }),
});

export const metaLeadGenerationContentSchema = z.strictObject({
  summary: caseStudySummary,
  campaignsHeading: text,
  sections: z.array(section),
  heroMetrics: figures,
  context: z.array(termValue),
  methodology: z.strictObject({ body: texts, labelPrimary: text, labelSecondary: text }),
  cohorts: z.array(
    z.strictObject({
      name: text,
      spend: text,
      leads: text,
      cpl: text,
      cplValue: metricValueRef,
      leadsValue: metricValueRef,
    }),
  ),
  cohortObservations: texts,
  resultTypesTable: dataTable,
  resultTypesChipNote: text,
  resultTypesCommentary: texts,
  campaignsIntro: text,
  campaignsTable: dataTable,
  variantsIntro: text,
  variantObservations: z.array(
    z.strictObject({
      campaign: text,
      original: z.strictObject({ spend: text, leads: text, cpl: text }),
      variant: z.strictObject({ spend: text, leads: text, cpl: text }),
    }),
  ),
  variantNote: text,
  blendedMetrics: figures,
  blendedMethodology: texts,
  operationalScale: z.array(z.strictObject({ value: text, label: text })),
  scaleNote: text,
  limitationsIntro: text,
  limitations: texts,
  takeaway: headingParagraphs,
});

export const measurementAuditContentSchema = z.strictObject({
  summary: caseStudySummary,
  sections: z.array(section),
  heroMetrics: figures,
  situation: texts,
  situationNote: text,
  auditChecks: z.array(z.strictObject({ title: text, description: text })),
  scaleFlow: z.array(z.strictObject({ label: text, value: text, tone: z.enum(['neutral', 'flag']) })),
  failureModes: z.array(
    z.strictObject({
      number: fixedText,
      title: text,
      summary: text,
      body: texts,
      metrics: figures.optional(),
      table: dataTable.optional(),
      caution: text,
    }),
  ),
  failureModesNote: text,
  campaignTypes: z.array(
    z.strictObject({
      name: text,
      rows: z.array(z.strictObject({ term: text, value: text, evidence: evidenceField.optional() })),
    }),
  ),
  campaignTypesIntro: text,
  campaignTypesCaution: text,
  lesson: headingParagraphs,
  limitationsIntro: text,
  limitations: texts,
  limitationsClosing: text,
});

export const preschoolGoogleAdsContentSchema = z.strictObject({
  summary: caseStudySummary,
  sections: z.array(section),
  heroScope: text,
  heroMetrics: figures,
  intro: texts,
  terminology: z.strictObject({ term: text, definition: text, excludes: texts, note: text }),
  accounts: z.array(
    z.strictObject({
      id: fixedText,
      letter: fixedText,
      name: text,
      metrics: figures,
      intro: texts,
      campaigns: z.array(
        z.strictObject({
          campaign: text,
          spend: text,
          clicks: text,
          cpc: text.optional(),
          conversions: text,
          flag: text.optional(),
        }),
      ),
      diagnostics: figures.optional(),
      note: text.optional(),
      caution: text.optional(),
    }),
  ),
  checks: texts,
  diagnosisIntro: texts,
  diagnosisChain: z.array(flowNode),
  diagnosisNote: text,
  pmaxNote: z.strictObject({
    heading: text,
    reported: z.strictObject({ value: text, label: text }),
    recorded: z.strictObject({ value: text, label: text }),
    caution: text,
  }),
  limitationsIntro: text,
  limitations: texts,
  limitationsClosing: text,
});

export const crossChannelRealEstateContentSchema = z.strictObject({
  summary: caseStudySummary,
  metaHeading: text,
  googleHeading: text,
  sections: z.array(section),
  heroMetrics: figures,
  context: z.array(termValue),
  contextIntro: texts,
  metaTable: dataTable,
  metaCommentary: texts,
  googleTable: dataTable,
  googleMetrics: figures,
  channelPanels: z.array(
    z.strictObject({
      channel: text,
      spend: text,
      outcomeValue: text,
      outcomeLabel: text,
      outcomeEvidence: evidenceField.optional(),
      rows: z.array(termValue),
      caveat: text.optional(),
    }),
  ),
  comparisonCaution: text,
  limitationBody: texts,
  inflatedRates: texts,
  limitationRules: z.array(z.strictObject({ rule: text, reason: text })),
  centralInsight: text,
  limitationsIntro: text,
  limitations: texts,
  limitationsClosing: text,
  takeaway: z.strictObject({ heading: text, comparable: texts, notComparable: texts, body: texts }),
});

export const documentsSchema = z.strictObject({
  proofStrip: documentSchema('proof_strip', 'proof-strip', proofStripContentSchema),
  homepage: documentSchema('homepage', 'home', homepageContentSchema),
  about: documentSchema('about', 'about', aboutContentSchema),
  services: documentSchema('services', 'services', servicesContentSchema),
  contact: documentSchema('contact', 'contact', contactContentSchema),
  caseStudyIndex: documentSchema('case_study_index', 'case-studies', caseStudyIndexContentSchema),
  caseStudies: z.strictObject({
    'meta-lead-generation': documentSchema('case_study', 'meta-lead-generation', metaLeadGenerationContentSchema),
    'measurement-audit': documentSchema('case_study', 'measurement-audit', measurementAuditContentSchema),
    'preschool-google-ads': documentSchema('case_study', 'preschool-google-ads', preschoolGoogleAdsContentSchema),
    'cross-channel-real-estate': documentSchema(
      'case_study',
      'cross-channel-real-estate',
      crossChannelRealEstateContentSchema,
    ),
  }),
});

export const snapshotSchema = z.strictObject({
  schemaVersion: z.literal(SNAPSHOT_SCHEMA_VERSION),
  kind: z.enum(['baseline', 'release']),
  description: z.string().min(1),
  metrics: z.array(publicMetricSchema).min(1),
  linkedPhrases: z.array(linkedPhraseSchema),
  media: z.array(mediaAssetSchema),
  documents: documentsSchema,
});

export type Snapshot = z.infer<typeof snapshotSchema>;
export type SnapshotDocuments = Snapshot['documents'];
export type CaseStudySlug = keyof SnapshotDocuments['caseStudies'];
