import { collectMetricReferences } from '../content/token-grammar';
import { snapshotSchema, type Snapshot } from './schema';

/**
 * Snapshot validation, free of any file or process access so the same check
 * runs in the site build (load.ts), the release build (scripts/release) and
 * the admin in the browser (release validation).
 */

/** Every problem with a snapshot: schema issues, duplicate metric ids and references to metrics it does not contain. */
export function snapshotIssues(json: unknown): string[] {
  const result = snapshotSchema.safeParse(json);
  if (!result.success) {
    return result.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`);
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
  return problems;
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

  const problems = snapshotIssues(json);
  if (problems.length > 0) {
    throw new Error(`Content snapshot ${origin} is inconsistent:\n  - ${problems.join('\n  - ')}`);
  }

  return result.data;
}
