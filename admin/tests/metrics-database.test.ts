import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, beforeEach, describe, test } from 'node:test';

import type { PGlite } from '@electric-sql/pglite';

import { draftFromMetric } from '../lib/metrics/changes';
import { GatewayError } from '../lib/metrics/errors';
import type { MetricsGateway } from '../lib/metrics/gateway';
import {
  DATA_ORIGINS,
  DISPLAY_FORMATS,
  EDITABLE_METRIC_FIELDS,
  EVIDENCE_STATUSES,
  METRIC_KINDS,
  METRIC_UNITS,
  PERIOD_BASES,
  PRECISIONS,
  SOURCE_PLATFORMS,
  SOURCE_TYPES,
  VALUE_TYPES,
  type MetricRow,
} from '../lib/metrics/model';
import { createMetricsRepository, type MetricsRepository } from '../lib/metrics/repository';
import { resolveValues } from '../lib/metrics/values';

import {
  ADMIN,
  ADMIN_SESSION,
  ADMIN_WITHOUT_MFA,
  ANON_SESSION,
  createDatabase,
  errorCode,
  insertMetrics,
  NON_ADMIN_SESSION,
  OWNER,
  ROOT,
  runAs,
} from './support/database';
import { createPgliteGateway } from './support/pglite-gateway';

/**
 * The metric editing layer against the real schema: every migration, RLS,
 * grants, triggers and database functions, running offline in PGlite.
 */

let db: PGlite;
let gateway: MetricsGateway;
let repository: MetricsRepository;

const FIXTURES = [
  { metric_key: 'fixture.lead.spend', kind: 'raw', value: 300, evidence_status: 'documented' },
  { metric_key: 'fixture.lead.leads', kind: 'raw', value: 4, evidence_status: 'verified' },
  { metric_key: 'fixture.lead.cpl', kind: 'calculated', formula: { fn: 'ratio', numerator: 'fixture.lead.spend', denominator: 'fixture.lead.leads' }, evidence_status: 'calculated' },
  { metric_key: 'fixture.lead.retired', kind: 'raw', value: 1, archived: true },
  { metric_key: 'fixture.lead.spare', kind: 'raw', value: 7 },
  { metric_key: 'fixture.lead.published', kind: 'legacy_fixed', value: 111000 },
] as const;

before(async () => {
  db = await createDatabase();
  await insertMetrics(db, FIXTURES);
  gateway = createPgliteGateway(db, ADMIN_SESSION);
  repository = createMetricsRepository(gateway);
});

after(async () => {
  await db.close();
});

async function load(key: string): Promise<MetricRow> {
  const metric = await gateway.getMetricByKey(key);
  assert.ok(metric, `${key} exists`);
  return metric;
}

async function detailOf(key: string) {
  const result = await repository.getMetricDetail(key);
  assert.ok(result.ok, result.ok ? '' : result.error.message);
  return result.data;
}

/** Calls the gateway directly, bypassing the repository's own checks, and returns the database error code. */
const databaseRejects = (work: Promise<unknown>) => errorCode(work);

describe('schema alignment', () => {
  test('admin vocabularies match the database enums exactly', async () => {
    const enums = await db.query<{ name: string; values: string[] }>(
      `select t.typname as name, array_agg(e.enumlabel order by e.enumsortorder) as values
       from pg_type t join pg_enum e on e.enumtypid = t.oid join pg_namespace n on n.oid = t.typnamespace
       where n.nspname = 'public' group by t.typname`,
    );
    const byName = new Map(enums.rows.map((row) => [row.name, row.values]));
    const expected: Record<string, readonly string[]> = {
      metric_kind: METRIC_KINDS,
      metric_value_type: VALUE_TYPES,
      metric_unit: METRIC_UNITS,
      value_precision: PRECISIONS,
      metric_display_format: DISPLAY_FORMATS,
      data_origin: DATA_ORIGINS,
      source_platform: SOURCE_PLATFORMS,
      source_type: SOURCE_TYPES,
      reporting_period_basis: PERIOD_BASES,
      evidence_status: EVIDENCE_STATUSES,
    };
    for (const [name, values] of Object.entries(expected)) {
      assert.deepEqual(byName.get(name), [...values], name);
    }
  });

  test('the editable fields are exactly the columns the backend lets an admin update', async () => {
    const granted = await db.query<{ column_name: string }>(
      `select column_name from information_schema.column_privileges
       where grantee = 'authenticated' and table_schema = 'public' and table_name = 'metrics' and privilege_type = 'UPDATE'`,
    );
    const expected = [...EDITABLE_METRIC_FIELDS, 'change_reason'].sort();
    assert.deepEqual(granted.rows.map((row) => row.column_name).sort(), expected);
  });
});

