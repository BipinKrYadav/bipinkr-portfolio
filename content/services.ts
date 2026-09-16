import { BarChart3, Gauge, LayoutTemplate, Search } from 'lucide-react';

import { fmt } from '@/lib/metrics';

import type { FlowNode, ProcessStep, ServiceContent } from './types';

/**
 * Four core services. The homepage renders `summary`; the services page
 * renders `description`, `includes`, `bestFor` and `principle`.
 *
 * Note the deliberate absence of outcome promises. No service here claims
 * a conversion rate, a lead volume or a return figure, because no such
 * result is established by the available evidence.
 */
export const services: ServiceContent[] = [
  {
    slug: 'meta-ads',
    title: 'Meta Ads & Lead Generation',
    summary:
      'Campaign setup, audience strategy, lead generation, creative testing, lead forms, optimisation, CPL analysis and lead-quality measurement.',
    description:
      'End-to-end Meta lead generation: building the campaign structure, deciding what a lead should actually be, testing creative properly, and analysing cost per lead against something more useful than the platform average.',
    includes: [
      'Campaign setup',
      'Campaign structure',
      'Audience strategy',
      'Creative testing',
      'Lead forms',
      'Optimisation',
      'CPL analysis',
      'Lead quality measurement',
      'Retargeting',
    ],
    bestFor: ['Real estate', 'Local businesses', 'Education', 'Lead-generation businesses'],
    evidence: {
      slug: 'meta-lead-generation',
      label: 'Scaling Meta lead generation in Patna',
    },
    icon: BarChart3,
  },
  {
    slug: 'google-ads',
    title: 'Google Ads & Search Acquisition',
    summary:
      'Search campaigns, campaign structure, keyword analysis, bid strategy, conversion tracking review, search-term analysis and performance diagnosis.',
    description:
      'Search and Performance Max work that starts one step earlier than most: with the conversion data itself. Structure, keywords and bidding all follow from knowing which numbers in the account can be trusted.',
    includes: [
      'Search campaigns',
      'Performance Max review',
      'Keyword analysis',
      'Campaign structure',
      'Bid strategy',
      'Conversion tracking review',
      'Search-term analysis',
      'Budget allocation',
      'Performance diagnosis',
    ],
    principle:
      'Before optimising Google Ads, check whether the conversion data deserves to be optimised.',
    evidence: {
      slug: 'preschool-google-ads',
      label: `Diagnosing preschool Google Ads across ${fmt('pre.accounts', 'words')} accounts`,
    },
    icon: Search,
  },
  {
    slug: 'landing-pages',
    title: 'Landing Pages & Marketing Websites',
    summary:
      'Conversion-focused landing pages and marketing websites designed around campaign intent, mobile experience, clear CTAs, forms and basic measurement.',
    /**
     * Deliberately avoids message match, mobile, forms, CTAs and tracking —
     * the callout below covers those. This describes the funnel role instead,
     * so the two do not restate each other.
     */
    description:
      'The step between a paid click and an enquiry — and the one most often treated as somebody else’s job. Campaign landing pages and marketing websites, built as part of the acquisition work rather than handed off separately.',
    includes: [
      'Campaign landing pages',
      'Marketing websites',
      'Mobile-first layouts',
      'CTA optimisation',
      'Form UX',
      'Campaign-message alignment',
      'Basic tracking',
    ],
    /**
     * Describes the work, not a result. The claims ledger rule still stands:
     * no conversion-rate improvement may be claimed for landing pages, and
     * this service still links to no case study because none documents
     * landing page results.
     */
    principle:
      'I build landing pages that match the ad, work well on mobile, and make it easy for people to take the next step — with clear CTAs, simple forms and tracking.',
    icon: LayoutTemplate,
  },
  {
    slug: 'tracking-measurement',
    title: 'Tracking & Measurement',
    summary:
      'Conversion definitions, Meta and Google tracking review, UTM structure, CRM funnel thinking, offline conversion strategy and cross-channel measurement.',
    description:
      'The layer most accounts skip. Deciding what a conversion means, checking whether the platforms are recording it, and making the same outcome comparable across channels so budget decisions rest on something solid.',
    includes: [
      'Conversion tracking review',
      'Conversion definitions',
      'Meta and Google measurement',
      'UTM structure',
      'CRM funnel thinking',
      'Offline conversion strategy',
      'Cross-channel measurement',
    ],
    evidence: {
      slug: 'measurement-audit',
      label: `Auditing ${fmt('site.accounts', 'words')} ad accounts before optimising them`,
    },
    icon: Gauge,
  },
];

export const servicesPageContent = {
  eyebrow: 'Services',
  h1: 'Performance Marketing Built Around Better Decisions',
  intro:
    'I work across paid acquisition, landing pages and measurement — with a focus on understanding what the data actually supports before making optimisation decisions.',
  secondaryIntro:
    'Most accounts do not need more activity. They need a clearer view of which numbers are load-bearing, and a plan that follows from it.',
};

/** The funnel visual shared by the services and about pages. */
export const funnelNodes: FlowNode[] = [
  { label: 'Ad', note: 'Reach and intent' },
  { label: 'Landing Page', note: 'Message match and form UX' },
  { label: 'Lead', note: 'A recorded, defined event' },
  { label: 'Qualification', note: 'Is this lead real and relevant?' },
  { label: 'Business Outcome', note: 'Site visit, booking, admission, sale' },
];

export const funnelContent = {
  eyebrow: 'The full path',
  heading: 'The ad is only the beginning.',
  body: 'Ad platforms can optimise the first two steps well. Everything after that depends on decisions made outside the platform — what counts as a lead, how it is qualified, and whether the outcome ever gets reported back. That is where most performance problems actually live.',
};

export const processSteps: ProcessStep[] = [
  {
    number: '01',
    title: 'Understand',
    description:
      'The business, the offer, what a good lead looks like, and what a genuine outcome is worth. Before any account access.',
  },
  {
    number: '02',
    title: 'Audit',
    description:
      'Campaign structure, spend allocation, conversion definitions and tracking status — establishing which numbers can carry a decision.',
  },
  {
    number: '03',
    title: 'Build',
    description:
      'Campaigns, audiences, creative and landing pages, structured so that performance differences are readable rather than blended away.',
  },
  {
    number: '04',
    title: 'Optimise',
    description:
      'Budget, bids, audiences and creative — against the metrics the audit established as trustworthy, not against whatever the dashboard shows first.',
  },
  {
    number: '05',
    title: 'Measure',
    description:
      'Closing the loop: connecting platform events to CRM and business outcomes so the next round of decisions is better informed than the last.',
  },
];

export const servicesCta = {
  heading: 'Not sure which part of your funnel needs fixing?',
  body: 'Send me what you have — account access, exports or even screenshots — and I will tell you what the data supports and where it stops.',
};
