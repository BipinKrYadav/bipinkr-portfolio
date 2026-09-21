/**
 * Document rows as stored in public.documents (supabase/migrations, 4 of 9),
 * limited to what the read-only Documents screens need.
 *
 * Page content — `draft` and document_revisions.content, token form with real
 * client names inside {{label:…}} tokens — is never part of a row the UI
 * receives. The list never requests it. The detail request fetches the draft
 * and the published revision's content at runtime, only so the repository can
 * compare them; it returns a yes/no and drops the content (repository.ts).
 */

/** public.document_type */
export type DocumentType =
  | 'proof_strip'
  | 'homepage'
  | 'about'
  | 'services'
  | 'contact'
  | 'case_study_index'
  | 'case_study'
  | 'blog_post'
  | 'site_settings';

/** public.document_status */
export type DocumentStatus = 'draft' | 'published' | 'hidden';

export interface DocumentListRow {
  id: string;
  doc_type: DocumentType;
  slug: string;
  status: DocumentStatus;
  schema_version: number;
  sort_order: number;
  published_revision_id: string | null;
  updated_at: string;
}

/** The documents list columns, exactly as requested from the Data API. */
export const DOCUMENT_LIST_COLUMNS = [
  'id',
  'doc_type',
  'slug',
  'status',
  'schema_version',
  'sort_order',
  'published_revision_id',
  'updated_at',
] as const satisfies readonly (keyof DocumentListRow)[];

/** One public.document_metric_refs row, reduced to the column the count needs. */
export interface DocumentReferenceIdRow {
  document_id: string;
}

export const DOCUMENT_TYPES = [
  'proof_strip',
  'homepage',
  'about',
  'services',
  'contact',
  'case_study_index',
  'case_study',
  'blog_post',
  'site_settings',
] as const satisfies readonly DocumentType[];

export const isDocumentType = (value: string): value is DocumentType => (DOCUMENT_TYPES as readonly string[]).includes(value);

/** public.documents slug check. */
export const DOCUMENT_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ---------------------------------------------------------------------------
// Document detail (Phase 4.5). Rows as the gateway returns them.
// ---------------------------------------------------------------------------

/**
 * A document with its draft. The draft is requested only so the repository
 * can compare it with the published revision; it never leaves the repository.
 */
export interface DocumentWithDraftRow extends DocumentListRow {
  draft: unknown;
}

export const DOCUMENT_DETAIL_COLUMNS = [...DOCUMENT_LIST_COLUMNS, 'draft'] as const;

/** public.document_revisions metadata — never the content. */
export interface DocumentRevisionRow {
  id: string;
  document_id: string;
  revision_number: number;
  schema_version: number;
  change_summary: string | null;
  release_id: number | null;
  created_at: string;
  created_by: string | null;
}

export const REVISION_COLUMNS = [
  'id',
  'document_id',
  'revision_number',
  'schema_version',
  'change_summary',
  'release_id',
  'created_at',
  'created_by',
] as const satisfies readonly (keyof DocumentRevisionRow)[];

/** One public.document_metric_refs row with its metric, as embedded by PostgREST. */
export interface DocumentMetricRefRow {
  field_path: string;
  format: string | null;
  metric_id: string;
  metrics: { metric_key: string; name: string; archived_at: string | null } | null;
}

/** One public.linked_phrases row. */
export interface LinkedPhraseRow {
  id: string;
  location: string;
  phrase: string;
  metric_keys: string[];
  reason: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  document_id: string | null;
  field_path: string | null;
  updated_at: string;
}

export const LINKED_PHRASE_COLUMNS = [
  'id',
  'location',
  'phrase',
  'metric_keys',
  'reason',
  'reviewed_at',
  'reviewed_by',
  'document_id',
  'field_path',
  'updated_at',
] as const satisfies readonly (keyof LinkedPhraseRow)[];

export const documentStatusLabels: Record<DocumentStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  hidden: 'Hidden',
};
