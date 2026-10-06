import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';

import type { PGlite } from '@electric-sql/pglite';

import { releaseBaselineSql } from '../../scripts/db/release-baseline';
import { createContentRepository } from '../lib/content/repository';
import { draftFromMetric } from '../lib/metrics/changes';
import { createMetricsRepository } from '../lib/metrics/repository';
import type { ReleaseRow } from '../lib/releases/model';
import { createReleasesRepository, type ReleasesRepository } from '../lib/releases/repository';
import { sha256Hex } from '../lib/releases/review';
import { ADMIN_SESSION, ADMIN_WITHOUT_MFA, ANON_SESSION, createDatabase, NON_ADMIN_SESSION, OWNER, ROOT, runAs, type Session } from './support/database';
import { createPgliteContentGateway } from './support/pglite-content-gateway';
import { createPgliteGateway } from './support/pglite-gateway';
import { createPgliteReleasesGateway } from './support/pglite-releases-gateway';

/**
 * The Phase 5C release workflow against the real schema in PGlite: every
 * migration, the metric and reference imports exactly as they were applied,
 * then the published-baseline release import. Drives the same repositories
 * the admin uses, so every rule is checked both in the admin layer and in
 * the database.
 */

let db: PGlite;
const snapshotText = readFileSync(join(ROOT, 'snapshot', 'baseline.json'), 'utf8');
const baseline = JSON.parse(snapshotText) as { metrics: { id: string; kind: string; value: number | null }[] };
/** The first raw metric with a value in the baseline. */
const METRIC_KEY = baseline.metrics.find((metric) => metric.kind === 'raw' && typeof metric.value === 'number')!.id;

before(async () => {
  db = await createDatabase();
  await db.exec(readFileSync(join(ROOT, 'supabase', 'imports', 'metrics_baseline.sql'), 'utf8'));
  await db.exec(readFileSync(join(ROOT, 'supabase', 'imports', 'references_baseline.sql'), 'utf8'));
  await db.exec(releaseBaselineSql(snapshotText).sql);
});

after(async () => {
  await db.close();
});

const releasesAs = (session: Session): ReleasesRepository => createReleasesRepository(createPgliteReleasesGateway(db, session));
const releases = () => releasesAs(ADMIN_SESSION);
const metrics = () => createMetricsRepository(createPgliteGateway(db, ADMIN_SESSION), {}, {});
const content = () => createContentRepository(createPgliteContentGateway(db, ADMIN_SESSION));

async function overview() {
  const result = await releases().getOverview();
  assert.ok(result.ok, result.ok ? '' : result.error.message);
  return result.data;
}

async function releaseDetail(id: number) {
  const result = await releases().getReleaseDetail(id);
  assert.ok(result.ok, result.ok ? '' : result.error.message);
  return result.data;
}

async function homepage() {
  const result = await content().getDocumentDetail('homepage', 'home');
  assert.ok(result.ok, result.ok ? '' : result.error.message);
  return result.data;
}

async function metric() {
  const result = await metrics().getMetricDetail(METRIC_KEY);
  assert.ok(result.ok, result.ok ? '' : result.error.message);
  return result.data;
}

async function editHeadline(suffix: string) {
  const detail = await homepage();
  const draft = structuredClone(detail.draft) as { hero: { h1: string } };
  draft.hero.h1 = `${draft.hero.h1}${suffix}`;
  const saved = await content().saveDocumentDraft(detail, draft, `Headline ${suffix.trim()}`);
  assert.ok(saved.ok, saved.ok ? '' : saved.error.message);
}

/** Validate → approve → start publishing → record the build, through the repository. */
async function advanceToBuilt(release: ReleaseRow, buildSha = 'a'.repeat(64)): Promise<ReleaseRow> {
  const repo = releases();
  const validated = await repo.validateRelease(release);
  assert.ok(validated.ok, validated.ok ? '' : validated.error.message);
  assert.equal(validated.data.status, 'review', JSON.stringify(validated.data.validation));
  const approved = await repo.approveRelease(await releaseDetail(release.id));
  assert.ok(approved.ok, approved.ok ? '' : approved.error.message);
  const started = await repo.startPublish(approved.data);
  assert.ok(started.ok, started.ok ? '' : started.error.message);
  const built = await repo.recordBuild(started.data, buildSha);
  assert.ok(built.ok, built.ok ? '' : built.error.message);
  return built.data;
}

