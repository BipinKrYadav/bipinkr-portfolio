import { fmt, metric, metricRow } from '@/lib/metrics';

import type {
  CaseStudySection,
  CaseStudySummary,
  DataTableContent,
  Metric,
} from '../types';

/*
 * Every evidence-backed figure below is rendered from the canonical metric
 * registry (content/evidence/metrics). No figure is typed here; wording that
 * restates a figure in words is listed in content/evidence/linked-phrases.ts.
 */

const placeholderValue = fmt('audit.placeholder_conversion_value');

export const summary: CaseStudySummary = {
  slug: 'measurement-audit',
  title: 'I Audited My Own Ad Accounts Before Optimising Them',
  cardTitle: 'Auditing My Own Ad Accounts',
  subtitle: `${fmt('audit.unreliable_share', 'percent_0dp')} of the spend was reporting numbers I could not trust.`,
  cardDescription:
    `A review of ${fmt('site.accounts', 'words')} ad accounts across Meta and Google, carried out before treating any performance number as a basis for optimisation.`,
  metaDescription:
    `A measurement audit of ${fmt('site.accounts', 'words')} Meta and Google ad accounts: inflated conversion reporting, placeholder values, unverified conversion actions and incomplete tracking, with the limitations stated.`,
  industry: 'Multi-account',
  platform: 'Meta + Google Ads',
  order: 2,
  cardMetrics: [
    metric('site.spend_total', 'documented spend reviewed'),
    metric('audit.unreliable_spend', 'tied to unreliable measurement', { format: 'inr_thousands_1dp' }),
    metric('audit.unreliable_share', 'of documented spend'),
  ],
  cta: {
    heading: 'Not sure whether your conversion data is trustworthy?',
    body: 'That is exactly what a free ad audit is for.',
  },
};

export const sections: CaseStudySection[] = [
  { id: 'situation', navLabel: 'Situation', heading: 'The situation' },
  { id: 'checks', navLabel: 'What I checked', heading: 'What I checked' },
  { id: 'scale', navLabel: 'Scale of the issue', heading: 'The scale of the issue' },
  { id: 'failure-modes', navLabel: 'Four failure modes', heading: 'Four failure modes' },
  { id: 'campaign-types', navLabel: 'Two campaign types', heading: 'Two campaign types, two measurement states' },
  { id: 'lesson', navLabel: 'Central lesson', heading: 'The central lesson' },
  { id: 'limitations', navLabel: 'Limitations', heading: 'What this review does not establish' },
];

export const heroMetrics: Metric[] = [
  metric('site.spend_total', 'documented spend'),
  metric('site.accounts', 'accounts'),
  metric('audit.unreliable_spend', 'associated with unreliable, unverified or inflated measurement', {
    format: 'inr_thousands_1dp',
  }),
  metric('audit.unreliable_share', 'of documented spend'),
];

export const situation = [
  `${fmt('site.accounts', 'words_capitalised')} ad accounts across Meta and Google were reviewed before treating performance numbers as optimisation truth.`,
  'The order matters. Optimising against a conversion column you have not checked is not optimisation — it is guessing with extra steps. So before any budget decision, the question was narrower and duller: do these numbers describe something real, and do they describe the same thing consistently?',
  'For roughly a third of the documented spend, the answer was no.',
];

export const situationNote =
  'The exact technical cause of every issue was not established from the exports alone, and none is asserted here.';

export const auditChecks: { title: string; description: string }[] = [
  {
    title: 'Conversion recording',
    description: 'Whether the account records conversions at all, and in which column.',
  },
  {
    title: 'Conversion plausibility vs clicks',
    description: 'Whether reported conversion counts and rates are arithmetically possible given recorded click volume.',
  },
  {
    title: 'Conversion diagnostics',
    description: 'The platform’s own status flags on each conversion action.',
  },
  {
    title: 'Placeholder values',
    description: 'Conversion values that are defaults or stand-ins rather than real business values.',
  },
  {
    title: 'Agreement between reports',
    description: 'Whether campaign-level and account-level figures reconcile with each other.',
  },
  {
    title: 'Measurement parity across campaign types',
    description: 'Whether different campaign types in the same account are measured on comparable terms.',
  },
  {
    title: 'Conversion-action status',
    description: 'Whether each conversion action is verified, active and currently recording.',
  },
  {
    title: 'Platform events vs business outcomes',
    description: 'Whether a recorded platform event can be tied to a defined business outcome at all.',
  },
];

