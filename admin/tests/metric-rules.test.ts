import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import {
  archiveBlockerMessages,
  archiveBlockers,
  diffMetric,
  draftFromMetric,
  hasDatabaseBlockers,
  hasSnapshotBlockers,
  metricUsage,
  reasonRequiredFields,
  requiresChangeReason,
  verificationStateOf,
  versionEntries,
  versionPublication,
} from '../lib/metrics/changes';
import {
  buildSnapshotReferenceIndex,
  snapshotReferencesFor,
  type SnapshotReferenceSource,
} from '../lib/metrics/snapshot-references';
import { GatewayError, toDataError } from '../lib/metrics/errors';
import { describeFormula, parseFormula, validateFormula, type FormulaContextMetric } from '../lib/metrics/formula';
import { EDITABLE_METRIC_FIELDS, LOCKED_METRIC_FIELDS, type MetricRow, type MetricVersionRow } from '../lib/metrics/model';
import { buildPublishedBaseline, comparePublished, PUBLISHED_FIELDS, type SnapshotMetric } from '../lib/metrics/published-baseline';
import { resolveValues } from '../lib/metrics/values';

/** Pure metric-editing rules: no database involved. */

function metric(overrides: Partial<MetricRow> = {}): MetricRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    metric_key: 'fixture.lead.spend',
    name: 'Spend',
    description: 'Fixture.',
    kind: 'raw',
    value_type: 'currency',
    unit: 'inr',
    currency: 'INR',
    value: 100,
    precision: 'exact',
    display_format: 'inr',
    formula: null,
    evidence_status: 'documented',
    data_origin: 'platform',
    source_platform: 'meta_ads',
    source_type: 'platform_export',
    source_reference: null,
    attribution_setting: null,
    reporting_period_basis: 'not_recorded',
    reporting_period_start: null,
    reporting_period_end: null,
    reporting_period_note: 'Not recorded.',
    public_note: null,
    internal_note: null,
    legacy_method_note: null,
    verified_by: null,
    verified_at: null,
    verified_value: null,
    verified_status: null,
    verification_source: null,
    change_reason: null,
    created_at: '2026-09-01T10:00:00.000000+00:00',
    created_by: null,
    updated_at: '2026-09-01T10:00:00.000000+00:00',
    updated_by: null,
    archived_at: null,
    archived_by: null,
    ...overrides,
  };
}

const context = (items: FormulaContextMetric[]) => new Map(items.map((item) => [item.metric_key, item]));

describe('edit form fields', () => {
  test('the metric key, evidence status and verification fields are never editable', () => {
    for (const field of ['metric_key', 'evidence_status', 'verified_by', 'verified_at', 'verified_value', 'verified_status', 'verification_source', 'archived_at', 'id']) {
      assert.ok(!(EDITABLE_METRIC_FIELDS as readonly string[]).includes(field), `${field} must not be editable`);
    }
  });

  test('a diff contains only changed editable fields, even if the draft carries others', () => {
    const original = metric();
    const draft = { ...draftFromMetric(original), value: 120, metric_key: 'fixture.lead.renamed', evidence_status: 'verified' };
    assert.deepEqual(diffMetric(original, draft), { value: 120 });
  });

  test('every change needs a change summary; only the figure fields make a source check stale', () => {
    assert.equal(requiresChangeReason({ value: 1 }), true);
    assert.equal(requiresChangeReason({ formula: { fn: 'sum', terms: ['a.b'] } }), true);
    assert.equal(requiresChangeReason({ precision: 'lower_bound' }), true);
    assert.equal(requiresChangeReason({ description: 'New wording' }), true);
    assert.equal(requiresChangeReason({}), false);
    assert.deepEqual(reasonRequiredFields({ value: 1, description: 'x' }), ['value']);
  });

  test('the structural fields are locked: never editable, never in a diff', () => {
    for (const field of LOCKED_METRIC_FIELDS) {
      assert.ok(!(EDITABLE_METRIC_FIELDS as readonly string[]).includes(field), `${field} must not be editable`);
    }
    const original = metric();
    const draft = { ...draftFromMetric(original), kind: 'legacy_fixed', unit: 'click', currency: null, display_format: 'percent' };
    assert.deepEqual(diffMetric(original, draft), {});
  });
});