describe('listing and detail', () => {
  test('the admin lists every metric, active and archived', async () => {
    const result = await repository.listMetrics();
    assert.ok(result.ok);
    assert.equal(result.data.metrics.length, FIXTURES.length);
    assert.equal(Object.keys(result.data.verification).length, FIXTURES.length);
    assert.ok(result.data.metrics.find((metric) => metric.metric_key === 'fixture.lead.retired')?.archived_at);
  });

  test('detail includes version history, evidence links and archive blockers', async () => {
    const detail = await detailOf('fixture.lead.spend');
    assert.equal(detail.versions.length, 1);
    assert.equal(detail.versions[0].changeKind, 'insert');
    assert.deepEqual(detail.evidence, []);
    assert.deepEqual(detail.blockers.formulas, ['fixture.lead.cpl']);
  });

  test('an unknown key is reported as not found', async () => {
    const result = await repository.getMetricDetail('fixture.lead.nope');
    assert.equal(result.ok ? null : result.error.kind, 'not_found');
  });
});

describe('editing', () => {
  test('a valid value update succeeds, keeps status and verification, and is versioned and audited', async () => {
    const detail = await detailOf('fixture.lead.spare');
    const saved = await repository.saveMetric(detail, { ...draftFromMetric(detail.metric), value: 8 }, 'Re-checked in Ads Manager');
    assert.ok(saved.ok, saved.ok ? '' : saved.error.message);
    assert.equal(saved.data.value, 8);
    assert.equal(saved.data.evidence_status, detail.metric.evidence_status);
    assert.equal(saved.data.verified_at, null);
    assert.equal(saved.data.change_reason, null);

    const after = await detailOf('fixture.lead.spare');
    const latest = after.versions[0];
    assert.equal(latest.number, 2);
    assert.equal(latest.changeKind, 'update');
    assert.equal(latest.reason, 'Re-checked in Ads Manager');
    assert.equal(latest.changedBy, ADMIN.id);
    assert.deepEqual(latest.changes, [{ field: 'value', before: 7, after: 8 }]);

    const audit = await runAs(db, ADMIN_SESSION, (tx) =>
      tx.query<{ action: string; actor_id: string }>(
        `select action, actor_id from public.audit_log where table_name = 'metrics' and record_id = $1 order by id desc limit 1`,
        [detail.metric.id],
      ),
    );
    assert.deepEqual(audit.rows[0], { action: 'metric.update', actor_id: ADMIN.id });
  });

  test('a required change reason is enforced by the editor layer and by the database', async () => {
    const detail = await detailOf('fixture.lead.spare');
    const result = await repository.saveMetric(detail, { ...draftFromMetric(detail.metric), precision: 'lower_bound' }, '  ');
    assert.equal(result.ok ? null : result.error.kind, 'validation');

    const metric = await load('fixture.lead.spare');
    assert.equal(await databaseRejects(gateway.updateMetric(metric.id, metric.updated_at, { value: 99 })), 'P0001');
    assert.equal((await load('fixture.lead.spare')).value, 8);
  });

  test('a change that needs no reason saves without one', async () => {
    const detail = await detailOf('fixture.lead.spare');
    const result = await repository.saveMetric(detail, { ...draftFromMetric(detail.metric), public_note: 'Rounded on the site.' }, '');
    assert.ok(result.ok);
    assert.equal(result.data.public_note, 'Rounded on the site.');
  });

  test('the metric key cannot be changed through the data layer', async () => {
    const metric = await load('fixture.lead.spare');
    const update = { metric_key: 'fixture.lead.renamed' } as unknown as Parameters<MetricsGateway['updateMetric']>[2];
    assert.equal(await databaseRejects(gateway.updateMetric(metric.id, metric.updated_at, update)), '42501');
    assert.ok(await gateway.getMetricByKey('fixture.lead.spare'));
  });

  test('an edit based on a stale copy is rejected as a conflict', async () => {
    const stale = await detailOf('fixture.lead.spare');
    const first = await repository.saveMetric(stale, { ...draftFromMetric(stale.metric), description: 'First edit.' }, '');
    assert.ok(first.ok);
    const second = await repository.saveMetric(stale, { ...draftFromMetric(stale.metric), description: 'Second edit.' }, '');
    assert.equal(second.ok ? null : second.error.kind, 'conflict');
    assert.equal((await load('fixture.lead.spare')).description, 'First edit.');
  });

  test('a database rule violation comes back as a readable validation error', async () => {
    const detail = await detailOf('fixture.lead.spare');
    const result = await repository.saveMetric(detail, { ...draftFromMetric(detail.metric), currency: null, value_type: 'currency' }, '');
    assert.equal(result.ok ? null : result.error.kind, 'validation');
    assert.match(result.ok ? '' : result.error.message, /Currency must be INR/);
  });
});

