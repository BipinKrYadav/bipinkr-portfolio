/**
 * Reference data import for the admin database (npm run db:import-references).
 *
 * Generates the one-off SQL that loads the published snapshot's documents,
 * document → metric references and linked phrases into the empty reference
 * tables, and proves offline that it is correct. It never connects to
 * Supabase and never applies anything: the generated file is applied by hand,
 * once, as the owner, after supabase/imports/metrics_baseline.sql.
 *
 *   node --import ./scripts/snapshot/register.mjs scripts/db/import-references.mjs [--write]
 *
 * Verification (always): applies the shim, every migration, the metric
 * baseline exactly as it was applied, then the generated SQL to an in-memory
 * PGlite database, and checks the counts, the content, that no metric changed,
 * that referenced metrics can no longer be archived, and that a second run is
 * refused. admin/tests/reference-import.test.ts covers the same ground in detail.
 *
 * --write also saves the SQL to supabase/imports/references_baseline.sql.
 */
import { PGlite } from '@electric-sql/pglite';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { referenceImportSql } from './reference-import.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const write = process.argv.includes('--write');
const target = join(root, 'supabase', 'imports', 'references_baseline.sql');

let failures = 0;
const ok = (message) => console.log(`PASS  ${message}`);
const fail = (message) => {
  failures += 1;
  console.log(`FAIL  ${message}`);
};

const snapshot = JSON.parse(readFileSync(join(root, 'snapshot', 'baseline.json'), 'utf8'));
const { sql, data, expected } = referenceImportSql(snapshot);

// ---------------------------------------------------------------------------
// Generate
// ---------------------------------------------------------------------------

const summary = `${expected.documents} documents, ${expected.revisions} revisions, ${expected.references} references, ${expected.phrases} linked phrases`;
if (write) {
  mkdirSync(join(root, 'supabase', 'imports'), { recursive: true });
  writeFileSync(target, sql);
  ok(`generated supabase/imports/references_baseline.sql (${summary})`);
} else {
  ok(`generated the import SQL in memory (${summary}; pass --write to save it)`);
  if (existsSync(target)) {
    if (readFileSync(target, 'utf8') === sql) ok('the saved supabase/imports/references_baseline.sql matches the snapshot');
    else fail('the saved supabase/imports/references_baseline.sql is out of date; regenerate it with --write');
  }
}

if (data.formatConflicts.length) {
  for (const conflict of data.formatConflicts) {
    ok(`format conflict stored as null: ${conflict.docType}/${conflict.slug} ${conflict.fieldPath} ${conflict.metricKey} (${conflict.formats.join(', ')})`);
  }
}

// ---------------------------------------------------------------------------
// Verify offline
// ---------------------------------------------------------------------------

const db = new PGlite();
await db.exec(readFileSync(join(root, 'scripts', 'db', 'supabase-shim.sql'), 'utf8'));
for (const name of readdirSync(join(root, 'supabase', 'migrations')).filter((file) => file.endsWith('.sql')).sort()) {
  await db.exec(readFileSync(join(root, 'supabase', 'migrations', name), 'utf8'));
}
await db.exec(readFileSync(join(root, 'supabase', 'imports', 'metrics_baseline.sql'), 'utf8'));

const metricState = async () =>
  (
    await db.query(`
      select
        (select jsonb_agg(to_jsonb(m) order by m.metric_key) from public.metrics m) as metrics,
        (select jsonb_agg(to_jsonb(v) order by v.id) from public.metric_versions v) as versions,
        (select jsonb_agg(to_jsonb(s) order by s.metric_key) from public.metric_verification s) as verification`)
  ).rows[0];
const before = JSON.stringify(await metricState());

try {
  await db.exec(sql);
  ok('the import applies to a database built from the migrations and the metric baseline');
} catch (error) {
  fail(`the import was rejected: ${error.message}`);
  process.exit(1);
}

const counts = (
  await db.query(`
    select (select count(*)::int from public.documents) as documents,
           (select count(*)::int from public.documents where status = 'published' and published_revision_id is not null) as published,
           (select count(*)::int from public.document_revisions) as revisions,
           (select count(*)::int from public.document_metric_refs) as refs,
           (select count(*)::int from public.linked_phrases) as phrases,
           (select count(*)::int from public.linked_phrases where reviewed_at is not null) as reviewed`)
).rows[0];
const want = { documents: 10, published: 10, revisions: 10, refs: 322, phrases: 21, reviewed: 0 };
const countProblems = Object.entries(want).filter(([key, value]) => counts[key] !== value);
if (countProblems.length === 0) ok('10 published documents, 10 revisions, 322 references, 21 unreviewed linked phrases');
else fail(`counts differ: ${countProblems.map(([key, value]) => `${key} ${counts[key]} ≠ ${value}`).join(', ')}`);

/** JSON with object keys sorted: jsonb does not keep key order. */
const canonical = (value) =>
  JSON.stringify(value ?? null, (_key, item) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item,
  );
const stored = (
  await db.query(`select d.doc_type, d.slug, d.draft, r.content from public.documents d
                  join public.document_revisions r on r.id = d.published_revision_id`)
).rows;
const contentProblems = data.documents.filter((doc) => {
  const row = stored.find((item) => item.doc_type === doc.docType && item.slug === doc.slug);
  return !row || canonical(row.draft) !== canonical(doc.content) || canonical(row.content) !== canonical(doc.content);
});
if (contentProblems.length === 0) ok('every document draft and baseline revision equals its snapshot content');
else fail(`content differs for ${contentProblems.map((doc) => `${doc.docType}/${doc.slug}`).join(', ')}`);

if (JSON.stringify(await metricState()) === before) ok('metrics, version history and verification state are unchanged');
else fail('the import changed public.metrics, metric_versions or metric_verification');

const unprotected = (
  await db.query(`select count(*)::int as count from public.metrics m
                  where not exists (select 1 from public.document_metric_refs r where r.metric_id = m.id)`)
).rows[0].count;
if (unprotected === 0) ok('all 134 metrics are referenced by page content, so the database now refuses to archive any of them');
else fail(`${unprotected} metrics have no document reference`);

try {
  await db.exec(sql);
  fail('a second run was accepted');
} catch (error) {
  if (/not empty/.test(error.message)) ok('a second run is refused (the tables are no longer empty)');
  else fail(`a second run failed for an unexpected reason: ${error.message}`);
}

await db.close();
console.log(failures === 0 ? '\nReference import verified (nothing was applied to any project).' : `\nReference import check failed (${failures}).`);
process.exit(failures === 0 ? 0 : 1);
