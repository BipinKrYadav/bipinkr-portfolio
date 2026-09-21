/**
 * Reference data for the admin database: the published snapshot's documents,
 * the metrics each document field references, and the linked phrases.
 *
 * Pure: derives rows from a snapshot and renders the import SQL. It reads no
 * files, opens no connection and applies nothing. scripts/db/import-references.mjs
 * runs it, verifies the SQL offline and saves it; admin/tests/reference-import.test.ts
 * proves it against the real schema.
 *
 * References are found with the site's own token grammar (lib/content/token-grammar.ts):
 * `collectMetricReferences` decides WHICH metrics a value references, exactly as
 * the build does; this module only adds WHERE (the field path) and the display
 * format written in the token.
 */
import { collectMetricReferences, METRIC_TOKEN } from '../../lib/content/token-grammar';

/** Snapshot parts this reads; structural, so the parsed JSON fits as-is. */
export interface ReferenceSnapshot {
  metrics: readonly { id: string }[];
  documents: Readonly<Record<string, unknown>>;
  linkedPhrases: readonly { location: string; phrase: string; metricIds: readonly string[]; reason: string }[];
}

export interface DocumentRow {
  docType: string;
  slug: string;
  schemaVersion: number;
  /** Exact snapshot content, token form. Stored as both the draft and the baseline revision. */
  content: Record<string, unknown>;
  sortOrder: number;
}

export interface ReferenceRow {
  docType: string;
  slug: string;
  /** Dot path from the document content to the field, array indices included (e.g. proofMetrics.0.value). */
  fieldPath: string;
  metricKey: string;
  /** Format named in the token; null for $pair, $metricValue, {{evidence:…}} and tokens without one. */
  format: string | null;
}

export interface PhraseRow {
  location: string;
  phrase: string;
  metricKeys: string[];
  reason: string;
}

/** One reference field that names the same metric in more than one format. */
export interface FormatConflict {
  docType: string;
  slug: string;
  fieldPath: string;
  metricKey: string;
  formats: (string | null)[];
}

export interface ReferenceData {
  documents: DocumentRow[];
  references: ReferenceRow[];
  phrases: PhraseRow[];
  /** Resolved by storing format = null (Phase 4.3 decision). */
  formatConflicts: FormatConflict[];
  /** Every metric key any document or phrase references, sorted. */
  referencedKeys: string[];
}

interface SnapshotDocument {
  type: string;
  slug: string;
  schemaVersion: number;
  content: Record<string, unknown>;
}

const isDocument = (value: unknown): value is SnapshotDocument =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as SnapshotDocument).type === 'string' &&
  typeof (value as SnapshotDocument).slug === 'string' &&
  'content' in value;

/** Top-level documents, then collections (caseStudies), in snapshot order. */
export function snapshotDocuments(documents: ReferenceSnapshot['documents']): SnapshotDocument[] {
  return Object.values(documents).flatMap((entry) => {
    if (isDocument(entry)) return [entry];
    if (entry && typeof entry === 'object') return Object.values(entry).filter(isDocument);
    return [];
  });
}

/** Case studies keep their public order; other documents are single pages. */
function sortOrderOf(document: SnapshotDocument): number {
  const order = (document.content.summary as { order?: unknown } | undefined)?.order;
  return typeof order === 'number' && Number.isInteger(order) ? order : 0;
}

/** Formats written in the metric tokens of one string, by metric. */
function tokenFormats(text: string): Map<string, Set<string | null>> {
  const formats = new Map<string, Set<string | null>>();
  for (const match of text.matchAll(METRIC_TOKEN)) {
    const set = formats.get(match[1]) ?? new Set<string | null>();
    set.add(match[2] || null);
    formats.set(match[1], set);
  }
  return formats;
}

