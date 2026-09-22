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
} from '@lib/snapshot/schema';
import { collectMetricReferences } from '@lib/content/token-grammar';

import type { DocumentType } from './model';

const schemaFor = (docType: DocumentType, slug: string) => {
  if (docType === 'proof_strip') return proofStripContentSchema;
  if (docType === 'homepage') return homepageContentSchema;
  if (docType === 'about') return aboutContentSchema;
  if (docType === 'services') return servicesContentSchema;
  if (docType === 'contact') return contactContentSchema;
  if (docType === 'case_study_index') return caseStudyIndexContentSchema;
  if (docType === 'case_study' && slug === 'meta-lead-generation') return metaLeadGenerationContentSchema;
  if (docType === 'case_study' && slug === 'measurement-audit') return measurementAuditContentSchema;
  if (docType === 'case_study' && slug === 'preschool-google-ads') return preschoolGoogleAdsContentSchema;
  if (docType === 'case_study' && slug === 'cross-channel-real-estate') return crossChannelRealEstateContentSchema;
  return null;
};



function collectProtectedTokens(value: unknown, into: string[] = []): string[] {
  if (typeof value === 'string') {
    for (const match of value.match(/\{\{[^{}]*\}\}/g) ?? []) into.push(match);
    return into;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectProtectedTokens(item, into));
    return into;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.$metricValue === 'string') into.push('$metricValue:' + record.$metricValue);
    if (
      record.$pair &&
      typeof record.$pair === 'object' &&
      typeof (record.$pair as Record<string, unknown>).first === 'string' &&
      typeof (record.$pair as Record<string, unknown>).second === 'string'
    ) {
      const pair = record.$pair as Record<string, unknown>;
      into.push('$pair:' + pair.first + ':' + pair.second);
    }
    Object.values(record).forEach((item) => collectProtectedTokens(item, into));
  }
  return into;
}

export type DraftValidation =
  | { ok: true }
  | { ok: false; message: string; details?: string[] };

export function validateDocumentDraft(
  docType: DocumentType,
  slug: string,
  draft: unknown,
  original: unknown,
): DraftValidation {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    return { ok: false, message: 'The draft must be a JSON object.' };
  }

  const schema = schemaFor(docType, slug);
  if (!schema) return { ok: false, message: 'This document type is not editable in Phase 5A.' };

  const parsed = schema.safeParse(draft);
  if (!parsed.success) {
    return {
      ok: false,
      message: 'The draft does not match the published document schema.',
      details: parsed.error.issues
        .slice(0, 12)
        .map((issue) => (issue.path.join('.') || '(root)') + ': ' + issue.message),
    };
  }

  const originalRefs = [...collectMetricReferences(original)].sort();
  const draftRefs = [...collectMetricReferences(draft)].sort();
  const originalTokens = collectProtectedTokens(original).sort();
  const draftTokens = collectProtectedTokens(draft).sort();
  if (JSON.stringify(originalRefs) !== JSON.stringify(draftRefs) || JSON.stringify(originalTokens) !== JSON.stringify(draftTokens)) {
    return {
      ok: false,
      message: 'Metric, evidence or client-label references cannot be changed in Phase 5A. Edit only the editorial copy.',
    };
  }

  return { ok: true };
}

/** True for text that contains a protected token. */
export function hasProtectedToken(value: string): boolean {
  return value.includes('{{') || value.includes('}}');
}
