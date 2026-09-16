import type { MetricDefinition } from '../../../lib/metrics/types';
import { calculated, PERIOD_NOT_RECORDED, raw, type SourceProfile } from '../define';

/**
 * Cross-channel Meta + Google for one real estate client. Evidence register §7.
 *
 * Meta campaign 1 carries the same name (“Balaji Leads”) and figures as
 * Project D in the Meta lead generation case study, but is recorded
 * separately: a matching name alone does not establish that both case
 * studies draw on the same evidence record.
 */

const META_EXPORTS: SourceProfile = {
  dataOrigin: 'platform',
  sourcePlatform: 'meta_ads',
  sourceType: 'platform_export',
  sourceReference: 'Meta Ads campaign exports for the cross-channel client (docs/evidence-register.md §7)',
  reportingPeriod: {
    ...PERIOD_NOT_RECORDED,
    description: 'Not recorded. The exports do not record a common start and end date for all campaigns.',
  },
};

const GOOGLE_EXPORTS: SourceProfile = {
  ...META_EXPORTS,
  sourcePlatform: 'google_ads',
  sourceReference: 'Google Ads Search campaign exports for the cross-channel client (docs/evidence-register.md §7)',
};

const BOTH = { ...META_EXPORTS, sourcePlatform: 'meta_and_google_ads' as const };

const googleCampaign = (n: number, spend: number, clicks: number): MetricDefinition[] => [
  raw(GOOGLE_EXPORTS, {
    id: `cc.google_${n}.spend`,
    name: `Google campaign ${n} spend`,
    description: `Spend of Google Search campaign ${n}.`,
    value: spend,
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: null,
  }),
  raw(GOOGLE_EXPORTS, {
    id: `cc.google_${n}.clicks`,
    name: `Google campaign ${n} clicks`,
    description: `Clicks recorded for Google Search campaign ${n}. Clicks, not leads.`,
    value: clicks,
    valueType: 'count',
    unit: 'click',
    displayFormat: 'integer',
    evidenceStatus: null,
  }),
];

const reportedRate = (n: number, value: number) =>
  raw(GOOGLE_EXPORTS, {
    id: `cc.google.reported_conversion_rate_${n}`,
    name: `Reported Google conversion rate ${n}`,
    description: 'A Google conversion rate in this dataset that cannot be reconciled with recorded click volume.',
    value,
    valueType: 'percent',
    unit: 'percent',
    displayFormat: 'percent_0dp',
    evidenceStatus: 'reported',
    notes:
      'The measurement audit also reports 345% and 476%. Not linked to those metrics: the repository does not establish that they are the same campaign records.',
  });