describe('draft vs published', () => {
  const snapshotMetric = (overrides: Partial<SnapshotMetric> = {}): SnapshotMetric => ({
    id: 'fixture.lead.spend',
    name: 'Spend quoted by a private label',
    description: 'Total spend.',
    kind: 'raw',
    valueType: 'currency',
    unit: 'inr',
    currency: 'INR',
    value: 100,
    precision: 'exact',
    displayFormat: 'inr',
    formula: null,
    evidenceStatus: 'documented',
    dataOrigin: 'platform',
    sourcePlatform: 'meta_ads',
    sourceType: 'platform_export',
    legacyMethodNote: null,
    reportingPeriod: { basis: 'not_recorded', start: null, end: null, description: 'Not recorded.' },
    ...overrides,
  });
  const row = (overrides: Partial<MetricRow> = {}) =>
    metric({ name: 'Spend quoted by a private label', description: 'Total spend.', value: 100, reporting_period_note: 'Not recorded.', ...overrides });

  test('the index holds fingerprints only: no name, description or figure is carried into the build', () => {
    const index = buildPublishedBaseline({ metrics: [snapshotMetric()] });
    const serialised = JSON.stringify(index);
    assert.equal(index['fixture.lead.spend'].length, PUBLISHED_FIELDS.length);
    for (const text of ['private label', 'Total spend', 'Not recorded']) assert.ok(!serialised.includes(text), text);
  });

  test('an unchanged metric matches; a changed one differs in exactly those fields; an unknown one is not published', () => {
    const index = buildPublishedBaseline({ metrics: [snapshotMetric()] });
    assert.deepEqual(comparePublished(row(), index), { state: 'matches' });
    assert.deepEqual(comparePublished(row({ value: 120, description: 'New.' }), index), { state: 'differs', fields: ['description', 'value'] });
    assert.deepEqual(comparePublished(row({ metric_key: 'fixture.lead.new' }), index), { state: 'not_published' });
  });

  test('numeric strings and reordered formula keys compare equal; private fields are not compared', () => {
    const formula = { fn: 'ratio', numerator: 'a.b.c', denominator: 'a.b.d' };
    const index = buildPublishedBaseline({ metrics: [snapshotMetric({ formula })] });
    const reordered = { denominator: 'a.b.d', numerator: 'a.b.c', fn: 'ratio' };
    assert.deepEqual(comparePublished(row({ value: '100' as unknown as number, formula: reordered, internal_note: 'private', source_reference: 'x' }), index), {
      state: 'matches',
    });
  });

  test('versions: a release link means published, the first version of a snapshot metric is the baseline, the rest are drafts', () => {
    assert.deepEqual(versionPublication({ changeKind: 'update', releaseId: 4 }, true), { state: 'published', releaseId: 4 });
    assert.deepEqual(versionPublication({ changeKind: 'insert', releaseId: null }, true), { state: 'baseline' });
    assert.deepEqual(versionPublication({ changeKind: 'insert', releaseId: null }, false), { state: 'draft' });
    assert.deepEqual(versionPublication({ changeKind: 'update', releaseId: null }, true), { state: 'draft' });
  });

  test('usage splits case studies from other documents and keeps where each use is recorded', () => {
    const usage = metricUsage({
      formulas: ['a.b.cpl'],
      documentReferences: [
        { documentType: 'case_study', slug: 'one', fieldPath: 'summary' },
        { documentType: 'homepage', slug: 'home', fieldPath: 'hero' },
      ],
      linkedPhrases: [{ location: 'home', phrase: 'a few' }],
      snapshotDocuments: [{ documentType: 'case_study', slug: 'two' }],
      snapshotLinkedPhrases: [],
    });
    assert.deepEqual(
      usage.caseStudies.map((ref) => [ref.slug, ref.fieldPath, ref.source]),
      [
        ['one', 'summary', 'database'],
        ['two', null, 'published_snapshot'],
      ],
    );
    assert.deepEqual(usage.otherDocuments.map((ref) => ref.slug), ['home']);
    assert.deepEqual(usage.linkedPhrases, [{ location: 'home', phrase: 'a few', source: 'database' }]);
    assert.deepEqual(usage.formulas, ['a.b.cpl']);
  });
});

