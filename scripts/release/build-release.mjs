/**
 * Builds the public site from an approved release (npm run release:build).
 *
 *   npm run release:build -- --snapshot release-7.snapshot.json --sha256 <64 hex> --release 7
 *
 * Steps (Phase 5C "Build" and "Verify build"; deployment stays manual):
 *   1. The snapshot file's SHA-256 must equal the one the release recorded
 *      (shown on the release page), so exactly the approved snapshot is built.
 *   2. The snapshot must pass the site's own schema and consistency check
 *      (lib/snapshot/parse.ts) and be a release (or the imported baseline).
 *   3. The public site is built from it (CONTENT_SNAPSHOT) into out/.
 *   4. The output is verified: every page present, one build ID, every
 *      referenced asset present, no unresolved token, nothing from the admin
 *      or Supabase.
 *   5. out/release.json records the release and snapshot SHA-256, so the
 *      deployed site can be checked (npm run release:verify-live).
 *   6. out/ is packed into release-builds/release-<id>-site.zip and its
 *      SHA-256 is printed: record it on the release page, then upload the
 *      archive yourself.
 *
 * It never contacts Supabase, the host or any network service, and it never
 * deploys anything.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseSnapshot } from '../../lib/snapshot/parse.ts';
import { listFiles, zipFolder } from './zip.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function stop(message) {
  console.error(`FAIL  ${message}`);
  console.error('\nNothing was built for deployment. Record the failure on the release page if publishing has started.');
  process.exit(1);
}
const ok = (message) => console.log(`PASS  ${message}`);

const snapshotFile = argument('--snapshot');
const expectedSha = argument('--sha256')?.toLowerCase() ?? null;
const releaseId = Number(argument('--release'));
if (!snapshotFile || !expectedSha || !Number.isInteger(releaseId) || releaseId <= 0) {
  stop('usage: npm run release:build -- --snapshot <release-N.snapshot.json> --sha256 <snapshot SHA-256> --release <N>');
}
if (!/^[0-9a-f]{64}$/.test(expectedSha)) stop('--sha256 must be the 64-character snapshot SHA-256 shown on the release page');

// 1. Integrity --------------------------------------------------------------

const snapshotPath = resolve(process.cwd(), snapshotFile);
if (!existsSync(snapshotPath)) stop(`snapshot file not found: ${snapshotPath}`);
const bytes = readFileSync(snapshotPath);
const actualSha = createHash('sha256').update(bytes).digest('hex');
if (actualSha !== expectedSha) stop(`the snapshot's SHA-256 is ${actualSha}, not the recorded ${expectedSha}`);
ok(`snapshot SHA-256 matches release ${releaseId}`);

// 2. Schema -----------------------------------------------------------------

let snapshot;
try {
  snapshot = parseSnapshot(JSON.parse(bytes.toString('utf8')), snapshotPath);
} catch (error) {
  stop(error.message);
}
ok(`the snapshot passes the site's schema check (${snapshot.metrics.length} metrics, kind ${snapshot.kind})`);

// 3. Build ------------------------------------------------------------------

const out = join(root, 'out');
rmSync(out, { recursive: true, force: true });
const build = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['next', 'build'], {
  cwd: root,
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: { ...process.env, CONTENT_SOURCE: 'snapshot', CONTENT_SNAPSHOT: snapshotPath, NEXT_TELEMETRY_DISABLED: '1' },
});
if (build.status !== 0) stop(`next build exited with ${build.status}`);
ok('the public site was built from the release snapshot');

// 4. Verify -----------------------------------------------------------------

const files = listFiles(out);
const names = new Set(files.map((file) => file.name));
const text = (name) => readFileSync(join(out, name), 'utf8');

const caseStudies = Object.keys(snapshot.documents.caseStudies);
const requiredPages = [
  'index.html',
  '404.html',
  'about/index.html',
  'services/index.html',
  'contact/index.html',
  'case-studies/index.html',
  ...caseStudies.map((slug) => `case-studies/${slug}/index.html`),
];
const missingPages = requiredPages.filter((page) => !names.has(page));
if (missingPages.length > 0) stop(`missing pages: ${missingPages.join(', ')}`);
ok(`all ${requiredPages.length} content pages are present (${files.length} files in total)`);

const pages = files.filter((file) => /\.(html|txt)$/.test(file.name)).map((file) => ({ name: file.name, body: text(file.name) }));
const buildIds = new Set();
for (const page of pages) {
  for (const match of page.body.matchAll(/_next\/static\/([A-Za-z0-9_-]{10,})\/_(?:buildManifest|ssgManifest)/g)) buildIds.add(match[1]);
  for (const match of page.body.matchAll(/\\?"b\\?":\\?"([A-Za-z0-9_-]{10,})\\?"/g)) buildIds.add(match[1]);
}
if (buildIds.size !== 1) stop(`expected one build ID, found ${[...buildIds].join(', ') || 'none'}`);
ok(`one build ID across ${pages.length} pages: ${[...buildIds][0]}`);

const assets = new Set();
for (const file of files.filter((item) => /\.(html|txt|js|css)$/.test(item.name))) {
  for (const match of text(file.name).matchAll(/\/?_next\/static\/[A-Za-z0-9_./-]+?\.(?:js|css|woff2?|png|svg|jpg|webp|ico)/g)) {
    assets.add(match[0].replace(/^\//, ''));
  }
}
const missingAssets = [...assets].filter((asset) => !names.has(asset));
if (missingAssets.length > 0) stop(`referenced assets are missing: ${missingAssets.slice(0, 10).join(', ')}`);
ok(`${assets.size} referenced _next assets are all present`);

const unresolved = pages.filter((page) => /\{\{(?:metric|evidence|label):/.test(page.body)).map((page) => page.name);
if (unresolved.length > 0) stop(`unresolved content tokens in: ${unresolved.slice(0, 10).join(', ')}`);
ok('no unresolved metric, evidence or label token in any page');

const forbidden = [/supabase/i, /\/rest\/v1\//, /admin\.bipinkr\.in/, /sb_publishable_/, /service_role/];
const leaking = pages.filter((page) => forbidden.some((pattern) => pattern.test(page.body))).map((page) => page.name);
if (leaking.length > 0) stop(`admin or database references in: ${leaking.slice(0, 10).join(', ')}`);
ok('no admin or database reference in the public output');

// 5. Release marker ---------------------------------------------------------

writeFileSync(
  join(out, 'release.json'),
  `${JSON.stringify({ release: releaseId, snapshotSha256: expectedSha }, null, 2)}\n`,
);
ok('out/release.json records the release and its snapshot SHA-256');

// 6. Archive ----------------------------------------------------------------

mkdirSync(join(root, 'release-builds'), { recursive: true });
const archive = join(root, 'release-builds', `release-${releaseId}-site.zip`);
const zipped = zipFolder(out, archive);
const archiveSha = createHash('sha256').update(zipped.buffer).digest('hex');
ok(`packed ${zipped.entries} files into ${archive} (${zipped.bytes} bytes)`);

console.log(`
Verified build of release ${releaseId}
  archive:  ${archive}
  SHA-256:  ${archiveSha}

Next (manual):
  1. On the release page, record this SHA-256 as the verified build.
  2. Upload the archive's contents to the site root yourself (_next/ first).
  3. Run: npm run release:verify-live -- --release ${releaseId} --sha256 ${expectedSha}
  4. Only then mark the release published on the release page.
Nothing has been deployed.`);
