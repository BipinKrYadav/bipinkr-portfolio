import { label } from '../anonymise';
import type {
  CaseStudySection,
  CaseStudySummary,
  DataTableContent,
  Metric,
} from '../types';

export const summary: CaseStudySummary = {
  slug: 'cross-channel-real-estate',
  title: 'Cross-Channel Lead Generation for Real Estate: Meta + Google Ads',
  cardTitle: 'Cross-Channel Meta + Google Ads',
  subtitle:
    '₹15,772.75 managed across five campaigns — with 191 verified Meta leads and 773 Google Search clicks.',
  cardDescription:
    'Paid acquisition documented across two platforms for one residential real estate client, and what it takes before the two can honestly be compared.',
  metaDescription:
    'Cross-channel real estate case study covering Meta Ads and Google Search: spend, leads, clicks, CPC and CTR across five campaigns, plus why a cross-channel cost-per-lead comparison was not made.',
  industry: 'Real Estate',
  platform: 'Meta + Google Ads',
  order: 4,
  cardMetrics: [
    { value: '₹15,772.75', label: 'managed across five campaigns', evidence: 'documented' },
    { value: '191', label: 'verified Meta leads', evidence: 'verified' },
    { value: '773', label: 'Google Search clicks', evidence: 'documented' },
  ],
  cta: {
    heading: 'Running both Meta and Google Ads?',
    body: 'Let us look at your numbers.',
  },
};

export const sections: CaseStudySection[] = [
  { id: 'context', navLabel: 'Context', heading: 'Context' },
  { id: 'meta', navLabel: 'Meta', heading: 'Meta — two campaigns, 191 verified leads' },
  { id: 'google', navLabel: 'Google', heading: 'Google — three Search campaigns, 773 clicks' },
  { id: 'comparison', navLabel: 'Side by side', heading: 'The two channels side by side' },
  { id: 'limitation', navLabel: 'Measurement limit', heading: 'Why there is no cross-channel CPL here' },
  { id: 'limitations', navLabel: 'Limitations', heading: 'What this evidence does not establish' },
  { id: 'takeaway', navLabel: 'Takeaway', heading: 'Takeaway' },
];

export const heroMetrics: Metric[] = [
  { value: '₹15,772.75', label: 'documented spend across five campaigns', evidence: 'documented' },
  { value: '191', label: 'verified Meta leads', evidence: 'verified' },
  { value: '773', label: 'Google Search clicks', evidence: 'documented' },
  { value: '5.85%', label: 'blended Google CTR', evidence: 'calculated' },
];

export const context = [
  { term: 'Client', value: 'Patna-based residential real estate' },
  { term: 'Platforms', value: 'Meta Ads + Google Ads' },
  { term: 'Campaigns', value: '5 (2 Meta, 3 Google Search)' },
  { term: 'Documented spend', value: '₹15,772.75' },
];

export const contextIntro = [
  'A Patna-based residential real estate client, with paid acquisition activity documented across two platforms.',
  'The exports record what each campaign spent and delivered. They do not record a common start and end date for every campaign, so nothing here should be read as a claim that all five campaigns were necessarily running concurrently.',
];

export const metaTable: DataTableContent = {
  caption: 'Meta campaigns',
  columns: [
    { key: 'campaign', header: 'Campaign' },
    { key: 'spend', header: 'Spend', numeric: true },
    { key: 'leads', header: 'Verified leads', numeric: true },
    { key: 'cpl', header: 'Cost per lead', numeric: true },
  ],
  rows: [
    {
      campaign: label('Balaji Leads', 'Meta campaign 1'),
      spend: '₹5,595.49',
      leads: '181',
      cpl: '₹30.91',
    },
    {
      campaign: label('Balaji Exotica', 'Meta campaign 2'),
      spend: '₹1,292.62',
      leads: '10',
      cpl: '₹129.26',
    },
  ],
  footRow: { campaign: 'Total Meta', spend: '₹6,888.11', leads: '191', cpl: '—' },
  note: '“Verified leads” means lead form submissions recorded by Meta. It does not mean independently qualified leads, and lead quality is not established by this evidence.',
};

export const metaCommentary = [
  'The two Meta campaigns produced very different cost per lead — ₹30.91 against ₹129.26 — on the same platform, for the same client, in the same market.',
  'That spread is the useful part. It says the difference sits in the campaign itself: the project, the offer, the audience or the creative. Those are testable. A blended Meta average across both would have hidden it.',
];

