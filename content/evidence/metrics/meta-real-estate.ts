import type { MetricDefinition } from '../../../lib/metrics/types';
import {
  calculated,
  cohortPeriod,
  legacyFixed,
  PERIOD_NOT_RECORDED,
  raw,
  type SourceProfile,
} from '../define';

/**
 * Meta lead generation for residential real estate. Evidence register §4.
 *
 * Entities use the neutral labels from content/anonymise.ts (Project A–G),
 * so ids never carry a client or campaign name.
 */

const META_EXPORTS: SourceProfile = {
  dataOrigin: 'platform',
  sourcePlatform: 'meta_ads',
  sourceType: 'platform_export',
  sourceReference: 'Meta Ads campaign, ad set and ad exports (docs/evidence-register.md §4)',
  reportingPeriod: PERIOD_NOT_RECORDED,
};

const OWNER_CONFIRMED: SourceProfile = {
  dataOrigin: 'owner_confirmed',
  sourcePlatform: 'meta_ads',
  sourceType: 'owner_confirmation',
  sourceReference: 'Confirmed by the account owner; not read from the exports (docs/evidence-register.md §4)',
  reportingPeriod: PERIOD_NOT_RECORDED,
};

const COHORT_2025 = { ...META_EXPORTS, reportingPeriod: cohortPeriod(2025) };
const COHORT_2026 = { ...META_EXPORTS, reportingPeriod: cohortPeriod(2026) };
const BOTH_COHORTS = {
  ...META_EXPORTS,
  reportingPeriod: {
    ...PERIOD_NOT_RECORDED,
    basis: 'campaign_start_year' as const,
    description: 'Compares the 2025 and 2026 campaign-start-year cohorts (campaigns that recorded results).',
  },
};

/* ------------------------------------------------------------------ */
/* Cohorts                                                             */
/* ------------------------------------------------------------------ */

const cohortMetrics: MetricDefinition[] = [
  raw(COHORT_2025, {
    id: 're.cohort_2025.spend',
    name: '2025 cohort spend',
    description: 'Spend of campaigns started in 2025 that recorded results.',
    value: 8212.69,
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: 'documented',
  }),
  raw(COHORT_2025, {
    id: 're.cohort_2025.leads',
    name: '2025 cohort recorded leads',
    description: 'Lead results recorded by Meta for the 2025 cohort.',
    value: 77,
    valueType: 'count',
    unit: 'lead',
    displayFormat: 'integer',
    evidenceStatus: 'verified',
  }),
  calculated(COHORT_2025, {
    id: 're.cohort_2025.cpl',
    name: '2025 cohort CPL',
    description: 'Cost per recorded lead for the 2025 cohort.',
    formula: { fn: 'ratio', numerator: 're.cohort_2025.spend', denominator: 're.cohort_2025.leads' },
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: 'calculated',
  }),
  raw(COHORT_2026, {
    id: 're.cohort_2026.spend',
    name: '2026 cohort spend',
    description: 'Spend of campaigns started in 2026 that recorded results.',
    value: 49722.95,
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: 'documented',
  }),
  raw(COHORT_2026, {
    id: 're.cohort_2026.leads',
    name: '2026 cohort recorded leads',
    description: 'Lead results recorded by Meta for the 2026 cohort.',
    value: 1540,
    valueType: 'count',
    unit: 'lead',
    displayFormat: 'integer',
    evidenceStatus: 'verified',
  }),
  calculated(COHORT_2026, {
    id: 're.cohort_2026.cpl',
    name: '2026 cohort CPL',
    description: 'Cost per recorded lead for the 2026 cohort.',
    formula: { fn: 'ratio', numerator: 're.cohort_2026.spend', denominator: 're.cohort_2026.leads' },
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: 'calculated',
  }),
  calculated(BOTH_COHORTS, {
    id: 're.cohort.cpl_change_pct',
    name: 'Reported CPL fall across cohorts',
    description: 'Percentage fall in cohort CPL from the 2025 to the 2026 cohort. An observed comparison, not a controlled experiment.',
    formula: { fn: 'pct_decrease', from: 're.cohort_2025.cpl', to: 're.cohort_2026.cpl' },
    valueType: 'percent',
    unit: 'percent',
    displayFormat: 'percent_1dp',
    evidenceStatus: 'calculated',
  }),
  calculated(BOTH_COHORTS, {
    id: 're.cohort.spend_multiple',
    name: 'Cohort spend multiple',
    description: '2026 cohort spend as a multiple of 2025 cohort spend.',
    formula: { fn: 'multiple', value: 're.cohort_2026.spend', base: 're.cohort_2025.spend' },
    valueType: 'multiple',
    unit: 'multiple',
    displayFormat: 'multiple_0dp',
    evidenceStatus: null,
  }),
  calculated(BOTH_COHORTS, {
    id: 're.cohort.lead_multiple',
    name: 'Cohort lead-volume multiple',
    description: '2026 cohort recorded leads as a multiple of 2025 cohort recorded leads.',
    formula: { fn: 'multiple', value: 're.cohort_2026.leads', base: 're.cohort_2025.leads' },
    valueType: 'multiple',
    unit: 'multiple',
    displayFormat: 'multiple_0dp',
    evidenceStatus: null,
  }),
];

