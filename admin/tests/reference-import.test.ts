import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';

import type { PGlite } from '@electric-sql/pglite';

import { collectMetricReferences } from '../../lib/content/token-grammar';
import { referenceImportSql, snapshotDocuments, type ReferenceSnapshot } from '../../scripts/db/reference-import';
import { DISPLAY_FORMATS } from '../lib/metrics/model';
import { ADMIN_SESSION, createDatabase, errorCode, NON_ADMIN_SESSION, ROOT, runAs } from './support/database';

/**
 * The reference data import (Phase 4.3), against the real schema in PGlite:
 * every migration, the metric baseline exactly as it was applied, then the
 * generated reference import.
 */

const snapshot = JSON.parse(readFileSync(join(ROOT, 'snapshot', 'baseline.json'), 'utf8')) as ReferenceSnapshot;
const { sql, data, expected } = referenceImportSql(snapshot);
const metricsBaseline = readFileSync(join(ROOT, 'supabase', 'imports', 'metrics_baseline.sql'), 'utf8');

/**
 * Advertising account, customer and campaign identifiers, by shape rather than
 * by value, so no real identifier ever has to be written into source. The
 * site's figures never need a run of 10+ digits (the longest in the snapshot
 * is 6), so any such run, a ddd-ddd-dddd sequence or a Meta act_ prefix means
 * an identifier has leaked into the import.
 */
const ACCOUNT_IDENTIFIER_SHAPES: readonly RegExp[] = [
  /(?<![\d.])\d{10,}(?![\d.])/,
  /(?<!\d)\d{3}[- ]\d{3}[- ]\d{4}(?!\d)/,
  /\bact_\d+/,
];

const refKey = (row: { docType: string; slug: string; fieldPath: string; metricKey: string }) =>
  JSON.stringify([row.docType, row.slug, row.fieldPath, row.metricKey]);

/** JSON with object keys sorted: jsonb does not keep key order. */
const canonical = (value: unknown) =>
  JSON.stringify(value ?? null, (_key, item: unknown) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : item,
  );

/** Runs a script that is expected to fail; returns its message and clears the aborted transaction. */
async function rejection(db: PGlite, script: string): Promise<string | null> {
  try {
    await db.exec(script);
    return null;
  } catch (error) {
    return (error as Error).message;
  } finally {
    await db.exec('rollback').catch(() => undefined);
  }
}

async function databaseWithBaseline(): Promise<PGlite> {
  const db = await createDatabase();
  await db.exec(metricsBaseline);
  return db;
}

const metricState = async (db: PGlite) =>
  JSON.stringify(
    (
      await db.query(`
        select
          (select jsonb_agg(to_jsonb(m) order by m.metric_key) from public.metrics m) as metrics,
          (select jsonb_agg(to_jsonb(v) order by v.id) from public.metric_versions v) as versions,
          (select jsonb_agg(to_jsonb(s) order by s.metric_key) from public.metric_verification s) as verification`)
    ).rows[0],
  );

