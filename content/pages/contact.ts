export const contactContent = {
  eyebrow: 'Contact',
  h1: 'Have a campaign that needs a second look?',
  intro:
    'Send me what you have — campaign exports, account access, or even screenshots of your reporting. I will tell you what the data supports, where it stops, and what I would look at first.',
  primaryCta: 'Get a Free Ad Audit',
  secondaryCta: 'Chat on WhatsApp',
  responseNote: 'I read every enquiry personally and reply to the ones I can genuinely help with.',
};

export const auditOffer = {
  heading: 'Get a Free Ad Audit',
  body: 'I’ll review your campaign setup, measurement and obvious opportunity areas based on the information you provide.',
  disclaimer: 'This is an initial assessment, not a guarantee of performance.',
  covers: [
    {
      title: 'Campaign structure',
      body: 'How campaigns, ad sets and budgets are organised, and whether that structure lets you read performance or hides it.',
    },
    {
      title: 'Measurement integrity',
      body: 'Whether your conversion data is being recorded, whether it is plausible, and whether it means what the dashboard implies.',
    },
    {
      title: 'Opportunity areas',
      body: 'The two or three things I would examine first, and what evidence would be needed to act on them.',
    },
  ],
  boundaries: {
    heading: 'What it is not',
    items: [
      'A performance guarantee, or a forecast of leads or revenue.',
      'A full technical tracking implementation — that is separate, hands-on work.',
      'A generic checklist. If your reporting looks sound, I will say so.',
    ],
  },
};

export interface ServiceOption {
  value: string;
  label: string;
}

/** Options for the "Service" field on the contact form. */
export const serviceOptions: ServiceOption[] = [
  { value: 'meta-ads', label: 'Meta Ads' },
  { value: 'google-ads', label: 'Google Ads' },
  { value: 'landing-page', label: 'Landing Page' },
  { value: 'website', label: 'Website' },
  { value: 'tracking-measurement', label: 'Tracking / Measurement' },
  { value: 'full-funnel', label: 'Full Funnel' },
  { value: 'not-sure', label: 'Not sure yet' },
];

/** Optional monthly ad spend bands. Kept as ranges — no exact figure needed. */
export const adSpendOptions: ServiceOption[] = [
  { value: 'under-25k', label: 'Under ₹25,000 / month' },
  { value: '25k-1l', label: '₹25,000 – ₹1,00,000 / month' },
  { value: '1l-5l', label: '₹1,00,000 – ₹5,00,000 / month' },
  { value: 'over-5l', label: 'Over ₹5,00,000 / month' },
  { value: 'not-running', label: 'Not running ads yet' },
];

export const formCopy = {
  heading: 'Tell me about your campaign',
  body: 'The more context you give me, the more useful the audit will be. Five fields are required; the rest help.',
  submitLabel: 'Request my free ad audit',
  submittingLabel: 'Sending…',
  successHeading: 'Thanks — your enquiry is in.',
  successBody:
    'I’ll review what you have sent and get back to you. If you would like to add anything in the meantime, WhatsApp is the fastest route.',
  errorHeading: 'That didn’t send.',
  errorBody:
    'Something went wrong on the way to my inbox. Please try again, or reach me directly using the details on this page.',
  privacyNote:
    'Your details are used only to respond to this enquiry. Nothing is sold, shared or added to a marketing list.',
};

export const setupNotice = {
  heading: 'Form endpoint not configured',
  body: 'This form has no submission endpoint set, so it will not send anything. Set NEXT_PUBLIC_FORM_ENDPOINT in your environment to activate it.',
  developerNote:
    'Shown deliberately rather than faking a successful submission. See docs/changelog.md for setup steps.',
};

/**
 * Thank-you page.
 *
 * Two states, because the page is a real URL that anyone can open directly.
 * `confirmed` is shown only when the visitor arrives from a submission the
 * form endpoint actually accepted. `direct` never claims a message was sent,
 * because in that state nothing was.
 */
export const thankYouContent = {
  confirmed: {
    eyebrow: 'Request received',
    h1: 'Thanks — your audit request is in.',
    body: 'I read every enquiry myself. You will get a reply from me, not an autoresponder sequence.',
  },
  direct: {
    eyebrow: 'Contact',
    h1: 'Nothing to confirm here yet.',
    body: 'This page confirms a submitted audit request, and no submission is attached to this visit. If you meant to send one, the form takes about a minute.',
  },
  nextSteps: {
    heading: 'What happens next',
    steps: [
      {
        number: '01',
        title: 'I read what you sent',
        body: 'Your campaign context, the problem you described, and anything you linked to.',
      },
      {
        number: '02',
        title: 'I look at the measurement first',
        body: 'Whether the numbers in your account can carry a decision, before looking at what the numbers say.',
      },
      {
        number: '03',
        title: 'You get a straight answer',
        body: 'What the data supports, where it stops, and the two or three things I would examine first. If your setup already looks sound, I will tell you that instead.',
      },
    ],
  },
  meanwhile: {
    heading: 'While you wait',
    body: 'The case studies are the clearest picture of how I work — including the parts where the evidence runs out.',
  },
  whatsappPrompt: 'Want to add context or send a screenshot? WhatsApp is the fastest route.',
  whatsappMessage:
    'Hi Bipin, I just submitted an ad audit request through your website and wanted to add some context.',
} as const;

export const recruiterCta = {
  heading: 'Hiring for a Performance Marketing role?',
  body: 'The case studies show how I approach campaigns and measurement. The resume covers the rest.',
};
