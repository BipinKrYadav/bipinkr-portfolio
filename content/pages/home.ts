import { Eye, LineChart, ShieldCheck, Workflow } from 'lucide-react';

export const hero = {
  eyebrow: 'Performance Marketing · Meta Ads · Google Ads',
  h1: 'Performance Marketing That Turns Ad Spend Into Measurable Growth',
  subheadline:
    'I help real estate and local businesses generate and improve leads through Meta Ads, Google Ads, conversion-focused landing pages, and better measurement.',
  primaryCta: 'Get a Free Ad Audit',
  secondaryCta: 'View Case Studies',
  trustLine: 'Real campaign evidence. Clear measurement. No inflated claims.',
};

export const intro = {
  eyebrow: 'The approach',
  heading: 'I don’t just run ads. I diagnose what the data is actually telling you.',
  body: [
    'Good performance marketing is not just about launching campaigns.',
    'It is about understanding the whole path — and knowing which part of it is actually costing you.',
  ],
  chain: ['Ad', 'Landing Page', 'Lead', 'Qualification', 'Business Outcome'],
  closing:
    'I combine campaign execution with analysis and measurement so that optimisation decisions are based on evidence rather than assumptions.',
};

export const servicesSection = {
  eyebrow: 'Services',
  heading: 'Four areas, one job: making spend accountable',
  subheading:
    'Acquisition, the page it lands on, and the measurement that tells you whether either worked.',
  cta: 'Explore Services',
};

export const caseStudiesSection = {
  eyebrow: 'Evidence',
  heading: 'Selected Campaign Evidence',
  subheading:
    'Real campaign data, decisions and limitations — not polished numbers without context.',
  cta: 'View all case studies',
};

export const howIWork = {
  eyebrow: 'How I work',
  heading: 'Measurement first, then scale',
  subheading:
    'A sequence, not a menu. Each step exists because skipping it makes the next one unreliable.',
};

export interface WhyPoint {
  title: string;
  body: string;
  icon: typeof Eye;
}

export const whyWorkWithMe = {
  eyebrow: 'Why work with me',
  heading: 'What you can expect from the work',
  subheading:
    'Four commitments that hold whether the numbers flatter me or not.',
  points: [
    {
      title: 'Evidence before assumptions',
      body: 'Every figure I show you is labelled with how it is known — documented, calculated, platform-reported or unverified. You should never have to guess which is which.',
      icon: ShieldCheck,
    },
    {
      title: 'Measurement before optimisation',
      body: 'I check whether the conversion data deserves to be optimised before touching budgets. In my own accounts that check found roughly a third of documented spend reporting numbers I could not stand behind.',
      icon: Eye,
    },
    {
      title: 'Analysis, not just execution',
      body: 'Campaign work is the starting point. The value is in reading what the account is telling you — which campaigns differ, why the spread exists, and what is worth testing next.',
      icon: LineChart,
    },
    {
      title: 'The whole funnel, not just the click',
      body: 'Ad, landing page, lead, qualification, business outcome. I work across the full path rather than optimising one step and hoping the rest holds up.',
      icon: Workflow,
    },
  ] as WhyPoint[],
};

export const aboutSnippet = {
  eyebrow: 'About',
  heading: 'I care about what happens after the click.',
  body: [
    'I’m Bipin Kumar, a performance marketer based in Patna, working across Meta Ads, Google Ads, lead generation, landing pages and measurement — with a strong focus on real estate and local-business marketing.',
    'A self-audit of my own ad accounts is what shaped how I work now: before scaling a campaign, make sure the numbers deserve your trust.',
  ],
  cta: 'More about how I work',
};

export const finalCta = {
  eyebrow: 'Next step',
  heading: 'Have a campaign that needs a second look?',
  body: 'Send me your campaign setup and reporting. I will review the structure, the measurement and the obvious opportunity areas, and tell you plainly what the data supports.',
  note: 'An initial assessment based on the information you provide — not a guarantee of performance.',
};
