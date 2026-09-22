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
    for (const marker of ['{{label:', '{{metric:', '{{evidence:', '"draft":']) {
      assert.deepEqual(files.filter((file) => file.text.includes(marker)).map((file) => file.path), [], marker);
    }

    // Phase 5A ships draft validation to the browser (snapshot schema, token lock,
    // locked-key list), so "$metricValue" and "$pair" now legitimately appear as
    // code identifiers. Content is what must never appear: those keys serialised
    // with a value, as page data would be, plain or backslash-escaped (RSC payload).
    const contentShapes = [/\\?"\$metricValue\\?"\s*:\s*\\?"[a-z0-9_]+\./, /\\?"\$pair\\?"\s*:\s*\{/];
    for (const shape of contentShapes) {
      assert.deepEqual(files.filter((file) => shape.test(file.text)).map((file) => file.path), [], String(shape));
    }
    // The shapes catch serialised content, and ignore the code forms the bundle contains.
    const serialised = JSON.stringify({ value: { $metricValue: 're.cohort_2025.cpl' }, pair: { $pair: { first: 'a.b', second: 'c.d' } } });
    for (const sample of [serialised, JSON.stringify(serialised)]) {
      for (const shape of contentShapes) assert.match(sample, shape);
    }
    for (const code of ['k=r.rej({$metricValue:i})', 't.push("$metricValue:"+e.$metricValue)', 'new Set(["$icon","$metricValue","$pair","slug"])']) {
      for (const shape of contentShapes) assert.doesNotMatch(code, shape);
    }

    // And no page copy: every substantial string of the published documents stays out of the build.
    const documents = (JSON.parse(snapshotText) as { documents: unknown }).documents;
    const strings: string[] = [];
    (function collect(value: unknown) {
      if (typeof value === 'string') strings.push(value);
      else if (value && typeof value === 'object') Object.values(value).forEach(collect);
    })(documents);
    const copy = [...new Set(strings.map((text) => text.replace(/\{\{[^}]*\}\}/g, '').trim()))].filter(
      (text) => text.length >= 40 && !/^[a-z0-9_.]+$/.test(text),
    );
    assert.ok(copy.length > 100, 'the snapshot has page copy to check');
    const leaked = copy.filter((text) => files.some((file) => file.text.includes(text.slice(0, 60))));
    assert.deepEqual(leaked.length, 0, `${leaked.length} page-copy strings are in the build`);
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
