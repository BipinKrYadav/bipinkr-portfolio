import { fail, ok, toDataError, type DataResult } from '../metrics/errors';

import type { ContentGateway, CountedRows } from './gateway';
import { validateDocumentDraft } from './draft';
import {
  DOCUMENT_SLUG,
  isDocumentType,
  type DocumentListRow,
  type DocumentMetricRefRow,
  type DocumentRevisionRow,
  type LinkedPhraseRow,
} from './model';

export interface DocumentListEntry extends DocumentListRow {
  /** document_metric_refs rows for this document. */
  referenceCount: number;
}

export interface DocumentReferenceEntry {
  fieldPath: string;
  format: string | null;
  metricId: string;
  /** null only if the metric is not visible to this session. */
  metricKey: string | null;
  metricName: string | null;
  archivedAt: string | null;
}

/**
 * How a linked phrase relates to a document:
 *   attached       — its document_id is this document;
 *   metric_matched — not attached (document_id is another document or null),
 *                    but it restates at least one metric this document references.
 */
export type PhraseRelation = 'attached' | 'metric_matched';

export interface LinkedPhraseMatch extends LinkedPhraseRow {
  relation: PhraseRelation;
  /** The phrase's metric keys that this document references. */
  matchedKeys: string[];
}

/**
 * Everything the read-only detail page shows. Deliberately carries NO page
 * content: the draft and the published revision's content are compared inside
 * the repository and only the outcome is kept.
 */
export interface DocumentDetail {
  document: DocumentListRow;
  /** The current editable draft, visible only to an authenticated admin. */
  draft: unknown;
  /** The document has a draft (always true under the current schema, which requires one). */
  hasDraft: boolean;
  /** The revision published_revision_id points at, or null. */
  publishedRevision: DocumentRevisionRow | null;
  /**
   * The document names a published revision that is not among the revisions
   * returned. Nothing is invented in its place; the UI reports the mismatch.
   */
  publishedRevisionMissing: boolean;
  /** All revision metadata (never content), newest first by revision_number. */
  revisions: DocumentRevisionRow[];
  /** Draft structurally equal to the published revision; null when there is nothing to compare with. */
  draftMatchesPublished: boolean | null;
  /** Sorted by field path, then metric key. */
  references: DocumentReferenceEntry[];
  /** Attached phrases first, then metric-matched ones. */
  linkedPhrases: LinkedPhraseMatch[];
}

export interface ContentRepository {
  /** Documents in database order, each with its metric-reference count. Read-only. */
  listDocuments(): Promise<DataResult<DocumentListEntry[]>>;
  /** One document by type and slug. */
  getDocumentDetail(docType: string, slug: string): Promise<DataResult<DocumentDetail>>;
  /** Save editorial copy; the database creates the revision atomically. */
  saveDocumentDraft(detail: DocumentDetail, draft: unknown, changeSummary: string): Promise<DataResult<DocumentListRow>>;
}

/** JSON with object keys sorted, so equal documents compare equal whatever key order jsonb returns. */
function canonical(value: unknown): string {
  return JSON.stringify(value ?? null, (_key, item: unknown) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : item,
  );
}

/** A capped response would silently drop rows; report it instead. */
function incomplete<T>(result: CountedRows<T>, what: string): string | null {
  return result.total !== null && result.rows.length < result.total
    ? `Only ${result.rows.length} of ${result.total} ${what} were returned, so the list would be incomplete.`
    : null;
}

const toReference = (row: DocumentMetricRefRow): DocumentReferenceEntry => ({
  fieldPath: row.field_path,
  format: row.format,
  metricId: row.metric_id,
  metricKey: row.metrics?.metric_key ?? null,
  metricName: row.metrics?.name ?? null,
  archivedAt: row.metrics?.archived_at ?? null,
});

const byPathThenKey = (a: DocumentReferenceEntry, b: DocumentReferenceEntry) =>
  a.fieldPath === b.fieldPath ? (a.metricKey ?? '').localeCompare(b.metricKey ?? '') : a.fieldPath < b.fieldPath ? -1 : 1;

