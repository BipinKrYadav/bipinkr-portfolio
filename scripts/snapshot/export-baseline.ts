/**
 * Generates snapshot/baseline.json from the Phase 2 TypeScript source.
 *
 *   npm run snapshot:export              writes snapshot/baseline.json
 *   npm run snapshot:export -- --stdout  prints it instead (used by snapshot:check)
 *
 * Content modules are evaluated in token mode, so every figure is stored as a
 * reference to its canonical metric — never as a value — and client/campaign
 * names keep both their real and anonymous labels. Private metric fields are
 * dropped. The output is deterministic: no timestamps, stable key order.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

process.env.CONTENT_SOURCE = 'typescript';

const { enableTokenMode } = await import('../../lib/metrics/render-mode');
enableTokenMode();

const { metricDefinitions } = await import('../../content/evidence/metrics');
const { linkedPhrases } = await import('../../content/evidence/linked-phrases');
const { toPublicMetric } = await import('../../lib/snapshot/public-metric');
const { DEFAULT_SNAPSHOT_PATH, parseSnapshot } = await import('../../lib/snapshot/load');
const { SNAPSHOT_SCHEMA_VERSION } = await import('../../lib/snapshot/schema');
const { ICONS } = await import('../../lib/content/icons');
const { DOCUMENT_SOURCES, pickContent } = await import('./catalog');

const iconNames = new Map<unknown, string>(Object.entries(ICONS).map(([name, icon]) => [icon, name]));

/** Converts evaluated content into plain snapshot JSON. */
function toSnapshotValue(value: unknown, path: string): unknown {
  if (typeof value === 'function' || (typeof value === 'object' && value !== null && iconNames.has(value))) {
    const name = iconNames.get(value);
    if (!name) throw new Error(`${path}: only allow-listed icons can be stored in a snapshot`);
    return { $icon: name };
  }
  if (typeof value === 'number' && !Number.isFinite(value)) throw new Error(`${path}: non-finite number`);
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => {
      if (item === undefined) throw new Error(`${path}[${index}]: undefined array item`);
      return toSnapshotValue(item, `${path}[${index}]`);
    });
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if ('$pair' in record) {
      // The combined display text is rebuilt from the pair when the site is built.
      return { $pair: record.$pair, label: record.label };
    }
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(record)) {
      if (item !== undefined) output[key] = toSnapshotValue(item, `${path}.${key}`);
    }
    return output;
  }
  throw new Error(`${path}: unsupported value of type ${typeof value}`);
}

const documents: Record<string, unknown> = { caseStudies: {} };
for (const source of DOCUMENT_SOURCES) {
  const module = (await source.load()) as Record<string, unknown>;
  const document = {
    type: source.type,
    slug: source.slug,
    status: 'published',
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    content: toSnapshotValue(pickContent(module, source.schema), source.path.join('.')),
  };
  if (source.path[0] === 'caseStudies') {
    (documents.caseStudies as Record<string, unknown>)[source.path[1] as string] = document;
  } else {
    documents[source.path[0]] = document;
  }
}

// Key order: top-level documents first, case studies last.
const { caseStudies, ...pages } = documents;

const snapshot = {
  schemaVersion: SNAPSHOT_SCHEMA_VERSION,
  kind: 'baseline',
  description:
    'Baseline content snapshot generated from the Phase 2 TypeScript source (content/evidence, content/pages, content/services.ts, content/metrics.ts, content/case-studies). Public fields only; every figure is a metric reference.',
  metrics: metricDefinitions.map(toPublicMetric),
  linkedPhrases,
  media: [],
  documents: { ...pages, caseStudies },
};

parseSnapshot(snapshot, 'generated from the TypeScript source');

const json = `${JSON.stringify(snapshot, null, 2)}\n`;

if (process.argv.includes('--stdout')) {
  process.stdout.write(json);
} else {
  const file = resolve(process.cwd(), DEFAULT_SNAPSHOT_PATH);
  writeFileSync(file, json, 'utf8');
  console.log(`Wrote ${file}`);
  console.log(`  metrics: ${snapshot.metrics.length}`);
  console.log(`  linked phrases: ${snapshot.linkedPhrases.length}`);
  console.log(`  documents: ${DOCUMENT_SOURCES.length}`);
}