describe('formula validation', () => {
  const metrics = context([
    { metric_key: 'f.a.spend', formula: null, archived_at: null },
    { metric_key: 'f.a.leads', formula: null, archived_at: null },
    { metric_key: 'f.a.old', formula: null, archived_at: '2026-09-01T00:00:00Z' },
    { metric_key: 'f.a.cpl', formula: { fn: 'ratio', numerator: 'f.a.spend', denominator: 'f.a.leads' }, archived_at: null },
    { metric_key: 'f.a.total', formula: { fn: 'sum', terms: ['f.a.cpl'] }, archived_at: null },
  ]);
  const codes = (value: unknown, self: string) => validateFormula(value, self, metrics).map((issue) => issue.code);

  test('a supported formula with active inputs passes', () => {
    assert.deepEqual(codes({ fn: 'percent', part: 'f.a.leads', whole: 'f.a.spend' }, 'f.a.share'), []);
  });
  test('an unsupported function fails', () => {
    assert.deepEqual(codes({ fn: 'eval', expr: '1+1' }, 'f.a.x'), ['unsupported']);
    assert.deepEqual(codes('spend / leads', 'f.a.x'), ['unsupported']);
  });
  test('a missing input fails', () => {
    assert.deepEqual(codes({ fn: 'ratio', numerator: 'f.a.spend', denominator: '' }, 'f.a.x'), ['missing_input']);
    assert.deepEqual(codes({ fn: 'sum', terms: [] }, 'f.a.x'), ['missing_input']);
  });
  test('extra fields fail', () => {
    assert.deepEqual(codes({ fn: 'sum', terms: ['f.a.spend'], weight: 2 }, 'f.a.x'), ['malformed']);
  });
  test('an input that does not exist fails', () => {
    assert.deepEqual(codes({ fn: 'sum', terms: ['f.a.nope'] }, 'f.a.x'), ['unknown_input']);
  });
  test('an archived (inactive) input fails', () => {
    assert.deepEqual(codes({ fn: 'sum', terms: ['f.a.old'] }, 'f.a.x'), ['archived_input']);
  });
  test('a self-reference fails', () => {
    assert.deepEqual(codes({ fn: 'sum', terms: ['f.a.x'] }, 'f.a.x'), ['self_reference']);
  });
  test('a circular dependency fails', () => {
    assert.deepEqual(codes({ fn: 'ratio', numerator: 'f.a.total', denominator: 'f.a.leads' }, 'f.a.cpl'), ['cycle']);
  });
  test('parse and describe only accept the fixed shapes', () => {
    assert.equal(parseFormula({ fn: 'ratio', numerator: 'f.a.spend' }), null);
    assert.equal(describeFormula({ fn: 'ratio', numerator: 'f.a.spend', denominator: 'f.a.leads' }), 'ratio(numerator: f.a.spend, denominator: f.a.leads)');
  });
});

describe('verification state', () => {
  test('the admin never computes verification itself; a metric without a database state shows as not verified', () => {
    assert.equal(verificationStateOf(undefined), 'not_verified');
    assert.equal(verificationStateOf(null), 'not_verified');
    assert.equal(
      verificationStateOf({
        metric_id: 'm',
        metric_key: 'f.a.cpl',
        verification_state: 'changed_since_verification',
        figure_changed_at: null,
        basis_changed_at: null,
        stale_inputs: ['f.a.spend'],
      }),
      'changed_since_verification',
    );
  });
});

function versionRow(
  id: number,
  changedAt: string,
  kind: MetricVersionRow['change_kind'],
  before: Partial<MetricRow> | null,
  after: Partial<MetricRow>,
  reason: string | null = null,
): MetricVersionRow {
  return { id, metric_id: 'm', change_kind: kind, reason, old_row: before, new_row: after, release_id: null, changed_at: changedAt, changed_by: null };
}

describe('version history entries', () => {
  test('entries are numbered oldest first, returned newest first, with before/after values and reason', () => {
    const entries = versionEntries([
      versionRow(7, '2026-09-01T00:00:00Z', 'insert', null, { value: 100, kind: 'raw', precision: 'exact' }),
      versionRow(9, '2026-09-02T00:00:00Z', 'update', { value: 100, precision: 'exact', description: 'a' }, { value: 120, precision: 'lower_bound', description: 'b' }, 'Re-checked'),
    ]);
    assert.deepEqual(entries.map((entry) => entry.number), [2, 1]);
    assert.deepEqual(entries[0].changes, [
      { field: 'value', before: 100, after: 120 },
      { field: 'precision', before: 'exact', after: 'lower_bound' },
    ]);
    assert.deepEqual(entries[0].otherFields, ['description']);
    assert.equal(entries[0].reason, 'Re-checked');
  });
});

