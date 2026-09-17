import { GatewayError } from './errors';
import type { MetricsGateway, MetricUpdate } from './gateway';
import type {
  DocumentReferenceRow,
  EvidenceLinkRow,
  EvidenceStatus,
  LinkedPhraseRow,
  MetricRow,
  MetricVerificationRow,
  MetricVersionRow,
} from './model';

export interface PostgrestGatewayOptions {
  /** Supabase project origin, e.g. https://<project>.supabase.co */
  url: string;
  /** Publishable (anon) key. Never the service-role key. */
  publishableKey: string;
  /** The signed-in admin's access token, or null without an MFA-verified session. */
  getAccessToken: () => Promise<string | null>;
  fetch?: typeof fetch;
}

const EVIDENCE_SELECT =
  'metric_id,evidence_file_id,locator,created_at,created_by,' +
  'evidence_files(original_filename,description,mime_type,byte_size,sha256,contains_personal_data,retention_review_at,archived_at)';

/**
 * MetricsGateway over the Supabase Data API (PostgREST). Every request carries
 * the admin's own access token, so the database applies RLS and grants as that
 * user. Requests are never sent without a token.
 */
export function createPostgrestGateway(options: PostgrestGatewayOptions): MetricsGateway {
  const base = `${options.url.replace(/\/+$/, '')}/rest/v1`;
  const fetchImpl = options.fetch ?? fetch;

  async function request<T>(path: string, init: { method?: string; body?: unknown; prefer?: string } = {}): Promise<T> {
    const token = await options.getAccessToken();
    if (!token) throw new GatewayError('unauthenticated', 'No signed-in admin session.', 401);

    let response: Response;
    try {
      response = await fetchImpl(`${base}/${path}`, {
        method: init.method ?? 'GET',
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
    const payload: unknown = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const body = (payload ?? {}) as { code?: string; message?: string };
      throw new GatewayError(body.code ?? String(response.status), body.message ?? response.statusText, response.status);
    }
    return payload as T;
  }

  const eq = (value: string) => `eq.${encodeURIComponent(value)}`;

  return {
    listMetrics: () => request<MetricRow[]>('metrics?select=*&order=metric_key.asc'),

    async getMetricByKey(metricKey) {
      const rows = await request<MetricRow[]>(`metrics?select=*&metric_key=${eq(metricKey)}`);
      return rows[0] ?? null;
    },

    listVerification: () => request<MetricVerificationRow[]>('metric_verification?select=*'),

    async getVerification(metricId) {
      const rows = await request<MetricVerificationRow[]>(`metric_verification?select=*&metric_id=${eq(metricId)}`);
      return rows[0] ?? null;
    },

    listVersions: (metricId) =>
      request<MetricVersionRow[]>(`metric_versions?select=*&metric_id=${eq(metricId)}&order=id.asc`),

    listEvidenceLinks: (metricId) =>
      request<EvidenceLinkRow[]>(`metric_evidence?select=${EVIDENCE_SELECT}&metric_id=${eq(metricId)}&order=created_at.asc`),

    listDocumentReferences: (metricId) =>
      request<DocumentReferenceRow[]>(
        `document_metric_refs?select=document_id,field_path,documents(doc_type,slug)&metric_id=${eq(metricId)}`,
      ),

    listLinkedPhrases: (metricKey) =>
      request<LinkedPhraseRow[]>(
        `linked_phrases?select=id,location,phrase,reviewed_at&metric_keys=cs.${encodeURIComponent(`{"${metricKey}"}`)}`,
      ),

    async updateMetric(metricId, expectedUpdatedAt, update: MetricUpdate) {
      const rows = await request<MetricRow[]>(`metrics?id=${eq(metricId)}&updated_at=${eq(expectedUpdatedAt)}`, {
        method: 'PATCH',
        body: update,
        prefer: 'return=representation',
      });
      return rows[0] ?? null;
    },

    setEvidenceStatus: (metricId, status: EvidenceStatus, reason) =>
      request<MetricRow>('rpc/set_metric_evidence_status', {
        method: 'POST',
        body: { p_metric_id: metricId, p_status: status, p_reason: reason },
      }),

    confirmVerification: (metricId, note) =>
      request<MetricRow>('rpc/confirm_metric_verification', {
        method: 'POST',
        body: { p_metric_id: metricId, p_note: note },
      }),

    archiveMetric: (metricId, reason) =>
      request<MetricRow>('rpc/archive_metric', {
        method: 'POST',
        body: { p_metric_id: metricId, p_reason: reason },
      }),
  };
}