/** Field-level references of one document, in content order. */
function documentReferences(document: SnapshotDocument): { rows: ReferenceRow[]; conflicts: FormatConflict[] } {
  // key: field path + metric → the formats seen there
  const found = new Map<string, { fieldPath: string; metricKey: string; formats: Set<string | null> }>();
  const note = (path: string[], metricKey: string, format: string | null) => {
    const segment = path.find((part) => part.includes('.'));
    if (segment !== undefined) throw new Error(`${document.type}/${document.slug}: key "${segment}" contains "." and would make field paths ambiguous`);
    const fieldPath = path.join('.');
    if (!fieldPath) throw new Error(`${document.type}/${document.slug}: a reference at the document root has no field path`);
    const id = JSON.stringify([fieldPath, metricKey]);
    const entry = found.get(id) ?? { fieldPath, metricKey, formats: new Set<string | null>() };
    entry.formats.add(format);
    found.set(id, entry);
  };

  const walk = (value: unknown, path: string[]) => {
    if (typeof value === 'string') {
      const formats = tokenFormats(value);
      for (const key of collectMetricReferences(value)) {
        for (const format of formats.get(key) ?? [null]) note(path, key, format);
      }
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, [...path, String(index)]));
    } else if (value && typeof value === 'object') {
      const record = value as Record<string, unknown>;
      // A $pair or $metricValue object references its metrics at its own path.
      const own = collectMetricReferences({ $metricValue: record.$metricValue, $pair: record.$pair });
      for (const key of own) note(path, key, null);
      for (const [key, item] of Object.entries(record)) walk(item, [...path, key]);
    }
  };
  walk(document.content, []);

  const rows: ReferenceRow[] = [];
  const conflicts: FormatConflict[] = [];
  for (const { fieldPath, metricKey, formats } of found.values()) {
    const list = [...formats];
    if (list.length > 1) conflicts.push({ docType: document.type, slug: document.slug, fieldPath, metricKey, formats: list });
    rows.push({ docType: document.type, slug: document.slug, fieldPath, metricKey, format: list.length === 1 ? list[0] : null });
  }
  return { rows, conflicts };
}

export function deriveReferenceData(snapshot: ReferenceSnapshot): ReferenceData {
  const documents: DocumentRow[] = [];
  const references: ReferenceRow[] = [];
  const formatConflicts: FormatConflict[] = [];

  for (const document of snapshotDocuments(snapshot.documents)) {
    documents.push({
      docType: document.type,
      slug: document.slug,
      schemaVersion: document.schemaVersion,
      content: document.content,
      sortOrder: sortOrderOf(document),
    });
    const { rows, conflicts } = documentReferences(document);
    references.push(...rows);
    formatConflicts.push(...conflicts);
  }

  const phrases: PhraseRow[] = snapshot.linkedPhrases.map((phrase) => ({
    location: phrase.location,
    phrase: phrase.phrase,
    metricKeys: [...new Set(phrase.metricIds)],
    reason: phrase.reason,
  }));

  const referencedKeys = [...new Set([...references.map((row) => row.metricKey), ...phrases.flatMap((row) => row.metricKeys)])].sort();
  return { documents, references, phrases, formatConflicts, referencedKeys };
}

// ---------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------

const DOLLAR_TAG = '$ref$';

const text = (value: string | null): string => (value === null ? 'null' : `'${value.replace(/'/g, "''")}'`);

/** Document JSON as a dollar-quoted literal, so the content is stored byte for byte as written. */
function jsonb(value: unknown): string {
  const json = JSON.stringify(value);
  if (json.includes(DOLLAR_TAG)) throw new Error(`content contains the SQL quote tag ${DOLLAR_TAG}`);
  return `${DOLLAR_TAG}${json}${DOLLAR_TAG}::jsonb`;
}

const textArray = (values: readonly string[]): string => `array[${values.map((value) => text(value)).join(', ')}]::text[]`;

export interface ReferenceImportSql {
  sql: string;
  data: ReferenceData;
  expected: { metrics: number; documents: number; revisions: number; references: number; phrases: number };
}