const revisionCount = async (docType: string, slug: string) =>
  (
    await db.query<{ count: number }>(
      'select count(*)::int as count from public.document_revisions r join public.documents d on d.id = r.document_id where d.doc_type = $1 and d.slug = $2',
      [docType, slug],
    )
  ).rows[0].count;

let baselineId: number;
let firstReleaseId: number;
let originalHeadline: string;
let originalValue: number;

describe('the published baseline', () => {
  test('the imported baseline is the published release, and no draft differs from it', async () => {
    const view = await overview();
    assert.ok(view.published);
    assert.equal(view.published.origin, 'baseline_import');
    assert.equal(view.published.status, 'published');
    const download = await releases().downloadSnapshot(view.published);
    assert.ok(download.ok, download.ok ? '' : download.error.message);
    assert.equal(await sha256Hex(download.data.text), view.published.snapshot_sha256);
    assert.deepEqual(JSON.parse(download.data.text), JSON.parse(snapshotText), 'the baseline release holds exactly snapshot/baseline.json');
    assert.deepEqual(view.preview.items, []);
    assert.equal(view.open, null);
    assert.equal(view.lastPublished?.id, view.published.id);
    assert.equal(view.recentFailure, null);
    baselineId = view.published.id;
  });

  test('a release with no real change is refused', async () => {
    const result = await releases().createRelease('Nothing changed');
    assert.equal(result.ok ? null : result.error.kind, 'validation');
    assert.match(result.ok ? '' : result.error.message, /no draft changes/);
    assert.equal((await releases().createRelease('   ')).ok, false, 'a summary is required');
  });

  test('the metric screen compares drafts with the published release in the database', async () => {
    const detail = await metric();
    assert.deepEqual(detail.publishedSource, { kind: 'release', releaseId: baselineId });
    assert.deepEqual(detail.published, { state: 'matches' });
    assert.equal(detail.publishedMetric?.id, METRIC_KEY);
    originalValue = detail.metric.value as number;
    originalHeadline = ((await homepage()).draft as { hero: { h1: string } }).hero.h1;
  });
});

