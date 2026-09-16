import { fmt, metric, metricPair, metricValue } from '@/lib/metrics';

import { label } from '../anonymise';
import type {
  CaseStudySection,
  CaseStudySummary,
  DataTableContent,
  Metric,
} from '../types';

/*
 * Every evidence-backed figure below is rendered from the canonical metric
 * registry (content/evidence/metrics/meta-real-estate.ts). No figure is typed
 * here; wording that restates a figure in words is listed in
 * content/evidence/linked-phrases.ts.
 */

const cohortCpls = metricPair('re.cohort_2025.cpl', 're.cohort_2026.cpl', 'cohort CPL');
const cohortLeads = metricPair('re.cohort_2025.leads', 're.cohort_2026.leads', 'recorded leads');
const top5Count = fmt('re.top5.campaign_count', 'words_capitalised');

export const summary: CaseStudySummary = {
  slug: 'meta-lead-generation',
  /**
   * Editorial SEO title and H1 — deliberately fixed text, not rendered from
   * metrics, so a changed figure never silently rewrites the page title.
   * The figures it quotes are tracked in content/evidence/linked-phrases.ts
   * and must be reviewed by hand if re.cohort_2025.cpl or re.cohort_2026.cpl
   * changes.
   */
  title: 'From ₹106.66 to ₹32.29 CPL: Scaling Meta Lead Generation in Patna',
  cardTitle: 'Scaling Meta Lead Generation in Patna',
  subtitle:
    `${cohortLeads.value} leads across observed campaign cohorts, while reported CPL fell ${fmt('re.cohort.cpl_change_pct')}.`,
  cardDescription:
    'Residential real estate lead generation on Meta across two campaign cohorts — what the exports show about spend, lead volume and cost per lead, and what they do not.',
  metaDescription:
    'Meta Ads lead generation case study for residential real estate in Patna: cohort CPL comparison, campaign-level evidence, result-type breakdown and stated measurement limitations.',
  industry: 'Real Estate',
  platform: 'Meta Ads',
  order: 1,
  cardMetrics: [
    cohortCpls,
    cohortLeads,
    metric('re.form_submissions', 'Meta form submissions'),
  ],
  cta: {
    heading: 'Running Meta lead campaigns?',
    body: 'Let us look at your numbers.',
  },
};

/** Also rendered as the section heading on the page. */
export const campaignsHeading = `${top5Count} campaigns that carried the volume`;

export const sections: CaseStudySection[] = [
  { id: 'context', navLabel: 'Context', heading: 'Context' },
  { id: 'methodology', navLabel: 'How to read this', heading: 'How to read this comparison' },
  { id: 'cohorts', navLabel: 'Cohort comparison', heading: 'The cohort comparison' },
  { id: 'result-types', navLabel: 'Result types', heading: 'What Meta was actually optimising for' },
  { id: 'campaigns', navLabel: 'Campaign evidence', heading: campaignsHeading },
  { id: 'variants', navLabel: 'Variant observations', heading: 'Variant observations' },
  { id: 'blended', navLabel: 'Conservative blend', heading: 'The conservative blended number' },
  { id: 'scale', navLabel: 'Operational scale', heading: 'Operational scale' },
  { id: 'limitations', navLabel: 'Limitations', heading: 'What this evidence does not establish' },
  { id: 'takeaway', navLabel: 'Takeaway', heading: 'Takeaway' },
];

export const heroMetrics: Metric[] = [
  metric('re.cohort_2025.cpl', '2025 cohort CPL'),
  metric('re.cohort_2026.cpl', '2026 cohort CPL'),
  cohortLeads,
  metric('re.cohort.cpl_change_pct', 'reported CPL reduction'),
];

export const context = [
  { term: 'Industry', value: 'Real Estate' },
  { term: 'Platform', value: 'Meta Ads' },
  { term: 'Market', value: 'Patna + surrounding Bihar cities' },
  { term: 'Campaign focus', value: 'Residential real estate lead generation' },
];

export const methodology = {
  body: [
    'The cohorts below are grouped by campaign start year and include only campaigns that recorded results.',
    'This is an observed comparison, not a controlled before/after experiment. Spend levels, projects, creative and platform delivery all changed between the two cohorts, so the difference in cost per lead cannot be attributed to any single decision.',
  ],
  labelPrimary: 'Observed campaign cohorts',
  labelSecondary: 'Not a controlled experiment',
};

