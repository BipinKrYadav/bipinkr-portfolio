import { label } from '../anonymise';
import type {
  CaseStudySection,
  CaseStudySummary,
  DataTableContent,
  Metric,
} from '../types';

export const summary: CaseStudySummary = {
  slug: 'meta-lead-generation',
  title: 'From ₹106.66 to ₹32.29 CPL: Scaling Meta Lead Generation in Patna',
  cardTitle: 'Scaling Meta Lead Generation in Patna',
  subtitle:
    '77 → 1,540 leads across observed campaign cohorts, while reported CPL fell 69.7%.',
  cardDescription:
    'Residential real estate lead generation on Meta across two campaign cohorts — what the exports show about spend, lead volume and cost per lead, and what they do not.',
  metaDescription:
    'Meta Ads lead generation case study for residential real estate in Patna: cohort CPL comparison, campaign-level evidence, result-type breakdown and stated measurement limitations.',
  industry: 'Real Estate',
  platform: 'Meta Ads',
  order: 1,
  cardMetrics: [
    { value: '₹106.66 → ₹32.29', label: 'cohort CPL', evidence: 'calculated' },
    { value: '77 → 1,540', label: 'recorded leads', evidence: 'verified' },
    { value: '1,617', label: 'Meta form submissions', evidence: 'verified' },
  ],
  cta: {
    heading: 'Running Meta lead campaigns?',
    body: 'Let us look at your numbers.',
  },
};

export const sections: CaseStudySection[] = [
  { id: 'context', navLabel: 'Context', heading: 'Context' },
  { id: 'methodology', navLabel: 'How to read this', heading: 'How to read this comparison' },
  { id: 'cohorts', navLabel: 'Cohort comparison', heading: 'The cohort comparison' },
  { id: 'result-types', navLabel: 'Result types', heading: 'What Meta was actually optimising for' },
  { id: 'campaigns', navLabel: 'Campaign evidence', heading: 'Five campaigns that carried the volume' },
  { id: 'variants', navLabel: 'Variant observations', heading: 'Variant observations' },
  { id: 'blended', navLabel: 'Conservative blend', heading: 'The conservative blended number' },
  { id: 'scale', navLabel: 'Operational scale', heading: 'Operational scale' },
  { id: 'limitations', navLabel: 'Limitations', heading: 'What this evidence does not establish' },
  { id: 'takeaway', navLabel: 'Takeaway', heading: 'Takeaway' },
];

export const heroMetrics: Metric[] = [
  { value: '₹106.66', label: '2025 cohort CPL', evidence: 'calculated' },
  { value: '₹32.29', label: '2026 cohort CPL', evidence: 'calculated' },
  { value: '77 → 1,540', label: 'recorded leads', evidence: 'verified' },
  { value: '69.7%', label: 'reported CPL reduction', evidence: 'calculated' },
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
  /** Relative bar length, 0–1, used by the comparison chart. */
  cplRatio: number;
  leadRatio: number;
}

export const cohorts: Cohort[] = [
  {
    name: '2025 cohort',
    spend: '₹8,212.69',
    leads: '77',
    cpl: '₹106.66',
    cplRatio: 1,
    leadRatio: 77 / 1540,
  },
  {
    name: '2026 cohort',
    spend: '₹49,722.95',
    leads: '1,540',
    cpl: '₹32.29',
    cplRatio: 32.29 / 106.66,
    leadRatio: 1,
  },
];

export const cohortObservations: string[] = [
  'Spend increased approximately 6×.',
  'Lead volume increased approximately 20×.',
  'Reported CPL fell 69.7% across the observed cohorts.',
];

export const resultTypesTable: DataTableContent = {
  caption: 'Meta result types and reported cost per result',
  columns: [
    { key: 'type', header: 'Result type' },
    { key: 'cost', header: 'Cost per result', numeric: true },
  ],
  rows: [
    { type: 'Messaging conversations', cost: '₹31.33' },
    { type: 'Standard lead generation', cost: '₹39.12' },
    { type: 'Meta quality-lead optimisation', cost: '₹50.22' },
    { type: 'Native calls', cost: '₹157.48' },
  ],
  note: 'Meta quality-lead optimisation is a platform optimisation setting with its own reported cost per result. The ₹50.22 figure is not a measure of independently verified, human-qualified leads and is not described as one anywhere on this site.',
};