/** The funnel visual: documented spend narrowing to the affected share. */
export const scaleFlow = [
  {
    label: 'Documented spend reviewed',
    value: fmt('site.spend_total', 'inr_whole', { lowerBoundMarker: true }),
    tone: 'neutral' as const,
  },
  { label: 'Spend where measurement did not hold up', value: fmt('audit.unreliable_spend'), tone: 'flag' as const },
  { label: 'Share of documented spend', value: fmt('audit.unreliable_share'), tone: 'flag' as const },
];

export interface FailureMode {
  number: string;
  title: string;
  summary: string;
  body: string[];
  metrics?: Metric[];
  table?: DataTableContent;
  caution: string;
}

export const failureModes: FailureMode[] = [
  {
    number: '01',
    title: 'Inflated conversion reporting',
    summary: 'Reported conversion rates that cannot be reconciled with recorded click volume.',
    body: [
      `One Google account reported campaign-level conversion rates far above 100%, alongside an account-level figure of ${fmt('audit.acct_inflated.conv_rate')}.`,
      'A conversion rate above 100% is not automatically an error — duplicate counting, multi-conversion actions and attribution settings can all produce one legitimately. What it is, always, is a signal to stop and check before the number is used to justify a budget change.',
    ],
    metrics: [
      metric('audit.acct_inflated.spend', 'spend in the affected account'),
      metric('audit.acct_inflated.conv_rate', 'account-level reported conversion rate'),
    ],
    table: {
      caption: 'Campaign-level reported conversion rates in the affected account',
      columns: [
        { key: 'campaign', header: 'Campaign' },
        { key: 'rate', header: 'Reported conversion rate', numeric: true },
      ],
      rows: [1, 2, 3, 4].map((n) => ({
        campaign: `Campaign ${n}`,
        rate: fmt(`audit.acct_inflated.campaign_${n}.conv_rate`),
      })),
      footRow: { campaign: 'Account level', rate: fmt('audit.acct_inflated.conv_rate') },
      note: 'Campaigns are numbered rather than named here because the point is the pattern across the account, not any individual campaign.',
    },
    caution:
      'The exports show mathematically implausible conversion reporting; the precise technical cause was not established from the exports alone.',
  },
  {
    number: '02',
    title: 'Placeholder values',
    summary: `Conversion values recorded as ${placeholderValue} rather than a real business value.`,
    body: [
      `${fmt('audit.placeholder_value_campaigns', 'words_capitalised')} campaigns contained ${placeholderValue} conversion values.`,
      `A ${placeholderValue} value is a placeholder, not a price. Any downstream figure built on it — conversion value, value per conversion, ROAS — inherits the placeholder and reports it as though it were revenue.`,
    ],
    metrics: [
      metric('audit.placeholder_value_campaigns', `campaigns with ${placeholderValue} conversion values`),
    ],
    caution:
      'Value-based reporting was therefore not meaningful for those campaigns, and no value-based metric from them appears anywhere on this site.',
  },
  {
    number: '03',
    title: 'Unverified or inactive conversion actions',
    summary: 'Conversion actions present in the account but not verified and not currently recording.',
    body: [
      'In one preschool account, the platform’s own diagnostics flagged a set of conversion actions as unverified or dormant, while campaigns in that account continued to spend.',
      'The Performance Max campaign in the same account is the clearest illustration: substantial click volume at a low cost per click, a lead-funnel figure reported in one place, and nothing at all in the conversions column.',
    ],
    metrics: [
      metric('pre.account_a.spend', 'spend in the affected account'),
      metric('pre.account_a.conversion_actions.unverified', 'conversion actions unverified'),
      metric('pre.account_a.conversion_actions.no_recent_conversions', 'with no recent conversions'),
      metric('pre.account_a.conversion_actions.actively_recording', 'actively recording'),
    ],
    caution:
      'A campaign recording 0 conversions in the platform’s conversion column is a statement about measurement, not about whether the campaign produced enquiries. This review does not establish that it produced none.',
  },
  {
    number: '04',
    title: 'Incomplete or zero-result tracking',
    summary: 'Spend running against campaigns with no usable recorded outcome.',
    body: [
      'Across two further preschool accounts and a set of Meta website lead campaigns, spend accumulated against tracking that was incomplete or recorded no results.',
      'This is the least dramatic failure mode and the most common one. Nothing looks broken on the surface; the account simply cannot answer the question it is being asked.',
    ],
    metrics: [
      metric('audit.incomplete_tracking.spend', 'combined spend'),
      metric('audit.incomplete_tracking.sources', 'sources: two preschool accounts and Meta website lead campaigns'),
    ],
    caution:
      'This describes the state of the recorded tracking. It does not establish that these campaigns generated no enquiries, and it does not identify the technical cause.',
  },
];

