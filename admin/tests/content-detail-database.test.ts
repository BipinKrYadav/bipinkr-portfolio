import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';

import type { PGlite } from '@electric-sql/pglite';

import { createContentRepository } from '../lib/content/repository';
import { ADMIN_SESSION, ADMIN_WITHOUT_MFA, ANON_SESSION, createDatabase, NON_ADMIN_SESSION, ROOT, type Session } from './support/database';
import { createPgliteContentGateway } from './support/pglite-content-gateway';

/**
 * Read-only document detail against the real schema in PGlite: every
 * migration, then the metric baseline and the reference import exactly as
 * they were applied (the files are read, never changed).
 */

let db: PGlite;

before(async () => {
  db = await createDatabase();
  await db.exec(readFileSync(join(ROOT, 'supabase', 'imports', 'metrics_baseline.sql'), 'utf8'));
  await db.exec(readFileSync(join(ROOT, 'supabase', 'imports', 'references_baseline.sql'), 'utf8'));
});

after(async () => {
  await db.close();
});

const detailAs = (session: Session, docType: string, slug: string) =>
  createContentRepository(createPgliteContentGateway(db, session)).getDocumentDetail(docType, slug);

/** Real client and campaign names hidden in {{label:actual|anonymous}} tokens of the snapshot. */
const snapshotText = readFileSync(join(ROOT, 'snapshot', 'baseline.json'), 'utf8');
const realLabelNames = [...new Set([...snapshotText.matchAll(/\{\{label:([^|{}]+)\|[^|{}]+\}\}/g)].map((match) => match[1]))];