export interface Cohort {
  name: string;
  spend: string;
  leads: string;
  cpl: string;
  /**
   * Unrounded values the comparison chart scales against. Bar lengths are
   * computed from these, so the chart can never disagree with the figures.
   */
  cplValue: number | null;
  leadsValue: number | null;
}

function cohort(name: string, key: 'cohort_2025' | 'cohort_2026'): Cohort {
  return {
    name,
    spend: fmt(`re.${key}.spend`),
    leads: fmt(`re.${key}.leads`),
    cpl: fmt(`re.${key}.cpl`),
    cplValue: metricValue(`re.${key}.cpl`),
    leadsValue: metricValue(`re.${key}.leads`),
  };
}

export const cohorts: Cohort[] = [cohort('2025 cohort', 'cohort_2025'), cohort('2026 cohort', 'cohort_2026')];

export const cohortObservations: string[] = [
  `Spend increased approximately ${fmt('re.cohort.spend_multiple')}.`,
  `Lead volume increased approximately ${fmt('re.cohort.lead_multiple')}.`,
  `Reported CPL fell ${fmt('re.cohort.cpl_change_pct')} across the observed cohorts.`,
];

export const resultTypesTable: DataTableContent = {
  caption: 'Meta result types and reported cost per result',
  columns: [
    { key: 'type', header: 'Result type' },
    { key: 'cost', header: 'Cost per result', numeric: true },
  ],
  rows: [
    { type: 'Messaging conversations', cost: fmt('re.result_type.messaging.cost_per_result') },
    { type: 'Standard lead generation', cost: fmt('re.result_type.standard_lead.cost_per_result') },
    { type: 'Meta quality-lead optimisation', cost: fmt('re.result_type.quality_lead.cost_per_result') },
    { type: 'Native calls', cost: fmt('re.result_type.native_call.cost_per_result') },
  ],
  note: `Meta quality-lead optimisation is a platform optimisation setting with its own reported cost per result. The ${fmt('re.result_type.quality_lead.cost_per_result')} figure is not a measure of independently verified, human-qualified leads and is not described as one anywhere on this site.`,
};

/** The sentence beside the “Not independently verified” chip under the table. */
export const resultTypesChipNote = `The ${fmt('re.result_type.quality_lead.cost_per_result')} figure is Meta’s cost per quality-optimised result, not a verified human-qualified lead cost.`;

export const resultTypesCommentary = [
  'These four result types are not interchangeable. A messaging conversation, a lead form submission, a quality-optimised lead and a native call are different events with different downstream value, so comparing their cost per result only means something once you have decided which event actually matters to the business.',
  'That decision is a business question rather than a platform question — and it is the one worth settling before any of these numbers is used to move budget.',
];

export const campaignsIntro = `${top5Count} campaigns account for ${fmt('re.top5.leads')} of the recorded leads. The spread between the cheapest and the most expensive is close to ${fmt('re.top5.cpl_spread')}, which is the more useful number: it says the difference sits in the campaign, not in the platform.`;

export const campaignsTable: DataTableContent = {
  caption: `${top5Count} campaigns by recorded leads and cost per lead`,
  columns: [
    { key: 'campaign', header: 'Campaign' },
    { key: 'leads', header: 'Recorded leads', numeric: true },
    { key: 'cpl', header: 'CPL', numeric: true },
  ],
  rows: [
    { campaign: label('SCE Gayatri', 'Project A'), leads: fmt('re.project_a.leads'), cpl: fmt('re.project_a.cpl') },
    { campaign: label('Nutan Construction Project 4', 'Project B'), leads: fmt('re.project_b.leads'), cpl: fmt('re.project_b.cpl') },
    { campaign: label('South City Centre 2', 'Project C'), leads: fmt('re.project_c.leads'), cpl: fmt('re.project_c.cpl') },
    { campaign: label('Balaji Leads', 'Project D'), leads: fmt('re.project_d.leads'), cpl: fmt('re.project_d.cpl') },
    { campaign: label('Garden Leads', 'Project E'), leads: fmt('re.project_e.leads'), cpl: fmt('re.project_e.cpl') },
  ],
  footRow: {
    campaign: `Combined — ${fmt('re.top5.spend')} spend`,
    leads: fmt('re.top5.leads'),
    cpl: `${fmt('re.top5.cpl')} blended`,
  },
  note: `Blended CPL is combined spend divided by combined recorded leads across these ${fmt('re.top5.campaign_count', 'words')} campaigns only. It is not the account-level figure.`,
};

