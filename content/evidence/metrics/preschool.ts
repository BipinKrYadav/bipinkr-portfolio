import type { MetricDefinition, MetricUnit } from '../../../lib/metrics/types';
import type { EvidenceKind } from '../../types';
import { calculated, PERIOD_NOT_RECORDED, raw, type SourceProfile } from '../define';

/**
 * Three preschool Google Ads accounts. Evidence register §6.
 *
 * Accounts use the neutral labels A, B and C. Account totals are stored as
 * exported rather than summed from campaign rows: the listed campaigns do
 * not always add up to the account (A by design, B by a rounding cent).
 */

const GOOGLE_EXPORTS: SourceProfile = {
  dataOrigin: 'platform',
  sourcePlatform: 'google_ads',
  sourceType: 'platform_export',
  sourceReference: 'Google Ads campaign exports for the three preschool accounts (docs/evidence-register.md §6)',
  reportingPeriod: PERIOD_NOT_RECORDED,
};

const GOOGLE_DIAGNOSTICS: SourceProfile = {
  ...GOOGLE_EXPORTS,
  sourceType: 'platform_diagnostics',
  sourceReference: 'Google Ads conversion action diagnostics for preschool account A (docs/evidence-register.md §5)',
};

interface FigureInput {
  id: string;
  name: string;
  description: string;
  value: number | null;
  evidenceStatus: EvidenceKind | null;
  notes?: string;
}

const spend = (input: FigureInput, source = GOOGLE_EXPORTS) =>
  raw(source, { ...input, valueType: 'currency', unit: 'inr', displayFormat: 'inr' });

const count = (input: FigureInput & { unit: MetricUnit }, source = GOOGLE_EXPORTS) =>
  raw(source, { ...input, valueType: 'count', displayFormat: 'integer' });

const cpc = (campaign: string, name: string) =>
  calculated(GOOGLE_EXPORTS, {
    id: `${campaign}.cpc`,
    name: `${name} CPC`,
    description: 'Spend ÷ clicks.',
    formula: { fn: 'ratio', numerator: `${campaign}.spend`, denominator: `${campaign}.clicks` },
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: 'calculated',
  });

const ACCOUNT_TOTAL_NOTE =
  'Account total as exported; not calculated from the campaign rows shown on the page.';

