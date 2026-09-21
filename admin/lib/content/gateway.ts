import type {
  DocumentListRow,
  DocumentMetricRefRow,
  DocumentReferenceIdRow,
  DocumentRevisionRow,
  DocumentType,
  DocumentWithDraftRow,
  LinkedPhraseRow,
} from './model';

/**
 * The only operations the Documents screens perform against the backend.
 * Read-only: there is no insert, update, delete or RPC here. Each maps to one
 * Data API GET made with the signed-in admin's session, so RLS and grants
 * apply to every call. Implementations throw GatewayError and apply no rules.
 */

/** Rows plus the total the database reports (Content-Range), or null when not reported. */
export interface CountedRows<T> {
  rows: T[];
  total: number | null;
}

export interface ContentGateway {
  /** public.documents, ordered by doc_type, sort_order, slug. Never the draft. */
  listDocuments(): Promise<DocumentListRow[]>;
  /** public.document_metric_refs, document_id only, for per-document counts. */
  listReferenceDocumentIds(): Promise<CountedRows<DocumentReferenceIdRow>>;

  /** One document by type and slug, with its draft (for comparison only), or null. */
  getDocument(docType: DocumentType, slug: string): Promise<DocumentWithDraftRow | null>;
  /** Revision metadata for a document, newest first. Never the content. */
  listRevisions(documentId: string): Promise<DocumentRevisionRow[]>;
  /** The content of one revision (for comparison only), or null when not visible. */
  getRevisionContent(revisionId: string): Promise<unknown | null>;
  /** A document's metric references with each metric's key, name and archive state. */
  listDocumentReferences(documentId: string): Promise<CountedRows<DocumentMetricRefRow>>;
  /** Every linked phrase; relevance to a document is decided by the repository. */
  listLinkedPhrases(): Promise<CountedRows<LinkedPhraseRow>>;
}