export const crossChannelMetrics: MetricDefinition[] = [
  /* Meta ------------------------------------------------------------ */
  raw(META_EXPORTS, {
    id: 'cc.meta_1.spend',
    name: 'Meta campaign 1 spend',
    description: 'Spend of Meta campaign 1.',
    value: 5595.49,
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: null,
  }),
  raw(META_EXPORTS, {
    id: 'cc.meta_1.leads',
    name: 'Meta campaign 1 recorded leads',
    description: 'Lead form submissions recorded by Meta for campaign 1.',
    value: 181,
    valueType: 'count',
    unit: 'lead',
    displayFormat: 'integer',
    evidenceStatus: null,
    notes: 'Same name and value as re.project_d.leads; not linked (see file header).',
  }),
  calculated(META_EXPORTS, {
    id: 'cc.meta_1.cpl',
    name: 'Meta campaign 1 CPL',
    description: 'Spend ÷ recorded leads.',
    formula: { fn: 'ratio', numerator: 'cc.meta_1.spend', denominator: 'cc.meta_1.leads' },
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: null,
  }),
  raw(META_EXPORTS, {
    id: 'cc.meta_2.spend',
    name: 'Meta campaign 2 spend',
    description: 'Spend of Meta campaign 2.',
    value: 1292.62,
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: null,
  }),
  raw(META_EXPORTS, {
    id: 'cc.meta_2.leads',
    name: 'Meta campaign 2 recorded leads',
    description: 'Lead form submissions recorded by Meta for campaign 2.',
    value: 10,
    valueType: 'count',
    unit: 'lead',
    displayFormat: 'integer',
    evidenceStatus: null,
  }),
  calculated(META_EXPORTS, {
    id: 'cc.meta_2.cpl',
    name: 'Meta campaign 2 CPL',
    description: 'Spend ÷ recorded leads.',
    formula: { fn: 'ratio', numerator: 'cc.meta_2.spend', denominator: 'cc.meta_2.leads' },
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: null,
  }),
  calculated(META_EXPORTS, {
    id: 'cc.meta.spend',
    name: 'Meta spend',
    description: 'Spend across the two Meta campaigns.',
    formula: { fn: 'sum', terms: ['cc.meta_1.spend', 'cc.meta_2.spend'] },
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: null,
  }),
  calculated(META_EXPORTS, {
    id: 'cc.meta.leads',
    name: 'Meta verified leads',
    description: 'Lead form submissions recorded by Meta across both campaigns. Not independently qualified leads.',
    formula: { fn: 'sum', terms: ['cc.meta_1.leads', 'cc.meta_2.leads'] },
    valueType: 'count',
    unit: 'lead',
    displayFormat: 'integer',
    evidenceStatus: 'verified',
  }),
  calculated(META_EXPORTS, {
    id: 'cc.meta.campaigns',
    name: 'Meta campaigns',
    description: 'Number of Meta campaigns.',
    formula: { fn: 'count', of: ['cc.meta_1.leads', 'cc.meta_2.leads'] },
    valueType: 'count',
    unit: 'campaign',
    displayFormat: 'integer',
    evidenceStatus: null,
  }),
  calculated(META_EXPORTS, {
    id: 'cc.meta.cpl_min',
    name: 'Lowest Meta campaign CPL',
    description: 'Lower end of the Meta cost-per-recorded-lead range.',
    formula: { fn: 'min', of: ['cc.meta_1.cpl', 'cc.meta_2.cpl'] },
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: null,
  }),
  calculated(META_EXPORTS, {
    id: 'cc.meta.cpl_max',
    name: 'Highest Meta campaign CPL',
    description: 'Upper end of the Meta cost-per-recorded-lead range.',
    formula: { fn: 'max', of: ['cc.meta_1.cpl', 'cc.meta_2.cpl'] },
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: null,
  }),

  /* Google ---------------------------------------------------------- */
  ...googleCampaign(1, 6700.07, 646),
  ...googleCampaign(2, 1814.01, 111),
  ...googleCampaign(3, 370.56, 16),
  calculated(GOOGLE_EXPORTS, {
    id: 'cc.google.spend',
    name: 'Google spend',
    description: 'Spend across the three Google Search campaigns.',
    formula: { fn: 'sum', terms: ['cc.google_1.spend', 'cc.google_2.spend', 'cc.google_3.spend'] },
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: 'documented',
  }),
  calculated(GOOGLE_EXPORTS, {
    id: 'cc.google.clicks',
    name: 'Google Search clicks',
    description: 'Clicks across the three Google Search campaigns. Clicks, not leads.',
    formula: { fn: 'sum', terms: ['cc.google_1.clicks', 'cc.google_2.clicks', 'cc.google_3.clicks'] },
    valueType: 'count',
    unit: 'click',
    displayFormat: 'integer',
    evidenceStatus: 'documented',
  }),
  calculated(GOOGLE_EXPORTS, {
    id: 'cc.google.campaigns',
    name: 'Google Search campaigns',
    description: 'Number of Google Search campaigns.',
    formula: { fn: 'count', of: ['cc.google_1.clicks', 'cc.google_2.clicks', 'cc.google_3.clicks'] },
    valueType: 'count',
    unit: 'campaign',
    displayFormat: 'integer',
    evidenceStatus: null,
  }),
  raw(GOOGLE_EXPORTS, {
    id: 'cc.google.impressions',
    name: 'Google impressions',
    description: 'Impressions across the three Google Search campaigns (recorded as a total only).',
    value: 13216,
    valueType: 'count',
    unit: 'impression',
    displayFormat: 'integer',
    evidenceStatus: 'documented',
  }),
  calculated(GOOGLE_EXPORTS, {
    id: 'cc.google.cpc',
    name: 'Blended Google CPC',
    description: 'Google spend ÷ Google clicks.',
    formula: { fn: 'ratio', numerator: 'cc.google.spend', denominator: 'cc.google.clicks' },
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: 'calculated',
  }),
  calculated(GOOGLE_EXPORTS, {
    id: 'cc.google.ctr',
    name: 'Blended Google CTR',
    description: 'Google clicks ÷ Google impressions × 100.',
    formula: { fn: 'percent', part: 'cc.google.clicks', whole: 'cc.google.impressions' },
    valueType: 'percent',
    unit: 'percent',
    displayFormat: 'percent_2dp',
    evidenceStatus: 'calculated',
  }),
  reportedRate(1, 345),
  reportedRate(2, 476),
  reportedRate(3, 191),

  /* Both channels ----------------------------------------------------- */
  calculated(BOTH, {
    id: 'cc.total.spend',
    name: 'Cross-channel total spend',
    description: 'Meta spend + Google spend across the five campaigns.',
    formula: { fn: 'sum', terms: ['cc.meta.spend', 'cc.google.spend'] },
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: 'documented',
  }),
  calculated(BOTH, {
    id: 'cc.campaigns',
    name: 'Cross-channel campaigns',
    description: 'Meta campaigns + Google Search campaigns.',
    formula: { fn: 'sum', terms: ['cc.meta.campaigns', 'cc.google.campaigns'] },
    valueType: 'count',
    unit: 'campaign',
    displayFormat: 'integer',
    evidenceStatus: null,
  }),
];