export const preschoolMetrics: MetricDefinition[] = [
  /* Account A — Pinwheel ------------------------------------------- */
  spend({ id: 'pre.account_a.spend', name: 'Account A spend', description: 'Documented spend in preschool account A.', value: 10979.48, evidenceStatus: 'documented', notes: ACCOUNT_TOTAL_NOTE }),
  count({ id: 'pre.account_a.recorded_conversions', name: 'Account A recorded conversions', description: 'Conversions recorded in the platform’s own conversions column.', value: 4, unit: 'conversion', evidenceStatus: 'verified', notes: ACCOUNT_TOTAL_NOTE }),

  spend({ id: 'pre.account_a.pmax.spend', name: 'Account A Performance Max spend', description: 'Spend of the Performance Max campaign in account A.', value: 8637.27, evidenceStatus: 'documented' }),
  count({ id: 'pre.account_a.pmax.clicks', name: 'Account A Performance Max clicks', description: 'Clicks recorded for the Performance Max campaign in account A.', value: 8537, unit: 'click', evidenceStatus: 'documented' }),
  cpc('pre.account_a.pmax', 'Account A Performance Max'),
  count({ id: 'pre.account_a.pmax.recorded_conversions', name: 'Account A Performance Max recorded conversions', description: 'Conversions recorded in the platform’s own conversions column.', value: 0, unit: 'conversion', evidenceStatus: 'verified' }),
  count({ id: 'pre.account_a.pmax.reported_funnel_leads', name: 'Account A Performance Max reported lead-funnel leads', description: 'Lead-funnel leads shown in a separate platform report. Not the conversions column, and not independently corroborated.', value: 171, unit: 'lead', evidenceStatus: 'reported' }),

  spend({ id: 'pre.account_a.search.spend', name: 'Account A Search spend', description: 'Spend of the Search campaign in account A.', value: 928.39, evidenceStatus: 'documented' }),
  count({ id: 'pre.account_a.search.clicks', name: 'Account A Search clicks', description: 'Clicks recorded for the Search campaign in account A.', value: 7, unit: 'click', evidenceStatus: 'documented' }),
  cpc('pre.account_a.search', 'Account A Search'),
  count({ id: 'pre.account_a.search.recorded_conversions', name: 'Account A Search recorded conversions', description: 'Conversions recorded in the platform’s own conversions column.', value: 4, unit: 'conversion', evidenceStatus: 'verified' }),

  count({ id: 'pre.account_a.conversion_actions.unverified', name: 'Account A conversion actions unverified', description: 'Conversion actions flagged unverified by the platform diagnostics.', value: 2, unit: 'conversion_action', evidenceStatus: 'documented' }, GOOGLE_DIAGNOSTICS),
  count({ id: 'pre.account_a.conversion_actions.no_recent_conversions', name: 'Account A conversion actions with no recent conversions', description: 'Conversion actions flagged as having no recent conversions.', value: 9, unit: 'conversion_action', evidenceStatus: 'documented' }, GOOGLE_DIAGNOSTICS),
  count({ id: 'pre.account_a.conversion_actions.actively_recording', name: 'Account A conversion actions actively recording', description: 'Conversion actions actively recording.', value: 0, unit: 'conversion_action', evidenceStatus: 'documented' }, GOOGLE_DIAGNOSTICS),

  /* Account B — Birla Open Minds ------------------------------------ */
  spend({ id: 'pre.account_b.spend', name: 'Account B spend', description: 'Documented spend in preschool account B.', value: 6663.79, evidenceStatus: 'documented', notes: `${ACCOUNT_TOTAL_NOTE} Its two campaigns sum to ₹6,663.78 (export rounding).` }),
  count({ id: 'pre.account_b.recorded_conversions', name: 'Account B recorded conversions', description: 'Conversions recorded in the platform’s own conversions column.', value: 1, unit: 'conversion', evidenceStatus: 'verified', notes: ACCOUNT_TOTAL_NOTE }),
  spend({ id: 'pre.account_b.smart.spend', name: 'Account B Smart spend', description: 'Spend of the Smart campaign in account B.', value: 1395.16, evidenceStatus: null }),
  count({ id: 'pre.account_b.smart.clicks', name: 'Account B Smart clicks', description: 'Clicks recorded for the Smart campaign in account B.', value: 1171, unit: 'click', evidenceStatus: null }),
  count({ id: 'pre.account_b.smart.recorded_conversions', name: 'Account B Smart recorded conversions', description: 'Conversions recorded in the platform’s own conversions column.', value: 0, unit: 'conversion', evidenceStatus: null }),
  spend({ id: 'pre.account_b.search.spend', name: 'Account B Search spend', description: 'Spend of the Search campaign in account B.', value: 5268.62, evidenceStatus: null }),
  count({ id: 'pre.account_b.search.clicks', name: 'Account B Search clicks', description: 'Clicks recorded for the Search campaign in account B.', value: 759, unit: 'click', evidenceStatus: null }),
  count({ id: 'pre.account_b.search.recorded_conversions', name: 'Account B Search recorded conversions', description: 'Conversions recorded in the platform’s own conversions column.', value: 1, unit: 'conversion', evidenceStatus: null }),

  /* Account C — Kidzee ---------------------------------------------- */
  spend({ id: 'pre.account_c.spend', name: 'Account C spend', description: 'Documented spend in preschool account C.', value: 2544.29, evidenceStatus: 'documented', notes: ACCOUNT_TOTAL_NOTE }),
  count({ id: 'pre.account_c.recorded_conversions', name: 'Account C recorded conversions', description: 'Conversions recorded in the platform’s own conversions column.', value: 7, unit: 'conversion', evidenceStatus: 'verified', notes: ACCOUNT_TOTAL_NOTE }),
  spend({ id: 'pre.account_c.smart.spend', name: 'Account C Smart spend', description: 'Spend of the Smart campaign in account C.', value: 1247.53, evidenceStatus: null }),
  count({ id: 'pre.account_c.smart.clicks', name: 'Account C Smart clicks', description: 'Clicks recorded for the Smart campaign in account C.', value: 195, unit: 'click', evidenceStatus: null }),
  count({ id: 'pre.account_c.smart.recorded_conversions', name: 'Account C Smart recorded conversions', description: 'Conversions recorded in the platform’s own conversions column.', value: 7, unit: 'conversion', evidenceStatus: null }),
  spend({ id: 'pre.account_c.search_2.spend', name: 'Account C Search-2 spend', description: 'Spend of the Search-2 campaign in account C.', value: 1296.76, evidenceStatus: null }),
  count({ id: 'pre.account_c.search_2.clicks', name: 'Account C Search-2 clicks', description: 'Clicks recorded for the Search-2 campaign in account C.', value: 259, unit: 'click', evidenceStatus: null }),
  count({ id: 'pre.account_c.search_2.recorded_conversions', name: 'Account C Search-2 recorded conversions', description: 'Conversions recorded in the platform’s own conversions column.', value: 0, unit: 'conversion', evidenceStatus: null }),
  spend({ id: 'pre.account_c.pmax.spend', name: 'Account C Performance Max spend', description: 'Spend of the Performance Max campaign in account C.', value: null, evidenceStatus: null, notes: 'Not recorded: conversion tracking setup incomplete.' }),
  count({ id: 'pre.account_c.pmax.clicks', name: 'Account C Performance Max clicks', description: 'Clicks for the Performance Max campaign in account C.', value: null, unit: 'click', evidenceStatus: null, notes: 'Not recorded: conversion tracking setup incomplete.' }),
  count({ id: 'pre.account_c.pmax.recorded_conversions', name: 'Account C Performance Max recorded conversions', description: 'Conversions for the Performance Max campaign in account C.', value: null, unit: 'conversion', evidenceStatus: null, notes: 'Not recorded: conversion tracking setup incomplete. Not the same as zero.' }),

  /* Totals ------------------------------------------------------------ */
  calculated(GOOGLE_EXPORTS, {
    id: 'pre.total.spend',
    name: 'Preschool accounts total spend',
    description: 'Documented spend across the three preschool accounts.',
    formula: { fn: 'sum', terms: ['pre.account_a.spend', 'pre.account_b.spend', 'pre.account_c.spend'] },
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: 'documented',
  }),
  calculated(GOOGLE_EXPORTS, {
    id: 'pre.total.recorded_conversions',
    name: 'Preschool accounts total recorded conversions',
    description: 'Recorded conversions across the three preschool accounts.',
    formula: {
      fn: 'sum',
      terms: ['pre.account_a.recorded_conversions', 'pre.account_b.recorded_conversions', 'pre.account_c.recorded_conversions'],
    },
    valueType: 'count',
    unit: 'conversion',
    displayFormat: 'integer',
    evidenceStatus: 'verified',
  }),
  calculated(GOOGLE_EXPORTS, {
    id: 'pre.accounts',
    name: 'Preschool Google Ads accounts',
    description: 'Number of preschool accounts reviewed.',
    formula: { fn: 'count', of: ['pre.account_a.spend', 'pre.account_b.spend', 'pre.account_c.spend'] },
    valueType: 'count',
    unit: 'account',
    displayFormat: 'integer',
    evidenceStatus: 'documented',
  }),
];