describe('formulas', () => {
  const calculated = (formula: unknown) => async () => {
    const detail = await detailOf('fixture.lead.cpl');
    return {
      viaEditor: await repository.saveMetric(detail, { ...draftFromMetric(detail.metric), formula }, 'Formula change'),
      viaDatabase: await databaseRejects(
        gateway.updateMetric(detail.metric.id, detail.metric.updated_at, { formula, change_reason: 'Formula change' }),
      ),
    };
  };

  for (const [name, formula] of [
    ['an unsupported formula', { fn: 'eval', expr: 'spend / leads' }],
    ['a missing formula input', { fn: 'ratio', numerator: 'fixture.lead.spend' }],
    ['an input that does not exist', { fn: 'ratio', numerator: 'fixture.lead.spend', denominator: 'fixture.lead.nope' }],
    ['an inactive (archived) input', { fn: 'ratio', numerator: 'fixture.lead.spend', denominator: 'fixture.lead.retired' }],
    ['a self-reference', { fn: 'ratio', numerator: 'fixture.lead.cpl', denominator: 'fixture.lead.leads' }],
  ] as const) {
    test(`${name} is rejected by the editor layer and by the database`, async () => {
      const { viaEditor, viaDatabase } = await calculated(formula)();
      assert.equal(viaEditor.ok ? null : viaEditor.error.kind, 'validation');
      assert.ok(viaDatabase === '23514' || viaDatabase === 'P0001', `database code ${viaDatabase}`);
    });
  }

  test('a circular dependency is rejected by the editor layer and by the database', async () => {
    await insertMetrics(db, [
      { metric_key: 'fixture.lead.cpl_sum', kind: 'calculated', formula: { fn: 'sum', terms: ['fixture.lead.cpl'] } },
    ]);
    const { viaEditor, viaDatabase } = await calculated({ fn: 'ratio', numerator: 'fixture.lead.cpl_sum', denominator: 'fixture.lead.leads' })();
    assert.equal(viaEditor.ok ? null : viaEditor.error.kind, 'validation');
    assert.equal(viaDatabase, 'P0001');
  });

  test('an archived metric cannot be referenced by content or linked phrases', async () => {
    const retired = await load('fixture.lead.retired');
    const documentId = await db.query<{ id: string }>(
      `insert into public.documents (doc_type, slug, schema_version, draft) values ('case_study', 'fixture-doc', 1, '{}') returning id`,
    );
    const asAdmin = (sql: string, params: unknown[]) => runAs(db, ADMIN_SESSION, (tx) => tx.query(sql, params));
    assert.equal(
      await errorCode(asAdmin('insert into public.document_metric_refs (document_id, field_path, metric_id) values ($1, $2, $3)', [documentId.rows[0].id, 'summary', retired.id])),
      'P0001',
    );
    assert.equal(
      await errorCode(asAdmin("insert into public.linked_phrases (location, phrase, metric_keys, reason) values ('fixture', 'a few', $1, 'r')", [[retired.metric_key]])),
      'P0001',
    );
  });

  test('a valid formula change saves and is versioned with before and after', async () => {
    const detail = await detailOf('fixture.lead.cpl');
    const formula = { fn: 'ratio', numerator: 'fixture.lead.spare', denominator: 'fixture.lead.leads' };
    const result = await repository.saveMetric(detail, { ...draftFromMetric(detail.metric), formula }, 'Use corrected spend');
    assert.ok(result.ok, result.ok ? '' : result.error.message);
    const latest = (await detailOf('fixture.lead.cpl')).versions[0];
    assert.deepEqual(latest.changes, [{ field: 'formula', before: detail.metric.formula, after: formula }]);
    assert.equal(latest.reason, 'Use corrected spend');
  });
});

