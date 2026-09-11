import { label } from '../anonymise';
import type {
  CaseStudySection,
  CaseStudySummary,
  FlowNode,
  Metric,
} from '../types';

export const summary: CaseStudySummary = {
  slug: 'preschool-google-ads',
  title: 'When Google Ads Numbers Don’t Tell the Whole Story',
  cardTitle: 'Diagnosing Preschool Google Ads',
  subtitle:
    'Diagnosing preschool campaign performance across three accounts, where reported activity and verifiable outcomes didn’t line up.',
  cardDescription:
    'Three preschool Google Ads accounts, reviewed campaign by campaign to work out which reported numbers could carry an optimisation decision and which could not.',
  metaDescription:
    'Google Ads case study across three preschool accounts: Performance Max, Smart and Search campaign performance, conversion diagnostics, and why reported activity and recorded conversions did not line up.',
  industry: 'Education / Preschool',
  platform: 'Google Ads',
  order: 3,
  cardMetrics: [
    { value: '₹20.19K', label: 'documented spend', evidence: 'documented' },
    { value: '12', label: 'recorded conversions', evidence: 'verified' },
    { value: '171 vs 0', label: 'reported leads vs recorded conversions', evidence: 'reported' },
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

export const heroMetrics: Metric[] = [
  { value: '₹20.19K', label: 'documented spend', evidence: 'documented' },
  { value: '3', label: 'preschool Google Ads accounts', evidence: 'documented' },
  { value: '12', label: 'recorded conversions', evidence: 'verified' },
  {
    value: '171 vs 0',
    label: 'reported lead-funnel leads vs recorded conversions in one campaign',
    evidence: 'reported',
  },
];

export const intro = [
  'Three preschool accounts, three different campaign-type mixes, and one recurring problem: the numbers describing activity and the numbers describing outcomes were not talking to each other.',
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
  spend: string;
  recordedConversions: string;
  intro: string[];
  campaigns: AccountCampaign[];
  diagnostics?: Metric[];
  note?: string;
  caution?: string;
}

export const accounts: AccountBlock[] = [
  {
    id: 'account-a',
    letter: 'A',
    name: label('Pinwheel', 'Preschool account A'),
    spend: '₹10,979.48',
    recordedConversions: '4',
    intro: [
      'The largest of the three accounts, and the one where the gap between reported activity and recorded outcomes is widest.',
      'The Performance Max campaign absorbed the majority of the spend and produced a large volume of clicks at around a rupee each. In one report it shows 171 lead-funnel leads. In the conversions column it shows nothing.',
    ],
    campaigns: [
      {
        campaign: 'Performance Max',
        spend: '₹8,637.27',
        clicks: '8,537',
        cpc: '₹1.01',
        conversions: '0',
        flag: '171 reported lead-funnel leads',
      },
      {
        campaign: 'Search',
        spend: '₹928.39',
        clicks: '7',
        cpc: '₹132.63',
        conversions: '4',
      },
    ],
    /**
     * The exports also record 0 conversion actions actively recording. That
     * figure is omitted here but still documented in the evidence register,
     * and still shown on the measurement audit case study.
     */
    diagnostics: [
      { value: '2', label: 'conversion actions unverified', evidence: 'documented' },
      { value: '9', label: 'with no recent conversions', evidence: 'documented' },
    ],
    note: 'The two campaigns above are the ones relevant to this diagnosis; together they do not account for the full ₹10,979.48 of account spend.',
    caution:
      'The Search campaign recorded 7 clicks. That sample is far too small, and the account’s measurement far too unreliable, to support any conclusion about Search performing better than Performance Max here.',
  },
  {
    id: 'account-b',
    letter: 'B',
    name: label('Birla Open Minds', 'Preschool account B'),
    spend: '₹6,663.79',
    recordedConversions: '1',
    intro: [
      'Nearly two thousand recorded clicks across two campaign types, and a single recorded conversion between them.',
      'A Smart campaign spent ₹1,395.16 for 1,171 clicks and recorded nothing. The Search campaign spent nearly four times as much for fewer clicks and recorded one conversion.',
    ],
    campaigns: [
      { campaign: 'Smart', spend: '₹1,395.16', clicks: '1,171', conversions: '0' },
      { campaign: 'Search', spend: '₹5,268.62', clicks: '759', conversions: '1' },
    ],
    caution:
      'One recorded conversion is not a performance signal. It is a prompt to check whether the conversion action was configured and firing across both campaign types on the same terms.',
  },
  {
    id: 'account-c',
    letter: 'C',
    name: label('Kidzee', 'Preschool account C'),
    spend: '₹2,544.29',
    recordedConversions: '7',
    intro: [
      'The smallest budget of the three, and the only account where a campaign recorded conversions at a rate that looks internally consistent.',
      'The Smart campaign recorded 7 conversions from 195 clicks. A second Search campaign spent slightly more for more clicks and recorded none. The Performance Max campaign could not be assessed at all.',
    ],
    campaigns: [
      { campaign: 'Smart', spend: '₹1,247.53', clicks: '195', conversions: '7' },
      { campaign: 'Search-2', spend: '₹1,296.76', clicks: '259', conversions: '0' },
      {
        campaign: 'Performance Max',
        spend: '—',
        clicks: '—',
        conversions: '—',
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
  reported: { value: '171', label: 'reported lead-funnel leads' },
  recorded: { value: '0', label: 'recorded conversions in the platform’s conversion column' },
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
