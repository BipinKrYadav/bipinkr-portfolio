import { loadSnapshot } from '../snapshot/load';
import type { CaseStudySlug, SnapshotDocuments } from '../snapshot/schema';
import { contentSource } from '../snapshot/source';
import { renderContent } from './render';

/**
 * Page content for the build.
 *
 * Reads a document from the content snapshot and renders it. With
 * CONTENT_SOURCE=typescript the Phase 2 TypeScript module is returned instead,
 * unchanged — the emergency fallback.
 */

type DocumentKey = Exclude<keyof SnapshotDocuments, 'caseStudies'>;

export function documentContent<T>(key: DocumentKey, typescriptSource: T): T {
  if (contentSource() === 'typescript') return typescriptSource;
  return renderContent<T>(loadSnapshot().documents[key].content);
}

export function caseStudyContent<T>(slug: CaseStudySlug, typescriptSource: T): T {
  if (contentSource() === 'typescript') return typescriptSource;
  return renderContent<T>(loadSnapshot().documents.caseStudies[slug].content);
}
