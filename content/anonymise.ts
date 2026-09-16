import { labelToken } from '../lib/content/token-grammar';
import { isTokenMode } from '../lib/metrics/render-mode';

/**
 * Account and campaign labelling.
 *
 * The campaign labels below come from the campaign exports. They are
 * campaign/account *names*, never account IDs, campaign IDs, ad set IDs,
 * creative IDs or any lead-level data — none of which appear anywhere in
 * this repository or in the built site.
 *
 * If client permission to name projects publicly is not in place, flip
 * ANONYMISE_LABELS to true. Every table, chart and paragraph that uses
 * `label()` switches to the neutral variant with no other code changes.
 */
export const ANONYMISE_LABELS = false;

/**
 * Returns the public label for a campaign or account.
 *
 * @param actual    The name as it appears in the export.
 * @param anonymous The neutral stand-in used when anonymisation is on.
 */
export function label(actual: string, anonymous: string): string {
  // The snapshot exporter keeps both names, so the switch still works for snapshot-built pages.
  if (isTokenMode()) return labelToken(actual, anonymous);
  return ANONYMISE_LABELS ? anonymous : actual;
}
