/**
 * Offline verification of the Supabase admin backend (npm run db:verify).
 *
 * 1. Starts an in-memory PGlite database (Postgres in WASM) — no network, no
 *    Supabase project, no credentials.
 * 2. Loads a minimal Supabase shim, then applies every migration in order.
 * 3. Runs every supabase/tests/*.test.sql file and requires every expectation
 *    in it to pass and its transaction to roll back cleanly.
 * 4. Negative control: runs each file again with one false expectation and
 *    requires that run to fail, proving failures are detected.
 *
 * Development tool only: not imported by the site and not part of `next build`.
 */
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const migrationsDir = join(root, 'supabase', 'migrations');
const testsDir = join(root, 'supabase', 'tests');
const PASS_MARKER = "select 'ALL ADMIN FOUNDATION TESTS PASSED' as result;";

let failures = 0;
const ok = (message) => console.log(`PASS  ${message}`);
const fail = (message) => {
  failures += 1;
  console.log(`FAIL  ${message}`);
};

const db = new PGlite();

async function runSuite(sql) {
  const notices = [];
  try {
    await db.exec(sql, { onNotice: (notice) => notices.push(notice.message) });
    return { error: null, notices };
  } catch (error) {
    await db.exec('rollback');
    return { error, notices };
  }
}

// 1–2. Shim and migrations
await db.exec(readFileSync(new URL('./supabase-shim.sql', import.meta.url), 'utf8'));
const migrations = readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort();
for (const name of migrations) {
  try {
    await db.exec(readFileSync(join(migrationsDir, name), 'utf8'));
  } catch (error) {
    fail(`migration ${name}: ${error.message}`);
    process.exit(1);
  }
}
ok(`applied ${migrations.length} migrations`);

const testFiles = readdirSync(testsDir).filter((name) => name.endsWith('.test.sql')).sort();
if (testFiles.length === 0) fail('no test files found');

for (const name of testFiles) {
  // 3. Test suite
  const suite = readFileSync(join(testsDir, name), 'utf8');
  const expected = suite.match(/select test_helpers\.expect(_error)?\(/g)?.length ?? 0;
  const run = await runSuite(suite);
  const passed = run.notices.filter((notice) => notice.startsWith('PASS: '));

  if (run.error) {
    for (const notice of run.notices) console.log(`      ${notice}`);
    fail(`${name}: test suite aborted: ${run.error.message}`);
  } else if (expected === 0 || passed.length !== expected) {
    fail(`${name}: ${passed.length} of ${expected} expectations reported a pass`);
  } else {
    ok(`${name}: ${passed.length}/${expected} expectations passed`);
  }

  const { rows } = await db.query(`
    select (select count(*) from auth.users)::int
         + (select count(*) from public.metrics)::int
         + (select count(*) from public.audit_log)::int
         + (select count(*) from storage.objects)::int
         + (select count(*) from pg_namespace where nspname = 'test_helpers')::int as leftovers`);
  if (rows[0].leftovers === 0) ok(`${name}: transaction rolled back (no rows or helpers left behind)`);
  else fail(`${name}: transaction left ${rows[0].leftovers} rows or objects behind`);

  // 4. Negative control
  if (!suite.includes(PASS_MARKER)) {
    fail(`${name}: missing its final pass marker`);
  } else {
    const control = await runSuite(
      suite.replace(PASS_MARKER, `select test_helpers.expect(false, 'negative control');\n${PASS_MARKER}`),
    );
    if (control.error?.message.includes('FAIL: negative control')) ok(`${name}: negative control detected`);
    else fail(`${name}: negative control was not detected (${control.error ? control.error.message : 'run succeeded'})`);
  }
}

await db.close();
console.log(failures === 0 ? '\nDatabase verification passed.' : `\nDatabase verification failed (${failures}).`);
process.exit(failures === 0 ? 0 : 1);
