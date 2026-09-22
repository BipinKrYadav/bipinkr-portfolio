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
} from '../../../lib/snapshot/schema';
import { collectMetricReferences } from '../../../lib/content/token-grammar';

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



type PathSegment = string | number;

/**
 * Every protected token together with the structural path of the field that
 * holds it: object keys and array indices from the document root. A string's
 * tokens sit at the string's own path; a $metricValue or $pair token sits at
 * the object that carries it. Each entry is JSON of [path, token], so paths
 * cannot collide however keys are spelled. Compared as a sorted multiset:
 * token order within one field is free, but a token may not move to another
 * field, which would leave document_metric_refs.field_path stale.
 */
function collectProtectedTokens(value: unknown, path: readonly PathSegment[] = [], into: string[] = []): string[] {
  const record = (token: string) => into.push(JSON.stringify([path, token]));
  if (typeof value === 'string') {
    for (const match of value.match(/\{\{[^{}]*\}\}/g) ?? []) record(match);
    return into;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectProtectedTokens(item, [...path, index], into));
    return into;
  }
  if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    if (typeof object.$metricValue === 'string') record('$metricValue:' + object.$metricValue);
    if (
      object.$pair &&
      typeof object.$pair === 'object' &&
      typeof (object.$pair as Record<string, unknown>).first === 'string' &&
      typeof (object.$pair as Record<string, unknown>).second === 'string'
    ) {
      const pair = object.$pair as Record<string, unknown>;
      record('$pair:' + pair.first + ':' + pair.second);
    }
    Object.entries(object).forEach(([key, item]) => collectProtectedTokens(item, [...path, key], into));
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
      message:
        'Metric, evidence or client-label references cannot be changed or moved to another field in Phase 5A. Edit only the editorial copy.',
    };
  }

  return { ok: true };
}

/** True for text that contains a protected token. */
export function hasProtectedToken(value: string): boolean {
  return value.includes('{{') || value.includes('}}');
}
