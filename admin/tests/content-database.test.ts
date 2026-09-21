import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';

import type { PGlite } from '@electric-sql/pglite';

import { createContentRepository } from '../lib/content/repository';
import { ADMIN_SESSION, ADMIN_WITHOUT_MFA, ANON_SESSION, createDatabase, NON_ADMIN_SESSION, ROOT } from './support/database';
import { createPgliteContentGateway } from './support/pglite-content-gateway';

/**
 * The read-only Documents list against the real schema in PGlite: every
 * migration, then the metric baseline and the reference import exactly as
 * they were applied to the project (the files are read, never changed).
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

const listAs = (session: Parameters<typeof createPgliteContentGateway>[1]) =>
  createContentRepository(createPgliteContentGateway(db, session)).listDocuments();

describe('documents list for the admin', () => {
  test('returns the 10 documents in (doc_type, sort_order, slug) order', async () => {
    const result = await listAs(ADMIN_SESSION);
    assert.ok(result.ok, result.ok ? '' : result.error.message);
    assert.deepEqual(
      result.data.map((doc) => `${doc.doc_type}/${doc.slug}#${doc.sort_order}`),
      [
        'proof_strip/proof-strip#0',
        'homepage/home#0',
        'about/about#0',
        'services/services#0',
        'contact/contact#0',
        'case_study_index/case-studies#0',
        'case_study/meta-lead-generation#1',
        'case_study/measurement-audit#2',
        'case_study/preschool-google-ads#3',
        'case_study/cross-channel-real-estate#4',
      ],
    );
  });

  test('metric-reference counts per document: 8 / 3 / 2 / 1 / 87 / 70 / 70 / 81, home and contact 0', async () => {
    const result = await listAs(ADMIN_SESSION);
    assert.ok(result.ok);
    assert.deepEqual(Object.fromEntries(result.data.map((doc) => [doc.slug, doc.referenceCount])), {
      'proof-strip': 8,
      home: 0,
      about: 3,
      services: 2,
      contact: 0,
      'case-studies': 1,
      'meta-lead-generation': 87,
      'measurement-audit': 70,
      'preschool-google-ads': 70,
      'cross-channel-real-estate': 81,
    });
    assert.equal(result.data.reduce((total, doc) => total + doc.referenceCount, 0), 322);
  });

  test('each row carries exactly the list metadata: published, schema 1, with its revision, and no content', async () => {
    const result = await listAs(ADMIN_SESSION);
    assert.ok(result.ok);
    for (const doc of result.data) {
      assert.deepEqual(Object.keys(doc).sort(), [
        'doc_type', 'id', 'published_revision_id', 'referenceCount', 'schema_version', 'slug', 'sort_order', 'status', 'updated_at',
      ]);
      assert.equal(doc.status, 'published');
      assert.equal(doc.schema_version, 1);
      assert.match(doc.published_revision_id ?? '', /^[0-9a-f-]{36}$/);
      assert.ok(!Number.isNaN(Date.parse(doc.updated_at)));
    }
  });
});

describe('row level security on the documents list', () => {
  test('a signed-in non-admin sees an empty list, not the documents', async () => {
    const result = await listAs(NON_ADMIN_SESSION);
    assert.ok(result.ok);
    assert.deepEqual(result.data, []);
  });

  test('the admin without an MFA-verified session is treated like a non-admin', async () => {
    const result = await listAs(ADMIN_WITHOUT_MFA);
    assert.ok(result.ok);
    assert.deepEqual(result.data, []);
  });

  test('an anonymous caller is denied and sees no rows', async () => {
    const result = await listAs(ANON_SESSION);
    assert.equal(result.ok ? null : result.error.kind, 'permission_denied');
  });
});