/** Phrases relevant to a document: attached to it, or restating a metric it references. */
export function matchLinkedPhrases(documentId: string, referencedKeys: ReadonlySet<string>, phrases: readonly LinkedPhraseRow[]): LinkedPhraseMatch[] {
  const matches: LinkedPhraseMatch[] = [];
  for (const phrase of phrases) {
    const matchedKeys = phrase.metric_keys.filter((key) => referencedKeys.has(key));
    if (phrase.document_id === documentId) matches.push({ ...phrase, relation: 'attached', matchedKeys });
    else if (matchedKeys.length > 0) matches.push({ ...phrase, relation: 'metric_matched', matchedKeys });
  }
  return matches.sort((a, b) => (a.relation === b.relation ? 0 : a.relation === 'attached' ? -1 : 1));
}

/**
 * Document reads for the admin UI. Nothing here writes; the database decides
 * what the session may see (RLS), and an empty result is shown as empty.
 */
export function createContentRepository(gateway: ContentGateway): ContentRepository {
  return {
    async listDocuments() {
      let documents: DocumentListRow[];
      let references: CountedRows<{ document_id: string }>;
      try {
        [documents, references] = await Promise.all([gateway.listDocuments(), gateway.listReferenceDocumentIds()]);
      } catch (error) {
        return { ok: false, error: toDataError(error) };
      }

      // A capped response would make every count too low; say so instead of showing them.
      if (references.total !== null && references.rows.length < references.total) {
        return fail(
          'unavailable',
          `Only ${references.rows.length} of ${references.total} metric references were returned, so the counts would be incomplete.`,
        );
      }

      const counts = new Map<string, number>();
      for (const row of references.rows) counts.set(row.document_id, (counts.get(row.document_id) ?? 0) + 1);

      return ok(documents.map((document) => ({ ...document, referenceCount: counts.get(document.id) ?? 0 })));
    },

    async getDocumentDetail(docType, slug) {
      // Nothing that could not be a document is ever sent to the database.
      if (!isDocumentType(docType) || !DOCUMENT_SLUG.test(slug)) {
        return fail('not_found', `No document "${docType}/${slug}".`);
      }

      try {
        const found = await gateway.getDocument(docType, slug);
        if (!found) return fail('not_found', `No document "${docType}/${slug}".`);

        const { draft, ...document } = found;
        const [revisions, references, phrases, publishedContent] = await Promise.all([
          gateway.listRevisions(document.id),
          gateway.listDocumentReferences(document.id),
          gateway.listLinkedPhrases(),
          document.published_revision_id ? gateway.getRevisionContent(document.published_revision_id) : Promise.resolve(null),
        ]);

        const problem = incomplete(references, 'metric references') ?? incomplete(phrases, 'linked phrases');
        if (problem) return fail('unavailable', problem);

        const entries = references.rows.map(toReference).sort(byPathThenKey);
        const referencedKeys = new Set(entries.flatMap((entry) => (entry.metricKey ? [entry.metricKey] : [])));
        const hasDraft = draft !== null && draft !== undefined;

        // The content is compared here and goes no further than this function.
        const draftMatchesPublished = hasDraft && publishedContent !== null ? canonical(draft) === canonical(publishedContent) : null;

        // Newest first by number, whatever order the rows arrived in.
        const history = [...revisions].sort((a, b) => b.revision_number - a.revision_number);
        const publishedRevision = history.find((revision) => revision.id === document.published_revision_id) ?? null;

        return ok({
          document,
          draft,
          hasDraft,
          publishedRevision,
          publishedRevisionMissing: document.published_revision_id !== null && publishedRevision === null,
          revisions: history,
          draftMatchesPublished,
          references: entries,
          linkedPhrases: matchLinkedPhrases(document.id, referencedKeys, phrases.rows),
        });
      } catch (error) {
        return { ok: false, error: toDataError(error) };
      }
    },

    async saveDocumentDraft(detail, draft, changeSummary) {
      const summary = changeSummary.trim();
      if (!summary) return fail('validation', 'A change summary is required.');

      const validation = validateDocumentDraft(detail.document.doc_type, detail.document.slug, draft, detail.draft);
      if (!validation.ok) return fail('validation', validation.message, validation.details);

      if (canonical(detail.draft) === canonical(draft)) {
        return fail('validation', 'There are no changes to save.');
      }

      return attempt(() =>
        gateway.saveDocumentDraft(detail.document.id, detail.document.updated_at, draft, summary),
      );
    },
  };
}