/* ------------------------------------------------------------------ */
/* Result types                                                        */
/* ------------------------------------------------------------------ */

const resultType = (
  key: string,
  name: string,
  value: number,
  evidenceStatus: 'reported' | 'unverified',
  notes?: string,
) =>
  raw(META_EXPORTS, {
    id: `re.result_type.${key}.cost_per_result`,
    name: `Cost per result — ${name}`,
    description: `Meta-reported cost per result for the “${name}” result type.`,
    value,
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus,
    notes,
  });

const resultTypeMetrics: MetricDefinition[] = [
  resultType('messaging', 'Messaging conversations', 31.33, 'reported'),
  resultType('standard_lead', 'Standard lead generation', 39.12, 'reported'),
  resultType(
    'quality_lead',
    'Meta quality-lead optimisation',
    50.22,
    'unverified',
    'Meta’s cost per quality-optimised result. Not a qualified-lead cost and never labelled as one (docs/claims-ledger.md §1).',
  ),
  resultType('native_call', 'Native calls', 157.48, 'reported'),
];

/* ------------------------------------------------------------------ */
/* The five campaigns that carried the volume                          */
/* ------------------------------------------------------------------ */

const TOP5_CPL_NOTE =
  'Per-campaign spend is not stored in the repository, so the published CPL is held exactly as published.';

/** "project_c" → "Project C" */
const projectLabel = (project: string) => `Project ${project.slice(-1).toUpperCase()}`;

const top5Leads = (project: string, value: number) =>
  raw(META_EXPORTS, {
    id: `re.${project}.leads`,
    name: `${projectLabel(project)} recorded leads`,
    description: 'Lead results recorded by Meta for this campaign.',
    value,
    valueType: 'count',
    unit: 'lead',
    displayFormat: 'integer',
    evidenceStatus: null,
  });

const top5LegacyCpl = (project: string, value: number, notes?: string) =>
  legacyFixed(META_EXPORTS, {
    id: `re.${project}.cpl`,
    name: `${projectLabel(project)} CPL`,
    description: 'Cost per recorded lead for this campaign, as published.',
    value,
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: null,
    legacyMethodNote: TOP5_CPL_NOTE,
    notes,
  });

const TOP5_LEADS = ['re.project_a.leads', 're.project_b.leads', 're.project_c.leads', 're.project_d.leads', 're.project_e.leads'];
const TOP5_CPLS = ['re.project_a.cpl', 're.project_b.cpl', 're.project_c.cpl', 're.project_d.cpl', 're.project_e.cpl'];

