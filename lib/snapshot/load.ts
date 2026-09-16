import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { collectMetricReferences } from '../content/token-grammar';
import { snapshotSchema, type Snapshot } from './schema';

/**
 * Reads and validates the content snapshot while the site is built.
 *
 * Path: `CONTENT_SNAPSHOT` if set, otherwise snapshot/baseline.json. The file
 * is read from disk during the build only — it is not bundled into any page
 * and nothing reads it at runtime.
 */

export const DEFAULT_SNAPSHOT_PATH = 'snapshot/baseline.json';

let cached: Snapshot | undefined;

export function snapshotPath(): string {
  return resolve(process.cwd(), process.env.CONTENT_SNAPSHOT?.trim() || DEFAULT_SNAPSHOT_PATH);
}

/** Validates snapshot JSON: strict schema, unique metric ids, and no reference to a metric that does not exist. */
export function parseSnapshot(json: unknown, origin = 'snapshot'): Snapshot {
  const result = snapshotSchema.safeParse(json);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 25)
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    throw new Error(`Content snapshot ${origin} is invalid:\n${issues.join('\n')}`);
  }

  const snapshot = result.data;
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const metric of snapshot.metrics) {
    if (ids.has(metric.id)) problems.push(`duplicate metric id ${metric.id}`);
    ids.add(metric.id);
  }
  for (const id of collectMetricReferences(snapshot.documents)) {
    if (!ids.has(id)) problems.push(`documents reference unknown metric ${id}`);
  }
  for (const phrase of snapshot.linkedPhrases) {
    for (const id of phrase.metricIds) {
      if (!ids.has(id)) problems.push(`linked phrase "${phrase.phrase}" references unknown metric ${id}`);
    }
  }
  if (problems.length > 0) {
    throw new Error(`Content snapshot ${origin} is inconsistent:\n  - ${problems.join('\n  - ')}`);
  }

  return snapshot;
}

export function loadSnapshot(): Snapshot {
  if (cached) return cached;
  const file = snapshotPath();

  let json: unknown;
  try {
    json = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read content snapshot at ${file}: ${(error as Error).message}`);
  }

  cached = parseSnapshot(json, file);
  return cached;
}