describe('verification', () => {
  test('evidence status and verification cannot be written directly', async () => {
    const metric = await load('fixture.lead.spend');
    for (const update of [{ evidence_status: 'verified' }, { verified_value: 300 }, { verified_at: new Date().toISOString() }, { verification_source: 'admin_confirmation' }]) {
      const code = await databaseRejects(gateway.updateMetric(metric.id, metric.updated_at, update as never));
      assert.equal(code, '42501', JSON.stringify(update));
    }
    const unchanged = await load('fixture.lead.spend');
    assert.equal(unchanged.evidence_status, 'documented');
    assert.equal(unchanged.verified_at, null);
  });

  test('the review functions require a reason or note, in the editor layer and in the database', async () => {
    const metric = await load('fixture.lead.spend');
    assert.equal((await repository.setEvidenceStatus(metric, 'verified', ' ')).ok, false);
    assert.equal((await repository.confirmVerification(metric, '')).ok, false);
    assert.equal(await databaseRejects(gateway.setEvidenceStatus(metric.id, 'verified', ' ')), 'P0001');
    assert.equal(await databaseRejects(gateway.confirmVerification(metric.id, '')), 'P0001');
  });

  test('status change and confirmation are recorded; a later edit shows as changed, never re-verified', async () => {
    const metric = await load('fixture.lead.spend');
    const status = await repository.setEvidenceStatus(metric, 'verified', 'Results column in Ads Manager');
    assert.ok(status.ok);
    const confirmed = await repository.confirmVerification(status.data, 'Ads Manager › Campaigns › Amount spent');
    assert.ok(confirmed.ok);
    assert.equal(confirmed.data.verified_value, 300);
    assert.equal(confirmed.data.verified_by, ADMIN.id);

    const detail = await detailOf('fixture.lead.spend');
    assert.deepEqual(detail.versions.slice(0, 2).map((entry) => entry.changeKind), ['verification_confirmed', 'evidence_status_changed']);
    assert.equal(detail.versions[1].reason, 'Results column in Ads Manager');

    const edited = await repository.saveMetric(detail, { ...draftFromMetric(detail.metric), value: 310 }, 'Late conversions');
    assert.ok(edited.ok);
    assert.equal(edited.data.verified_value, 300);
    assert.equal(edited.data.evidence_status, 'verified');
    assert.equal((await detailOf('fixture.lead.spend')).verification?.verification_state, 'changed_since_verification');
  });
});

describe('history', () => {
  test('version history and audit entries cannot be edited or deleted', async () => {
    for (const sql of [
      "update public.metric_versions set reason = 'rewritten'",
      'delete from public.metric_versions',
      "update public.audit_log set action = 'rewritten'",
      'delete from public.audit_log',
    ]) {
      assert.equal(await errorCode(runAs(db, ADMIN_SESSION, (tx) => tx.query(sql))), '42501', sql);
      assert.equal(await errorCode(runAs(db, OWNER, (tx) => tx.query(sql))), 'P0001', `${sql} as owner`);
    }
  });
});

describe('archiving', () => {
  test('a referenced metric shows why it cannot be archived, and the database refuses too', async () => {
    const detail = await detailOf('fixture.lead.leads');
    const result = await repository.archiveMetric(detail, '');
    assert.equal(result.ok ? null : result.error.kind, 'validation');
    assert.ok(result.ok ? false : result.error.details?.some((line) => line.includes('fixture.lead.cpl')));
    assert.equal(
      await databaseRejects(gateway.archiveMetric(detail.metric.id, null)),
      'P0001',
    );
  });

  test('an unreferenced metric is archived (not deleted) with a version entry', async () => {
    const detail = await detailOf('fixture.lead.published');
    const result = await repository.archiveMetric(detail, 'Figure withdrawn from the site');
    assert.ok(result.ok, result.ok ? '' : result.error.message);
    const after = await detailOf('fixture.lead.published');
    assert.ok(after.metric.archived_at);
    assert.equal(after.metric.archived_by, ADMIN.id);
    assert.equal(after.versions[0].changeKind, 'archived');
    assert.equal(after.versions[0].reason, 'Figure withdrawn from the site');
    assert.equal(after.metric.archived_at, after.versions[0].changedAt, 'archive time is the database transaction time');
    assert.equal(await errorCode(runAs(db, ADMIN_SESSION, (tx) => tx.query('delete from public.metrics where id = $1', [detail.metric.id]))), '42501');
  });
});