export const failureModesNote = `The three spend figures above — ${fmt('audit.acct_inflated.spend')}, ${fmt('pre.account_a.spend')} and ${fmt('audit.incomplete_tracking.spend')} — sum to the ${fmt('audit.unreliable_spend')} quoted at the top of this page.`;

export interface CampaignTypeCard {
  name: string;
  rows: { term: string; value: string; evidence?: Metric['evidence'] }[];
}

export const campaignTypes: CampaignTypeCard[] = [
  {
    name: 'Performance Max',
    rows: [
      metricRow('Spend', 'pre.account_a.pmax.spend'),
      metricRow('Clicks', 'pre.account_a.pmax.clicks'),
      metricRow('CPC', 'pre.account_a.pmax.cpc'),
      metricRow('Recorded conversions', 'pre.account_a.pmax.recorded_conversions'),
    ],
  },
  {
    name: 'Search',
    rows: [
      metricRow('Spend', 'pre.account_a.search.spend'),
      metricRow('Clicks', 'pre.account_a.search.clicks'),
      metricRow('CPC', 'pre.account_a.search.cpc'),
      metricRow('Recorded conversions', 'pre.account_a.search.recorded_conversions'),
    ],
  },
];

export const campaignTypesIntro =
  'Two campaign types in the same account, presented side by side because they were measured on completely different terms — not because one of them won.';

export const campaignTypesCaution =
  'This is not evidence that Search outperformed PMax. The sample and measurement conditions are not comparable enough to make that conclusion.';

export const lesson = {
  heading: 'The first optimisation decision was measurement integrity — not scaling.',
  body: [
    'Every action available in an ads platform — raising budgets, pausing campaigns, shifting spend between channels, changing bid strategy — depends on the conversion column being a reasonable description of reality.',
    'Where it is not, optimisation does not merely fail to help. It actively moves budget towards whichever campaign happens to be miscounting most confidently.',
    'So the first piece of work in these accounts was not a scaling decision. It was establishing which numbers had earned the right to be optimised against.',
  ],
};

export const limitationsIntro =
  'This review was carried out on exported reporting. It does not establish:';

export const limitations: string[] = [
  'Revenue',
  'Qualified leads',
  'Sales',
  'Bookings',
  'ROAS',
  'Reliable cost per acquisition',
  'The precise technical cause of any issue',
  'Actual business outcomes',
  'Lead quality',
];

export const limitationsClosing =
  'This was a review of exported reporting, not a technical tracking audit of the live accounts. A live audit — tag firing, event parameters, conversion action configuration, deduplication — is a separate piece of work and would be needed to establish causes.';
