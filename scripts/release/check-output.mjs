import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function argument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] ?? null;
}

function fail(message) {
  console.error(`FAIL  ${message}`);
  process.exit(1);
}

const releaseId = Number(argument('--release'));
const expectedSha = argument('--sha256')?.toLowerCase() ?? null;

if (!Number.isInteger(releaseId) || releaseId <= 0) {
  fail('usage: npm run release:check-output -- --release <N> --sha256 <snapshot SHA-256>');
}

if (!expectedSha || !/^[0-9a-f]{64}$/.test(expectedSha)) {
  fail('--sha256 must be the 64-character snapshot SHA-256 recorded for the release');
}

const releaseFile = join(process.cwd(), 'out', 'release.json');

if (!existsSync(releaseFile)) {
  fail('out/release.json is missing. Do not deploy this output. Build an approved release with npm run release:build.');
}

let marker;

try {
  marker = JSON.parse(readFileSync(releaseFile, 'utf8'));
} catch {
  fail('out/release.json is not valid JSON');
}

if (marker.release !== releaseId) {
  fail(`out/release.json says release ${marker.release}, expected release ${releaseId}`);
}

if (String(marker.snapshotSha256).toLowerCase() !== expectedSha) {
  fail('out/release.json snapshot SHA-256 does not match the approved release');
}

const requiredFiles = [
  'index.html',
  '404.html',
  'release.json',
];

for (const file of requiredFiles) {
  if (!existsSync(join(process.cwd(), 'out', file))) {
    fail(`required output file is missing: out/${file}`);
  }
}

console.log(`PASS  out/ is marked as approved release ${releaseId}`);
console.log(`PASS  snapshot SHA-256 matches ${expectedSha}`);
console.log('PASS  output is eligible for manual deployment');