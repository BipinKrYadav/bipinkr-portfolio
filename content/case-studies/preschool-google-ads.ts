import { fmt, metric, metricPair } from '@/lib/metrics';

import { label } from '../anonymise';
import type {
  CaseStudySection,
  CaseStudySummary,
  FlowNode,
  Metric,
} from '../types';

/*
 * Every evidence-backed figure below is rendered from the canonical metric
 * registry (content/evidence/metrics/preschool.ts). No figure is typed here;
 * wording that restates a figure in words is listed in
 * content/evidence/linked-phrases.ts.
 */

const accounts3 = fmt('pre.accounts', 'words');

/**
 * "171 vs 0". The two figures carry different grades (reported / verified);
 * the combined figure has always been shown with the Reported chip.
 */
const reportedVsRecorded = (caption: string) =>
  metricPair('pre.account_a.pmax.reported_funnel_leads', 'pre.account_a.pmax.recorded_conversions', caption, {
    separator: ' vs ',
    evidence: 'reported',
  });

export const summary: CaseStudySummary = {
  slug: 'preschool-google-ads',
  title: 'When Google Ads Numbers Don’t Tell the Whole Story',
  cardTitle: 'Diagnosing Preschool Google Ads',
  subtitle:
    `Diagnosing preschool campaign performance across ${accounts3} accounts, where reported activity and verifiable outcomes didn’t line up.`,
  cardDescription:
    `${fmt('pre.accounts', 'words_capitalised')} preschool Google Ads accounts, reviewed campaign by campaign to work out which reported numbers could carry an optimisation decision and which could not.`,
  metaDescription:
    `Google Ads case study across ${accounts3} preschool accounts: Performance Max, Smart and Search campaign performance, conversion diagnostics, and why reported activity and recorded conversions did not line up.`,
  industry: 'Education / Preschool',
  platform: 'Google Ads',
  order: 3,
  cardMetrics: [
    metric('pre.total.spend', 'documented spend', { format: 'inr_thousands_2dp' }),
    metric('pre.total.recorded_conversions', 'recorded conversions'),
    reportedVsRecorded('reported leads vs recorded conversions'),
  ],
  cta: {
    heading: 'Seeing conversions you can’t confidently explain?',
    body: 'That is worth diagnosing before you spend another rupee against them.',
  },
};

export const sections: CaseStudySection[] = [
  { id: 'terminology', navLabel: 'Terminology', heading: 'One word, defined precisely' },
  { id: 'account-a', navLabel: 'Account A', heading: 'Account A — Performance Max at scale, nothing recorded' },
  { id: 'account-b', navLabel: 'Account B', heading: 'Account B — spend without recorded outcomes' },
  { id: 'account-c', navLabel: 'Account C', heading: 'Account C — the smallest account, the clearest signal' },
  { id: 'checks', navLabel: 'What I checked', heading: 'What I checked' },
  { id: 'diagnosis', navLabel: 'Core diagnosis', heading: 'Where the chain breaks' },
  { id: 'limitations', navLabel: 'Limitations', heading: 'What this diagnosis does not establish' },
];

/** Scope line shown in the hero, e.g. "3 accounts". */
export const heroScope = `${fmt('pre.accounts')} accounts`;

export const heroMetrics: Metric[] = [
  metric('pre.total.spend', 'documented spend', { format: 'inr_thousands_2dp' }),
  metric('pre.accounts', 'preschool Google Ads accounts'),
  metric('pre.total.recorded_conversions', 'recorded conversions'),
  reportedVsRecorded('reported lead-funnel leads vs recorded conversions in one campaign'),
];

export const intro = [
  `${fmt('pre.accounts', 'words_capitalised')} preschool accounts, ${accounts3} different campaign-type mixes, and one recurring problem: the numbers describing activity and the numbers describing outcomes were not talking to each other.`,
  'This page walks each account in turn. It is a diagnosis of what the reporting can and cannot support — not a claim about which campaigns produced admissions.',
];

