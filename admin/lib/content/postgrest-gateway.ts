import { GatewayError } from '../metrics/errors';

import type { ContentGateway } from './gateway';
import {
  DOCUMENT_DETAIL_COLUMNS,
  DOCUMENT_LIST_COLUMNS,
  LINKED_PHRASE_COLUMNS,
  REVISION_COLUMNS,
  type DocumentListRow,
  type DocumentMetricRefRow,
  type DocumentReferenceIdRow,
  type DocumentRevisionRow,
  type DocumentWithDraftRow,
  type LinkedPhraseRow,
} from './model';

export interface ContentPostgrestGatewayOptions {
  /** Supabase project origin, e.g. https://<project>.supabase.co */
  url: string;
  /** Publishable (anon) key. Never the service-role key. */
  publishableKey: string;
  /** The signed-in admin's access token, or null without an MFA-verified session. */
  getAccessToken: () => Promise<string | null>;
  fetch?: typeof fetch;
}

export const DOCUMENTS_PATH = `documents?select=${DOCUMENT_LIST_COLUMNS.join(',')}&order=doc_type.asc,sort_order.asc,slug.asc`;
export const REFERENCE_IDS_PATH = 'document_metric_refs?select=document_id';

const eq = (value: string) => `eq.${encodeURIComponent(value)}`;

export const documentPath = (docType: string, slug: string) =>
  `documents?select=${DOCUMENT_DETAIL_COLUMNS.join(',')}&doc_type=${eq(docType)}&slug=${eq(slug)}`;
export const revisionsPath = (documentId: string) =>
  `document_revisions?select=${REVISION_COLUMNS.join(',')}&document_id=${eq(documentId)}&order=revision_number.desc`;
export const revisionContentPath = (revisionId: string) => `document_revisions?select=content&id=${eq(revisionId)}`;
export const documentReferencesPath = (documentId: string) =>
  `document_metric_refs?select=field_path,format,metric_id,metrics(metric_key,name,archived_at)&document_id=${eq(documentId)}&order=field_path.asc`;
export const LINKED_PHRASES_PATH = `linked_phrases?select=${LINKED_PHRASE_COLUMNS.join(',')}&order=location.asc,phrase.asc`;

/** Total from a Content-Range header such as "0-321/322" or "*\/0"; null if absent or "*". */
export function totalFromContentRange(header: string | null): number | null {
  const total = header?.split('/')[1];
  if (!total || total === '*') return null;
  const value = Number(total);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * Read-only ContentGateway over the Supabase Data API (PostgREST). Same rules
 * as the metrics gateway: every request carries the admin's own access token,
 * so the database applies RLS and grants as that user, and nothing is sent
 * without a token. Only GET requests exist here.
 */
export function createContentPostgrestGateway(options: ContentPostgrestGatewayOptions): ContentGateway {
  const base = `${options.url.replace(/\/+$/, '')}/rest/v1`;
  const fetchImpl = options.fetch ?? fetch;

  async function get<T>(path: string, prefer?: string): Promise<{ payload: T; contentRange: string | null }> {
    const token = await options.getAccessToken();
    if (!token) throw new GatewayError('unauthenticated', 'No signed-in admin session.', 401);

    let response: Response;
    try {
      response = await fetchImpl(`${base}/${path}`, {
        method: 'GET',
        headers: {
          apikey: options.publishableKey,
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ...(prefer ? { Prefer: prefer } : {}),
        },
        cache: 'no-store',
      });
    } catch {
      throw new GatewayError('network', 'The database could not be reached.');
    }

    const text = await response.text();
    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      throw new GatewayError(String(response.status), 'The database returned an unreadable response.', response.status);
    }
    if (!response.ok) {
      const body = (payload ?? {}) as { code?: string; message?: string };
      throw new GatewayError(body.code ?? String(response.status), body.message ?? response.statusText, response.status);
    }
    return { payload: payload as T, contentRange: response.headers.get('Content-Range') };
  }

  return {
    listDocuments: async () => (await get<DocumentListRow[]>(DOCUMENTS_PATH)).payload,

    async listReferenceDocumentIds() {
      const { payload, contentRange } = await get<DocumentReferenceIdRow[]>(REFERENCE_IDS_PATH, 'count=exact');
      return { rows: payload, total: totalFromContentRange(contentRange) };
    },

    async getDocument(docType, slug) {
      const { payload } = await get<DocumentWithDraftRow[]>(documentPath(docType, slug));
      return payload[0] ?? null;
    },

    listRevisions: async (documentId) => (await get<DocumentRevisionRow[]>(revisionsPath(documentId))).payload,

    async getRevisionContent(revisionId) {
      const { payload } = await get<{ content: unknown }[]>(revisionContentPath(revisionId));
      return payload[0]?.content ?? null;
    },

    async saveDocumentDraft(documentId, expectedUpdatedAt, draft, changeSummary) {
      const payload = await request<DocumentListRow>('rpc/save_document_draft', {
        method: 'POST',
        body: {
          p_document_id: documentId,
          p_expected_updated_at: expectedUpdatedAt,
          p_draft: draft,
          p_change_summary: changeSummary,
        },
      });
      return payload;
    },

    async listDocumentReferences(documentId) {
      const { payload, contentRange } = await get<DocumentMetricRefRow[]>(documentReferencesPath(documentId), 'count=exact');
      return { rows: payload, total: totalFromContentRange(contentRange) };
    },

    async listLinkedPhrases() {
      const { payload, contentRange } = await get<LinkedPhraseRow[]>(LINKED_PHRASES_PATH, 'count=exact');
      return { rows: payload, total: totalFromContentRange(contentRange) };
    },
  };
}
