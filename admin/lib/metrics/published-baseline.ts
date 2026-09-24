import type { MetricRow } from './model';

/**
 * Draft vs published, for metrics (Phase 5B).
 *
 * The public site is built from snapshot/baseline.json, never from the
 * database, so that snapshot is the published baseline. public.metrics is the
 * admin's working copy: an edit there is a draft until a publish pipeline
 * turns it into a new snapshot.
 *
 * The comparison runs in the browser against a build-time index of the
 * published fields. The index holds fingerprints, never the values: some
 * published names quote wording the site anonymises, and the static build
 * must not carry them. A fingerprint only has to tell "same" from "changed".
 *
 * Pure: the index is built from a snapshot passed in (lib/snapshot-catalog.ts
 * does that at build time).
 */

/** Published fields, in a fixed order, with the snapshot → database mapping of scripts/db/import-snapshot.mjs. */
export const PUBLISHED_FIELDS = [
  'name',
  'description',
  'kind',
  'value_type',
  'unit',
  'currency',
  'value',
  'precision',
  'display_format',
  'formula',
  'evidence_status',
  'data_origin',
  'source_platform',
  'source_type',
  'legacy_method_note',
  'reporting_period_basis',
  'reporting_period_start',
  'reporting_period_end',
  'reporting_period_note',
] as const satisfies readonly (keyof MetricRow)[];

export type PublishedField = (typeof PUBLISHED_FIELDS)[number];

/** metric_key → fingerprint per PUBLISHED_FIELDS entry, in the same order. */
export type PublishedBaselineIndex = Readonly<Record<string, readonly string[]>>;

/** The parts of a snapshot metric this reads; structural, so the JSON import fits. */
export interface SnapshotMetric {
  id: string;
  name: string;
  description: string;
  kind: string;
  valueType: string;
  unit: string;
  currency?: string | null;
  value?: number | null;
  precision: string;
  displayFormat: string;
  formula?: unknown;
  evidenceStatus?: string | null;
  dataOrigin: string;
  sourcePlatform?: string | null;
  sourceType: string;
  legacyMethodNote?: string | null;
  reportingPeriod: { basis: string; start?: string | null; end?: string | null; description: string };
}

/** JSON with object keys sorted and undefined as null, so equal values always compare equal. */
function canonical(value: unknown): string {
  return JSON.stringify(value ?? null, (_key, item: unknown) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item as Record<string, unknown>)
            .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
            .map(([key, inner]) => [key, inner === undefined ? null : inner]),
        )
      : item,
  );
}

/** cyrb53: a small, stable 53-bit string hash. Not cryptographic; it only has to detect change. */
function hash(text: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** Numbers from the database may arrive as strings (numeric); compare them as numbers. */
const normalised = (field: PublishedField, value: unknown): unknown =>
  field === 'value' && value !== null && value !== undefined ? Number(value) : (value ?? null);

export const fingerprint = (field: PublishedField, value: unknown): string => hash(canonical(normalised(field, value)));

function publishedValues(metric: SnapshotMetric): Record<PublishedField, unknown> {
  return {
    name: metric.name,
    description: metric.description,
    kind: metric.kind,
    value_type: metric.valueType,
    unit: metric.unit,
    currency: metric.currency,
    value: metric.value,
    precision: metric.precision,
    display_format: metric.displayFormat,
    formula: metric.formula,
    evidence_status: metric.evidenceStatus,
    data_origin: metric.dataOrigin,
    source_platform: metric.sourcePlatform,
    source_type: metric.sourceType,
    legacy_method_note: metric.legacyMethodNote,
    reporting_period_basis: metric.reportingPeriod.basis,
    reporting_period_start: metric.reportingPeriod.start,
    reporting_period_end: metric.reportingPeriod.end,
    reporting_period_note: metric.reportingPeriod.description,
  };
}

export function buildPublishedBaseline(snapshot: { metrics: readonly SnapshotMetric[] }): PublishedBaselineIndex {
  const index: Record<string, string[]> = {};
  for (const metric of snapshot.metrics) {
    const values = publishedValues(metric);
    index[metric.id] = PUBLISHED_FIELDS.map((field) => fingerprint(field, values[field]));
  }
  return index;
}

export type PublishedState =
  /** The metric is not in the published snapshot: it has never been published. */
  | { state: 'not_published' }
  /** The working copy equals what the live site shows. */
  | { state: 'matches' }
  /** The working copy is a draft that differs from the live site in these fields. */
  | { state: 'differs'; fields: PublishedField[] };

export function comparePublished(metric: Pick<MetricRow, 'metric_key' | PublishedField>, index: PublishedBaselineIndex): PublishedState {
  const published = index[metric.metric_key];
  if (!published) return { state: 'not_published' };
  const fields = PUBLISHED_FIELDS.filter((field, position) => fingerprint(field, metric[field]) !== published[position]);
  return fields.length === 0 ? { state: 'matches' } : { state: 'differs', fields };
}
