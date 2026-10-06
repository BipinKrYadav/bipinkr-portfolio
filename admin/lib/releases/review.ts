import { snapshotIssues } from '../../../lib/snapshot/parse';

import type { ReleaseItemRow } from './model';

/**
 * The release review, computed from the release items and the two snapshots:
 * the published baseline (before) and the release (after). Pure: no requests.
 *
 * Page content is shown here on purpose — this is the admin's review of what
 * will go live — but it is only ever fetched at runtime, after sign-in, and
 * never becomes part of the static admin build.
 */

export interface FieldChange {
  /** Dot path, array indices included (for documents, relative to the content). */
  path: string;
  before: unknown;
  after: unknown;
  /** The value holds a protected metric, evidence or label token. */
  hasTokens: boolean;
}

export interface MetricChangeView {
  key: string;
  name: string;
  change: ReleaseItemRow['diff']['change'];
  fields: FieldChange[];
  /** Calculated metrics in the release whose formula reads this metric. */
  dependents: string[];
}

export interface DocumentChangeView {
  key: string;
  change: ReleaseItemRow['diff']['change'];
  fields: FieldChange[];
  /** Protected tokens in the published and the release content. */
  tokens: { before: number; after: number };
  revisionId: string | null;
}

export interface ReleaseReview {
  metrics: MetricChangeView[];
  documents: DocumentChangeView[];
  /** "location › phrase" for each linked phrase added, removed or changed. */
  linkedPhrases: string[];
  warnings: string[];
}

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => !!value && typeof value === 'object' && !Array.isArray(value);

/** The value at a dot path (array indices as numbers), or undefined. */
export function valueAt(root: unknown, path: string): unknown {
  if (path === '' || path === '(whole value)') return root;
  let current: unknown = root;
  for (const part of path.split('.')) {
    if (Array.isArray(current)) current = current[Number(part)];
    else if (isObject(current)) current = current[part];
    else return undefined;
  }
  return current;
}

const TOKEN = /\{\{[^{}]*\}\}/g;

/** Protected tokens in a value: {{…}} tokens in strings, plus $metricValue and $pair objects. */
export function countTokens(value: unknown): number {
  if (typeof value === 'string') return value.match(TOKEN)?.length ?? 0;
  if (Array.isArray(value)) return value.reduce<number>((total, item) => total + countTokens(item), 0);
  if (isObject(value)) {
    let total = typeof value.$metricValue === 'string' ? 1 : 0;
    if (isObject(value.$pair)) total += 1;
    for (const item of Object.values(value)) total += countTokens(item);
    return total;
  }
  return 0;
}

function metricsOf(snapshot: unknown): Json[] {
  return isObject(snapshot) && Array.isArray(snapshot.metrics) ? (snapshot.metrics.filter(isObject) as Json[]) : [];
}

/** Every document in a snapshot, keyed "type/slug" (collections flattened). */
export function documentsOf(snapshot: unknown): Map<string, Json> {
  const found = new Map<string, Json>();
  const documents = isObject(snapshot) && isObject(snapshot.documents) ? snapshot.documents : {};
  for (const entry of Object.values(documents)) {
    const candidates = isObject(entry) && 'type' in entry ? [entry] : isObject(entry) ? Object.values(entry) : [];
    for (const document of candidates) {
      if (isObject(document) && typeof document.type === 'string' && typeof document.slug === 'string') {
        found.set(`${document.type}/${document.slug}`, document);
      }
    }
  }
  return found;
}

/** Formula inputs of a snapshot metric (every metric id its formula names). */
function formulaInputs(metric: Json): string[] {
  if (!isObject(metric.formula)) return [];
  return Object.entries(metric.formula)
    .filter(([name]) => name !== 'fn')
    .flatMap(([, value]) => (Array.isArray(value) ? value : [value]))
    .filter((value): value is string => typeof value === 'string');
}

const field = (path: string, before: unknown, after: unknown): FieldChange => ({
  path,
  before,
  after,
  hasTokens: countTokens(before) + countTokens(after) > 0,
});

export function buildReleaseReview(items: readonly ReleaseItemRow[], before: unknown, after: unknown): ReleaseReview {
  const afterMetrics = metricsOf(after);
  const beforeDocuments = documentsOf(before);
  const afterDocuments = documentsOf(after);
  const warnings: string[] = [];

  const metrics = items
    .filter((item) => item.entity_type === 'metric')
    .map<MetricChangeView>((item) => {
      const { diff } = item;
      const key = diff.entityKey;
      const name = String((diff.after ?? diff.before)?.name ?? key);
      const dependents = afterMetrics
        .filter((metric) => formulaInputs(metric).includes(key))
        .map((metric) => String(metric.id));
      if (diff.change === 'changed' && diff.fields.includes('evidenceStatus')) {
        warnings.push(`${key}: the evidence status shown on the site changes (${String(diff.before?.evidenceStatus)} → ${String(diff.after?.evidenceStatus)}).`);
      }
      if (diff.change === 'removed') warnings.push(`${key} is removed from the site (archived).`);
      if (dependents.length > 0 && diff.fields.some((path) => path === 'value' || path.startsWith('formula'))) {
        warnings.push(`${key} changes; the calculated ${dependents.join(', ')} ${dependents.length === 1 ? 'follows' : 'follow'} on the site.`);
      }
      return {
        key,
        name,
        change: diff.change,
        fields: diff.fields.map((path) => field(path, valueAt(diff.before, path), valueAt(diff.after, path))),
        dependents,
      };
    });

  const documents = items
    .filter((item) => item.entity_type === 'document')
    .map<DocumentChangeView>((item) => {
      const key = item.diff.entityKey;
      const beforeDocument = beforeDocuments.get(key);
      const afterDocument = afterDocuments.get(key);
      const tokens = { before: countTokens(beforeDocument?.content), after: countTokens(afterDocument?.content) };
      if (tokens.before !== tokens.after) {
        warnings.push(`${key}: the number of protected tokens changes (${tokens.before} → ${tokens.after}).`);
      }
      return {
        key,
        change: item.diff.change,
        fields: item.diff.fields.map((path) =>
          field(path.replace(/^content\.?/, '') || '(whole content)', valueAt(beforeDocument, path), valueAt(afterDocument, path)),
        ),
        tokens,
        revisionId: item.document_revision_id,
      };
    });

  const linkedPhrases = items.filter((item) => item.entity_type === 'linked_phrases').flatMap((item) => item.diff.fields);

  return { metrics, documents, linkedPhrases, warnings };
}

/** The same schema and consistency check the site build runs (lib/snapshot/parse.ts). */
export function snapshotSchemaIssues(snapshot: unknown): string[] {
  return snapshotIssues(snapshot);
}

/** SHA-256 of text as UTF-8, lowercase hex (Web Crypto; available in browsers and Node). */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** A short, human value for review tables. */
export function displayValue(value: unknown): string {
  if (value === undefined) return '—';
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}
