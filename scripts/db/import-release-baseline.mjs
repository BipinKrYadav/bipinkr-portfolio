/**
 * Published baseline release for the admin database (npm run db:import-release-baseline).
 *
 * Generates the one-off SQL that records snapshot/baseline.json as release 1
 * (published) and proves offline that it is correct. It never connects to
 * Supabase and never applies anything: the generated file is applied by hand,
 * once, as the owner, after the Phase 5C migration and the earlier imports.
 *
 *   node --import ./scripts/snapshot/register.mjs scripts/db/import-release-baseline.mjs [--write]
 *
 * Verification (always), on an in-memory PGlite database built from every
 * migration plus metrics_baseline.sql and references_baseline.sql exactly as
 * they were applied:
 *   * the release is published, hashed, and links the 134 imported metric
 *     versions and 10 baseline document revisions;
 *   * the database assembles exactly this snapshot again from its own rows,
 *     so a release made without edits would change nothing;
 *   * no metric, document or draft changes;
 *   * with drafts saved after the baseline (like the production test drafts),
 *     the import still succeeds and leaves those drafts as unpublished changes;
 *   * a second run is refused.
 *
 * --write also saves the SQL to supabase/imports/release_baseline.sql.
 */
import { PGlite } from '@electric-sql/pglite';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { releaseBaselineSql } from './release-baseline.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const write = process.argv.includes('--write');
const target = join(root, 'supabase', 'imports', 'release_baseline.sql');

let failures = 0;
const ok = (message) => console.log(`PASS  ${message}`);
const fail = (message) => {
  failures += 1;
  console.log(`FAIL  ${message}`);
};

const snapshotText = readFileSync(join(root, 'snapshot', 'baseline.json'), 'utf8');
const { sql, expected } = releaseBaselineSql(snapshotText);
const summary = `${expected.metrics} metrics, ${expected.documents} documents, ${expected.linkedPhrases} linked phrases`;

if (write) {
  mkdirSync(join(root, 'supabase', 'imports'), { recursive: true });
  writeFileSync(target, sql);
  ok(`generated supabase/imports/release_baseline.sql (${summary})`);
} else {
  ok(`generated the import SQL in memory (${summary}; pass --write to save it)`);
  if (existsSync(target)) {
    if (readFileSync(target, 'utf8') === sql) ok('the saved supabase/imports/release_baseline.sql matches the snapshot');
    else fail('the saved supabase/imports/release_baseline.sql is out of date; regenerate it with --write');
  }
}

async function database() {
  const db = new PGlite();
  await db.exec(readFileSync(join(root, 'scripts', 'db', 'supabase-shim.sql'), 'utf8'));
  for (const name of readdirSync(join(root, 'supabase', 'migrations')).filter((file) => file.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(root, 'supabase', 'migrations', name), 'utf8'));
  }
  await db.exec(readFileSync(join(root, 'supabase', 'imports', 'metrics_baseline.sql'), 'utf8'));
  await db.exec(readFileSync(join(root, 'supabase', 'imports', 'references_baseline.sql'), 'utf8'));
  return db;
}

const state = async (db) =>
  JSON.stringify(
    (
      await db.query(`
        select
          (select jsonb_agg(to_jsonb(m) order by m.metric_key) from public.metrics m) as metrics,
          (select jsonb_agg(to_jsonb(d) - 'updated_at' order by d.slug) from public.documents d) as documents,
          (select jsonb_agg(to_jsonb(r) - 'release_id' order by r.id) from public.document_revisions r) as revisions,
          (select jsonb_agg(to_jsonb(v) - 'release_id' order by v.id) from public.metric_versions v) as versions`)
    ).rows[0],
  );

// ---------------------------------------------------------------------------
// 1. A database that holds exactly the baseline
// ---------------------------------------------------------------------------

const db = await database();
const before = await state(db);
try {
  await db.exec(sql);
  ok('the import applies after every migration and the earlier imports');
} catch (error) {
  fail(`the import was rejected: ${error.message}`);
  process.exit(1);
}