export const resultTypesCommentary = [
  'These four result types are not interchangeable. A messaging conversation, a lead form submission, a quality-optimised lead and a native call are different events with different downstream value, so comparing their cost per result only means something once you have decided which event actually matters to the business.',
  'That decision is a business question rather than a platform question — and it is the one worth settling before any of these numbers is used to move budget.',
];

export const campaignsTable: DataTableContent = {
  caption: 'Five campaigns by recorded leads and cost per lead',
  columns: [
    { key: 'campaign', header: 'Campaign' },
    { key: 'leads', header: 'Recorded leads', numeric: true },
    { key: 'cpl', header: 'CPL', numeric: true },
  ],
  rows: [
    { campaign: label('SCE Gayatri', 'Project A'), leads: '296', cpl: '₹19.37' },
    { campaign: label('Nutan Construction Project 4', 'Project B'), leads: '341', cpl: '₹21.87' },
    { campaign: label('South City Centre 2', 'Project C'), leads: '71', cpl: '₹29.62' },
    { campaign: label('Balaji Leads', 'Project D'), leads: '181', cpl: '₹30.91' },
    { campaign: label('Garden Leads', 'Project E'), leads: '281', cpl: '₹34.84' },
  ],
  footRow: { campaign: 'Combined — ₹30,678.43 spend', leads: '1,170', cpl: '₹26.22 blended' },
  note: 'Blended CPL is combined spend divided by combined recorded leads across these five campaigns only. It is not the account-level figure.',
};

export interface VariantObservation {
  campaign: string;
  original: { spend: string; leads: string; cpl: string };
  variant: { spend: string; leads: string; cpl: string };
}

export const variantObservations: VariantObservation[] = [
  {
    campaign: label('Aqua City', 'Project F'),
    original: { spend: '₹2,519', leads: '34 leads', cpl: '₹74.09 CPL' },
    variant: { spend: '₹7,180', leads: '190 leads', cpl: '₹37.79 CPL' },
  },
  {
    campaign: label('Urmila', 'Project G'),
    original: { spend: '₹419', leads: '4 leads', cpl: '₹104.66 CPL' },
    variant: { spend: '₹733', leads: '12 leads', cpl: '₹61.09 CPL' },
  },
  {
    campaign: label('South City Centre', 'Project C'),
    original: { spend: '₹2,103', leads: '71 leads', cpl: '₹29.62 CPL' },
    variant: { spend: '₹105', leads: '0 results', cpl: '—' },
  },
];

export const variantNote =
  'The exports show performance differences between campaign variants, but they do not establish the original decision rationale. Nothing here should be read as a claim that a particular creative or copy change caused a particular outcome.';

export const blendedMetrics: Metric[] = [
  { value: '1,617', label: 'Meta form submissions', evidence: 'verified' },
  { value: '₹40.77', label: 'conservative blended CPL', evidence: 'calculated' },
];

export const blendedMethodology = [
  '₹40.77 divides all lead-objective spend by Meta form submissions, and it includes ₹7,990.31 of lead campaigns that recorded no results.',
  'A more flattering figure is available by excluding that spend. It is not used here. Spend that produced no recorded result is still spend, and a cost-per-lead number that quietly removes it is not a number worth planning a budget against.',
];

export interface ScaleItem {
  value: string;
  label: string;
}

/**
 * A subset of the documented scope, not all of it. The exports also record
 * 13 age ranges and 4 lead-related result types (see docs/evidence-register.md);
 * both are omitted here because they add breadth without telling the reader
 * anything they can act on. Removing evidence is always safe — it can only
 * under-claim.
 */
export const operationalScale: ScaleItem[] = [
  { value: '48', label: 'campaigns' },
  { value: '51', label: 'ad sets' },
  { value: '83', label: 'ads / creatives' },
  { value: '6', label: 'Bihar cities' },
  /**
   * Campaign objectives (awareness, engagement, leads) — the campaign level
   * of Meta's taxonomy. Not the same as the 2 lead optimisation goals recorded
   * at ad set level, which the evidence register still documents separately.
   * Only lead-objective spend feeds the ₹40.77 blended CPL.
   */
  { value: '3', label: 'campaign objectives' },
];

export const scaleNote =
  'The exports record that Hindi and English creative variants existed. They do not record a language attribute for every creative, so 83 is a count of ads, not a count of bilingual creative pairs.';

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
