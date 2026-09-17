import { PGlite, type Transaction } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Offline database for admin tests: PGlite with the Supabase shim and every
 * migration, plus two fixture users (example.test addresses, not accounts).
 */

export const ROOT = fileURLToPath(new URL('../../../', import.meta.url));

export const ADMIN = { id: '00000000-0000-4000-8000-000000000001', email: 'owner@example.test' } as const;
export const OTHER_USER = { id: '00000000-0000-4000-8000-000000000002', email: 'someone-else@example.test' } as const;

export type Session =
  | { role: 'owner' }
  | { role: 'anon' }
  | { role: 'authenticated'; userId: string; aal: 'aal1' | 'aal2' };

export const ADMIN_SESSION: Session = { role: 'authenticated', userId: ADMIN.id, aal: 'aal2' };
export const ADMIN_WITHOUT_MFA: Session = { role: 'authenticated', userId: ADMIN.id, aal: 'aal1' };
export const NON_ADMIN_SESSION: Session = { role: 'authenticated', userId: OTHER_USER.id, aal: 'aal2' };
export const ANON_SESSION: Session = { role: 'anon' };
export const OWNER: Session = { role: 'owner' };

export async function createDatabase(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(readFileSync(join(ROOT, 'scripts', 'db', 'supabase-shim.sql'), 'utf8'));
  const migrations = join(ROOT, 'supabase', 'migrations');
  for (const name of readdirSync(migrations).filter((file) => file.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(migrations, name), 'utf8'));
  }
  await db.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [ADMIN.id, ADMIN.email, OTHER_USER.id, OTHER_USER.email]);
  await db.query('select private.grant_admin_owner($1)', [ADMIN.email]);
  return db;
}

/** Runs `work` in one transaction as the given session, like a Data API request. */
export function runAs<T>(db: PGlite, session: Session, work: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    if (session.role !== 'owner') {
      const claims =
        session.role === 'anon' ? { role: 'anon' } : { sub: session.userId, role: 'authenticated', aal: session.aal };
      await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
      await tx.exec(`set local role ${session.role}`);
    }
    return work(tx);
  });
}

export interface FixtureMetric {
  metric_key: string;
  kind: 'raw' | 'calculated' | 'legacy_fixed';
  value?: number | null;
  formula?: object | null;
  evidence_status?: string | null;
  archived?: boolean;
}

/** Inserts minimal valid metrics as the database owner. */
export async function insertMetrics(db: PGlite, metrics: readonly FixtureMetric[]): Promise<void> {
  for (const metric of metrics) {
    const calculated = metric.kind === 'calculated';
    await db.query(
      `insert into public.metrics (metric_key, name, description, kind, value_type, unit, value, precision, display_format,
         formula, evidence_status, data_origin, source_type, legacy_method_note, reporting_period_note, archived_at)
       values ($1, $2, 'Fixture metric.', $3, 'count', 'lead', $4, 'exact', 'integer', $5::jsonb, $6,
         $7, $8, $9, 'Not recorded.', $10)`,
      [
        metric.metric_key,
        `Fixture ${metric.metric_key}`,
        metric.kind,
        calculated ? null : (metric.value ?? null),
        metric.formula ? JSON.stringify(metric.formula) : null,
        metric.evidence_status ?? null,
        calculated ? 'derived' : 'platform',
        calculated ? 'calculation' : 'platform_export',
        metric.kind === 'legacy_fixed' ? 'Inputs not stored.' : null,
        metric.archived ? new Date().toISOString() : null,
      ],
    );
  }
}

/** Database error code (SQLSTATE) of a rejected promise, or null if it resolved. */
export async function errorCode(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise;
    return null;
  } catch (error) {
    return (error as { code?: string }).code ?? 'unknown';
  }
}
