// Module hooks that let the snapshot scripts run the site's TypeScript
// directly with Node's built-in type stripping — no bundler or extra dependency.
//
// - resolves the "@/…" path alias to the project root
// - resolves extensionless relative imports to .ts / index.ts
// - loads project .ts files as TypeScript modules
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CANDIDATES = ['', '.ts', '/index.ts'];

function findFile(base) {
  for (const suffix of CANDIDATES) {
    const file = base + suffix;
    if (existsSync(file) && statSync(file).isFile()) return file;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  let base = null;
  if (specifier.startsWith('@/')) {
    base = resolvePath(ROOT, specifier.slice(2));
  } else if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    context.parentURL?.startsWith('file:')
  ) {
    base = resolvePath(dirname(fileURLToPath(context.parentURL)), specifier);
  }

  if (base) {
    const file = findFile(base);
    if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith('file:') && url.endsWith('.ts') && !url.includes('/node_modules/')) {
    return {
      format: 'module-typescript',
      source: readFileSync(fileURLToPath(url), 'utf8'),
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
