/**
 * Row shapes for screens that do not load data yet, mirroring
 * supabase/migrations. Metric types live in lib/metrics/model.ts, release
 * types in lib/releases/model.ts.
 */

export interface AuditLogRow {
  id: number;
  occurred_at: string;
  actor_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
}