export const terminology = {
  term: 'Verified conversion',
  definition:
    'A conversion recorded in the platform’s own conversions column.',
  excludes: [
    'An independently verified business outcome',
    'A confirmed admission',
    'A confirmed enquiry',
    'A confirmed qualified lead',
  ],
  note:
    'Every use of “recorded” or “verified conversion” on this page carries the narrow meaning above and nothing more.',
};

export interface AccountCampaign {
  campaign: string;
  spend: string;
  clicks: string;
  cpc?: string;
  conversions: string;
  flag?: string;
}

export interface AccountBlock {
  id: string;
  letter: string;
  name: string;
  /** Account spend and recorded conversions; values and evidence chips from the registry. */
  metrics: Metric[];
  intro: string[];
  campaigns: AccountCampaign[];
  diagnostics?: Metric[];
  note?: string;
  caution?: string;
}

const accountMetrics = (account: 'account_a' | 'account_b' | 'account_c'): Metric[] => [
  metric(`pre.${account}.spend`, 'documented spend'),
  metric(`pre.${account}.recorded_conversions`, 'recorded conversions'),
];

export const accounts: AccountBlock[] = [
  {
    id: 'account-a',
    letter: 'A',
    name: label('Pinwheel', 'Preschool account A'),
    metrics: accountMetrics('account_a'),
    intro: [
      `The largest of the ${accounts3} accounts, and the one where the gap between reported activity and recorded outcomes is widest.`,
      `The Performance Max campaign absorbed the majority of the spend and produced a large volume of clicks at around a rupee each. In one report it shows ${fmt('pre.account_a.pmax.reported_funnel_leads')} lead-funnel leads. In the conversions column it shows nothing.`,
    ],
    campaigns: [
      {
        campaign: 'Performance Max',
        spend: fmt('pre.account_a.pmax.spend'),
        clicks: fmt('pre.account_a.pmax.clicks'),
        cpc: fmt('pre.account_a.pmax.cpc'),
        conversions: fmt('pre.account_a.pmax.recorded_conversions'),
        flag: `${fmt('pre.account_a.pmax.reported_funnel_leads')} reported lead-funnel leads`,
      },
      {
        campaign: 'Search',
        spend: fmt('pre.account_a.search.spend'),
        clicks: fmt('pre.account_a.search.clicks'),
        cpc: fmt('pre.account_a.search.cpc'),
        conversions: fmt('pre.account_a.search.recorded_conversions'),
      },
    ],
    /**
     * The exports also record 0 conversion actions actively recording. That
     * figure is omitted here but still documented in the evidence register,
     * and still shown on the measurement audit case study.
     */
    diagnostics: [
      metric('pre.account_a.conversion_actions.unverified', 'conversion actions unverified'),
      metric('pre.account_a.conversion_actions.no_recent_conversions', 'with no recent conversions'),
    ],
    note: `The two campaigns above are the ones relevant to this diagnosis; together they do not account for the full ${fmt('pre.account_a.spend')} of account spend.`,
    caution:
      `The Search campaign recorded ${fmt('pre.account_a.search.clicks')} clicks. That sample is far too small, and the account’s measurement far too unreliable, to support any conclusion about Search performing better than Performance Max here.`,
  },
  {
    id: 'account-b',
    letter: 'B',
    name: label('Birla Open Minds', 'Preschool account B'),
    metrics: accountMetrics('account_b'),
    intro: [
      'Nearly two thousand recorded clicks across two campaign types, and a single recorded conversion between them.',
      `A Smart campaign spent ${fmt('pre.account_b.smart.spend')} for ${fmt('pre.account_b.smart.clicks')} clicks and recorded nothing. The Search campaign spent nearly four times as much for fewer clicks and recorded one conversion.`,
    ],
    campaigns: [
      {
        campaign: 'Smart',
        spend: fmt('pre.account_b.smart.spend'),
        clicks: fmt('pre.account_b.smart.clicks'),
        conversions: fmt('pre.account_b.smart.recorded_conversions'),
      },
      {
        campaign: 'Search',
        spend: fmt('pre.account_b.search.spend'),
        clicks: fmt('pre.account_b.search.clicks'),
        conversions: fmt('pre.account_b.search.recorded_conversions'),
      },
    ],
    caution:
      'One recorded conversion is not a performance signal. It is a prompt to check whether the conversion action was configured and firing across both campaign types on the same terms.',
  },
  {
    id: 'account-c',
    letter: 'C',
    name: label('Kidzee', 'Preschool account C'),
    metrics: accountMetrics('account_c'),
    intro: [
      `The smallest budget of the ${accounts3}, and the only account where a campaign recorded conversions at a rate that looks internally consistent.`,
      `The Smart campaign recorded ${fmt('pre.account_c.smart.recorded_conversions')} conversions from ${fmt('pre.account_c.smart.clicks')} clicks. A second Search campaign spent slightly more for more clicks and recorded none. The Performance Max campaign could not be assessed at all.`,
    ],
    campaigns: [
      {
        campaign: 'Smart',
        spend: fmt('pre.account_c.smart.spend'),
        clicks: fmt('pre.account_c.smart.clicks'),
        conversions: fmt('pre.account_c.smart.recorded_conversions'),
      },
      {
        campaign: 'Search-2',
        spend: fmt('pre.account_c.search_2.spend'),
        clicks: fmt('pre.account_c.search_2.clicks'),
        conversions: fmt('pre.account_c.search_2.recorded_conversions'),
      },
      {
        campaign: 'Performance Max',
        // Not recorded — renders as "—", never as 0.
        spend: fmt('pre.account_c.pmax.spend'),
        clicks: fmt('pre.account_c.pmax.clicks'),
        conversions: fmt('pre.account_c.pmax.recorded_conversions'),
        flag: 'Conversion tracking setup incomplete',
      },
    ],
    caution:
      'Two campaign types in one account, spending comparable amounts, recording completely different outcomes. That divergence is a measurement question before it is a performance question.',
  },
];