describe('document detail for the admin', () => {
  test('resolves by doc_type + slug with its metadata and published revision', async () => {
    const result = await detailAs(ADMIN_SESSION, 'case_study', 'meta-lead-generation');
    assert.ok(result.ok, result.ok ? '' : result.error.message);
    const { document, publishedRevision, revisions, hasDraft, draftMatchesPublished } = result.data;
    assert.equal(document.doc_type, 'case_study');
    assert.equal(document.slug, 'meta-lead-generation');
    assert.equal(document.status, 'published');
    assert.equal(document.sort_order, 1);
    assert.equal(revisions.length, 1);
    assert.ok(publishedRevision);
    assert.equal(publishedRevision.id, document.published_revision_id);
    assert.equal(publishedRevision.document_id, document.id);
    assert.equal(publishedRevision.revision_number, 1);
    assert.equal(publishedRevision.schema_version, 1);
    assert.equal(publishedRevision.change_summary, 'Baseline import from snapshot/baseline.json');
    assert.equal(publishedRevision.release_id, null);
    assert.equal(publishedRevision.created_by, null);
    assert.equal(hasDraft, true);
    assert.equal(draftMatchesPublished, true, 'the imported draft equals its baseline revision');
  });

  test('metric references resolve to metric key and name, sorted by field path, all active', async () => {
    const result = await detailAs(ADMIN_SESSION, 'case_study', 'meta-lead-generation');
    assert.ok(result.ok);
    const { references } = result.data;
    assert.equal(references.length, 87);
    for (const ref of references) {
      assert.match(ref.metricKey ?? '', /^[a-z0-9_]+(\.[a-z0-9_]+)+$/);
      assert.ok(ref.metricName && ref.metricName.length > 0);
      assert.equal(ref.archivedAt, null);
    }
    const paths = references.map((ref) => ref.fieldPath);
    assert.deepEqual(paths, [...paths].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
  });

  test('the Phase 4.2 metric appears exactly three times on the measurement audit', async () => {
    const result = await detailAs(ADMIN_SESSION, 'case_study', 'measurement-audit');
    assert.ok(result.ok);
    assert.deepEqual(
      result.data.references.filter((ref) => ref.metricKey === 'audit.placeholder_value_campaigns').map((ref) => [ref.fieldPath, ref.format]),
      [
        ['failureModes.1.body.0', 'words_capitalised'],
        ['failureModes.1.metrics.0.evidence', null],
        ['failureModes.1.metrics.0.value', null],
      ],
    );
  });

  test('linked phrases are matched by metric keys and none claims to be attached', async () => {
    for (const slug of ['meta-lead-generation', 'measurement-audit', 'preschool-google-ads', 'cross-channel-real-estate']) {
      const result = await detailAs(ADMIN_SESSION, 'case_study', slug);
      assert.ok(result.ok);
      const expected = await db.query<{ id: string }>(
        `select p.id from public.linked_phrases p
         where p.metric_keys && (select array_agg(m.metric_key) from public.document_metric_refs r
                                 join public.documents d on d.id = r.document_id
                                 join public.metrics m on m.id = r.metric_id
                                 where d.doc_type = 'case_study' and d.slug = $1)`,
        [slug],
      );
      assert.deepEqual(result.data.linkedPhrases.map((phrase) => phrase.id).sort(), expected.rows.map((row) => row.id).sort(), slug);
      for (const phrase of result.data.linkedPhrases) {
        assert.equal(phrase.relation, 'metric_matched');
        assert.equal(phrase.document_id, null);
        assert.ok(phrase.matchedKeys.length > 0);
        assert.equal(phrase.reviewed_at, null);
      }
    }
  });

  test('a document with no references gets no references and no phrases', async () => {
    const result = await detailAs(ADMIN_SESSION, 'homepage', 'home');
    assert.ok(result.ok);
    assert.deepEqual(result.data.references, []);
    assert.deepEqual(result.data.linkedPhrases, []);
  });

  test('draft content is available to the MFA-verified admin editor, not to anonymous or non-admin sessions', async () => {
    const admin = await detailAs(ADMIN_SESSION, 'case_study', 'meta-lead-generation');
    assert.ok(admin.ok);
    assert.ok(admin.data.draft && typeof admin.data.draft === 'object');
    assert.match(JSON.stringify(admin.data.draft), /\{\{(label|metric|evidence):/);

    const nonAdmin = await detailAs(NON_ADMIN_SESSION, 'case_study', 'meta-lead-generation');
    assert.equal(nonAdmin.ok ? null : nonAdmin.error.kind, 'not_found');

    const anonymous = await detailAs(ANON_SESSION, 'case_study', 'meta-lead-generation');
    assert.equal(anonymous.ok ? null : anonymous.error.kind, 'permission_denied');
  });

  test('the only label value a detail shows is inside three metric names from public.metrics', async () => {
    const result = await detailAs(ADMIN_SESSION, 'case_study', 'preschool-google-ads');
    assert.ok(result.ok);
    const carrying = result.data.references.filter((ref) => realLabelNames.some((name) => ref.metricName?.includes(name))).map((ref) => ref.metricKey);
    assert.deepEqual([...new Set(carrying)].sort(), [
      'pre.account_c.search_2.clicks',
      'pre.account_c.search_2.recorded_conversions',
      'pre.account_c.search_2.spend',
    ]);
  });

  test('revision history: the imported baseline revision is the current published one, metadata only', async () => {
    for (const [type, slug] of [['proof_strip', 'proof-strip'], ['case_study', 'cross-channel-real-estate']]) {
      const result = await detailAs(ADMIN_SESSION, type, slug);
      assert.ok(result.ok);
      const { revisions, publishedRevision, publishedRevisionMissing, document } = result.data;
      assert.equal(revisions.length, 1, slug);
      const [baseline] = revisions;
      assert.deepEqual(Object.keys(baseline).sort(), [
        'change_summary', 'created_at', 'created_by', 'document_id', 'id', 'release_id', 'revision_number', 'schema_version',
      ]);
      assert.equal(baseline.revision_number, 1);
      assert.equal(baseline.document_id, document.id);
      assert.equal(baseline.id, document.published_revision_id);
      assert.equal(baseline.change_summary, 'Baseline import from snapshot/baseline.json');
      assert.equal(baseline.release_id, null);
      assert.equal(baseline.created_by, null, 'imported in the SQL editor, with no signed-in user');
      assert.ok(!Number.isNaN(Date.parse(baseline.created_at)));
      assert.deepEqual(publishedRevision, baseline);
      assert.equal(publishedRevisionMissing, false);
    }
  });

  test('an unknown document is not found', async () => {
    const result = await detailAs(ADMIN_SESSION, 'case_study', 'no-such-case-study');
    assert.equal(result.ok ? null : result.error.kind, 'not_found');
  });
});

describe('row level security on document detail', () => {
  test('a signed-in non-admin cannot see the document', async () => {
    const result = await detailAs(NON_ADMIN_SESSION, 'case_study', 'meta-lead-generation');
    assert.equal(result.ok ? null : result.error.kind, 'not_found');
  });

  test('the admin without an MFA-verified session is treated like a non-admin', async () => {
    const result = await detailAs(ADMIN_WITHOUT_MFA, 'case_study', 'meta-lead-generation');
    assert.equal(result.ok ? null : result.error.kind, 'not_found');
  });

  test('an anonymous caller is denied', async () => {
    const result = await detailAs(ANON_SESSION, 'case_study', 'meta-lead-generation');
    assert.equal(result.ok ? null : result.error.kind, 'permission_denied');
  });
});

// These change the in-memory test database only (never a fixture file), so they run last.
describe('Phase 5A draft editing', () => {
  test('admin can save editorial copy and the database creates an immutable revision without publishing', async () => {
    const before = await detailAs(ADMIN_SESSION, 'homepage', 'home');
    assert.ok(before.ok);
    const original = before.data.draft as Record<string, any>;
    const nextDraft = structuredClone(original);
    nextDraft.hero.eyebrow = original.hero.eyebrow + ' · Edited in test';

    const saved = await createContentRepository(createPgliteContentGateway(db, ADMIN_SESSION)).saveDocumentDraft(
      before.data,
      nextDraft,
      'Phase 5A automated draft-save test',
    );
    assert.ok(saved.ok, saved.ok ? '' : saved.error.message);
    assert.equal(saved.data.status, 'published');
    assert.equal(saved.data.published_revision_id, before.data.document.published_revision_id);

    const after = await detailAs(ADMIN_SESSION, 'homepage', 'home');
    assert.ok(after.ok);
    assert.equal(after.data.draftMatchesPublished, false);
    assert.equal((after.data.draft as any).hero.eyebrow, nextDraft.hero.eyebrow);
    assert.equal(after.data.revisions.length, 2);
    assert.equal(after.data.revisions[0].revision_number, 2);
    assert.equal(after.data.revisions[0].change_summary, 'Phase 5A automated draft-save test');
    assert.equal(after.data.publishedRevision?.revision_number, 1);
  });

  test('token changes are rejected and leave the draft unchanged', async () => {
    const before = await detailAs(ADMIN_SESSION, 'case_study', 'meta-lead-generation');
    assert.ok(before.ok);
    const original = before.data.draft as Record<string, any>;
    const nextDraft = structuredClone(original);
    const originalValue = nextDraft.summary.subtitle;
    nextDraft.summary.subtitle = originalValue.replace(/\{\{metric:/, '{{metric:site.accounts');

    const saved = await createContentRepository(createPgliteContentGateway(db, ADMIN_SESSION)).saveDocumentDraft(
      before.data,
      nextDraft,
      'This must be rejected',
    );
    assert.equal(saved.ok ? null : saved.error.kind, 'validation');

    const after = await detailAs(ADMIN_SESSION, 'case_study', 'meta-lead-generation');
    assert.ok(after.ok);
    assert.equal((after.data.draft as any).summary.subtitle, originalValue);
    assert.equal(after.data.revisions.length, 1);
  });

  test('a stale draft save is rejected as a conflict', async () => {
    // Uses a document no other test in this file touches, so its extra revision cannot leak into them.
    const first = await detailAs(ADMIN_SESSION, 'contact', 'contact');
    assert.ok(first.ok);
    const original = first.data.draft as Record<string, any>;
    const nextDraft = structuredClone(original);
    nextDraft.contactContent.h1 = original.contactContent.h1 + ' · first';

    const firstSave = await createContentRepository(createPgliteContentGateway(db, ADMIN_SESSION)).saveDocumentDraft(
      first.data,
      nextDraft,
      'First test save',
    );
    assert.ok(firstSave.ok);

    const staleDraft = structuredClone(original);
    staleDraft.contactContent.h1 = original.contactContent.h1 + ' · stale';
    const staleSave = await createContentRepository(createPgliteContentGateway(db, ADMIN_SESSION)).saveDocumentDraft(
      first.data,
      staleDraft,
      'Stale test save',
    );
    assert.equal(staleSave.ok ? null : staleSave.error.kind, 'validation');
    assert.match(staleSave.ok ? '' : staleSave.error.message, /changed after you opened it/i);

    // The conflict leaves the first save's draft in place and adds no revision.
    const after = await detailAs(ADMIN_SESSION, 'contact', 'contact');
    assert.ok(after.ok);
    assert.equal((after.data.draft as any).contactContent.h1, nextDraft.contactContent.h1);
    assert.deepEqual(after.data.revisions.map((revision) => [revision.revision_number, revision.change_summary]), [
      [2, 'First test save'],
      [1, 'Baseline import from snapshot/baseline.json'],
    ]);
    assert.equal(after.data.publishedRevision?.revision_number, 1, 'saving a draft never publishes');
  });
});

describe('detail after in-memory changes', () => {
  test('a phrase attached to a document is shown as attached, even without a matching metric', async () => {
    const { rows } = await db.query<{ id: string }>("select id from public.documents where doc_type = 'homepage' and slug = 'home'");
    await db.query("update public.linked_phrases set document_id = $1, field_path = 'hero.h1' where phrase = 'From ₹106.66 to ₹32.29 CPL'", [rows[0].id]);
    const result = await detailAs(ADMIN_SESSION, 'homepage', 'home');
    assert.ok(result.ok);
    assert.deepEqual(result.data.linkedPhrases.map((phrase) => [phrase.phrase, phrase.relation, phrase.field_path, phrase.matchedKeys]), [
      ['From ₹106.66 to ₹32.29 CPL', 'attached', 'hero.h1', []],
    ]);
  });

  test('a newer revision is listed first, while the published marker stays on the published one', async () => {
    await db.query(`
      insert into public.document_revisions (document_id, content, schema_version, change_summary)
      select id, draft, schema_version, 'Second revision, created in the test database only'
      from public.documents where doc_type = 'services' and slug = 'services'`);
    const result = await detailAs(ADMIN_SESSION, 'services', 'services');
    assert.ok(result.ok);
    const { revisions, publishedRevision, publishedRevisionMissing, document } = result.data;
    assert.deepEqual(revisions.map((revision) => [revision.revision_number, revision.change_summary]), [
      [2, 'Second revision, created in the test database only'],
      [1, 'Baseline import from snapshot/baseline.json'],
    ]);
    assert.equal(publishedRevision?.revision_number, 1);
    assert.equal(publishedRevision?.id, document.published_revision_id);
    assert.equal(publishedRevisionMissing, false);

    // Phase 5A: the admin editor receives the current draft; revisions stay metadata only.
    for (const revision of revisions) {
      assert.deepEqual(Object.keys(revision).sort(), [
        'change_summary', 'created_at', 'created_by', 'document_id', 'id', 'release_id', 'revision_number', 'schema_version',
      ]);
    }
    const { draft, ...rest } = result.data;
    const stored = await db.query<{ draft: unknown }>("select draft from public.documents where doc_type = 'services' and slug = 'services'");
    assert.deepEqual(draft, stored.rows[0].draft);
    assert.doesNotMatch(JSON.stringify(rest), /"content"|"draft"|\{\{(label|metric|evidence):/);
  });

  test('a draft edited after publishing is reported as different from the published revision', async () => {
    await db.query("update public.documents set draft = draft || '{\"editedInTest\": true}'::jsonb where doc_type = 'about' and slug = 'about'");
    const result = await detailAs(ADMIN_SESSION, 'about', 'about');
    assert.ok(result.ok);
    assert.equal(result.data.draftMatchesPublished, false);
    assert.equal(result.data.publishedRevision?.revision_number, 1);
  });
});
