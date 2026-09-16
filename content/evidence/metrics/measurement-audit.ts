import type { MetricDefinition } from '../../../lib/metrics/types';
import { calculated, legacyFixed, PERIOD_NOT_RECORDED, raw, type SourceProfile } from '../define';

/**
 * Measurement audit across the documented accounts. Evidence register §5.
 *
 * The affected preschool account's spend and conversion diagnostics live in
 * preschool.ts and are referenced from here, not duplicated.
 */

const GOOGLE_EXPORTS: SourceProfile = {
  dataOrigin: 'platform',
  sourcePlatform: 'google_ads',
  sourceType: 'platform_export',
  sourceReference: 'Google Ads campaign exports for the account with inflated conversion reporting (docs/evidence-register.md §5)',
  reportingPeriod: PERIOD_NOT_RECORDED,
};

const MIXED_EXPORTS: SourceProfile = {
  ...GOOGLE_EXPORTS,
  sourcePlatform: 'meta_and_google_ads',
  sourceReference: 'Meta Ads and Google Ads campaign exports reviewed in the measurement audit (docs/evidence-register.md §5)',
};

const campaignRate = (n: number, value: number) =>
  raw(GOOGLE_EXPORTS, {
    id: `audit.acct_inflated.campaign_${n}.conv_rate`,
    name: `Inflated account — campaign ${n} reported conversion rate`,
    description: 'Campaign-level conversion rate as reported by Google Ads. Cannot be reconciled with recorded click volume.',
    value,
    valueType: 'percent',
    unit: 'percent',
    displayFormat: 'percent_0dp',
    evidenceStatus: 'reported',
  });

export const measurementAuditMetrics: MetricDefinition[] = [
  calculated(MIXED_EXPORTS, {
    id: 'audit.unreliable_spend',
    name: 'Spend with unreliable, unverified or inflated measurement',
    description: 'Sum of the three affected areas: inflated reporting, unverified conversion actions, incomplete tracking.',
    formula: {
      fn: 'sum',
      terms: ['audit.acct_inflated.spend', 'pre.account_a.spend', 'audit.incomplete_tracking.spend'],
    },
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: 'calculated',
    notes: 'Spend where the reporting could not be trusted — not spend that was necessarily wasted.',
  }),
  legacyFixed(MIXED_EXPORTS, {
    id: 'audit.unreliable_share',
    name: 'Share of documented spend with unreliable measurement',
    description: 'Unreliable-measurement spend as a percentage of total documented spend.',
    value: 34.9,
    valueType: 'percent',
    unit: 'percent',
    displayFormat: 'percent_1dp',
    evidenceStatus: 'calculated',
    legacyMethodNote:
      '₹38,898.65 ÷ total documented spend. The exact total is not stored (site.spend_total is a lower bound), so the published share is held fixed; 34.9% implies a total between ₹1,11,298 and ₹1,11,617. Becomes a formula once the exact total is entered.',
  }),
  raw(GOOGLE_EXPORTS, {
    id: 'audit.acct_inflated.spend',
    name: 'Inflated-reporting account spend',
    description: 'Spend in the Google Ads account with mathematically implausible conversion reporting.',
    value: 10638.93,
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: 'documented',
  }),
  raw(GOOGLE_EXPORTS, {
    id: 'audit.acct_inflated.conv_rate',
    name: 'Inflated account — account-level reported conversion rate',
    description: 'Account-level conversion rate as reported by Google Ads.',
    value: 256,
    valueType: 'percent',
    unit: 'percent',
    displayFormat: 'percent_0dp',
    evidenceStatus: 'reported',
  }),
  campaignRate(1, 345),
  campaignRate(2, 476),
  campaignRate(3, 160),
  campaignRate(4, 133),
  raw(GOOGLE_EXPORTS, {
    id: 'audit.placeholder_value_campaigns',
    name: 'Campaigns with placeholder conversion values',
    description: 'Campaigns whose conversion values were recorded as a placeholder rather than a real business value.',
    value: 3,
    valueType: 'count',
    unit: 'campaign',
    displayFormat: 'integer',
    evidenceStatus: 'documented',
  }),
  raw(GOOGLE_EXPORTS, {
    id: 'audit.placeholder_conversion_value',
    name: 'Placeholder conversion value',
    description: 'The placeholder value recorded per conversion in those campaigns.',
    value: 1,
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr_whole',
    evidenceStatus: null,
  }),
  raw(MIXED_EXPORTS, {
    id: 'audit.incomplete_tracking.spend',
    name: 'Spend with incomplete or zero-result tracking',
    description: 'Combined spend across two preschool accounts and a set of Meta website lead campaigns.',
    value: 17280.24,
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: 'documented',
    notes: 'Stored as published, not summed: the Meta website-lead component is not stored separately.',
  }),
  raw(MIXED_EXPORTS, {
    id: 'audit.incomplete_tracking.sources',
    name: 'Sources with incomplete or zero-result tracking',
    description: 'Two preschool accounts and the Meta website lead campaigns.',
    value: 3,
    valueType: 'count',
    unit: 'source',
    displayFormat: 'integer',
    evidenceStatus: 'documented',
  }),
];
