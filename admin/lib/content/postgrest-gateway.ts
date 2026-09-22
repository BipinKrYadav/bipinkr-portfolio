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
 * ContentGateway over the Supabase Data API (PostgREST). Same rules as the
 * metrics gateway: every request carries the admin's own access token, so the
 * database applies RLS and grants as that user, and nothing is sent without a
 * token. Reads are GET requests. The only write is a POST to the dedicated
 * save_document_draft RPC, which checks admin access, tokens and concurrency
 * in the database; documents are never updated directly from the browser.
 */
export function createContentPostgrestGateway(options: ContentPostgrestGatewayOptions): ContentGateway {
  const base = `${options.url.replace(/\/+$/, '')}/rest/v1`;
  const fetchImpl = options.fetch ?? fetch;

  async function send<T>(
    path: string,
    init: { method: 'GET' | 'POST'; body?: unknown; prefer?: string },
  ): Promise<{ payload: T; contentRange: string | null }> {
    // No token, no request: checked before anything is built or sent.
    const token = await options.getAccessToken();
    if (!token) throw new GatewayError('unauthenticated', 'No signed-in admin session.', 401);

    let response: Response;
    try {
      response = await fetchImpl(`${base}/${path}`, {
        method: init.method,
        headers: {
          apikey: options.publishableKey,
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(init.prefer ? { Prefer: init.prefer } : {}),
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
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

  const get = <T>(path: string, prefer?: string) => send<T>(path, { method: 'GET', prefer });

  /** POST to a database function (RPC) and return its result. */
  async function rpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
    return (await send<T>(`rpc/${name}`, { method: 'POST', body })).payload;
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

    saveDocumentDraft: (documentId, expectedUpdatedAt, draft, changeSummary) =>
      rpc<DocumentListRow>('save_document_draft', {
        p_document_id: documentId,
        p_expected_updated_at: expectedUpdatedAt,
        p_draft: draft,
        p_change_summary: changeSummary,
      }),

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