describe('archive timestamp', () => {
  test('a browser-supplied archive timestamp cannot override database time', async () => {
    await insertMetrics(db, [
      { metric_key: 'fixture.archive.browser', kind: 'raw', value: 1 },
      { metric_key: 'fixture.archive.backdated', kind: 'raw', value: 1 },
    ]);

    // The admin's session cannot write archived_at at all.
    const browser = await load('fixture.archive.browser');
    const spoof = { archived_at: '2000-01-01T00:00:00+00:00' } as unknown as Parameters<MetricsGateway['updateMetric']>[2];
    assert.equal(await databaseRejects(gateway.updateMetric(browser.id, browser.updated_at, spoof)), '42501');
    assert.equal((await load('fixture.archive.browser')).archived_at, null);

    // Even a trusted role supplying a time gets database time instead.
    const backdated = await load('fixture.archive.backdated');
    await runAs(db, OWNER, (tx) => tx.query("update public.metrics set archived_at = '2000-01-01T00:00:00Z' where id = $1", [backdated.id]));
    const stored = await load('fixture.archive.backdated');
    assert.ok(stored.archived_at && !stored.archived_at.startsWith('2000'), `stored ${stored.archived_at}`);
    const [archivedVersion] = (await detailOf('fixture.archive.backdated')).versions;
    assert.equal(archivedVersion.changeKind, 'archived');
    assert.equal(stored.archived_at, archivedVersion.changedAt);

    // Unarchiving stays unsupported.
    assert.equal(await errorCode(runAs(db, OWNER, (tx) => tx.query('update public.metrics set archived_at = null where id = $1', [backdated.id]))), 'P0001');
  });
});

