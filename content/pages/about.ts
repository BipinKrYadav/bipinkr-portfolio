import { BrainCircuit, Gauge, LayoutTemplate, LineChart, Target } from 'lucide-react';

export const aboutContent = {
  eyebrow: 'About',
  h1: 'I’m Bipin Kumar — a performance marketer focused on measurable growth.',
  intro:
    'I work across Meta Ads, Google Ads, lead generation, landing pages and measurement, with a strong focus on real estate and local-business marketing.',
  secondaryIntro:
    'Based in Patna, working with clients who need paid acquisition to produce something the business can actually act on.',
};

export const approach = {
  eyebrow: 'Approach',
  heading: 'I care about what happens after the click.',
  body: [
    'Ad platforms are very good at the first two steps of the path below, and structurally blind to the last two. That gap is where most wasted spend hides.',
    'So the work I do runs the length of the chain rather than stopping where the platform’s reporting does.',
  ],
};

export const experience = {
  eyebrow: 'Experience',
  heading: 'Hands-on paid acquisition, across two very different verticals',
  body: [
    'Hands-on paid acquisition experience across real estate and education campaigns, with practical exposure to campaign analysis, lead generation, creative testing, CPL analysis and measurement diagnosis.',
    'The real estate work is lead-generation at volume: multiple residential projects, Meta lead campaigns and Google Search running in the same market, with cost per lead varying widely between projects. The education work is the opposite problem — smaller budgets, and accounts where the central question was whether the reporting could be trusted at all.',
    'Both are documented in the case studies, including the parts that do not flatter the numbers.',
  ],
};

export const realEstateFocus = {
  eyebrow: 'Primary focus',
  heading: 'Real estate lead generation',
  body: 'Residential property is where most of my documented campaign work sits — long consideration cycles, high lead volume, and a wide gap between a form submission and a site visit.',
  items: [
    'Residential project lead generation',
    'Meta lead campaigns',
    'Google Search',
    'Campaign and audience analysis',
    'Creative testing',
    'CPL analysis',
    'Funnel thinking',
    'Measurement',
  ],
};

export const beyondRealEstate = {
  heading: 'Beyond real estate',
  body: 'Preschool and education campaigns, where the work centred on measurement diagnosis — establishing which reported numbers could support a decision before any budget was moved.',
};

export interface Capability {
  title: string;
  body: string;
  icon: typeof Target;
}

export const capabilities: Capability[] = [
  {
    title: 'Paid Acquisition',
    body: 'Meta Ads and Google Ads across lead generation, search and Performance Max — campaign structure, audiences, creative testing and budget allocation.',
    icon: Target,
  },
  {
    title: 'Campaign Analysis',
    body: 'Reading an account for what it is actually saying: cohort comparison, cost-per-result spread, campaign-level variance and the questions that spread raises.',
    icon: LineChart,
  },
  {
    title: 'Conversion-Focused Web Experiences',
    body: 'Campaign landing pages and marketing websites built around campaign intent, mobile experience, form UX and message match.',
    icon: LayoutTemplate,
  },
  {
    title: 'Tracking & Measurement',
    body: 'Conversion definitions, tracking review across Meta and Google, UTM structure, CRM funnel thinking and cross-channel outcome comparability.',
    icon: Gauge,
  },
  {
    title: 'AI-Assisted Marketing',
    body: 'I use AI-assisted workflows for research, analysis, content development and faster execution — while keeping final decisions grounded in campaign evidence and human judgement.',
    icon: BrainCircuit,
  },
];

export const principles = {
  eyebrow: 'Principles',
  heading: 'Three things I do not negotiate on',
  items: [
    {
      number: '01',
      title: 'Evidence before assumptions.',
      body: 'If the data does not establish something, I say so rather than filling the gap with a confident-sounding estimate.',
    },
    {
      number: '02',
      title: 'Measurement before optimisation.',
      body: 'Optimising against numbers nobody has checked moves budget towards whichever campaign is miscounting most.',
    },
    {
      number: '03',
      title: 'Business outcomes matter.',
      body: 'A cheaper lead is only progress if it is still a lead the business wants. Platform metrics are a means, not the goal.',
    },
  ],
};

export const measurementLesson = {
  eyebrow: 'The lesson',
  heading: 'One lesson changed how I look at performance data.',
  body: [
    'I ran a measurement audit across my own ad accounts before treating any of their numbers as a basis for optimisation.',
    'It identified ₹38,898.65 of documented spend associated with unreliable, unverified or inflated measurement — roughly 34.9% of the total. Inflated conversion rates that could not be reconciled with click volume. Placeholder ₹1 conversion values. Conversion actions sitting unverified while campaigns kept spending.',
    'None of it was visible from the top-level dashboard. All of it would have quietly corrupted every optimisation decision made against it.',
  ],
  pullQuote: 'Before scaling a campaign, make sure the numbers deserve your trust.',
  ctaLabel: 'Read the full measurement audit',
  ctaHref: '/case-studies/measurement-audit',
};

export const currentFocus = {
  eyebrow: 'Current focus',
  heading: 'What I am building towards',
  items: [
    {
      title: 'Deeper performance marketing',
      body: 'More sophisticated account structures, better creative testing discipline, and analysis that goes past the platform average.',
    },
    {
      title: 'Conversion-focused web experiences',
      body: 'Treating the landing page as part of the campaign rather than as a separate deliverable handed off to someone else.',
    },
    {
      title: 'Better measurement systems',
      body: 'Closing the loop between platform events, CRM records and business outcomes so cross-channel decisions rest on comparable numbers.',
    },
  ],
};

export const recruiterSection = {
  heading: 'Hiring for a Performance Marketing role?',
  body: 'The case studies on this site are the clearest picture of how I think about campaigns, analysis and measurement. The resume covers the rest.',
};