const top5Metrics: MetricDefinition[] = [
  top5Leads('project_a', 296),
  top5Leads('project_b', 341),
  top5Leads('project_c', 71),
  top5Leads('project_d', 181),
  top5Leads('project_e', 281),
  top5LegacyCpl('project_a', 19.37),
  top5LegacyCpl('project_b', 21.87),
  top5LegacyCpl(
    'project_c',
    29.62,
    'The variant observations record an original “South City Centre” campaign with the same 71 leads and ₹29.62 CPL. It is not linked to this row because the campaign names differ (“South City Centre 2”) and the repository does not establish that they are the same campaign.',
  ),
  top5LegacyCpl(
    'project_d',
    30.91,
    'The cross-channel case study records a Meta campaign with the same name (“Balaji Leads”), 181 leads and ₹5,595.49 spend (cc.meta_1.*). It is kept separate: a matching name alone does not establish that both case studies draw on the same evidence record.',
  ),
  top5LegacyCpl('project_e', 34.84),
  raw(META_EXPORTS, {
    id: 're.top5.spend',
    name: 'Five-campaign combined spend',
    description: 'Combined spend of the five campaigns that carried the lead volume.',
    value: 30678.43,
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: null,
    notes: 'Stored as published: per-campaign spend is not stored, so it cannot be summed.',
  }),
  calculated(META_EXPORTS, {
    id: 're.top5.leads',
    name: 'Five-campaign recorded leads',
    description: 'Recorded leads across the five campaigns.',
    formula: { fn: 'sum', terms: TOP5_LEADS },
    valueType: 'count',
    unit: 'lead',
    displayFormat: 'integer',
    evidenceStatus: null,
  }),
  calculated(META_EXPORTS, {
    id: 're.top5.cpl',
    name: 'Five-campaign blended CPL',
    description: 'Combined spend ÷ combined recorded leads, across these five campaigns only. Not the account-level figure.',
    formula: { fn: 'ratio', numerator: 're.top5.spend', denominator: 're.top5.leads' },
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: null,
  }),
  calculated(META_EXPORTS, {
    id: 're.top5.cpl_spread',
    name: 'Five-campaign CPL spread',
    description: 'Most expensive campaign CPL ÷ cheapest campaign CPL.',
    formula: { fn: 'spread', of: TOP5_CPLS },
    valueType: 'multiple',
    unit: 'multiple',
    displayFormat: 'multiple_1dp',
    evidenceStatus: null,
  }),
  calculated(META_EXPORTS, {
    id: 're.top5.campaign_count',
    name: 'Campaigns carrying the volume',
    description: 'Number of campaigns in the five-campaign table.',
    formula: { fn: 'count', of: TOP5_LEADS },
    valueType: 'count',
    unit: 'campaign',
    displayFormat: 'integer',
    evidenceStatus: null,
  }),
];

/* ------------------------------------------------------------------ */
/* Variant observations                                                */
/* ------------------------------------------------------------------ */

const ROUNDED_SPEND_NOTE = 'Published to the whole rupee; the unrounded export value is not stored.';

function variantSide(
  project: string,
  side: 'original' | 'variant',
  spend: number,
  leads: number,
  cpl: { legacy: number; note: string } | 'calculated',
): MetricDefinition[] {
  const base = `re.variant.${project}.${side}`;
  const label = `${projectLabel(project)} ${side}`;

  return [
    raw(META_EXPORTS, {
      id: `${base}.spend`,
      name: `${label} spend`,
      description: `Spend of the ${side} campaign in this variant pair.`,
      value: spend,
      precision: 'rounded_published',
      valueType: 'currency',
      unit: 'inr',
      displayFormat: 'inr_whole',
      evidenceStatus: null,
      notes: ROUNDED_SPEND_NOTE,
    }),
    raw(META_EXPORTS, {
      id: `${base}.leads`,
      name: `${label} recorded results`,
      description: `Lead results recorded by Meta for the ${side} campaign.`,
      value: leads,
      valueType: 'count',
      unit: 'lead',
      displayFormat: 'integer',
      evidenceStatus: null,
    }),
    cpl === 'calculated'
      ? calculated(META_EXPORTS, {
          id: `${base}.cpl`,
          name: `${label} CPL`,
          description: `Cost per recorded lead for the ${side} campaign. Shows “—” when no results were recorded.`,
          formula: { fn: 'ratio', numerator: `${base}.spend`, denominator: `${base}.leads` },
          valueType: 'currency',
          unit: 'inr',
          displayFormat: 'inr',
          evidenceStatus: null,
        })
      : legacyFixed(META_EXPORTS, {
          id: `${base}.cpl`,
          name: `${label} CPL`,
          description: `Cost per recorded lead for the ${side} campaign, as published.`,
          value: cpl.legacy,
          valueType: 'currency',
          unit: 'inr',
          displayFormat: 'inr',
          evidenceStatus: null,
          legacyMethodNote: cpl.note,
        }),
  ];
}

