/**
 * Where the build reads metrics and page content from.
 *
 * - `snapshot` (default)  snapshot/baseline.json, validated on load
 * - `typescript`          the Phase 2 TypeScript source in content/ — the
 *                         emergency fallback: `CONTENT_SOURCE=typescript npm run build`
 *
 * Both are read only while the site is built. The exported site never reads
 * either at runtime and makes no database request.
 */
export type ContentSource = 'snapshot' | 'typescript';

export function contentSource(): ContentSource {
  const value = process.env.CONTENT_SOURCE?.trim();
  if (!value || value === 'snapshot') return 'snapshot';
  if (value === 'typescript') return 'typescript';
  throw new Error(`CONTENT_SOURCE must be "snapshot" or "typescript", received "${value}".`);
}