export const checks: string[] = [
  'Conversion recording',
  'Plausibility versus clicks',
  'Platform diagnostics',
  'Report agreement',
  'Campaign-type measurement parity',
  'Ability to tie platform conversions to a defined business event',
];

export const diagnosisIntro = [
  'Every one of these accounts fails at the same place in the same chain. Delivery works. The conversion action exists. What is missing is any dependable link between a recorded event and a business outcome someone at the school would recognise.',
];

export const diagnosisChain: FlowNode[] = [
  { label: 'Campaign delivered', note: 'Clicks and impressions recorded', state: 'ok' },
  { label: 'Conversion action defined', note: 'Actions present in the account', state: 'ok' },
  { label: 'Event recorded', note: 'Recording inconsistent across campaign types', state: 'uncertain' },
  { label: 'Event verified', note: 'Diagnostics show unverified and dormant actions', state: 'uncertain' },
  { label: 'CRM outcome', note: 'Not established by the available evidence', state: 'unknown' },
  { label: 'Business outcome', note: 'Not established by the available evidence', state: 'unknown' },
];

export const diagnosisNote =
  'The chain holds through delivery and breaks at recording and verification. Everything downstream of that break is unknown rather than negative — the evidence does not show that outcomes failed to happen, only that it cannot show whether they did.';

export const pmaxNote = {
  heading: 'Same campaign, two measurement states',
  reported: { value: fmt('pre.account_a.pmax.reported_funnel_leads'), label: 'reported lead-funnel leads' },
  recorded: {
    value: fmt('pre.account_a.pmax.recorded_conversions'),
    label: 'recorded conversions in the platform’s conversion column',
  },
  caution:
    'These are two different reports of the same campaign, not a before-and-after. This is not evidence that the campaign produced no enquiries; it is evidence that the account cannot currently tell you whether it did.',
};

export const limitationsIntro =
  'This diagnosis is based on exported reporting. It does not confirm:';

export const limitations: string[] = [
  'Admissions',
  'Qualified leads',
  'Actual enquiries',
  'Site visits',
  'Sales',
  'Revenue',
  'ROI',
  'ROAS',
  'True cost per acquisition',
  'Lead quality',
  'Lead-to-admission rate',
  'The technical cause of the tracking problems',
  'Whether PMax or Search produced better business outcomes',
];

export const limitationsClosing =
  'This is a diagnosis of exported reporting, not a completed technical tracking implementation. Establishing causes would require access to the live accounts, the tag setup and the conversion action configuration.';