describe('creating, reviewing and publishing a release', () => {
  test('saving drafts never publishes; the preview lists exactly what changed', async () => {
    const before = await overview();
    await editHeadline(' — release test');
    const detail = await metric();
    const saved = await metrics().saveMetric(detail, { ...draftFromMetric(detail.metric), value: originalValue + 1 }, 'Recount');
    assert.ok(saved.ok, saved.ok ? '' : saved.error.message);

    const after = await overview();
    assert.equal(after.published?.id, before.published?.id);
    assert.equal(after.published?.snapshot_sha256, before.published?.snapshot_sha256, 'the published snapshot is untouched');
    assert.deepEqual(
      after.preview.items.map((item) => [item.entityType, item.entityKey, item.fields]),
      [
        ['document', 'homepage/home', ['content.hero.h1']],
        ['metric', METRIC_KEY, ['value']],
      ],
    );
    assert.deepEqual((await metric()).published, { state: 'differs', fields: ['value'] });
    assert.equal((await homepage()).draftMatchesPublished, false);
  });

  test('a release freezes the drafts, and the review shows each change before and after', async () => {
    const created = await releases().createRelease('Sharper headline and a recount');
    assert.ok(created.ok, created.ok ? '' : created.error.message);
    assert.equal(created.data.status, 'draft');
    assert.equal(created.data.base_release_id, baselineId);
    firstReleaseId = created.data.id;

    const detail = await releaseDetail(firstReleaseId);
    assert.equal(detail.items.length, 2);
    assert.deepEqual(detail.schemaIssues, [], 'the frozen snapshot passes the site schema');
    const [document] = detail.review.documents;
    assert.equal(document.key, 'homepage/home');
    assert.deepEqual(document.fields.map((field) => [field.path, field.before, field.after]), [
      ['hero.h1', originalHeadline, `${originalHeadline} — release test`],
    ]);
    assert.equal(document.tokens.before, document.tokens.after, 'protected tokens are unchanged');
    const [metricChange] = detail.review.metrics;
    assert.equal(metricChange.key, METRIC_KEY);
    assert.deepEqual(metricChange.fields.map((field) => [field.path, field.before, field.after]), [['value', originalValue, originalValue + 1]]);

    const second = await releases().createRelease('Another');
    assert.equal(second.ok ? null : second.error.kind, 'validation', 'only one release can be open');
  });

  test('a stale copy of the release is refused as a conflict', async () => {
    const { release } = await releaseDetail(firstReleaseId);
    const result = await releases().validateRelease({ ...release, updated_at: '2000-01-01T00:00:00.000000+00:00' });
    assert.equal(result.ok ? null : result.error.kind, 'conflict');
  });

  test('each step is separate: validate, approve, confirm publish, record the verified build', async () => {
    const repo = releases();
    const { release } = await releaseDetail(firstReleaseId);
    assert.equal((await repo.approveRelease(await releaseDetail(firstReleaseId))).ok, false, 'approval needs a validated release');
    assert.equal((await repo.startPublish(release)).ok, false, 'publishing needs approval');

    const validated = await repo.validateRelease(release);
    assert.ok(validated.ok);
    assert.equal(validated.data.status, 'review');
    assert.equal(validated.data.validation?.passed, true);
    assert.deepEqual(
      validated.data.validation?.checks.map((check) => [check.code, check.ok]),
      [
        ['has_changes', true],
        ['current_base', true],
        ['drafts_unchanged', true],
        ['protected_tokens', true],
        ['metric_references', true],
        ['no_duplicates', true],
        ['required_fields', true],
        ['document_schema', true],
      ],
    );

    const approved = await repo.approveRelease(await releaseDetail(firstReleaseId));
    assert.ok(approved.ok);
    const started = await repo.startPublish(approved.data);
    assert.ok(started.ok);
    assert.equal(started.data.status, 'publishing');

    assert.equal((await repo.recordBuild(started.data, 'not-a-sha')).ok, false);
    const unbuilt = await repo.markPublished(started.data, true);
    assert.match(unbuilt.ok ? '' : unbuilt.error.message, /verified build/);
    const built = await repo.recordBuild(started.data, 'B'.repeat(64));
    assert.ok(built.ok);
    assert.equal(built.data.build_sha256, 'b'.repeat(64));
    const unconfirmed = await repo.markPublished(built.data, false);
    assert.match(unconfirmed.ok ? '' : unconfirmed.error.message, /Confirm that you deployed/);
    assert.equal((await overview()).published?.id, baselineId, 'still not published');
  });

  test('marked published, the release becomes the published baseline', async () => {
    const { release } = await releaseDetail(firstReleaseId);
    const published = await releases().markPublished(release, true);
    assert.ok(published.ok, published.ok ? '' : published.error.message);
    assert.equal(published.data.status, 'published');
    assert.equal(published.data.previous_release_id, baselineId);
    assert.ok(published.data.deployment_confirmed_at);

    const view = await overview();
    assert.equal(view.published?.id, firstReleaseId);
    assert.equal(view.lastPublished?.id, firstReleaseId);
    assert.equal(view.releases.find((item) => item.id === baselineId)?.status, 'superseded');
    assert.deepEqual(view.preview.items, [], 'nothing is unpublished any more');

    const metricDetail = await metric();
    assert.deepEqual(metricDetail.publishedSource, { kind: 'release', releaseId: firstReleaseId });
    assert.deepEqual(metricDetail.published, { state: 'matches' });

    const document = await homepage();
    assert.equal(document.draftMatchesPublished, true);
    assert.equal(document.publishedRevision?.release_id, firstReleaseId);
  });
});

