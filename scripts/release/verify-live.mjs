/**
 * Checks that the live site serves a given release (npm run release:verify-live).
 *
 *   npm run release:verify-live -- --release 7 --sha256 <snapshot SHA-256> [--url https://bipinkr.in]
 *
 * Reads <url>/release.json, written by npm run release:build, and compares
 * the release number and snapshot SHA-256. One read-only GET; it changes
 * nothing anywhere. Run it after uploading a release build and before
 * marking the release published.
 */

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1] ?? fallback;
}

const url = argument('--url', 'https://bipinkr.in').replace(/\/+$/, '');
const releaseId = Number(argument('--release'));
const sha = argument('--sha256')?.toLowerCase() ?? '';
if (!Number.isInteger(releaseId) || releaseId <= 0 || !/^[0-9a-f]{64}$/.test(sha)) {
  console.error('usage: npm run release:verify-live -- --release <N> --sha256 <snapshot SHA-256> [--url https://bipinkr.in]');
  process.exit(1);
}

let marker;
try {
  const response = await fetch(`${url}/release.json`, { cache: 'no-store', headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  marker = await response.json();
} catch (error) {
  console.error(`FAIL  could not read ${url}/release.json: ${error.message}`);
  console.error('      The live site does not show a release build yet. Do not mark the release published.');
  process.exit(1);
}

if (marker?.release === releaseId && marker?.snapshotSha256 === sha) {
  console.log(`PASS  ${url} serves release ${releaseId} (snapshot ${sha})`);
  console.log('      You can now mark the release published on the release page.');
} else {
  console.error(`FAIL  ${url} serves ${JSON.stringify(marker)}, not release ${releaseId} with snapshot ${sha}`);
  console.error('      Do not mark the release published.');
  process.exit(1);
}