const variantMetrics: MetricDefinition[] = [
  // Project F — “Aqua City”
  ...variantSide('project_f', 'original', 2519, 34, 'calculated'),
  ...variantSide('project_f', 'variant', 7180, 190, 'calculated'),
  // Project G — “Urmila”
  ...variantSide('project_g', 'original', 419, 4, {
    legacy: 104.66,
    note: '₹419 ÷ 4 = ₹104.75, not the published ₹104.66: the published CPL was calculated from an unrounded spend that is not stored. Held fixed until that spend is entered.',
  }),
  ...variantSide('project_g', 'variant', 733, 12, {
    legacy: 61.09,
    note: '₹733 ÷ 12 = ₹61.08, not the published ₹61.09: the published CPL was calculated from an unrounded spend that is not stored. Held fixed until that spend is entered.',
  }),
  // Project C — “South City Centre”
  ...variantSide('project_c', 'original', 2103, 71, 'calculated'),
  ...variantSide('project_c', 'variant', 105, 0, 'calculated'),
  calculated(META_EXPORTS, {
    id: 're.variant.campaign_count',
    name: 'Campaigns run alongside a variant',
    description: 'Number of campaigns in the variant observations.',
    formula: {
      fn: 'count',
      of: ['re.variant.project_f.original.spend', 're.variant.project_g.original.spend', 're.variant.project_c.original.spend'],
    },
    valueType: 'count',
    unit: 'campaign',
    displayFormat: 'integer',
    evidenceStatus: null,
  }),
];

/* ------------------------------------------------------------------ */
/* Blended figure and scale                                            */
/* ------------------------------------------------------------------ */

const blendedMetrics: MetricDefinition[] = [
  raw(META_EXPORTS, {
    id: 're.form_submissions',
    name: 'Meta form submissions',
    description: 'Lead form submissions recorded by Meta. Not qualified leads.',
    value: 1617,
    valueType: 'count',
    unit: 'form_submission',
    displayFormat: 'integer',
    evidenceStatus: 'verified',
    notes:
      'Equals 77 + 1,540 (the two cohorts), but the repository does not document it as defined by that sum, so it is stored as its own figure rather than calculated.',
  }),
  raw(META_EXPORTS, {
    id: 're.zero_result_lead_spend',
    name: 'Lead-objective spend with no recorded results',
    description: 'Spend on lead campaigns that recorded no results. Included in the conservative blended CPL.',
    value: 7990.31,
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: null,
  }),
  legacyFixed(META_EXPORTS, {
    id: 're.blended_cpl',
    name: 'Conservative blended CPL',
    description: 'All lead-objective spend ÷ Meta form submissions, including spend on lead campaigns with no recorded results.',
    value: 40.77,
    valueType: 'currency',
    unit: 'inr',
    displayFormat: 'inr',
    evidenceStatus: 'calculated',
    legacyMethodNote:
      '(₹8,212.69 + ₹49,722.95 + ₹7,990.31) ÷ 1,617 reproduces ₹40.77, but the repository does not confirm that this is the full lead-objective spend, so the published figure is held fixed. Headline lock: docs/claims-ledger.md §3.',
  }),
];

const structure = (key: string, name: string, value: number, unit: 'campaign' | 'ad_set' | 'ad' | 'city') =>
  raw(META_EXPORTS, {
    id: `re.structure.${key}`,
    name,
    description: `${name} documented in the exports.`,
    value,
    valueType: 'count',
    unit,
    displayFormat: 'integer',
    evidenceStatus: null,
  });

const scaleMetrics: MetricDefinition[] = [
  structure('campaigns', 'Campaigns', 48, 'campaign'),
  structure('ad_sets', 'Ad sets', 51, 'ad_set'),
  raw(META_EXPORTS, {
    id: 're.structure.ads',
    name: 'Ads / creatives',
    description: 'Ads documented in the exports. A count of ads, not of bilingual creative pairs.',
    value: 83,
    valueType: 'count',
    unit: 'ad',
    displayFormat: 'integer',
    evidenceStatus: null,
  }),
  structure('cities', 'Bihar cities', 6, 'city'),
  raw(OWNER_CONFIRMED, {
    id: 're.structure.objectives',
    name: 'Campaign objectives',
    description: 'Campaign objectives used: awareness, engagement and leads.',
    value: 3,
    valueType: 'count',
    unit: 'objective',
    displayFormat: 'integer',
    evidenceStatus: null,
    notes: 'Distinct from the 2 lead optimisation goals recorded at ad set level (evidence register §4).',
  }),
];

export const metaRealEstateMetrics: MetricDefinition[] = [
  ...cohortMetrics,
  ...resultTypeMetrics,
  ...top5Metrics,
  ...variantMetrics,
  ...blendedMetrics,
  ...scaleMetrics,
];