describe('archive blockers', () => {
  test('formulas, page content and linked phrases each block archiving, with a reason', () => {
    const blockers = archiveBlockers(
      { metric_key: 'f.a.spend' },
      [
        { metric_key: 'f.a.cpl', formula: { fn: 'ratio', numerator: 'f.a.spend', denominator: 'f.a.leads' }, archived_at: null },
        { metric_key: 'f.a.old_cpl', formula: { fn: 'ratio', numerator: 'f.a.spend', denominator: 'f.a.leads' }, archived_at: '2026-01-01T00:00:00Z' },
      ],
      [{ document_id: 'd', field_path: 'heroMetrics.0', documents: { doc_type: 'case_study', slug: 'meta-lead-generation' } }],
      [{ id: 'p', location: 'home › hero', phrase: 'roughly a third', reviewed_at: null }],
    );
    assert.deepEqual(archiveBlockerMessages(blockers), [
      'Used in the formula of f.a.cpl.',
      'Referenced by case_study "meta-lead-generation" at heroMetrics.0.',
      'Restated by the linked phrase "roughly a third" (home › hero).',
    ]);
    // Without a snapshot argument nothing is added: existing behaviour is unchanged.
    assert.deepEqual(blockers.snapshotDocuments, []);
    assert.deepEqual(blockers.snapshotLinkedPhrases, []);
    assert.equal(hasSnapshotBlockers(blockers), false);
    assert.equal(hasDatabaseBlockers(blockers), true);
  });

  test('a metric used by the published snapshot is blocked, and the message says where', () => {
    const blockers = archiveBlockers({ metric_key: 'f.a.leads' }, [], [], [], {
      documents: [{ documentType: 'case_study', slug: 'meta-lead-generation' }],
      linkedPhrases: [{ location: 'home › hero', phrase: 'From ₹106.66 to ₹32.29 CPL' }],
    });
    assert.deepEqual(archiveBlockerMessages(blockers), [
      'Used by case_study "meta-lead-generation" in the published snapshot.',
      'Restated in the published snapshot by the linked phrase "From ₹106.66 to ₹32.29 CPL" (home › hero).',
    ]);
    assert.equal(hasSnapshotBlockers(blockers), true);
    assert.equal(hasDatabaseBlockers(blockers), false);
  });

  test('a metric the snapshot does not use gets no snapshot blocker', () => {
    const index = buildSnapshotReferenceIndex(SNAPSHOT_FIXTURE);
    const blockers = archiveBlockers({ metric_key: 'f.a.unused' }, [], [], [], snapshotReferencesFor(index, 'f.a.unused'));
    assert.deepEqual(archiveBlockerMessages(blockers), []);
    assert.equal(hasSnapshotBlockers(blockers), false);
  });

  test('the formula blocker still applies alongside snapshot blockers', () => {
    const blockers = archiveBlockers(
      { metric_key: 'f.a.spend' },
      [{ metric_key: 'f.a.cpl', formula: { fn: 'ratio', numerator: 'f.a.spend', denominator: 'f.a.leads' }, archived_at: null }],
      [],
      [],
      { documents: [{ documentType: 'homepage', slug: 'home' }], linkedPhrases: [] },
    );
    assert.deepEqual(archiveBlockerMessages(blockers), [
      'Used in the formula of f.a.cpl.',
      'Used by homepage "home" in the published snapshot.',
    ]);
    assert.equal(hasDatabaseBlockers(blockers), true);
    assert.equal(hasSnapshotBlockers(blockers), true);
  });

  test('a use recorded in the database is not reported a second time from the snapshot', () => {
    const blockers = archiveBlockers(
      { metric_key: 'f.a.leads' },
      [],
      [{ document_id: 'd', field_path: 'heroMetrics.0', documents: { doc_type: 'case_study', slug: 'meta-lead-generation' } }],
      [{ id: 'p', location: 'home › hero', phrase: 'roughly a third', reviewed_at: null }],
      {
        documents: [
          { documentType: 'case_study', slug: 'meta-lead-generation' },
          { documentType: 'homepage', slug: 'home' },
        ],
        linkedPhrases: [
          { location: 'home › hero', phrase: 'roughly a third' },
          { location: 'about › intro', phrase: 'over 60 accounts' },
        ],
      },
    );
    assert.deepEqual(blockers.snapshotDocuments, [{ documentType: 'homepage', slug: 'home' }]);
    assert.deepEqual(blockers.snapshotLinkedPhrases, [{ location: 'about › intro', phrase: 'over 60 accounts' }]);
  });
});

