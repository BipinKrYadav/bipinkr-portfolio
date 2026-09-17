/**
 * Admin isolation and security check (npm run admin:check).
 *
 *   node scripts/admin/check-isolation.mjs [--public <dir>] [--admin <dir>]
 *
 * 1. Public-site source never imports admin code.
 * 2. Public build output (default: out) contains no admin UI or Supabase
 *    references. Skipped with a notice if that output does not exist.
 * 3. Admin build output (default: admin/out) is noindex on every page, has a
 *    Content Security Policy, loads no tracking, and contains no secret keys
 *    or private storage URLs.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const argument = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index > -1 ? process.argv[index + 1] : fallback;
};
const publicOut = resolve(root, argument('--public', 'out'));
const adminOut = resolve(root, argument('--admin', 'admin/out'));

let failures = 0;
const pass = (message) => console.log(`PASS  ${message}`);
const fail = (message) => {
  failures += 1;
  console.log(`FAIL  ${message}`);
};

function files(dir, extensions) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) found.push(...files(full, extensions));
    else if (extensions.includes(extname(name))) found.push(full);
  }
  return found;
}

function scan(paths, patterns) {
  const hits = [];
  for (const path of paths) {
    const text = readFileSync(path, 'utf8');
    for (const [label, pattern] of patterns) {
      if (pattern.test(text)) hits.push(`${relative(root, path)}: ${label}`);
    }
  }
  return hits;
}

const report = (hits, ok) => (hits.length === 0 ? pass(ok) : fail(`${ok}\n      ${hits.join('\n      ')}`));

// 1. Source isolation
const publicSource = ['app', 'components', 'content', 'lib']
  .map((dir) => join(root, dir))
  .filter(existsSync)
  .flatMap((dir) => files(dir, ['.ts', '.tsx', '.js', '.mjs']));
report(
  scan(publicSource, [
    ['imports admin code', /(?:from|import\()\s*['"](?:@admin\/|(?:\.\.?\/)+admin\/)/],
    ['references Supabase', /supabase/i],
  ]),
  `public-site source (${publicSource.length} files) does not import admin code or Supabase`,
);

// 2. Public build output
const TEXT = ['.html', '.js', '.css', '.txt', '.json', '.xml', '.webmanifest'];
if (existsSync(publicOut)) {
  report(
    scan(files(publicOut, TEXT), [
      ['admin app marker', /bipinkr-admin/],
      ['admin UI text', /Authentication not configured|Admin sign-in/],
      ['Supabase reference', /supabase/i],
      ['Supabase key', /sb_(?:publishable|secret)_/],
    ]),
    `public output (${relative(root, publicOut)}) has no admin or Supabase references`,
  );
} else {
  console.log(`SKIP  public output ${relative(root, publicOut)} not found (run npm run build first)`);
}

// 3. Admin build output
if (!existsSync(adminOut)) {
  fail(`admin output ${relative(root, adminOut)} not found (run npm run admin:build first)`);
} else {
  const adminFiles = files(adminOut, TEXT);
  const pages = adminFiles.filter((path) => path.endsWith('.html'));

  report(
    pages.flatMap((page) => {
      const html = readFileSync(page, 'utf8');
      const problems = [];
      if (!/<meta name="robots" content="noindex, nofollow/.test(html)) problems.push('missing noindex');
      if (!/<meta http-equiv="Content-Security-Policy"/i.test(html)) problems.push('missing CSP');
      if (!/<meta name="referrer" content="no-referrer"/.test(html)) problems.push('missing referrer policy');
      return problems.map((problem) => `${relative(root, page)}: ${problem}`);
    }),
    `all ${pages.length} admin pages are noindex, with CSP and no-referrer`,
  );

  const robots = join(adminOut, 'robots.txt');
  if (existsSync(robots) && /Disallow:\s*\/\s*$/m.test(readFileSync(robots, 'utf8'))) pass('admin robots.txt disallows all');
  else fail('admin robots.txt missing or does not disallow all');

  report(
    scan(adminFiles, [
      ['Google Tag Manager', /googletagmanager\.com|GTM-[A-Z0-9]{4,}/],
      ['Google Analytics', /google-analytics\.com|gtag\(|G-XDGM90H8WH/],
      ['Meta Pixel', /connect\.facebook\.net|fbq\(|facebook\.com\/tr/],
      ['dataLayer', /dataLayer/],
    ]),
    `admin output (${adminFiles.length} files) loads no tag manager, analytics or pixel`,
  );

  report(
    scan(adminFiles, [
      ['Supabase secret key', /sb_secret_[A-Za-z0-9_-]{8,}/],
      ['JWT', /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}/],
      ['storage object URL', /\/storage\/v1\/object\//],
      ['service-role key variable', /SERVICE_ROLE_KEY/],
    ]),
    'admin output contains no secret keys, JWTs or storage URLs',
  );
}

console.log(failures === 0 ? '\nAdmin isolation check passed.' : `\nAdmin isolation check failed (${failures}).`);
process.exit(failures === 0 ? 0 : 1);
