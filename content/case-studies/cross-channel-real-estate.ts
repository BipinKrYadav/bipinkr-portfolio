import { evidenceOf, fmt, metric } from '@/lib/metrics';

import { label } from '../anonymise';
import type {
  CaseStudySection,
  CaseStudySummary,
  DataTableContent,
  Metric,
} from '../types';

/*
 * Every evidence-backed figure below is rendered from the canonical metric
 * registry (content/evidence/metrics/cross-channel.ts). No figure is typed
 * here; wording that restates a figure in words is listed in
 * content/evidence/linked-phrases.ts.
 */

const campaignsInWords = fmt('cc.campaigns', 'words');

export const summary: CaseStudySummary = {
  slug: 'cross-channel-real-estate',
  title: 'Cross-Channel Lead Generation for Real Estate: Meta + Google Ads',
  cardTitle: 'Cross-Channel Meta + Google Ads',
  subtitle:
    `${fmt('cc.total.spend')} managed across ${campaignsInWords} campaigns — with ${fmt('cc.meta.leads')} verified Meta leads and ${fmt('cc.google.clicks')} Google Search clicks.`,
  cardDescription:
    'Paid acquisition documented across two platforms for one residential real estate client, and what it takes before the two can honestly be compared.',
  metaDescription:
    `Cross-channel real estate case study covering Meta Ads and Google Search: spend, leads, clicks, CPC and CTR across ${campaignsInWords} campaigns, plus why a cross-channel cost-per-lead comparison was not made.`,
  industry: 'Real Estate',
  platform: 'Meta + Google Ads',
  order: 4,
  cardMetrics: [
    metric('cc.total.spend', `managed across ${campaignsInWords} campaigns`),
    metric('cc.meta.leads', 'verified Meta leads'),
    metric('cc.google.clicks', 'Google Search clicks'),
  ],
  cta: {
    heading: 'Running both Meta and Google Ads?',
    body: 'Let us look at your numbers.',
  },
};

/** Also rendered as section headings on the page. */
export const metaHeading = `Meta — ${fmt('cc.meta.campaigns', 'words')} campaigns, ${fmt('cc.meta.leads')} verified leads`;
export const googleHeading = `Google — ${fmt('cc.google.campaigns', 'words')} Search campaigns, ${fmt('cc.google.clicks')} clicks`;

export const sections: CaseStudySection[] = [
  { id: 'context', navLabel: 'Context', heading: 'Context' },
  { id: 'meta', navLabel: 'Meta', heading: metaHeading },
  { id: 'google', navLabel: 'Google', heading: googleHeading },
  { id: 'comparison', navLabel: 'Side by side', heading: 'The two channels side by side' },
  { id: 'limitation', navLabel: 'Measurement limit', heading: 'Why there is no cross-channel CPL here' },
  { id: 'limitations', navLabel: 'Limitations', heading: 'What this evidence does not establish' },
  { id: 'takeaway', navLabel: 'Takeaway', heading: 'Takeaway' },
];

export const heroMetrics: Metric[] = [
  metric('cc.total.spend', `documented spend across ${campaignsInWords} campaigns`),
  metric('cc.meta.leads', 'verified Meta leads'),
  metric('cc.google.clicks', 'Google Search clicks'),
  metric('cc.google.ctr', 'blended Google CTR'),
];

export const context = [
  { term: 'Client', value: 'Patna-based residential real estate' },
  { term: 'Platforms', value: 'Meta Ads + Google Ads' },
  {
    term: 'Campaigns',
    value: `${fmt('cc.campaigns')} (${fmt('cc.meta.campaigns')} Meta, ${fmt('cc.google.campaigns')} Google Search)`,
  },
  { term: 'Documented spend', value: fmt('cc.total.spend') },
];

export const contextIntro = [
  'A Patna-based residential real estate client, with paid acquisition activity documented across two platforms.',
  `The exports record what each campaign spent and delivered. They do not record a common start and end date for every campaign, so nothing here should be read as a claim that all ${campaignsInWords} campaigns were necessarily running concurrently.`,
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
      spend: fmt('cc.meta_1.spend'),
      leads: fmt('cc.meta_1.leads'),
      cpl: fmt('cc.meta_1.cpl'),
    },
    {
      campaign: label('Balaji Exotica', 'Meta campaign 2'),
      spend: fmt('cc.meta_2.spend'),
      leads: fmt('cc.meta_2.leads'),
      cpl: fmt('cc.meta_2.cpl'),
    },
  ],
  // A blended Meta CPL is deliberately not shown; "—" is editorial, not a missing value.
  footRow: { campaign: 'Total Meta', spend: fmt('cc.meta.spend'), leads: fmt('cc.meta.leads'), cpl: '—' },
  note: '“Verified leads” means lead form submissions recorded by Meta. It does not mean independently qualified leads, and lead quality is not established by this evidence.',
};

