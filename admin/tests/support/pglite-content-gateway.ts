import type { PGlite, Transaction } from '@electric-sql/pglite';

import type { ContentGateway } from '../../lib/content/gateway';
import type {
  DocumentListRow,
  DocumentMetricRefRow,
  DocumentReferenceIdRow,
  DocumentRevisionRow,
  DocumentWithDraftRow,
  LinkedPhraseRow,
} from '../../lib/content/model';
import { GatewayError } from '../../lib/metrics/errors';

import { runAs, type Session } from './database';

/**
 * ContentGateway that runs each read as one transaction under the given
 * session, with the grants and RLS the Data API would apply. It selects the
 * same columns as the PostgREST gateway: the list never reads documents.draft;
 * the detail read fetches it (and one revision's content) for comparison only,
 * exactly like the real gateway. Test use only.
 */
export function createPgliteContentGateway(db: PGlite, session: Session): ContentGateway {
  async function run<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    try {
      return await runAs(db, session, work);
    } catch (error) {
      const { code, message } = error as { code?: string; message?: string };
      throw new GatewayError(code ?? 'unknown', message ?? String(error));
    }
  }

  return {
    listDocuments: () =>
      run(async (tx) => {
        const result = await tx.query<{ row: DocumentListRow }>(`
          select jsonb_build_object(
            'id', d.id, 'doc_type', d.doc_type, 'slug', d.slug, 'status', d.status,
            'schema_version', d.schema_version, 'sort_order', d.sort_order,
            'published_revision_id', d.published_revision_id, 'updated_at', d.updated_at
          ) as row
          from public.documents d
          order by d.doc_type, d.sort_order, d.slug`);
        return result.rows.map((item) => item.row);
      }),

    listReferenceDocumentIds: () =>
      run(async (tx) => {
        const result = await tx.query<DocumentReferenceIdRow>('select document_id from public.document_metric_refs');
        const total = await tx.query<{ total: number }>('select count(*)::int as total from public.document_metric_refs');
        return { rows: result.rows, total: total.rows[0].total };
      }),

    getDocument: (docType, slug) =>
      run(async (tx) => {
        const result = await tx.query<{ row: DocumentWithDraftRow }>(
          `select jsonb_build_object(
             'id', d.id, 'doc_type', d.doc_type, 'slug', d.slug, 'status', d.status,
             'schema_version', d.schema_version, 'sort_order', d.sort_order,
             'published_revision_id', d.published_revision_id, 'updated_at', d.updated_at, 'draft', d.draft
           ) as row
           from public.documents d
           where d.doc_type = $1::public.document_type and d.slug = $2`,
          [docType, slug],
        );
        return result.rows[0]?.row ?? null;
      }),

    listRevisions: (documentId) =>
      run(async (tx) => {
        const result = await tx.query<{ row: DocumentRevisionRow }>(
          `select jsonb_build_object(
             'id', r.id, 'document_id', r.document_id, 'revision_number', r.revision_number,
             'schema_version', r.schema_version, 'change_summary', r.change_summary,
             'release_id', r.release_id, 'created_at', r.created_at, 'created_by', r.created_by
           ) as row
           from public.document_revisions r
           where r.document_id = $1
           order by r.revision_number desc`,
          [documentId],
        );
        return result.rows.map((item) => item.row);
      }),

    getRevisionContent: (revisionId) =>
      run(async (tx) => {
        const result = await tx.query<{ content: unknown }>('select content from public.document_revisions where id = $1', [revisionId]);
        return result.rows[0]?.content ?? null;
      }),

    listDocumentReferences: (documentId) =>
      run(async (tx) => {
        const result = await tx.query<{ row: DocumentMetricRefRow }>(
          `select jsonb_build_object(
             'field_path', r.field_path, 'format', r.format, 'metric_id', r.metric_id,
             'metrics', (select jsonb_build_object('metric_key', m.metric_key, 'name', m.name, 'archived_at', m.archived_at)
                         from public.metrics m where m.id = r.metric_id)
           ) as row
           from public.document_metric_refs r
           where r.document_id = $1
           order by r.field_path`,
          [documentId],
        );
        const total = await tx.query<{ total: number }>(
          'select count(*)::int as total from public.document_metric_refs where document_id = $1',
          [documentId],
        );
        return { rows: result.rows.map((item) => item.row), total: total.rows[0].total };
      }),

    listLinkedPhrases: () =>
      run(async (tx) => {
        const result = await tx.query<{ row: LinkedPhraseRow }>(
          `select jsonb_build_object(
             'id', p.id, 'location', p.location, 'phrase', p.phrase, 'metric_keys', p.metric_keys,
             'reason', p.reason, 'reviewed_at', p.reviewed_at, 'reviewed_by', p.reviewed_by,
             'document_id', p.document_id, 'field_path', p.field_path, 'updated_at', p.updated_at
           ) as row
           from public.linked_phrases p
           order by p.location, p.phrase`,
        );
        const total = await tx.query<{ total: number }>('select count(*)::int as total from public.linked_phrases');
        return { rows: result.rows.map((item) => item.row), total: total.rows[0].total };
      }),
  };
}
