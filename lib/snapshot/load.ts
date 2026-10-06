import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseSnapshot } from './parse';
import type { Snapshot } from './schema';

export { parseSnapshot } from './parse';

/**
 * Reads and validates the content snapshot while the site is built.
 *
 * Path: `CONTENT_SNAPSHOT` if set, otherwise snapshot/baseline.json. The file
 * is read from disk during the build only — it is not bundled into any page
 * and nothing reads it at runtime.
 */

export const DEFAULT_SNAPSHOT_PATH = 'snapshot/baseline.json';

let cached: Snapshot | undefined;

export function snapshotPath(): string {
  return resolve(process.cwd(), process.env.CONTENT_SNAPSHOT?.trim() || DEFAULT_SNAPSHOT_PATH);
}

export function loadSnapshot(): Snapshot {
  if (cached) return cached;
  const file = snapshotPath();

  let json: unknown;
  try {
    json = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read content snapshot at ${file}: ${(error as Error).message}`);
  }

  cached = parseSnapshot(json, file);
  return cached;
}