export const metaCommentary = [
  `The ${fmt('cc.meta.campaigns', 'words')} Meta campaigns produced very different cost per lead — ${fmt('cc.meta_1.cpl')} against ${fmt('cc.meta_2.cpl')} — on the same platform, for the same client, in the same market.`,
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
    { campaign: label('Balaji Project Search', 'Google campaign 1'), spend: fmt('cc.google_1.spend'), clicks: fmt('cc.google_1.clicks') },
    { campaign: label('Search-5', 'Google campaign 2'), spend: fmt('cc.google_2.spend'), clicks: fmt('cc.google_2.clicks') },
    { campaign: label('Search-2', 'Google campaign 3'), spend: fmt('cc.google_3.spend'), clicks: fmt('cc.google_3.clicks') },
  ],
  footRow: { campaign: 'Total Google', spend: fmt('cc.google.spend'), clicks: fmt('cc.google.clicks') },
  note: 'Clicks are clicks. They are not leads, and they are not treated as leads anywhere on this page.',
};

export const googleMetrics: Metric[] = [
  metric('cc.google.spend', 'Google spend'),
  metric('cc.google.clicks', 'clicks'),
  metric('cc.google.cpc', 'blended CPC'),
  metric('cc.google.impressions', 'impressions'),
  metric('cc.google.ctr', 'blended CTR'),
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
    spend: fmt('cc.meta.spend'),
    outcomeValue: fmt('cc.meta.leads'),
    outcomeLabel: 'verified Meta leads',
    outcomeEvidence: evidenceOf('cc.meta.leads'),
    rows: [
      { term: 'Campaigns', value: fmt('cc.meta.campaigns') },
      { term: 'Recorded outcome', value: 'Lead form submissions' },
      { term: 'Cost per recorded lead', value: `${fmt('cc.meta.cpl_min')} – ${fmt('cc.meta.cpl_max')}` },
    ],
  },
  {
    channel: 'Google',
    spend: fmt('cc.google.spend'),
    outcomeValue: fmt('cc.google.clicks'),
    outcomeLabel: 'Search clicks',
    outcomeEvidence: evidenceOf('cc.google.clicks'),
    rows: [
      { term: 'Campaigns', value: fmt('cc.google.campaigns') },
      { term: 'Recorded outcome', value: 'Clicks, impressions, CTR, CPC' },
      { term: 'Cost per recorded lead', value: 'Not calculable' },
    ],
    caveat: 'Google lead count is not verified from the available evidence.',
  },
];

export const comparisonCaution =
  'These panels are deliberately not aligned into a single winner-versus-loser comparison. The two channels are being measured against different outcome definitions, and one of those definitions is not reliable in this dataset.';

const reportedRates = [1, 2, 3].map((n) => fmt(`cc.google.reported_conversion_rate_${n}`));

export const limitationBody = [
  `Google conversion reporting is not reliable in this dataset. The campaign exports show conversion rates that cannot be reconciled with recorded click volume — figures such as ${reportedRates[0]}, ${reportedRates[1]} and ${reportedRates[2]}.`,
  'That rules out a Google cost per lead. It also rules out the comparison a client most often asks for: which channel produced cheaper leads.',
  'The honest answer is that the question cannot be answered from this evidence, and answering it anyway — by dividing Google spend by Google clicks and calling the result a lead cost — would be the single most misleading thing this case study could do.',
];

export const inflatedRates = reportedRates;

export const limitationRules = [
  { rule: 'No Google CPL is calculated.', reason: 'The conversion denominator is not trustworthy.' },
  {
    rule: `The ${fmt('cc.google.clicks')} clicks are never called ${fmt('cc.google.clicks')} leads.`,
    reason: 'A click is not a lead.',
  },
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
  `The exports also do not record a common start and end date for all ${campaignsInWords} campaigns, so this is a record of documented activity across two platforms rather than a like-for-like comparison of two channels running side by side.`;

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