describe('reference data derived from the snapshot', () => {
  test('10 documents, 322 references and 21 linked phrases', () => {
    assert.deepEqual(expected, { metrics: 134, documents: 10, revisions: 10, references: 322, phrases: 21 });
  });

  test('each document keeps its type, slug, schema version, content and case-study order', () => {
    assert.deepEqual(
      data.documents.map((doc) => `${doc.docType}/${doc.slug}:${doc.sortOrder}`),
      [
        'proof_strip/proof-strip:0',
        'homepage/home:0',
        'about/about:0',
        'services/services:0',
        'contact/contact:0',
        'case_study_index/case-studies:0',
        'case_study/meta-lead-generation:1',
        'case_study/measurement-audit:2',
        'case_study/preschool-google-ads:3',
        'case_study/cross-channel-real-estate:4',
      ],
    );
    const source = snapshotDocuments(snapshot.documents);
    data.documents.forEach((doc, index) => {
      assert.equal(doc.content, source[index].content, 'content is the snapshot object itself, not a rebuilt copy');
      assert.equal(doc.schemaVersion, source[index].schemaVersion);
    });
  });

  test('per document, the referenced metrics are exactly what the site grammar collects', () => {
    for (const doc of snapshotDocuments(snapshot.documents)) {
      const collected = [...collectMetricReferences(doc.content)].sort();
      const derived = [...new Set(data.references.filter((row) => row.slug === doc.slug && row.docType === doc.type).map((row) => row.metricKey))].sort();
      assert.deepEqual(derived, collected, `${doc.type}/${doc.slug}`);
    }
  });

  test('all 134 metrics are referenced, no key is unknown, and no relationship repeats', () => {
    const defined = new Set(snapshot.metrics.map((metric) => metric.id));
    assert.deepEqual(data.referencedKeys, [...defined].sort());
    assert.deepEqual(data.references.filter((row) => !defined.has(row.metricKey)), []);
    assert.deepEqual(data.phrases.flatMap((row) => row.metricKeys).filter((key) => !defined.has(key)), []);
    assert.equal(new Set(data.references.map(refKey)).size, data.references.length);
    assert.equal(new Set(data.phrases.map((row) => JSON.stringify([row.location, row.phrase]))).size, data.phrases.length);
    for (const row of data.phrases) assert.equal(new Set(row.metricKeys).size, row.metricKeys.length);
  });

  test('no malformed reference: field paths are set, formats are known display formats', () => {
    const formats = new Set<string>(DISPLAY_FORMATS);
    for (const row of data.references) {
      assert.ok(row.fieldPath.length > 0 && !row.fieldPath.startsWith('.') && !row.fieldPath.endsWith('.'), refKey(row));
      assert.ok(row.format === null || formats.has(row.format), `${refKey(row)}: ${row.format}`);
    }
  });

  test('the one field naming a metric in two formats stores format null', () => {
    assert.deepEqual(data.formatConflicts, [
      { docType: 'case_study', slug: 'preschool-google-ads', fieldPath: 'intro.0', metricKey: 'pre.accounts', formats: ['words_capitalised', 'words'] },
    ]);
    const row = data.references.find((item) => item.slug === 'preschool-google-ads' && item.fieldPath === 'intro.0' && item.metricKey === 'pre.accounts');
    assert.equal(row?.format, null);
  });

  test('linked phrases keep location, phrase, reason and metric keys', () => {
    assert.deepEqual(
      data.phrases,
      snapshot.linkedPhrases.map((phrase) => ({ location: phrase.location, phrase: phrase.phrase, metricKeys: [...phrase.metricIds], reason: phrase.reason })),
    );
  });
});

describe('the generated SQL', () => {
  test('the saved supabase/imports/references_baseline.sql is exactly what the snapshot generates', () => {
    assert.equal(readFileSync(join(ROOT, 'supabase', 'imports', 'references_baseline.sql'), 'utf8'), sql);
  });

  test('one transaction, no destructive statement, and no write to public.metrics', () => {
    assert.equal(sql.match(/^begin;$/gm)?.length, 1);
    assert.equal(sql.match(/^commit;$/gm)?.length, 1);
    const statements = sql.replace(/\$ref\$[\s\S]*?\$ref\$/g, "''").replace(/--[^\n]*/g, '');
    assert.doesNotMatch(statements, /\b(drop|truncate|delete\s+from|alter\s+table|grant|revoke|create)\b/i);
    assert.doesNotMatch(statements, /\b(insert\s+into|update|delete\s+from)\s+public\.metrics\b/i);
    assert.doesNotMatch(statements, /\bupdate\s+public\.(metric_versions|audit_log)\b/i);
  });

  test('no secret or private identifier is embedded', () => {
    for (const pattern of [
      /sb_(secret|publishable)_[A-Za-z0-9_-]{10,}/,
      /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}\./,
      /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
      /[\w.+-]+@[\w-]+\.[a-z]{2,}/i,
      ...ACCOUNT_IDENTIFIER_SHAPES,
    ]) {
      assert.doesNotMatch(sql, pattern);
    }
  });

  test('the account-identifier checks catch each identifier shape (synthetic values)', () => {
    for (const sample of ['id 123456789012345', 'customer 1234567890', 'customer 123-456-7890', 'customer 123 456 7890', 'act_123456789']) {
      assert.ok(ACCOUNT_IDENTIFIER_SHAPES.some((pattern) => pattern.test(sample)), sample);
    }
    for (const sample of ['₹1,23,45,678', '1617', '106.66', '2026-09-21', '0-321/322']) {
      assert.ok(!ACCOUNT_IDENTIFIER_SHAPES.some((pattern) => pattern.test(sample)), sample);
    }
  });
});

