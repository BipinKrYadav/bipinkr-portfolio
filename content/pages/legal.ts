import { fmt } from '@/lib/metrics';

import { siteConfig } from '../site-config';

/**
 * Privacy content.
 *
 * Written to describe exactly what this site does and nothing more. It
 * makes no claim to be legal advice and asserts no compliance certification,
 * because neither would be supportable.
 */
export const privacyContent = {
  eyebrow: 'Privacy',
  h1: 'Privacy',
  intro: `How information is handled on ${siteConfig.domain}. This is a short, plain description of a small site — there is not much to it, which is the point.`,
  lastUpdated: 'Last updated: September 2026',
  sections: [
    {
      id: 'contact-form',
      heading: 'Information collected through the contact form',
      body: [
        'If you submit the contact form, you provide your name, email address, business or company name, the service you are interested in, and a description of your problem. You may optionally provide a WhatsApp or phone number, a monthly ad spend range, and a website or landing page URL.',
        'Nothing beyond what you type into that form is collected. There is no hidden field, no tracking pixel attached to the form, and no attempt to enrich or look up your details from other sources.',
      ],
    },
    {
      id: 'purpose',
      heading: 'Why this information is collected',
      body: [
        'To read your enquiry, prepare an initial assessment where appropriate, and reply to you. That is the only purpose.',
        'Your details are not sold, rented or traded. They are not added to a mailing list, and you will not receive marketing emails as a result of contacting me.',
      ],
    },
    {
      id: 'communication',
      heading: 'WhatsApp and email',
      body: [
        'If you start a WhatsApp conversation from a link on this site, that conversation takes place inside WhatsApp and is governed by WhatsApp’s own privacy terms. This site does not receive a copy of it, and no message is sent on your behalf — the link simply opens WhatsApp with a suggested message you can edit or delete before sending.',
        'Email replies are handled through a standard email provider. Correspondence is kept only as long as it is useful for the conversation it belongs to.',
      ],
    },
    {
      id: 'form-provider',
      heading: 'Third-party form provider',
      body: [
        'Contact form submissions are delivered through a third-party form service. That provider processes and forwards the submission so it reaches my inbox, and it handles the data under its own privacy terms.',
        'If no form endpoint is configured, the form does not submit anywhere at all and says so rather than pretending otherwise.',
      ],
    },
    {
      id: 'analytics',
      heading: 'Analytics and advertising measurement',
      body: [
        'This site is built so that measurement is optional. Each platform — Google Tag Manager, Google Analytics 4, Google Ads and the Meta Pixel — loads only when its ID has been configured. When none is configured, no tracking script loads, no cookie is set and no measurement request leaves your browser.',
        'Where a platform is enabled, it is used to understand aggregate behaviour: which pages are read, which calls to action are used, and whether a contact form submission completed. Events carry context such as the page or the service selected. They never carry your name, email address, phone number, company name or the message you typed into the form.',
        'Enabling Google Ads or the Meta Pixel means those platforms may set advertising cookies and may be used to measure or target advertising. That is a genuine change in what the site does, which is why it is stated here plainly rather than buried.',
        'A live, always-current summary of exactly which platforms are switched on — generated from the site’s own configuration rather than written by hand — is published on the "How this site is tracked" page.',
      ],
    },
    {
      id: 'consent',
      heading: 'Consent',
      body: [
        'The site supports Google Consent Mode v2. When consent handling is switched on, measurement and advertising storage default to denied before any tag loads, and tags stay held until a consent decision is recorded.',
        'This site does not currently ship its own consent banner. Where a consent banner is legally required for a given audience, a consent management platform should be connected before advertising tags are enabled.',
      ],
    },
    {
      id: 'campaign-attribution',
      heading: 'Campaign attribution',
      body: [
        'If you arrive from an advertisement or a campaign link, the campaign parameters in that link (utm_source, utm_medium, utm_campaign, utm_content, utm_term, and the click identifiers ad platforms append) are stored in your browser for the length of your session. This is so that an enquiry sent several pages later can be attributed to the campaign that brought you here.',
        'They are held in session storage, they clear when you close the tab, and they describe a campaign rather than a person. No profile, fingerprint or cross-site identifier is created.',
      ],
    },
    {
      id: 'data-minimisation',
      heading: 'No unnecessary data collection',
      body: [
        'This is a static website. It has no user accounts, no login, and no database of visitors.',
        'Fonts are self-hosted rather than requested from a third party, so the page itself never reports your visit to an outside service. Beyond the measurement platforms described above — each of which loads only when explicitly configured — nothing else is loaded: no session recording, no heatmaps, no fingerprinting and no cross-site identity resolution.',
      ],
    },
    {
      id: 'client-data',
      heading: 'Campaign data shown on this site',
      body: [
        'The case studies are built from campaign exports. They contain no ad account IDs, campaign IDs, ad set IDs or creative IDs, and no lead-level personal information of any kind.',
        'No individual who submitted a lead form through any campaign described on this site is identifiable from anything published here.',
      ],
    },
    {
      id: 'your-choices',
      heading: 'Your choices',
      body: [
        'You can ask me to delete an enquiry you have sent, and I will remove it from my records.',
        'You are under no obligation to use the contact form at all — the alternative contact routes on the contact page reach me just as well.',
      ],
    },
  ],
  contactPrompt: {
    heading: 'Questions about any of this?',
    body: 'Ask me directly. A plain question gets a plain answer.',
  },
};

export const resumeContent = {
  eyebrow: 'Resume',
  h1: 'Resume',
  intro:
    'A performance marketer working across Meta Ads, Google Ads, lead generation, landing pages and measurement — with documented campaign evidence across real estate and education accounts.',
  secondaryIntro:
    'If you are evaluating me for a role, the case studies are the more useful document. They show the actual reasoning, including where the evidence runs out.',
  downloadLabel: 'Download Resume',
  linkedinLabel: 'View LinkedIn',
  previewHeading: 'Preview',
  placeholder: {
    heading: 'Resume PDF not uploaded yet',
    body: 'Drop the PDF into /public/documents/ and set NEXT_PUBLIC_RESUME_FILE to its filename. The preview and download button activate automatically once the file is present.',
    fallback:
      'In the meantime, the case studies and the about page cover the same ground in more depth.',
  },
  highlights: {
    heading: 'At a glance',
    items: [
      {
        title: 'Paid acquisition',
        body: 'Meta Ads and Google Ads across lead generation, Search and Performance Max campaigns.',
      },
      {
        title: 'Documented evidence',
        body: `${fmt('site.spend_total', 'inr_lakh', { lowerBoundMarker: true })} of documented ad spend across ${fmt('site.accounts')} ad accounts, with ${fmt('site.evidence_months')} of campaign evidence.`,
      },
      {
        title: 'Analysis and measurement',
        body: 'Cohort analysis, cost-per-result breakdown, conversion tracking review and cross-channel measurement comparability.',
      },
      {
        title: 'Verticals',
        body: 'Residential real estate lead generation, and preschool/education campaign measurement diagnosis.',
      },
    ],
  },
};

export const notFoundContent = {
  code: '404',
  heading: 'This page doesn’t exist.',
  body: 'The link may be out of date, or the address may have a typo in it. Nothing is broken on your end.',
  suggestionsHeading: 'Try one of these instead',
};