describe('dependency-aware verification', () => {
  const stateOf = async (key: string) => {
    const { verification } = await detailOf(key);
    assert.ok(verification, `${key} has a verification row`);
    return { state: verification.verification_state, stale: verification.stale_inputs };
  };
  const confirm = async (key: string) => {
    const result = await repository.confirmVerification(await load(key), `Checked ${key}`);
    assert.ok(result.ok, result.ok ? '' : result.error.message);
  };
  const setValue = async (key: string, value: number) => {
    const detail = await detailOf(key);
    const result = await repository.saveMetric(detail, { ...draftFromMetric(detail.metric), value }, 'Source corrected');
    assert.ok(result.ok, result.ok ? '' : result.error.message);
  };

  before(async () => {
    await insertMetrics(db, [
      { metric_key: 'dep.chain.spend', kind: 'raw', value: 500 },
      { metric_key: 'dep.chain.leads', kind: 'raw', value: 10 },
      { metric_key: 'dep.chain.other', kind: 'raw', value: 3 },
      { metric_key: 'dep.chain.cpl', kind: 'calculated', formula: { fn: 'ratio', numerator: 'dep.chain.spend', denominator: 'dep.chain.leads' } },
      { metric_key: 'dep.chain.cpl_total', kind: 'calculated', formula: { fn: 'sum', terms: ['dep.chain.cpl'] } },
    ]);
  });

  test('a direct input change invalidates a calculated metric verification', async () => {
    await confirm('dep.chain.cpl');
    assert.deepEqual(await stateOf('dep.chain.cpl'), { state: 'verified_current', stale: [] });

    await setValue('dep.chain.spend', 550);
    assert.deepEqual(await stateOf('dep.chain.cpl'), { state: 'changed_since_verification', stale: ['dep.chain.spend'] });
  });

  test('a change invalidates every level that depends on it (A → B → C)', async () => {
    await confirm('dep.chain.cpl');
    await confirm('dep.chain.cpl_total');
    assert.equal((await stateOf('dep.chain.cpl_total')).state, 'verified_current');

    await setValue('dep.chain.leads', 11);
    assert.deepEqual(await stateOf('dep.chain.cpl'), { state: 'changed_since_verification', stale: ['dep.chain.leads'] });
    assert.deepEqual(await stateOf('dep.chain.cpl_total'), { state: 'changed_since_verification', stale: ['dep.chain.leads'] });
  });

  test('re-verification restores the verified state', async () => {
    await confirm('dep.chain.cpl');
    await confirm('dep.chain.cpl_total');
    assert.deepEqual(await stateOf('dep.chain.cpl'), { state: 'verified_current', stale: [] });
    assert.deepEqual(await stateOf('dep.chain.cpl_total'), { state: 'verified_current', stale: [] });
  });

  test('a formula change in an intermediate metric invalidates the metrics that read it', async () => {
    const detail = await detailOf('dep.chain.cpl');
    const formula = { fn: 'ratio', numerator: 'dep.chain.spend', denominator: 'dep.chain.other' };
    const saved = await repository.saveMetric(detail, { ...draftFromMetric(detail.metric), formula }, 'Different denominator');
    assert.ok(saved.ok, saved.ok ? '' : saved.error.message);
    assert.equal((await stateOf('dep.chain.cpl')).state, 'changed_since_verification');
    assert.deepEqual(await stateOf('dep.chain.cpl_total'), { state: 'changed_since_verification', stale: ['dep.chain.cpl'] });

    const back = await detailOf('dep.chain.cpl');
    const restored = await repository.saveMetric(back, { ...draftFromMetric(back.metric), formula: detail.metric.formula }, 'Restore denominator');
    assert.ok(restored.ok);
    await confirm('dep.chain.cpl');
    await confirm('dep.chain.cpl_total');
  });

  test('a change to an unrelated metric does not invalidate verification', async () => {
    assert.equal((await stateOf('dep.chain.cpl_total')).state, 'verified_current');
    await setValue('dep.chain.other', 4);
    assert.deepEqual(await stateOf('dep.chain.cpl'), { state: 'verified_current', stale: [] });
    assert.deepEqual(await stateOf('dep.chain.cpl_total'), { state: 'verified_current', stale: [] });
  });

  test('archived and inactive dependencies stay subject to the existing rules', async () => {
    // An input of a verified calculated metric cannot be archived.
    const spend = await detailOf('dep.chain.spend');
    assert.equal((await repository.archiveMetric(spend, '')).ok, false);
    assert.equal(await databaseRejects(gateway.archiveMetric(spend.metric.id, null)), 'P0001');

    // Archiving an unrelated metric is not a figure change and leaves verification intact.
    const other = await detailOf('dep.chain.other');
    assert.ok((await repository.archiveMetric(other, 'Unused')).ok);
    assert.deepEqual(await stateOf('dep.chain.cpl'), { state: 'verified_current', stale: [] });

    // An archived metric cannot become a formula input.
    const cpl = await detailOf('dep.chain.cpl');
    const formula = { fn: 'ratio', numerator: 'dep.chain.spend', denominator: 'dep.chain.other' };
    const viaEditor = await repository.saveMetric(cpl, { ...draftFromMetric(cpl.metric), formula }, 'Try archived input');
    assert.equal(viaEditor.ok ? null : viaEditor.error.kind, 'validation');
    assert.equal(
      await databaseRejects(gateway.updateMetric(cpl.metric.id, cpl.metric.updated_at, { formula, change_reason: 'Try archived input' })),
      'P0001',
    );
    assert.equal((await stateOf('dep.chain.cpl')).state, 'verified_current');
  });
});

