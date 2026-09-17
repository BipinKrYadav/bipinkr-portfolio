/**
 * Row shapes for screens that do not load data yet, mirroring
 * supabase/migrations. Metric types live in lib/metrics/model.ts.
 */

export type ReleaseKind = 'publish' | 'rollback';
export type ReleaseStatus =
  | 'validating'
  | 'queued'
  | 'building'
  | 'built'
  | 'deploying'
  | 'live'
  | 'failed'
  | 'superseded';

export interface ReleaseRow {
  id: number;
  kind: ReleaseKind;
  status: ReleaseStatus;
  summary: string;
  created_at: string;
  live_at: string | null;
  failed_at: string | null;
  failure_stage: string | null;
}

export interface AuditLogRow {
  id: number;
  occurred_at: string;
  actor_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
}