export interface VariantObservation {
  campaign: string;
  original: { spend: string; leads: string; cpl: string };
  variant: { spend: string; leads: string; cpl: string };
}

/** One side of a variant pair. A CPL with no recorded results renders as a bare "—". */
function variantSide(base: string, resultsWord: string) {
  return {
    spend: fmt(`${base}.spend`),
    leads: `${fmt(`${base}.leads`)} ${resultsWord}`,
    cpl: fmt(`${base}.cpl`, undefined, { suffix: ' CPL' }),
  };
}

export const variantsIntro = `${fmt('re.variant.campaign_count', 'words_capitalised')} campaigns ran alongside a variant. The exports record what each one spent and produced; they do not record why the variant was created.`;

export const variantObservations: VariantObservation[] = [
  {
    campaign: label('Aqua City', 'Project F'),
    original: variantSide('re.variant.project_f.original', 'leads'),
    variant: variantSide('re.variant.project_f.variant', 'leads'),
  },
  {
    campaign: label('Urmila', 'Project G'),
    original: variantSide('re.variant.project_g.original', 'leads'),
    variant: variantSide('re.variant.project_g.variant', 'leads'),
  },
  {
    campaign: label('South City Centre', 'Project C'),
    original: variantSide('re.variant.project_c.original', 'leads'),
    variant: variantSide('re.variant.project_c.variant', 'results'),
  },
];

export const variantNote =
  'The exports show performance differences between campaign variants, but they do not establish the original decision rationale. Nothing here should be read as a claim that a particular creative or copy change caused a particular outcome.';

export const blendedMetrics: Metric[] = [
  metric('re.form_submissions', 'Meta form submissions'),
  metric('re.blended_cpl', 'conservative blended CPL'),
];

export const blendedMethodology = [
  `${fmt('re.blended_cpl')} divides all lead-objective spend by Meta form submissions, and it includes ${fmt('re.zero_result_lead_spend')} of lead campaigns that recorded no results.`,
  'A more flattering figure is available by excluding that spend. It is not used here. Spend that produced no recorded result is still spend, and a cost-per-lead number that quietly removes it is not a number worth planning a budget against.',
];

export interface ScaleItem {
  value: string;
  label: string;
}

/**
 * A subset of the documented scope, not all of it. The exports also record
 * age ranges and lead-related result types (see docs/evidence-register.md);
 * both are omitted here because they add breadth without telling the reader
 * anything they can act on. Removing evidence is always safe — it can only
 * under-claim.
 */
export const operationalScale: ScaleItem[] = [
  { value: fmt('re.structure.campaigns'), label: 'campaigns' },
  { value: fmt('re.structure.ad_sets'), label: 'ad sets' },
  { value: fmt('re.structure.ads'), label: 'ads / creatives' },
  { value: fmt('re.structure.cities'), label: 'Bihar cities' },
  /**
   * Campaign objectives (awareness, engagement, leads) — the campaign level
   * of Meta's taxonomy. Not the same as the lead optimisation goals recorded
   * at ad set level, which the evidence register still documents separately.
   * Only lead-objective spend feeds the conservative blended CPL.
   */
  { value: fmt('re.structure.objectives'), label: 'campaign objectives' },
];

export const scaleNote = `The exports record that Hindi and English creative variants existed. They do not record a language attribute for every creative, so ${fmt('re.structure.ads')} is a count of ads, not a count of bilingual creative pairs.`;

export const limitationsIntro =
  'The available evidence covers platform-recorded activity. It does not confirm any of the following:';

export const limitations: string[] = [
  'Qualified lead rate',
  'Site visits',
  'Bookings',
  'Sales',
  'Revenue',
  'Lead-to-sale rate',
  'True cost per acquisition',
  'Offline attribution',
];

export const takeaway = {
  heading: 'Scaling lead volume is only half the job.',
  body: [
    'The cohort data shows what a paid social account can do once structure, targeting and creative volume are working: more spend absorbed, considerably more recorded leads, a materially lower reported cost per lead.',
    'It also shows the ceiling of platform-only measurement. Every figure on this page stops at the form submission. The next layer — and the more valuable one — is connecting ad-platform results with lead quality and downstream business outcomes, so that cheaper leads can be tested against better leads rather than assumed to mean the same thing.',
  ],
};
