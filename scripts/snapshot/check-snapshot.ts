/**
 * Verifies snapshot/baseline.json against the Phase 2 TypeScript source.
 *
 *   npm run snapshot:check
 *
 * 1. The snapshot passes the strict schema and reference checks.
 * 2. Its metrics and linked phrases equal the public projection of the source.
 * 3. The metric registry loads from the snapshot and every metric renders.
 * 4. Every document, rendered, equals the exports of its TypeScript module.
 * 5. Regenerating the snapshot from the source reproduces the file exactly.
 *
 * Exits non-zero on any difference.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

process.env.CONTENT_SOURCE = 'snapshot';

const { loadSnapshot, snapshotPath } = await import('../../lib/snapshot/load');
const { toPublicMetric } = await import('../../lib/snapshot/public-metric');
const { metricDefinitions } = await import('../../content/evidence/metrics');
const { linkedPhrases } = await import('../../content/evidence/linked-phrases');
const metrics = await import('../../lib/metrics');
const { renderContent } = await import('../../lib/content/render');
const { DOCUMENT_SOURCES, pickContent } = await import('./catalog');

const failures: string[] = [];
const pass = (message: string) => console.log(`PASS  ${message}`);
const fail = (message: string) => {
  console.log(`FAIL  ${message}`);
  failures.push(message);
};

/** Structural equality; a key holding undefined counts as absent, functions compare by identity. */
function differences(actual: unknown, expected: unknown, path = '', found: string[] = []): string[] {
  if (found.length >= 20) return found;
  if (typeof actual === 'function' || typeof expected === 'function') {
    if (actual !== expected) found.push(`${path}: different function`);
    return found;
  }
  if (Array.isArray(actual) || Array.isArray(expected)) {
    if (!Array.isArray(actual) || !Array.isArray(expected)) {
      found.push(`${path}: array vs non-array`);
      return found;
    }
    if (actual.length !== expected.length) found.push(`${path}: length ${actual.length} ≠ ${expected.length}`);
    for (let i = 0; i < Math.min(actual.length, expected.length); i++) differences(actual[i], expected[i], `${path}[${i}]`, found);
    return found;
  }
  if (actual && expected && typeof actual === 'object' && typeof expected === 'object') {
    const a = actual as Record<string, unknown>;
    const e = expected as Record<string, unknown>;
    const keys = new Set([...Object.keys(a), ...Object.keys(e)]);
    for (const key of keys) {
      if (a[key] === undefined && e[key] === undefined) continue;
      differences(a[key], e[key], path ? `${path}.${key}` : key, found);
    }
    return found;
  }
  if (!Object.is(actual, expected)) found.push(`${path}: ${JSON.stringify(actual)} ≠ ${JSON.stringify(expected)}`);
  return found;
}

// 1. Schema and references.
let snapshot: ReturnType<typeof loadSnapshot> | undefined;
try {
  snapshot = loadSnapshot();
  pass(`snapshot is valid: ${snapshotPath()}`);
} catch (error) {
  fail((error as Error).message);
}

if (snapshot) {
  // 2. Metrics and linked phrases equal the source.
  const metricDiff = differences(snapshot.metrics, metricDefinitions.map(toPublicMetric), 'metrics');
  if (metricDiff.length === 0) pass(`metrics equal the TypeScript source (${snapshot.metrics.length})`);
  else fail(`metrics differ from the TypeScript source:\n    ${metricDiff.join('\n    ')}`);

  const phraseDiff = differences(snapshot.linkedPhrases, linkedPhrases, 'linkedPhrases');
  if (phraseDiff.length === 0) pass(`linked phrases equal the TypeScript source (${snapshot.linkedPhrases.length})`);
  else fail(`linked phrases differ:\n    ${phraseDiff.join('\n    ')}`);

  // 3. Registry from the snapshot; every metric renders.
  try {
    const all = metrics.allMetrics();
    for (const metric of all) metrics.fmt(metric.id);
    const kinds = all.reduce<Record<string, number>>((count, metric) => {
      count[metric.kind] = (count[metric.kind] ?? 0) + 1;
      return count;
    }, {});
    const statuses = all.reduce<Record<string, number>>((count, metric) => {
      const status = metric.evidenceStatus ?? 'not graded';
      count[status] = (count[status] ?? 0) + 1;
      return count;
    }, {});
    pass(`registry loads from the snapshot and renders all ${all.length} metrics — kinds ${JSON.stringify(kinds)}, statuses ${JSON.stringify(statuses)}`);
  } catch (error) {
    fail(`registry: ${(error as Error).message}`);
  }

  // 4. Documents round-trip.
  for (const source of DOCUMENT_SOURCES) {
    const name = source.path.join('.');
    const document =
      source.path[0] === 'caseStudies'
        ? snapshot.documents.caseStudies[source.path[1] as keyof typeof snapshot.documents.caseStudies]
        : snapshot.documents[source.path[0] as Exclude<keyof typeof snapshot.documents, 'caseStudies'>];
    try {
      const rendered = renderContent(document.content);
      const expected = pickContent((await source.load()) as Record<string, unknown>, source.schema);
      const diff = differences(rendered, expected, name);
      if (diff.length === 0) pass(`document ${name} renders identically to its TypeScript module`);
      else fail(`document ${name} differs:\n    ${diff.join('\n    ')}`);
    } catch (error) {
      fail(`document ${name}: ${(error as Error).message}`);
    }
  }

  // 5. No drift between the file and the source.
  const register = fileURLToPath(new URL('./register.mjs', import.meta.url));
  const exporter = fileURLToPath(new URL('./export-baseline.ts', import.meta.url));
  const regenerated = spawnSync(process.execPath, ['--import', `file:///${register.replace(/\\/g, '/')}`, exporter, '--stdout'], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, CONTENT_SOURCE: 'typescript' },
  });
  if (regenerated.status !== 0) {
    fail(`regeneration failed: ${regenerated.stderr}`);
  } else if (regenerated.stdout !== readFileSync(snapshotPath(), 'utf8')) {
    fail('snapshot/baseline.json is out of date with the TypeScript source — run npm run snapshot:export');
  } else {
    pass('regenerating from the TypeScript source reproduces snapshot/baseline.json exactly');
  }
}

console.log(failures.length === 0 ? '\nSnapshot check passed.' : `\nSnapshot check failed (${failures.length}).`);
process.exitCode = failures.length === 0 ? 0 : 1;