describe('failures and validation blocks', () => {
  test('a failed publish leaves the published release, the documents and the history untouched', async () => {
    await editHeadline(' (second)');
    const publishedRevision = (await homepage()).document.published_revision_id;
    const created = await releases().createRelease('Will fail');
    assert.ok(created.ok);
    const built = await advanceToBuilt(created.data);
    const failed = await releases().recordFailure(built, 'deploy', 'The upload was interrupted');
    assert.ok(failed.ok);
    assert.equal(failed.data.status, 'failed');

    const view = await overview();
    assert.equal(view.published?.id, firstReleaseId);
    assert.equal(view.recentFailure?.id, created.data.id);
    assert.equal((await homepage()).document.published_revision_id, publishedRevision);
    const linked = await db.query<{ count: number }>('select count(*)::int as count from public.document_revisions where release_id = $1', [created.data.id]);
    assert.equal(linked.rows[0].count, 0, 'no revision is linked to a failed release');
  });

  test('a draft that breaks the published schema is blocked by validation, with the reason', async () => {
    // The admin editor cannot produce this; the owner stands in for any other path.
    await runAs(db, OWNER, async (tx) => {
      await tx.query("update public.documents set draft = jsonb_set(draft, '{unexpectedField}', '\"x\"') where doc_type = 'homepage'");
      await tx.query(
        "insert into public.document_revisions (document_id, content, schema_version, change_summary) select id, draft, schema_version, 'Schema test' from public.documents where doc_type = 'homepage'",
      );
    });
    const created = await releases().createRelease('Breaks the schema');
    assert.ok(created.ok);
    assert.ok((await releaseDetail(created.data.id)).schemaIssues.some((issue) => issue.includes('unexpectedField')));
    const validated = await releases().validateRelease(created.data);
    assert.ok(validated.ok);
    assert.equal(validated.data.status, 'draft');
    assert.equal(validated.data.validation?.passed, false);
    const schema = validated.data.validation?.checks.find((check) => check.code === 'document_schema');
    assert.equal(schema?.ok, false);
    assert.ok(schema?.details.some((line) => line.includes('unexpectedField')));

    const cancelled = await releases().cancelRelease(validated.data, 'Schema problem');
    assert.ok(cancelled.ok);
    assert.equal(cancelled.data.status, 'cancelled');
  });
});

describe('resetting drafts to the published state', () => {
  test('a document draft resets to its published revision as a new revision; history is kept', async () => {
    const before = await revisionCount('homepage', 'home');
    const reset = await content().resetDraftToPublished(await homepage(), 'Discard unpublished edits');
    assert.ok(reset.ok, reset.ok ? '' : reset.error.message);
    assert.equal(await revisionCount('homepage', 'home'), before + 1);
    const document = await homepage();
    assert.equal(document.draftMatchesPublished, true);
    assert.equal((await content().resetDraftToPublished(document, 'Again')).ok, false, 'nothing to reset');
  });

  test('a metric draft resets to the published values as a new version, with a summary', async () => {
    const detail = await metric();
    const edited = await metrics().saveMetric(detail, { ...draftFromMetric(detail.metric), value: originalValue + 5, description: 'Temporary.' }, 'Try');
    assert.ok(edited.ok);
    const changed = await metric();
    assert.equal(changed.published.state, 'differs');
    assert.equal((await metrics().resetToPublished(changed, '  ')).ok, false, 'a summary is required');
    const reset = await metrics().resetToPublished(changed, 'Discard unpublished edits');
    assert.ok(reset.ok, reset.ok ? '' : reset.error.message);
    const after = await metric();
    assert.deepEqual(after.published, { state: 'matches' });
    assert.equal(after.metric.value, originalValue + 1);
    assert.equal(after.versions.length, changed.versions.length + 1);
    assert.equal(after.versions[0].reason, 'Discard unpublished edits');
    assert.deepEqual((await overview()).preview.items, []);
  });
});