export function referenceImportSql(snapshot: ReferenceSnapshot): ReferenceImportSql {
  const data = deriveReferenceData(snapshot);
  const expected = {
    metrics: snapshot.metrics.length,
    documents: data.documents.length,
    revisions: data.documents.length,
    references: data.references.length,
    phrases: data.phrases.length,
  };
  const conflictNote = data.formatConflicts.length
    ? data.formatConflicts
        .map((conflict) => `--   ${conflict.docType}/${conflict.slug} ${conflict.fieldPath} ${conflict.metricKey}: ${conflict.formats.map(String).join(', ')} → null`)
        .join('\n')
    : '--   none';

  const sql = `-- =====================================================================
-- Reference data import — generated by scripts/db/import-references.mjs
-- Source: snapshot/baseline.json
--   ${expected.documents} documents, each with one baseline revision, published
--   ${expected.references} document → metric references (document_metric_refs)
--   ${expected.phrases} linked phrases
--
-- Apply ONCE, by hand, as the database owner, after every migration and after
-- supabase/imports/metrics_baseline.sql. This is not a migration and must not
-- be applied automatically.
--
-- Reads public.metrics only to resolve metric keys. It never inserts, updates
-- or deletes a metric, so no version row, verification state or archive state
-- changes. It refuses to run unless the four reference tables are empty and
-- the ${expected.metrics} baseline metrics are present and active, and it checks
-- every count before committing; any failure rolls the whole import back.
--
-- Linked phrases are imported unreviewed (reviewed_at null): no review is
-- recorded that did not happen.
--
-- A field that names the same metric in more than one format stores format null:
${conflictNote}
-- =====================================================================

begin;

-- 1. Preconditions ------------------------------------------------------

do $$
declare
  v_missing text[];
begin
  if exists (select 1 from public.documents) then
    raise exception 'public.documents is not empty; the reference import runs once, on empty tables';
  end if;
  if exists (select 1 from public.document_revisions) then
    raise exception 'public.document_revisions is not empty; the reference import runs once, on empty tables';
  end if;
  if exists (select 1 from public.document_metric_refs) then
    raise exception 'public.document_metric_refs is not empty; the reference import runs once, on empty tables';
  end if;
  if exists (select 1 from public.linked_phrases) then
    raise exception 'public.linked_phrases is not empty; the reference import runs once, on empty tables';
  end if;
  if (select count(*) from public.metrics) <> ${expected.metrics} then
    raise exception 'expected exactly ${expected.metrics} metrics, found %; import the metric baseline first', (select count(*) from public.metrics);
  end if;
  if exists (select 1 from public.metrics where archived_at is not null) then
    raise exception 'archived metrics found; the snapshot references only active metrics';
  end if;

  select array_agg(k order by k) into v_missing
  from unnest(${textArray(data.referencedKeys)}) as k
  where not exists (select 1 from public.metrics m where m.metric_key = k);
  if v_missing is not null then
    raise exception 'referenced metrics do not exist: %', v_missing;
  end if;

  -- Recorded for the final check that no metric was touched.
  perform set_config('reference_import.metric_versions', (select count(*) from public.metric_versions)::text, true);
  perform set_config('reference_import.metrics_updated', coalesce((select max(updated_at) from public.metrics)::text, ''), true);
end
$$;

-- 2. Documents (draft first: a published document needs its revision) --

insert into public.documents (doc_type, slug, status, schema_version, draft, sort_order)
values
${data.documents
  .map((doc) => `  (${text(doc.docType)}, ${text(doc.slug)}, 'draft', ${doc.schemaVersion}, ${jsonb(doc.content)}, ${doc.sortOrder})`)
  .join(',\n')};

-- 3. One baseline revision per document, identical to its draft --------

insert into public.document_revisions (document_id, content, schema_version, change_summary)
select d.id, d.draft, d.schema_version, 'Baseline import from snapshot/baseline.json'
from public.documents d;

update public.documents d
   set published_revision_id = r.id,
       status = 'published'
  from public.document_revisions r
 where r.document_id = d.id;

-- 4. Document → metric references -------------------------------------

insert into public.document_metric_refs (document_id, field_path, metric_id, format)
select d.id, v.field_path, m.id, v.format::public.metric_display_format
from (
  values
${data.references
  .map((row) => `    (${text(row.docType)}, ${text(row.slug)}, ${text(row.fieldPath)}, ${text(row.metricKey)}, ${text(row.format)})`)
  .join(',\n')}
) as v (doc_type, slug, field_path, metric_key, format)
join public.documents d on d.doc_type = v.doc_type::public.document_type and d.slug = v.slug
join public.metrics m on m.metric_key = v.metric_key;

-- 5. Linked phrases (unreviewed) --------------------------------------

insert into public.linked_phrases (location, phrase, metric_keys, reason)
values
${data.phrases
  .map((row) => `  (${text(row.location)}, ${text(row.phrase)}, ${textArray(row.metricKeys)}, ${text(row.reason)})`)
  .join(',\n')};

-- 6. Postconditions ----------------------------------------------------

do $$
declare
  v_count integer;
begin
  select count(*) into v_count from public.documents;
  if v_count <> ${expected.documents} then raise exception 'expected ${expected.documents} documents, found %', v_count; end if;

  select count(*) into v_count from public.documents where status = 'published' and published_revision_id is not null;
  if v_count <> ${expected.documents} then raise exception 'expected ${expected.documents} published documents, found %', v_count; end if;

  select count(*) into v_count from public.document_revisions;
  if v_count <> ${expected.revisions} then raise exception 'expected ${expected.revisions} document revisions, found %', v_count; end if;

  select count(*) into v_count from public.document_metric_refs;
  if v_count <> ${expected.references} then raise exception 'expected ${expected.references} document metric references, found %', v_count; end if;

  select count(*) into v_count from public.linked_phrases;
  if v_count <> ${expected.phrases} then raise exception 'expected ${expected.phrases} linked phrases, found %', v_count; end if;

  if (select count(*) from public.metric_versions)::text <> current_setting('reference_import.metric_versions')
     or coalesce((select max(updated_at) from public.metrics)::text, '') <> current_setting('reference_import.metrics_updated') then
    raise exception 'public.metrics changed during the reference import';
  end if;
end
$$;

commit;
`;

  return { sql, data, expected };
}
