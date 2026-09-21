import { dependentMetrics, type FormulaContextMetric } from './formula';
import {
  EDITABLE_METRIC_FIELDS,
  REASON_REQUIRED_FIELDS,
  type DocumentReferenceRow,
  type EditableMetricField,
  type EvidenceLinkRow,
  type LinkedPhraseRow,
  type MetricRow,
  type MetricVerificationRow,
  type MetricVersionRow,
  type VerificationState,
} from './model';
import type { SnapshotDocumentReference, SnapshotPhraseReference, SnapshotReferences } from './snapshot-references';

// ---------------------------------------------------------------------------
// Drafts and patches
// ---------------------------------------------------------------------------

export type MetricDraft = Pick<MetricRow, EditableMetricField>;
export type MetricPatch = Partial<MetricDraft>;

export function draftFromMetric(metric: MetricRow): MetricDraft {
  const draft = {} as Record<EditableMetricField, unknown>;
  for (const field of EDITABLE_METRIC_FIELDS) draft[field] = metric[field];
  return draft as MetricDraft;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Only the editable fields that differ. Never contains metric_key, evidence_status or verification fields. */
export function diffMetric(original: MetricRow, draft: MetricDraft): MetricPatch {
  const patch: Record<string, unknown> = {};
  for (const field of EDITABLE_METRIC_FIELDS) {
    if (!same(original[field], draft[field])) patch[field] = draft[field];
  }
  return patch as MetricPatch;
}

export function reasonRequiredFields(patch: MetricPatch): EditableMetricField[] {
  return REASON_REQUIRED_FIELDS.filter((field) => field in patch);
}

export const requiresChangeReason = (patch: MetricPatch): boolean => reasonRequiredFields(patch).length > 0;

// ---------------------------------------------------------------------------
// Version history
// ---------------------------------------------------------------------------

export const TRACKED_VERSION_FIELDS = ['value', 'formula', 'kind', 'precision', 'evidence_status', 'archived_at'] as const;
type TrackedField = (typeof TRACKED_VERSION_FIELDS)[number];

const IGNORED_FIELDS = new Set(['updated_at', 'updated_by', 'change_reason', 'created_at', 'created_by']);

export interface VersionChange {
  field: TrackedField;
  before: unknown;
  after: unknown;
}

export interface VersionEntry {
  id: number;
  /** 1 for the first record of the metric, counting up. */
  number: number;
  changeKind: MetricVersionRow['change_kind'];
  reason: string | null;
  changedAt: string;
  changedBy: string | null;
  changes: VersionChange[];
  /** Other fields that changed (descriptions, sources, notes). */
  otherFields: string[];
  verifiedValue: number | null;
}

/** Numbered entries, newest first. */
export function versionEntries(rows: readonly MetricVersionRow[]): VersionEntry[] {
  return [...rows]
    .sort((a, b) => a.id - b.id)
    .map((row, index) => {
      const before = (row.old_row ?? {}) as Record<string, unknown>;
      const after = row.new_row as Record<string, unknown>;
      const changes: VersionChange[] = [];
      const otherFields: string[] = [];

      for (const field of TRACKED_VERSION_FIELDS) {
        if (row.old_row === null ? after[field] !== null && after[field] !== undefined : !same(before[field], after[field])) {
          changes.push({ field, before: row.old_row === null ? null : before[field], after: after[field] });
        }
      }
      if (row.old_row !== null) {
        for (const field of Object.keys(after)) {
          if ((TRACKED_VERSION_FIELDS as readonly string[]).includes(field) || IGNORED_FIELDS.has(field)) continue;
          if (field.startsWith('verified_') || field === 'verification_source' || field === 'archived_by') continue;
          if (!same(before[field], after[field])) otherFields.push(field);
        }
      }

      return {
        id: row.id,
        number: index + 1,
        changeKind: row.change_kind,
        reason: row.reason,
        changedAt: row.changed_at,
        changedBy: row.changed_by,
        changes,
        otherFields,
        verifiedValue: (after.verified_value as number | null | undefined) ?? null,
      };
    })
    .reverse();
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

// The state itself is computed by the database (public.metric_verification);
// the admin only labels it.

export type { VerificationState };

export const verificationStateLabels: Record<VerificationState, { label: string; description: string }> = {
  verified_current: {
    label: 'Verified at current value',
    description: 'An admin confirmed this figure against its source, and neither it nor anything it is calculated from has changed since.',
  },
  changed_since_verification: {
    label: 'Changed since verification',
    description:
      'The figure, its evidence status, or a metric it is calculated from changed after the last source check. That check no longer covers the current figure.',
  },
  not_verified: {
    label: 'Not verified',
    description: 'No source check has been recorded.',
  },
};

/** The database state for a metric; a metric without a row is treated as not verified. */
export const verificationStateOf = (row: MetricVerificationRow | null | undefined): VerificationState =>
  row?.verification_state ?? 'not_verified';

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export type EvidenceRelationship = 'before_verification' | 'after_verification' | 'no_verification';

export function evidenceRelationship(link: Pick<EvidenceLinkRow, 'created_at'>, metric: Pick<MetricRow, 'verified_at'>): EvidenceRelationship {
  if (!metric.verified_at) return 'no_verification';
  return Date.parse(link.created_at) <= Date.parse(metric.verified_at) ? 'before_verification' : 'after_verification';
}

// ---------------------------------------------------------------------------
// Archiving
// ---------------------------------------------------------------------------

export interface ArchiveBlockers {
  formulas: string[];
  documentReferences: { documentType: string; slug: string; fieldPath: string }[];
  linkedPhrases: { location: string; phrase: string }[];
  /** Uses in the published snapshot the database does not record yet. Checked by the admin only. */
  snapshotDocuments: SnapshotDocumentReference[];
  snapshotLinkedPhrases: SnapshotPhraseReference[];
}

export function archiveBlockers(
  metric: Pick<MetricRow, 'metric_key'>,
  metrics: Iterable<FormulaContextMetric>,
  documentReferences: readonly DocumentReferenceRow[],
  linkedPhrases: readonly LinkedPhraseRow[],
  snapshot: SnapshotReferences = { documents: [], linkedPhrases: [] },
): ArchiveBlockers {
  const documents = documentReferences.map((ref) => ({
    documentType: ref.documents?.doc_type ?? 'document',
    slug: ref.documents?.slug ?? ref.document_id,
    fieldPath: ref.field_path,
  }));
  const phrases = linkedPhrases.map((phrase) => ({ location: phrase.location, phrase: phrase.phrase }));

  // Once the database holds the snapshot's references, the same use shows up
  // in both lists; report it once, from the database.
  const documentKey = (ref: SnapshotDocumentReference) => JSON.stringify([ref.documentType, ref.slug]);
  const phraseKey = (phrase: SnapshotPhraseReference) => JSON.stringify([phrase.location, phrase.phrase]);
  const recordedDocument = new Set(documents.map(documentKey));
  const recordedPhrase = new Set(phrases.map(phraseKey));

  return {
    formulas: dependentMetrics(metric.metric_key, metrics),
    documentReferences: documents,
    linkedPhrases: phrases,
    snapshotDocuments: snapshot.documents.filter((ref) => !recordedDocument.has(documentKey(ref))),
    snapshotLinkedPhrases: snapshot.linkedPhrases.filter((phrase) => !recordedPhrase.has(phraseKey(phrase))),
  };
}

export const hasSnapshotBlockers = (blockers: ArchiveBlockers): boolean =>
  blockers.snapshotDocuments.length > 0 || blockers.snapshotLinkedPhrases.length > 0;

export const hasDatabaseBlockers = (blockers: ArchiveBlockers): boolean =>
  blockers.formulas.length > 0 || blockers.documentReferences.length > 0 || blockers.linkedPhrases.length > 0;

export function archiveBlockerMessages(blockers: ArchiveBlockers): string[] {
  return [
    ...blockers.formulas.map((key) => `Used in the formula of ${key}.`),
    ...blockers.documentReferences.map((ref) => `Referenced by ${ref.documentType} "${ref.slug}" at ${ref.fieldPath}.`),
    ...blockers.linkedPhrases.map((phrase) => `Restated by the linked phrase "${phrase.phrase}" (${phrase.location}).`),
    ...blockers.snapshotDocuments.map((ref) => `Used by ${ref.documentType} "${ref.slug}" in the published snapshot.`),
    ...blockers.snapshotLinkedPhrases.map(
      (phrase) => `Restated in the published snapshot by the linked phrase "${phrase.phrase}" (${phrase.location}).`,
    ),
  ];
}
