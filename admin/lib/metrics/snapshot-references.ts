import { collectMetricReferences } from '../../../lib/content/token-grammar';

/**
 * Which metrics the published snapshot (snapshot/baseline.json) uses, and where.
 *
 * The public site is built from that snapshot, not from the database, and the
 * database does not yet hold the snapshot's documents or linked phrases. Until
 * it does, this is how the admin knows a metric is still in published use.
 *
 * Pure: it takes the snapshot as an argument. The index is built at build
 * time (see lib/snapshot-catalog.ts), so the snapshot itself never ships to
 * the browser — only this small key → references map does.
 */

export interface SnapshotDocumentReference {
  documentType: string;
  slug: string;
}

export interface SnapshotPhraseReference {
  location: string;
  phrase: string;
}

export interface SnapshotReferences {
  documents: SnapshotDocumentReference[];
  linkedPhrases: SnapshotPhraseReference[];
}

/** Keyed by metric_key. A metric with no entry is not used by the snapshot. */
export type SnapshotReferenceIndex = Readonly<Record<string, SnapshotReferences>>;

/** The parts of a snapshot this reads; structural, so the JSON import fits as-is. */
export interface SnapshotReferenceSource {
  documents: Readonly<Record<string, unknown>>;
  linkedPhrases: readonly { location: string; phrase: string; metricIds: readonly string[] }[];
}

interface SnapshotDocument {
  type: string;
  slug: string;
  content: unknown;
}

const isDocument = (value: unknown): value is SnapshotDocument =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as SnapshotDocument).type === 'string' &&
  typeof (value as SnapshotDocument).slug === 'string' &&
  'content' in value;

/** Documents at the top level, or one level down in a collection (caseStudies). */
function documentsOf(documents: Readonly<Record<string, unknown>>): SnapshotDocument[] {
  return Object.values(documents).flatMap((entry) => {
    if (isDocument(entry)) return [entry];
    if (entry && typeof entry === 'object') return Object.values(entry).filter(isDocument);
    return [];
  });
}

export function buildSnapshotReferenceIndex(snapshot: SnapshotReferenceSource): SnapshotReferenceIndex {
  const index: Record<string, SnapshotReferences> = {};
  const entry = (key: string) => (index[key] ??= { documents: [], linkedPhrases: [] });

  for (const document of documentsOf(snapshot.documents)) {
    for (const key of collectMetricReferences(document.content)) {
      entry(key).documents.push({ documentType: document.type, slug: document.slug });
    }
  }
  for (const phrase of snapshot.linkedPhrases) {
    for (const key of new Set(phrase.metricIds)) {
      entry(key).linkedPhrases.push({ location: phrase.location, phrase: phrase.phrase });
    }
  }
  return index;
}

export const snapshotReferencesFor = (index: SnapshotReferenceIndex, metricKey: string): SnapshotReferences =>
  index[metricKey] ?? { documents: [], linkedPhrases: [] };
