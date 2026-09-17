import baseline from '../../snapshot/baseline.json';

/**
 * Read-only catalogue of the documents the public site is currently built
 * from (snapshot/baseline.json). Only identifiers, names and status are
 * exposed — no page copy and no figures.
 *
 * Use from server components only. Static export bakes their output into
 * the admin build, so this must never be used for private data.
 */

export interface SnapshotDocumentSummary {
  type: string;
  slug: string;
  status: string;
  schemaVersion: number;
}

export interface CaseStudyEntry extends SnapshotDocumentSummary {
  /** Approved card name, as shown on the public case-study index. */
  name: string;
  industry: string;
  platform: string;
  order: number;
}

type SnapshotDocumentKey = Exclude<keyof typeof baseline.documents, 'caseStudies'>;

const summarise = (document: SnapshotDocumentSummary): SnapshotDocumentSummary => ({
  type: document.type,
  slug: document.slug,
  status: document.status,
  schemaVersion: document.schemaVersion,
});

export function snapshotDocument(key: SnapshotDocumentKey): SnapshotDocumentSummary {
  return summarise(baseline.documents[key]);
}

export const caseStudyCatalog: readonly CaseStudyEntry[] = Object.values(baseline.documents.caseStudies)
  .map((document) => ({
    ...summarise(document),
    name: document.content.summary.cardTitle,
    industry: document.content.summary.industry,
    platform: document.content.summary.platform,
    order: document.content.summary.order,
  }))
  .sort((a, b) => a.order - b.order);

export const snapshotSource = 'snapshot/baseline.json';