const { rows: releases } = await db.query(
  `select id, status::text, origin, kind::text, snapshot_sha256, live_at is not null as live,
          snapshot = $1::jsonb as exact from public.releases`,
  [snapshotText],
);
const release = releases[0];
if (releases.length === 1 && release.status === 'published' && release.origin === 'baseline_import' && release.live && release.exact) {
  ok(`release ${release.id} is the published baseline (snapshot SHA-256 ${release.snapshot_sha256})`);
} else fail(`unexpected release rows: ${JSON.stringify(releases.map(({ exact, ...row }) => ({ ...row, exact })))}`);

const { rows: links } = await db.query(
  `select (select count(*)::int from public.metric_versions where release_id = $1) as versions,
          (select count(*)::int from public.document_revisions where release_id = $1) as revisions`,
  [release.id],
);
if (links[0].versions === expected.metrics && links[0].revisions === expected.documents) {
  ok(`linked ${links[0].versions} imported metric versions and ${links[0].revisions} baseline document revisions to release ${release.id}`);
} else fail(`linked ${links[0].versions} versions and ${links[0].revisions} revisions`);

if ((await state(db)) === before) ok('no metric, document, draft or history content changed');
else fail('the import changed metrics, documents or history content');

const { rows: composed } = await db.query(
  `select private.snapshot_content(private.compose_release_snapshot(r.snapshot, 'check')) = private.snapshot_content(r.snapshot) as same
     from public.releases r where r.id = $1`,
  [release.id],
);
if (composed[0].same) ok('the database assembles exactly the baseline from its own rows (a release without edits changes nothing)');
else fail('the snapshot the database assembles differs from the baseline');

const { rows: audit } = await db.query("select count(*)::int as count from public.audit_log where action = 'release_baseline_imported'");
if (audit[0].count === 1) ok('the import is recorded in the audit log');
else fail(`expected one audit entry, found ${audit[0].count}`);

try {
  await db.exec(sql);
  fail('a second run was accepted');
} catch (error) {
  await db.exec('rollback').catch(() => undefined);
  if (/not empty/.test(error.message)) ok('a second run is refused');
  else fail(`a second run failed for another reason: ${error.message}`);
}
await db.close();

// ---------------------------------------------------------------------------
// 2. Drafts saved after the baseline (like the production test drafts)
// ---------------------------------------------------------------------------

const drafted = await database();
await drafted.exec(`
  update public.documents
     set draft = jsonb_set(draft, '{hero,h1}', to_jsonb((draft #>> '{hero,h1}') || ' (draft)'))
   where doc_type = 'homepage';
  insert into public.document_revisions (document_id, content, schema_version, change_summary)
  select id, draft, schema_version, 'offline draft' from public.documents where doc_type = 'homepage';
  select set_config('app.metric_change_reason', 'offline draft', false);
  update public.metrics set public_note = 'offline draft note', change_reason = 'offline draft'
   where metric_key = (select metric_key from public.metrics order by metric_key limit 1);
`);
const draftedBefore = await state(drafted);
try {
  await drafted.exec(sql);
  ok('the import succeeds with later drafts present, and publishes none of them');
} catch (error) {
  fail(`the import was rejected with drafts present: ${error.message}`);
}
if ((await state(drafted)) === draftedBefore) ok('the later drafts are left exactly as they were');
else fail('the import changed a later draft');
const { rows: pending } = await drafted.query(
  `select c.entity_type, c.entity_key, c.fields
     from public.releases r, private.snapshot_changes(r.snapshot, private.compose_release_snapshot(r.snapshot, 'check')) c`,
);
if (pending.length === 1 && pending[0].entity_key === 'homepage/home') {
  ok(`the homepage draft shows as the only unpublished change (${pending[0].fields.join(', ')}); the admin-only metric note is not published content`);
} else fail(`unexpected unpublished changes: ${JSON.stringify(pending)}`);
await drafted.close();

console.log(failures === 0 ? '\nRelease baseline import verified (nothing was applied to any project).' : `\nRelease baseline import check failed (${failures}).`);
process.exit(failures === 0 ? 0 : 1);
