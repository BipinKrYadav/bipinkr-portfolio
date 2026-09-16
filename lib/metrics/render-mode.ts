/**
 * Render mode for the metric API.
 *
 * `values` (the default, and the only mode a site build ever uses) renders
 * formatted figures. `tokens` is switched on only by the snapshot exporter
 * (scripts/snapshot/export-baseline.ts): content modules then produce metric
 * references such as `{{metric:re.cohort_2026.leads}}` instead of numbers,
 * which is how the TypeScript content becomes snapshot documents without
 * copying any value into them.
 */

let tokens = false;

export function enableTokenMode(): void {
  tokens = true;
}

export function isTokenMode(): boolean {
  return tokens;
}
