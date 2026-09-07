import type { FlowNode } from '../types';

/**
 * Content for /how-this-site-is-tracked.
 *
 * This page exists for two reasons. It tells a visitor plainly what happens
 * when they browse the site, and it demonstrates the measurement thinking
 * the rest of the portfolio argues for — applied to my own site, including
 * the part where a platform event stops being evidence of a business
 * outcome.
 *
 * Everything here must stay factually true of the deployed site. If the
 * tracking setup changes, this page changes with it.
 */

export const trackingPageContent = {
  eyebrow: 'Measurement',
  h1: 'How this site is tracked',
  intro:
    'I ask clients to let me look at their measurement setup, so it would be poor form not to show you mine. This is a plain description of what happens when you browse this site, and what the resulting numbers can and cannot tell me.',
  secondaryIntro:
    'It is also the shortest honest explanation I can give of how conversion tracking actually works.',
};

/** The chain, from visit to business outcome. */
export const trackingChain: FlowNode[] = [
  { label: 'Visitor', note: 'You open a page' },
  { label: 'Consent', note: 'Whether tags may run at all' },
  { label: 'Tag Manager', note: 'Decides which tags fire, and when' },
  { label: 'Analytics & ad platforms', note: 'GA4, Google Ads, Meta' },
  { label: 'Conversion event', note: 'A recorded action, e.g. a form submission' },
  { label: 'Business outcome', note: 'A real client, months later', state: 'unknown' },
];

export const chainNote =
  'The chain is solid up to the conversion event. The final step is the one every ad platform quietly invites you to assume — and it is the step no platform can actually see.';

export const steps = [
  {
    number: '01',
    title: 'You open a page',
    body: 'The site is a set of pre-built static files. There is no login, no database of visitors and no server-side profile of you. Fonts are served from this domain rather than a third party, so reading a page does not, by itself, announce your visit to anyone else.',
  },
  {
    number: '02',
    title: 'Consent decides whether anything runs',
    body: 'Tracking is either configured or it is not. When consent handling is switched on, Google Consent Mode defaults are set to denied before the tag manager loads, so measurement and advertising tags hold off until there is a decision to act on. If no tracking IDs are configured at all — which is how this site ships by default — no third-party script loads and no cookie is set.',
  },
  {
    number: '03',
    title: 'A tag manager decides what fires',
    body: 'Rather than hard-coding a separate snippet for every platform, the site pushes named events into a single data layer and lets Google Tag Manager decide which tags care about them. That means the measurement setup can change without the website changing, and every platform receives the same event definition instead of its own slightly different one.',
  },
  {
    number: '04',
    title: 'A few specific things get recorded',
    body: 'Page views, case study views, clicks on the audit CTA, WhatsApp clicks, resume downloads, and three separate stages of the contact form. That is the whole list. Each event carries context such as which page or which service was selected — never your name, email address, phone number or the message you typed.',
  },
  {
    number: '05',
    title: 'One of them counts as a conversion',
    body: 'Exactly one event is treated as the conversion: a contact form submission the form provider confirmed it received. Not opening the form. Not clicking submit. Not a failed submission. If the confirmation does not come back, nothing is counted — the number stays lower and stays honest.',
  },
];

export const distinction = {
  heading: 'A platform event is not a business outcome.',
  body: [
    'This is the part that matters, and the part most reporting quietly skips.',
    'When this site records a conversion, the only thing that has been established is that a form submission was accepted. It has not established that the enquiry is relevant, that it turns into a conversation, that the work happens, or that anyone is better off.',
    'The same gap exists in every ad account I have ever looked at. Meta can tell you a lead form was submitted. Google can tell you a conversion action fired. Neither platform can see whether the lead was any good, because that information lives in a CRM, a sales call, or somebody’s head — and it is almost never sent back.',
    'So the honest framing is: platform events measure the website. Business outcomes measure the business. Connecting the two is deliberate work, and until it is done, they are not the same number.',
  ],
};

export const distinctionTable = {
  caption: 'What each layer can and cannot establish',
  columns: [
    { key: 'layer', header: 'Layer' },
    { key: 'establishes', header: 'Establishes' },
    { key: 'cannot', header: 'Cannot establish' },
  ],
  rows: [
    {
      layer: 'Page view',
      establishes: 'A page was opened',
      cannot: 'Whether it was read, or by whom',
    },
    {
      layer: 'CTA click',
      establishes: 'Intent to enquire',
      cannot: 'Whether an enquiry followed',
    },
    {
      layer: 'WhatsApp click',
      establishes: 'A chat was opened',
      cannot: 'Whether a message was ever sent',
    },
    {
      layer: 'Conversion event',
      establishes: 'A submission was accepted',
      cannot: 'Whether the enquiry is qualified',
    },
    {
      layer: 'Business outcome',
      establishes: '—',
      cannot: 'Anything, until CRM data is connected back',
    },
  ],
};

export const whatIsNotCollected = {
  heading: 'What is deliberately not collected',
  items: [
    'Your name, email address or phone number in any analytics event',
    'The contents of the message you type into the contact form',
    'Any attempt to identify you as an individual across sites',
    'Any advertising or social pixel when its ID is not configured',
    'Fingerprinting, session recording, heatmaps or scroll tracking',
  ],
  closing:
    'Campaign parameters from the link you arrived on are kept for the length of your browser session so a later enquiry can be attributed to the right campaign. They clear when you close the tab.',
};

export const whyItMatters = {
  heading: 'Why I built it this way',
  body: [
    'Because the alternative is the thing I spend most of my time undoing in client accounts: conversion numbers that nobody has checked, firing on events nobody has defined, feeding optimisation decisions nobody has questioned.',
    'A measurement setup earns trust by being specific about what it records and honest about where it stops. That is a lower bar than it sounds, and most accounts do not clear it.',
  ],
  ctaLabel: 'Read the measurement audit case study',
  ctaHref: '/case-studies/measurement-audit',
};

/**
 * Live status.
 *
 * The page renders this from the actual build-time tracking configuration
 * rather than from a hard-coded sentence, so it cannot drift out of date the
 * moment a platform is switched on. A page about honest measurement that
 * lies about its own measurement would be a poor advertisement.
 */
export const statusNote = {
  heading: 'What is switched on right now',
  intro:
    'Read from this build’s configuration, not written by hand — so it stays true when something changes.',
  activeBody:
    'Where a platform is listed as active below, its tag is loaded on this site and is collecting the events described above.',
  inactiveBody:
    'Nothing is active. No tracking ID is configured in this build, so no third-party script loads, no cookie is set and no event leaves your browser. The architecture is in place and inert.',
  labels: {
    gtm: 'Google Tag Manager',
    ga4: 'Google Analytics 4',
    googleAds: 'Google Ads',
    metaPixel: 'Meta Pixel',
    consent: 'Consent gating',
  },
  active: 'Active',
  inactive: 'Not configured',
  consentOn: 'Enabled — tags held until consent',
  consentOff: 'Not enabled',
};