export const googleTable: DataTableContent = {
  caption: 'Google Search campaigns',
  columns: [
    { key: 'campaign', header: 'Campaign' },
    { key: 'spend', header: 'Spend', numeric: true },
    { key: 'clicks', header: 'Clicks', numeric: true },
  ],
  rows: [
    { campaign: label('Balaji Project Search', 'Google campaign 1'), spend: '₹6,700.07', clicks: '646' },
    { campaign: label('Search-5', 'Google campaign 2'), spend: '₹1,814.01', clicks: '111' },
    { campaign: label('Search-2', 'Google campaign 3'), spend: '₹370.56', clicks: '16' },
  ],
  footRow: { campaign: 'Total Google', spend: '₹8,884.64', clicks: '773' },
  note: 'Clicks are clicks. They are not leads, and they are not treated as leads anywhere on this page.',
};

export const googleMetrics: Metric[] = [
  { value: '₹8,884.64', label: 'Google spend', evidence: 'documented' },
  { value: '773', label: 'clicks', evidence: 'documented' },
  { value: '₹11.49', label: 'blended CPC', evidence: 'calculated' },
  { value: '13,216', label: 'impressions', evidence: 'documented' },
  { value: '5.85%', label: 'blended CTR', evidence: 'calculated' },
];

export interface ChannelPanel {
  channel: string;
  spend: string;
  outcomeValue: string;
  outcomeLabel: string;
  outcomeEvidence: Metric['evidence'];
  rows: { term: string; value: string }[];
  caveat?: string;
}

export const channelPanels: ChannelPanel[] = [
  {
    channel: 'Meta',
    spend: '₹6,888.11',
    outcomeValue: '191',
    outcomeLabel: 'verified Meta leads',
    outcomeEvidence: 'verified',
    rows: [
      { term: 'Campaigns', value: '2' },
      { term: 'Recorded outcome', value: 'Lead form submissions' },
      { term: 'Cost per recorded lead', value: '₹30.91 – ₹129.26' },
    ],
  },
  {
    channel: 'Google',
    spend: '₹8,884.64',
    outcomeValue: '773',
    outcomeLabel: 'Search clicks',
    outcomeEvidence: 'documented',
    rows: [
      { term: 'Campaigns', value: '3' },
      { term: 'Recorded outcome', value: 'Clicks, impressions, CTR, CPC' },
      { term: 'Cost per recorded lead', value: 'Not calculable' },
    ],
    caveat: 'Google lead count is not verified from the available evidence.',
  },
];

export const comparisonCaution =
  'These panels are deliberately not aligned into a single winner-versus-loser comparison. The two channels are being measured against different outcome definitions, and one of those definitions is not reliable in this dataset.';

export const limitationBody = [
  'Google conversion reporting is not reliable in this dataset. The campaign exports show conversion rates that cannot be reconciled with recorded click volume — figures such as 345%, 476% and 191%.',
  'That rules out a Google cost per lead. It also rules out the comparison a client most often asks for: which channel produced cheaper leads.',
  'The honest answer is that the question cannot be answered from this evidence, and answering it anyway — by dividing Google spend by Google clicks and calling the result a lead cost — would be the single most misleading thing this case study could do.',
];

export const inflatedRates = ['345%', '476%', '191%'];

export const limitationRules = [
  { rule: 'No Google CPL is calculated.', reason: 'The conversion denominator is not trustworthy.' },
  { rule: 'The 773 clicks are never called 773 leads.', reason: 'A click is not a lead.' },
  { rule: 'No Meta-versus-Google winner is declared.', reason: 'The two channels are not measured on the same outcome.' },
];

export const centralInsight =
  'Cross-channel marketing only becomes comparable when both platforms report the same defined outcome.';

export const limitationsIntro =
  'The evidence here covers spend and platform-recorded activity across two channels. It does not establish:';

export const limitations: string[] = [
  'Google lead count',
  'Google cost per lead',
  'Lead quality on either channel',
  'Which channel produced better business outcomes',
  'Site visits',
  'Bookings',
  'Sales',
  'Revenue',
  'ROAS or ROI',
  'True cost per acquisition',
];

export const limitationsClosing =
  'The exports also do not record a common start and end date for all five campaigns, so this is a record of documented activity across two platforms rather than a like-for-like comparison of two channels running side by side.';

export const takeaway = {
  heading: 'The strongest cross-channel lesson is measurement comparability.',
  comparable: ['Spend', 'Clicks', 'CTR', 'CPC', 'Campaign structure'],
  notComparable: [
    'Cost per lead across channels',
    'Lead quality across channels',
    'Which channel produced better business outcomes',
  ],
  body: [
    'Spend, clicks, click-through rate, cost per click and campaign structure can all be compared across channels today. They are measured the same way on both platforms.',
    'Meaningful acquisition comparison needs something else: the same trustworthy outcome definition on both sides. Until a lead means the same thing in Meta and in Google — and until both platforms record it dependably — a cross-channel budget decision is being made on a number that only one channel actually has.',
    'That is fixable, and fixing it is usually worth more than any bid adjustment made in the meantime.',
  ],
};
