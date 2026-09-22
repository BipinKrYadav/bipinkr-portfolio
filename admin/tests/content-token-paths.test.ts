import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';

import type { PGlite } from '@electric-sql/pglite';

import { validateDocumentDraft } from '../lib/content/draft';
import { ADMIN_SESSION, createDatabase, ROOT, runAs } from './support/database';

/**
 * Phase 5A token lock, with field paths: a protected token must keep both its
 * identity and the field that holds it. Every case is checked twice — by the
 * client validator and by the database's save_document_draft — and every
 * database attempt runs in a transaction that is rolled back.
 */

type Draft = Record<string, any>;

const snapshot = JSON.parse(readFileSync(join(ROOT, 'snapshot', 'baseline.json'), 'utf8'));
// The one document that carries every protected token kind.
const original: Draft = snapshot.documents.caseStudies['meta-lead-generation'].content;
const TOKEN = /\{\{[^{}]*\}\}/g;

let db: PGlite;

before(async () => {
  db = await createDatabase();
  await db.exec(readFileSync(join(ROOT, 'supabase', 'imports', 'metrics_baseline.sql'), 'utf8'));
  await db.exec(readFileSync(join(ROOT, 'supabase', 'imports', 'references_baseline.sql'), 'utf8'));
});

after(async () => {
  await db.close();
});

const ROLLBACK = '__rollback__';

/** Runs the real RPC as the MFA-verified admin and always rolls back: 'accepted', or the database's message. */
async function databaseSave(draft: Draft): Promise<string> {
  let outcome = '';
  try {
    await runAs(db, ADMIN_SESSION, async (tx) => {
      const { rows } = await tx.query<{ id: string; updated_at: string }>(
        "select id, updated_at from public.documents where doc_type = 'case_study' and slug = 'meta-lead-generation'",
      );
      await tx.query('select public.save_document_draft($1, $2, $3::jsonb, $4)', [rows[0].id, rows[0].updated_at, JSON.stringify(draft), 'token path test']);
      outcome = 'accepted';
      throw new Error(ROLLBACK);
    });
  } catch (error) {
    if ((error as Error).message !== ROLLBACK) outcome = (error as Error).message;
  }
  return outcome;
}

function edited(change: (draft: Draft) => void): Draft {
  const draft = structuredClone(original);
  change(draft);
  return draft;
}

/** The first object, depth-first, that carries a $metricValue. */
function firstMetricValueObject(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstMetricValueObject(item);
      if (found) return found;
    }
  } else if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    if (typeof object.$metricValue === 'string') return object;
    for (const item of Object.values(object)) {
      const found = firstMetricValueObject(item);
      if (found) return found;
    }
  }
  return null;
}

const bareTokens = (draft: unknown) => (JSON.stringify(draft).match(TOKEN) ?? []).sort();

async function expectAllowed(draft: Draft) {
  const client = validateDocumentDraft('case_study', 'meta-lead-generation', draft, original);
  assert.equal(client.ok, true, client.ok ? '' : client.message);
  assert.equal(await databaseSave(draft), 'accepted');
}

async function expectRejected(draft: Draft) {
  const client = validateDocumentDraft('case_study', 'meta-lead-generation', draft, original);
  assert.equal(client.ok, false, 'the client validator must reject');
  assert.match(client.ok ? '' : client.message, /references cannot be changed or moved/i, 'rejected by the token rule, not by the schema');
  assert.match(await databaseSave(draft), /Document tokens are locked/, 'the database must reject');
}

describe('protected tokens keep their field (client and database)', () => {
  test('fixtures are present', () => {
    assert.match(original.blendedMethodology[0], /\{\{metric:re\.blended_cpl\}\}/);
    assert.doesNotMatch(original.blendedMethodology[1], TOKEN);
    assert.ok((original.summary.subtitle.match(TOKEN) ?? []).length >= 2);
    assert.match(original.campaignsTable.rows[0].campaign, /\{\{label:/);
    assert.match(original.summary.cardMetrics[2].evidence, /^\{\{evidence:/);
    assert.equal(typeof original.summary.cardMetrics[0].$pair.first, 'string');
    assert.ok(firstMetricValueObject(original));
    assert.doesNotMatch(original.summary.title, TOKEN);
  });

  test('same token, same field, with the copy around it edited: allowed', async () => {
    await expectAllowed(edited((d) => {
      d.summary.subtitle = 'Edited in test: ' + d.summary.subtitle;
    }));
  });

  test('token order within one field is free: allowed', async () => {
    await expectAllowed(edited((d) => {
      const [first, second] = d.summary.subtitle.match(TOKEN) as string[];
      d.summary.subtitle = d.summary.subtitle.replace(first, '@@SWAP_PLACEHOLDER@@').replace(second, first).replace('@@SWAP_PLACEHOLDER@@', second);
    }));
  });

  test('a token changed to another valid metric: rejected', async () => {
    await expectRejected(edited((d) => {
      d.blendedMethodology[0] = d.blendedMethodology[0].replace('{{metric:re.blended_cpl}}', '{{metric:site.accounts}}');
    }));
  });

  test('the same token moved to another field: rejected', async () => {
    const moved = edited((d) => {
      d.blendedMethodology[0] = d.blendedMethodology[0].replace('{{metric:re.blended_cpl}}', 'the blended CPL');
      d.blendedMethodology[1] = d.blendedMethodology[1] + ' {{metric:re.blended_cpl}}';
    });
    // Exactly the gap being closed: the bare tokens are identical, only the field differs.
    assert.deepEqual(bareTokens(moved), bareTokens(original));
    await expectRejected(moved);
  });

  test('a token removed: rejected', async () => {
    await expectRejected(edited((d) => {
      d.blendedMethodology[0] = d.blendedMethodology[0].replace('{{metric:re.blended_cpl}}', '42');
    }));
  });

  test('a token added: rejected', async () => {
    await expectRejected(edited((d) => {
      d.blendedMethodology[1] = d.blendedMethodology[1] + ' {{metric:re.zero_result_lead_spend}}';
    }));
  });

  test('a client label changed: rejected', async () => {
    await expectRejected(edited((d) => {
      const row = d.campaignsTable.rows[0];
      row.campaign = row.campaign.replace(/\{\{label:[^|]+\|/, '{{label:Changed in test|');
    }));
  });

  test('an evidence token changed: rejected', async () => {
    await expectRejected(edited((d) => {
      d.summary.cardMetrics[2].evidence = '{{evidence:site.accounts}}';
    }));
  });

  test('a $metricValue changed: rejected', async () => {
    await expectRejected(edited((d) => {
      (firstMetricValueObject(d) as Record<string, unknown>).$metricValue = 'site.accounts';
    }));
  });

  test('a $pair changed: rejected', async () => {
    await expectRejected(edited((d) => {
      d.summary.cardMetrics[0].$pair.first = 'site.accounts';
    }));
  });

  test('a normal editorial text change: allowed', async () => {
    await expectAllowed(edited((d) => {
      d.summary.title = d.summary.title + ' (edited in test)';
    }));
  });

  test('every database attempt was rolled back', async () => {
    const { rows } = await db.query<{ n: number }>(
      `select count(*)::int as n from public.document_revisions r
       join public.documents d on d.id = r.document_id
       where d.doc_type = 'case_study' and d.slug = 'meta-lead-generation'`,
    );
    assert.equal(rows[0].n, 1);
  });
});
