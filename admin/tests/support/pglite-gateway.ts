import type { PGlite, Transaction } from '@electric-sql/pglite';

import { GatewayError } from '../../lib/metrics/errors';
import type { MetricsGateway } from '../../lib/metrics/gateway';
import type {
  DocumentReferenceRow,
  EvidenceLinkRow,
  LinkedPhraseRow,
  MetricRow,
  MetricVerificationRow,
  MetricVersionRow,
} from '../../lib/metrics/model';

import { runAs, type Session } from './database';

/**
 * MetricsGateway that runs each operation as one transaction under the given
 * session, with the same grants, RLS, triggers and functions the Data API
 * would apply. Rows are returned as JSON, like PostgREST, so timestamps keep
 * microsecond precision. Test use only.
 */
export function createPgliteGateway(db: PGlite, session: Session): MetricsGateway {
  async function rows<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    try {
      return await runAs(db, session, async (tx: Transaction) => {
        const result = await tx.query<{ row: T }>(sql, params);
        return result.rows.map((item) => item.row);
      });
    } catch (error) {
      const { code, message } = error as { code?: string; message?: string };
      throw new GatewayError(code ?? 'unknown', message ?? String(error));
    }
  }

  return {
    listMetrics: () => rows<MetricRow>('select to_jsonb(m) as row from public.metrics m order by m.metric_key'),

    async getMetricByKey(metricKey) {
      const found = await rows<MetricRow>('select to_jsonb(m) as row from public.metrics m where m.metric_key = $1', [metricKey]);
      return found[0] ?? null;
    },

    listVerification: () => rows<MetricVerificationRow>('select to_jsonb(v) as row from public.metric_verification v'),

    async getVerification(metricId) {
      const found = await rows<MetricVerificationRow>(
        'select to_jsonb(v) as row from public.metric_verification v where v.metric_id = $1',
        [metricId],
      );
      return found[0] ?? null;
    },

    listVersions: (metricId) =>
      rows<MetricVersionRow>('select to_jsonb(v) as row from public.metric_versions v where v.metric_id = $1 order by v.id', [metricId]),

    listEvidenceLinks: (metricId) =>
      rows<EvidenceLinkRow>(
        `select to_jsonb(l) || jsonb_build_object('evidence_files', (
           select jsonb_build_object('original_filename', f.original_filename, 'description', f.description,
             'mime_type', f.mime_type, 'byte_size', f.byte_size, 'sha256', f.sha256,
             'contains_personal_data', f.contains_personal_data, 'retention_review_at', f.retention_review_at,
             'archived_at', f.archived_at)
           from public.evidence_files f where f.id = l.evidence_file_id)) as row
         from public.metric_evidence l where l.metric_id = $1 order by l.created_at`,
        [metricId],
      ),

    listDocumentReferences: (metricId) =>
      rows<DocumentReferenceRow>(
        `select jsonb_build_object('document_id', r.document_id, 'field_path', r.field_path, 'documents',
           (select jsonb_build_object('doc_type', d.doc_type, 'slug', d.slug) from public.documents d where d.id = r.document_id)) as row
         from public.document_metric_refs r where r.metric_id = $1`,
        [metricId],
      ),

    listLinkedPhrases: (metricKey) =>
      rows<LinkedPhraseRow>(
        `select jsonb_build_object('id', p.id, 'location', p.location, 'phrase', p.phrase, 'reviewed_at', p.reviewed_at) as row
         from public.linked_phrases p where p.metric_keys @> array[$1]::text[]`,
        [metricKey],
      ),

    async updateMetric(metricId, expectedUpdatedAt, update) {
      // Like PostgREST, pass every supplied column through and let the database decide.
      const entries = Object.entries(update);
      const assignments = entries.map(([column, value], index) => {
        if (!/^[a-z_]+$/.test(column)) throw new GatewayError('42703', `Invalid column ${column}`);
        const cast = value !== null && typeof value === 'object' ? '::jsonb' : '';
        return `"${column}" = $${index + 3}${cast}`;
      });
      const params = entries.map(([, value]) => (value !== null && typeof value === 'object' ? JSON.stringify(value) : value));
      const updated = await rows<MetricRow>(
        `update public.metrics set ${assignments.join(', ')}
         where id = $1 and updated_at = $2::timestamptz returning to_jsonb(metrics.*) as row`,
        [metricId, expectedUpdatedAt, ...params],
      );
      return updated[0] ?? null;
    },

    async setEvidenceStatus(metricId, status, reason) {
      const [row] = await rows<MetricRow>(
        'select to_jsonb(r) as row from public.set_metric_evidence_status($1, $2::public.evidence_status, $3) r',
        [metricId, status, reason],
      );
      return row;
    },

    async confirmVerification(metricId, note) {
      const [row] = await rows<MetricRow>('select to_jsonb(r) as row from public.confirm_metric_verification($1, $2) r', [metricId, note]);
      return row;
    },

    async archiveMetric(metricId, reason) {
      const [row] = await rows<MetricRow>('select to_jsonb(r) as row from public.archive_metric($1, $2) r', [metricId, reason]);
      return row;
    },
  };
}