describe('rollback', () => {
  test('a failed rollback leaves the published release in place', async () => {
    const created = await releases().createRollbackRelease('Try to go back');
    assert.ok(created.ok, created.ok ? '' : created.error.message);
    assert.equal(created.data.kind, 'rollback');
    assert.equal(created.data.restores_release_id, baselineId);
    const built = await advanceToBuilt(created.data);
    const failed = await releases().recordFailure(built, 'build', 'Build stopped');
    assert.ok(failed.ok);
    assert.equal((await overview()).published?.id, firstReleaseId);
  });

  test('a rollback restores the previous published state and leaves every draft as it is', async () => {
    const draftBefore = (await homepage()).draft;
    const valueBefore = (await metric()).metric.value;
    const created = await releases().createRollbackRelease('Go back to the baseline');
    assert.ok(created.ok);
    const detail = await releaseDetail(created.data.id);
    assert.deepEqual(detail.review.documents.map((document) => document.key), ['homepage/home']);
    const built = await advanceToBuilt(created.data);
    const published = await releases().markPublished(built, true);
    assert.ok(published.ok, published.ok ? '' : published.error.message);

    const view = await overview();
    assert.equal(view.published?.id, created.data.id);
    assert.equal(view.releases.find((release) => release.id === firstReleaseId)?.status, 'rolled_back');
    assert.deepEqual((await homepage()).draft, draftBefore, 'the document draft is not modified');
    assert.equal((await metric()).metric.value, valueBefore, 'the metric draft is not modified');
    assert.equal((await homepage()).draftMatchesPublished, false, 'the drafts are unpublished changes again');
    assert.deepEqual(
      view.preview.items.map((item) => item.entityKey),
      ['homepage/home', METRIC_KEY],
    );
  });
});

describe('snapshot download', () => {
  test('the downloaded snapshot hashes to the recorded SHA-256', async () => {
    const { release } = await releaseDetail(firstReleaseId);
    const download = await releases().downloadSnapshot(release);
    assert.ok(download.ok);
    assert.equal(download.data.fileName, `release-${firstReleaseId}.snapshot.json`);
    assert.equal(await sha256Hex(download.data.text), release.snapshot_sha256);
  });

  test('a snapshot that does not match its SHA-256 is refused', async () => {
    const gateway = createPgliteReleasesGateway(db, ADMIN_SESSION);
    const tampered = createReleasesRepository({ ...gateway, getReleaseSnapshotText: async (id) => `${await gateway.getReleaseSnapshotText(id)} ` });
    const { release } = await releaseDetail(firstReleaseId);
    const download = await tampered.downloadSnapshot(release);
    assert.equal(download.ok ? null : download.error.kind, 'conflict');
  });
});

describe('audit log', () => {
  test('every release action is recorded with the actor, the release and the time', async () => {
    const { rows } = await db.query<{ action: string; actor_id: string | null; record_id: string }>(
      "select action, actor_id, record_id from public.audit_log where table_name = 'releases' and action not in ('insert', 'update')",
    );
    const actions = new Set(rows.map((row) => row.action));
    for (const action of [
      'release_baseline_imported',
      'release_created',
      'release_validated',
      'release_approved',
      'publish_started',
      'release_build_verified',
      'publish_succeeded',
      'publish_failed',
      'release_cancelled',
      'rollback_started',
      'rollback_succeeded',
      'rollback_failed',
    ]) {
      assert.ok(actions.has(action), `${action} is audited`);
    }
    for (const row of rows.filter((item) => item.action !== 'release_baseline_imported')) {
      assert.equal(row.actor_id, '00000000-0000-4000-8000-000000000001');
      assert.match(row.record_id, /^\d+$/);
    }
  });
});

describe('access control', () => {
  test('a non-admin, an admin without MFA and an anonymous caller get nothing and can do nothing', async () => {
    for (const session of [NON_ADMIN_SESSION, ADMIN_WITHOUT_MFA, ANON_SESSION]) {
      const repo = releasesAs(session);
      const view = await repo.getOverview();
      assert.equal(view.ok ? null : view.error.kind, 'permission_denied', JSON.stringify(session));
      const created = await repo.createRelease('Not allowed');
      assert.equal(created.ok ? null : created.error.kind, 'permission_denied', JSON.stringify(session));
      const rollback = await repo.createRollbackRelease('Not allowed');
      assert.equal(rollback.ok, false);
    }
    const visible = await runAs(db, NON_ADMIN_SESSION, (tx) => tx.query<{ count: number }>('select count(*)::int as count from public.releases'));
    assert.equal(visible.rows[0].count, 0);
  });
});
