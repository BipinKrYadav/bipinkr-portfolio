import type { MetricDefinition } from '../../../lib/metrics/types';
import { legacyFixed, PERIOD_NOT_RECORDED, raw, type SourceProfile } from '../define';

/** Site-wide headline figures. Evidence register §3. */

const ALL_ACCOUNTS: SourceProfile = {
  dataOrigin: 'platform',
  sourcePlatform: 'meta_and_google_ads',
  sourceType: 'platform_export',
  sourceReference: 'Meta Ads and Google Ads campaign exports across the documented accounts (docs/evidence-register.md §3)',
  reportingPeriod: PERIOD_NOT_RECORDED,
};

export const siteMetrics: MetricDefinition[] = [
  legacyFixed(ALL_ACCOUNTS, {
    id: 'site.spend_total',
    name: 'Documented ad spend, all accounts',
    description: 'Total ad spend documented across the Meta and Google accounts. Ad spend, not client revenue.',
    value: 111000,
    precision: 'lower_bound',
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr_lakh',
    evidenceStatus: 'documented',
    legacyMethodNote:
      'Published as “₹1.11L+”, the sum across the documented accounts. The exact total and the per-account breakdown are not stored in the repository, so the figure is held as a lower bound of ₹1,11,000 until they are entered.',
  }),
  raw(ALL_ACCOUNTS, {
    id: 'site.accounts',
    name: 'Ad accounts documented',
    description: 'Meta and Google ad accounts covered by the documented exports.',
    value: 5,
    valueType: 'count',
    unit: 'account',
    displayFormat: 'integer',
    evidenceStatus: 'documented',
  }),
  raw(ALL_ACCOUNTS, {
    id: 'site.evidence_months',
    name: 'Campaign evidence span',
    description: 'Length of time covered by the campaign exports.',
    value: 15,
    valueType: 'duration',
    unit: 'month',
    displayFormat: 'months',
    evidenceStatus: 'documented',
    reportingPeriod: {
      basis: 'export_span',
      start: null,
      end: null,
      description: 'Span of the exports. Start and end dates are not recorded (docs/claims-ledger.md §5, open action 2).',
    },
  }),
];