const SNAPSHOT_FIXTURE: SnapshotReferenceSource = {
  documents: {
    homepage: {
      type: 'homepage',
      slug: 'home',
      content: {
        hero: 'Managed {{metric:f.a.spend|inr_compact}} and {{metric:f.a.spend}} again',
        grade: '{{evidence:f.a.grade}}',
        chart: [{ value: { $metricValue: 'f.a.chart' } }],
      },
    },
    caseStudies: {
      'meta-lead-generation': {
        type: 'case_study',
        slug: 'meta-lead-generation',
        content: { comparison: { $pair: { first: 'f.a.before', second: 'f.a.after' }, label: 'CPL' } },
      },
    },
  },
  linkedPhrases: [{ location: 'home › title', phrase: 'Roughly a third', metricIds: ['f.a.spend', 'f.a.spend', 'f.a.before'] }],
};

describe('published snapshot references', () => {
  test('every reference form the site resolves is recognised, once per document', () => {
    const index = buildSnapshotReferenceIndex(SNAPSHOT_FIXTURE);
    assert.deepEqual(Object.keys(index).sort(), ['f.a.after', 'f.a.before', 'f.a.chart', 'f.a.grade', 'f.a.spend']);
    assert.deepEqual(index['f.a.spend'], {
      documents: [{ documentType: 'homepage', slug: 'home' }],
      linkedPhrases: [{ location: 'home › title', phrase: 'Roughly a third' }],
    });
    assert.deepEqual(index['f.a.after'].documents, [{ documentType: 'case_study', slug: 'meta-lead-generation' }]);
    assert.deepEqual(snapshotReferencesFor(index, 'f.a.unused'), { documents: [], linkedPhrases: [] });
  });

  test('the real published snapshot is indexed: a headline figure is used by its case study and a linked phrase', () => {
    const snapshot = JSON.parse(readFileSync(join(process.cwd(), 'snapshot/baseline.json'), 'utf8')) as SnapshotReferenceSource & {
      metrics: { id: string }[];
    };
    const index = buildSnapshotReferenceIndex(snapshot);
    const cpl = snapshotReferencesFor(index, 're.cohort_2025.cpl');
    assert.ok(cpl.documents.some((ref) => ref.documentType === 'case_study' && ref.slug === 'meta-lead-generation'));
    assert.ok(cpl.linkedPhrases.some((phrase) => phrase.phrase === 'From ₹106.66 to ₹32.29 CPL'));
    // Every indexed key is a metric the snapshot defines.
    const defined = new Set(snapshot.metrics.map((entry) => entry.id));
    assert.deepEqual(Object.keys(index).filter((key) => !defined.has(key)), []);
  });
});

describe('error mapping', () => {
  test('database errors map to actionable kinds', () => {
    assert.equal(toDataError(new GatewayError('42501', 'permission denied for table metrics')).kind, 'permission_denied');
    assert.equal(toDataError(new GatewayError('P0001', 'Changing the value of x requires change_reason')).message, 'Changing the value of x requires change_reason');
    assert.equal(
      toDataError(new GatewayError('23514', 'new row for relation "metrics" violates check constraint "metrics_calculated_shape"')).message,
      'A calculated metric needs a formula, no stored value, data origin "derived" and source type "calculation".',
    );
    assert.equal(toDataError(new GatewayError('network', 'fetch failed')).kind, 'unavailable');
    assert.equal(toDataError(new GatewayError('PGRST301', 'JWT expired', 401)).kind, 'unauthenticated');
    assert.equal(toDataError(new Error('boom')).kind, 'unknown');
  });
});

describe('current values', () => {
  test('calculated values use the site formula engine; missing inputs and cycles give null', () => {
    const values = resolveValues([
      { metric_key: 'f.a.spend', kind: 'raw', value: 300, formula: null },
      { metric_key: 'f.a.leads', kind: 'raw', value: 4, formula: null },
      { metric_key: 'f.a.cpl', kind: 'calculated', value: null, formula: { fn: 'ratio', numerator: 'f.a.spend', denominator: 'f.a.leads' } },
      { metric_key: 'f.a.missing', kind: 'calculated', value: null, formula: { fn: 'sum', terms: ['f.a.nope'] } },
      { metric_key: 'f.a.loop', kind: 'calculated', value: null, formula: { fn: 'sum', terms: ['f.a.loop'] } },
    ]);
    assert.equal(values.get('f.a.cpl'), 75);
    assert.equal(values.get('f.a.missing'), null);
    assert.equal(values.get('f.a.loop'), null);
  });
});