describe('importing into a database with the metric baseline', () => {
  let db: PGlite;
  let before_: string;

  before(async () => {
    db = await databaseWithBaseline();
    before_ = await metricState(db);
    await db.exec(sql);
  });
  after(async () => {
    await db.close();
  });

  test('documents are published through their own baseline revision', async () => {
    const { rows } = await db.query<{ status: string; revision_number: number; linked: boolean; change_summary: string }>(`
      select d.status, r.revision_number, r.document_id = d.id as linked, r.change_summary
      from public.documents d join public.document_revisions r on r.id = d.published_revision_id`);
    assert.equal(rows.length, 10);
    for (const row of rows) {
      assert.deepEqual(row, { status: 'published', revision_number: 1, linked: true, change_summary: 'Baseline import from snapshot/baseline.json' });
    }
    assert.equal((await db.query<{ n: number }>('select count(*)::int as n from public.document_revisions')).rows[0].n, 10);
  });

  test('every draft and revision equals the snapshot content exactly', async () => {
    const { rows } = await db.query<{ doc_type: string; slug: string; draft: unknown; content: unknown; schema_version: number; sort_order: number }>(`
      select d.doc_type, d.slug, d.draft, r.content, d.schema_version, d.sort_order
      from public.documents d join public.document_revisions r on r.id = d.published_revision_id`);
    for (const doc of data.documents) {
      const row = rows.find((item) => item.doc_type === doc.docType && item.slug === doc.slug);
      assert.ok(row, `${doc.docType}/${doc.slug} missing`);
      assert.equal(canonical(row.draft), canonical(doc.content), `${doc.slug} draft`);
      assert.equal(canonical(row.content), canonical(doc.content), `${doc.slug} revision`);
      assert.equal(row.schema_version, doc.schemaVersion);
      assert.equal(row.sort_order, doc.sortOrder);
    }
  });

  test('the stored references are exactly the derived set, with metric keys resolved to ids', async () => {
    const { rows } = await db.query<{ doc_type: string; slug: string; field_path: string; metric_key: string; format: string | null }>(`
      select d.doc_type, d.slug, r.field_path, m.metric_key, r.format
      from public.document_metric_refs r
      join public.documents d on d.id = r.document_id
      join public.metrics m on m.id = r.metric_id`);
    const stored = rows.map((row) => JSON.stringify([row.doc_type, row.slug, row.field_path, row.metric_key, row.format])).sort();
    const derived = data.references.map((row) => JSON.stringify([row.docType, row.slug, row.fieldPath, row.metricKey, row.format])).sort();
    assert.deepEqual(stored, derived);
    assert.equal((await db.query<{ n: number }>('select count(distinct metric_id)::int as n from public.document_metric_refs')).rows[0].n, 134);
  });

  test('linked phrases are stored unreviewed and unpinned', async () => {
    const { rows } = await db.query<{ location: string; phrase: string; metric_keys: string[]; reason: string; reviewed_at: string | null; reviewed_by: string | null; document_id: string | null; field_path: string | null }>(
      'select location, phrase, metric_keys, reason, reviewed_at, reviewed_by, document_id, field_path from public.linked_phrases',
    );
    assert.equal(rows.length, 21);
    for (const phrase of data.phrases) {
      const row = rows.find((item) => item.location === phrase.location && item.phrase === phrase.phrase);
      assert.deepEqual(row, { ...{ location: phrase.location, phrase: phrase.phrase, metric_keys: phrase.metricKeys, reason: phrase.reason }, reviewed_at: null, reviewed_by: null, document_id: null, field_path: null });
    }
  });

  test('metrics, their version history and their verification state are unchanged', async () => {
    assert.equal(await metricState(db), before_);
  });

  test('the Phase 4.2 metric has exactly its 3 references, all in the measurement audit', async () => {
    const { rows } = await db.query<{ doc_type: string; slug: string; field_path: string; format: string | null }>(`
      select d.doc_type, d.slug, r.field_path, r.format
      from public.document_metric_refs r
      join public.documents d on d.id = r.document_id
      join public.metrics m on m.id = r.metric_id
      where m.metric_key = 'audit.placeholder_value_campaigns'
      order by r.field_path`);
    assert.deepEqual(rows, [
      { doc_type: 'case_study', slug: 'measurement-audit', field_path: 'failureModes.1.body.0', format: 'words_capitalised' },
      { doc_type: 'case_study', slug: 'measurement-audit', field_path: 'failureModes.1.metrics.0.evidence', format: null },
      { doc_type: 'case_study', slug: 'measurement-audit', field_path: 'failureModes.1.metrics.0.value', format: null },
    ]);
  });

  test('archive_metric now refuses a referenced metric, and nothing changes', async () => {
    const { rows } = await db.query<{ id: string }>("select id from public.metrics where metric_key = 'audit.placeholder_value_campaigns'");
    const refused = await runAs(db, ADMIN_SESSION, (tx) => tx.query('select public.archive_metric($1, $2)', [rows[0].id, 'must be refused'])).then(
      () => null,
      (error: Error) => error.message,
    );
    assert.match(refused ?? 'accepted', /referenced by page content and cannot be archived/);
    assert.equal(await metricState(db), before_);
  });

  test('the reference rows are invisible to a signed-in non-admin', async () => {
    const counts = await runAs(db, NON_ADMIN_SESSION, (tx) =>
      tx.query<{ docs: number; refs: number; phrases: number }>(`
        select (select count(*)::int from public.documents) as docs,
               (select count(*)::int from public.document_metric_refs) as refs,
               (select count(*)::int from public.linked_phrases) as phrases`),
    );
    assert.deepEqual(counts.rows[0], { docs: 0, refs: 0, phrases: 0 });
  });

  test('a second import is refused because the tables are no longer empty, and changes nothing', async () => {
    const message = await rejection(db, sql);
    assert.match(message ?? 'accepted', /public\.documents is not empty/);
    const { rows } = await db.query<{ docs: number; revisions: number; refs: number; phrases: number }>(`
      select (select count(*)::int from public.documents) as docs, (select count(*)::int from public.document_revisions) as revisions,
             (select count(*)::int from public.document_metric_refs) as refs, (select count(*)::int from public.linked_phrases) as phrases`);
    assert.deepEqual(rows[0], { docs: 10, revisions: 10, refs: 322, phrases: 21 });
  });
});

describe('the import refuses an unexpected database', () => {
  test('without the metric baseline', async () => {
    const db = await createDatabase();
    try {
      assert.match((await rejection(db, sql)) ?? 'accepted', /expected exactly 134 metrics, found 0/);
      assert.equal((await db.query<{ n: number }>('select count(*)::int as n from public.documents')).rows[0].n, 0);
    } finally {
      await db.close();
    }
  });

  test('when a metric is archived', async () => {
    const db = await databaseWithBaseline();
    try {
      const { rows } = await db.query<{ id: string }>("select id from public.metrics where metric_key = 'audit.placeholder_value_campaigns'");
      // Before the import nothing references it, so the database allows the archive.
      assert.equal(await errorCode(runAs(db, ADMIN_SESSION, (tx) => tx.query('select public.archive_metric($1, null)', [rows[0].id]))), null);
      assert.match((await rejection(db, sql)) ?? 'accepted', /archived metrics found/);
      assert.equal((await db.query<{ n: number }>('select count(*)::int as n from public.document_metric_refs')).rows[0].n, 0);
    } finally {
      await db.close();
    }
  });
});