describe('access control', () => {
  test('a signed-in non-admin sees no metrics and cannot change any', async () => {
    const outsider = createMetricsRepository(createPgliteGateway(db, NON_ADMIN_SESSION));
    const list = await outsider.listMetrics();
    assert.ok(list.ok);
    assert.equal(list.data.metrics.length, 0);
    assert.deepEqual(list.data.verification, {});

    const metric = await load('fixture.lead.spare');
    const outsiderGateway = createPgliteGateway(db, NON_ADMIN_SESSION);
    assert.equal(await outsiderGateway.updateMetric(metric.id, metric.updated_at, { description: 'Hijacked.' }), null);
    assert.equal(await databaseRejects(outsiderGateway.setEvidenceStatus(metric.id, 'verified', 'reason')), '42501');
    assert.notEqual((await load('fixture.lead.spare')).description, 'Hijacked.');
  });

  test('the admin without an MFA-verified session is treated like a non-admin', async () => {
    const unverified = createPgliteGateway(db, ADMIN_WITHOUT_MFA);
    assert.deepEqual(await unverified.listMetrics(), []);
    const metric = await load('fixture.lead.spare');
    assert.equal(await databaseRejects(unverified.confirmVerification(metric.id, 'note')), '42501');
  });

  test('an unauthenticated caller is denied outright', async () => {
    const anonymous = createMetricsRepository(createPgliteGateway(db, ANON_SESSION));
    const list = await anonymous.listMetrics();
    assert.equal(list.ok ? null : list.error.kind, 'permission_denied');
    const metric = await load('fixture.lead.spare');
    const anonGateway = createPgliteGateway(db, ANON_SESSION);
    assert.equal(await databaseRejects(anonGateway.updateMetric(metric.id, metric.updated_at, { description: 'x' })), '42501');
    assert.equal(await databaseRejects(anonGateway.confirmVerification(metric.id, 'note')), '42501');
  });

  test('gateway errors are GatewayError instances with the database code', async () => {
    const error = await createPgliteGateway(db, ANON_SESSION).listMetrics().catch((caught: unknown) => caught);
    assert.ok(error instanceof GatewayError);
    assert.equal(error.code, '42501');
  });
});

describe('published snapshot', () => {
  let snapshotDb: PGlite;

  beforeEach(async () => {
    snapshotDb ??= await createDatabase();
  });

  test('every snapshot metric satisfies the database rules, and the admin shows the same values as the site', async () => {
    const baseline = JSON.parse(readFileSync(join(ROOT, 'snapshot', 'baseline.json'), 'utf8')) as {
      metrics: {
        id: string; name: string; description: string; kind: string; valueType: string; unit: string; currency: string | null;
        value: number | null; precision: string; displayFormat: string; formula: object | null; evidenceStatus: string | null;
        dataOrigin: string; sourcePlatform: string | null; sourceType: string; legacyMethodNote: string | null;
        reportingPeriod: { basis: string; start: string | null; end: string | null; description: string };
      }[];
    };

    // Insert inputs before the formulas that read them.
    const pending = [...baseline.metrics];
    const inserted = new Set<string>();
    while (pending.length > 0) {
      const index = pending.findIndex((metric) => {
        if (!metric.formula) return true;
        const inputs = Object.entries(metric.formula).filter(([name]) => name !== 'fn').flatMap(([, value]) => value as string | string[]);
        return inputs.every((key) => inserted.has(key));
      });
      assert.ok(index >= 0, 'snapshot formulas have no unresolvable inputs');
      const [metric] = pending.splice(index, 1);
      await snapshotDb.query(
        `insert into public.metrics (metric_key, name, description, kind, value_type, unit, currency, value, precision,
           display_format, formula, evidence_status, data_origin, source_platform, source_type, legacy_method_note,
           reporting_period_basis, reporting_period_start, reporting_period_end, reporting_period_note)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
        [
          metric.id, metric.name, metric.description, metric.kind, metric.valueType, metric.unit, metric.currency, metric.value,
          metric.precision, metric.displayFormat, metric.formula ? JSON.stringify(metric.formula) : null, metric.evidenceStatus,
          metric.dataOrigin, metric.sourcePlatform, metric.sourceType, metric.legacyMethodNote, metric.reportingPeriod.basis,
          metric.reportingPeriod.start, metric.reportingPeriod.end, metric.reportingPeriod.description,
        ],
      );
      inserted.add(metric.id);
    }

    const rows = await createPgliteGateway(snapshotDb, ADMIN_SESSION).listMetrics();
    assert.equal(rows.length, baseline.metrics.length);

    const { metricValue } = await import('../../lib/metrics/registry');
    const values = resolveValues(rows);
    for (const row of rows) {
      assert.equal(values.get(row.metric_key), metricValue(row.metric_key), row.metric_key);
    }
    await snapshotDb.close();
  });
});
