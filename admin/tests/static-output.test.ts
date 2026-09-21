import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, test } from 'node:test';

import { ROOT } from './support/database';

/**
 * The static admin build must not contain page content: documents are read in
 * the browser after sign-in, never at build time. This scans admin/out when a
 * build exists (run it after `npm run admin:build`); without one it is skipped.
 */

const OUT = join(ROOT, 'admin', 'out');
const built = existsSync(join(OUT, 'index.html'));

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => (statSync(join(dir, name)).isDirectory() ? walk(join(dir, name)) : [join(dir, name)]));

const snapshotText = readFileSync(join(ROOT, 'snapshot', 'baseline.json'), 'utf8');
const realLabelNames = [...new Set([...snapshotText.matchAll(/\{\{label:([^|{}]+)\|[^|{}]+\}\}/g)].map((match) => match[1]))];

describe('static admin build', { skip: built ? false : 'no admin/out build to scan' }, () => {
  const files = built ? walk(OUT).map((path) => ({ path: relative(OUT, path), text: readFileSync(path, 'utf8') })) : [];

  test('contains no real client or campaign names from label tokens', () => {
    assert.ok(realLabelNames.length > 0, 'the snapshot has label tokens to check');
    for (const name of realLabelNames) {
      const found = files.filter((file) => file.text.includes(name)).map((file) => file.path);
      assert.deepEqual(found, [], `a real label name (${name.length} characters) is in the build`);
    }
  });

  test('contains no page-content tokens or document drafts', () => {
    for (const marker of ['{{label:', '{{metric:', '{{evidence:', '$metricValue', '"$pair"', '"draft":']) {
      assert.deepEqual(files.filter((file) => file.text.includes(marker)).map((file) => file.path), [], marker);
    }
  });

  test('contains no revision metadata or content: revisions are read at runtime only', () => {
    // The baseline revision's change summary is database data; the build must not have it.
    for (const text of ['Baseline import from snapshot/baseline.json']) {
      assert.deepEqual(files.filter((file) => file.text.includes(text)).map((file) => file.path), [], text);
    }
  });

  test('contains no secret, service-role or JWT value, and loads scripts only from its own origin', () => {
    for (const pattern of [/sb_secret_[A-Za-z0-9_-]{10,}/, /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /service_role["']?\s*[:=]/]) {
      assert.deepEqual(files.filter((file) => pattern.test(file.text)).map((file) => file.path), [], String(pattern));
    }
    for (const file of files.filter((item) => item.path.endsWith('.html'))) {
      for (const match of file.text.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) {
        assert.ok(match[1].startsWith('/_next/'), `${file.path} loads ${match[1]}`);
      }
    }
  });

  test('ships the document detail route as a shell with no document in it', () => {
    const page = files.find((file) => file.path.replace(/\\/g, '/') === 'content/detail/index.html');
    assert.ok(page, 'content/detail/index.html exists');
    for (const slug of ['meta-lead-generation', 'measurement-audit', 'preschool-google-ads', 'cross-channel-real-estate']) {
      assert.ok(!page.text.includes(`slug=${slug}`), `the detail shell does not bake in ${slug}`);
    }
  });
});
