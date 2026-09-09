/**
 * The Free Ad Audit offer page.
 *
 * This page describes what the audit reviews and what it explicitly does
 * not promise. It shares the site's single conversion path — the existing
 * contact form and WhatsApp — and introduces no second form system.
 */
export const auditPageContent = {
  eyebrow: 'Free Ad Audit',
  h1: 'Have a campaign that needs a second look?',
  intro:
    'Send me what you have — campaign exports, account access, or even screenshots of your reporting. I will review the structure, the measurement and the obvious opportunity areas, and tell you plainly what your data supports and where it stops.',
  secondaryIntro:
    'No obligation, no pitch deck, and no attempt to sell you a retainer you do not need. If your setup already looks sound, I will tell you that instead.',
  primaryCta: 'Get a Free Ad Audit',
  responseNote: 'I read every enquiry personally and reply to the ones I can genuinely help with.',
};

export const reviewAreas: { title: string; body: string }[] = [
  {
    title: 'Campaign structure',
    body: 'How campaigns, ad sets and budgets are organised — and whether that structure lets you read performance or quietly hides it. Over-segmentation and blended averages both cost you the ability to see what is working.',
  },
  {
    title: 'Spend, CPC and cost per lead',
    body: 'Where the money is actually going, what each click and recorded lead costs, and which campaigns carry the spread. Wide variation between campaigns is usually the most useful signal in an account.',
  },
  {
    title: 'Conversion tracking',
    body: 'Whether conversions are being recorded, whether the figures are arithmetically plausible against click volume, and what the platform’s own diagnostics say about each conversion action.',
  },
  {
    title: 'Lead measurement',
    body: 'What counts as a lead in your account today, whether both platforms record the same event, and whether that event corresponds to anything the business would recognise as an enquiry.',
  },
  {
    title: 'Landing page and funnel issues',
    body: 'Where relevant: message match between ad and page, mobile form experience, and the obvious friction between a click and a completed enquiry.',
  },
  {
    title: 'Measurement inconsistencies',
    body: 'Conversion rates that cannot be reconciled with clicks, placeholder conversion values, unverified or dormant conversion actions, and campaign types being measured on different terms.',
  },
  {
    title: 'Practical optimisation opportunities',
    body: 'The two or three things I would examine first, in order — and what evidence would be needed before acting on any of them.',
  },
];

export const boundaries = {
  heading: 'What this is not',
  intro:
    'Worth being direct about the limits, because plenty of "free audits" are a sales call with a spreadsheet attached.',
  items: [
    'Not a performance guarantee. I will not promise you a lead volume, a cost per lead, a return on ad spend or a revenue figure — none of which anyone can honestly guarantee before seeing an account.',
    'Not a full technical tracking implementation. Reviewing exported reporting and rebuilding a tracking setup are different pieces of work, and I will say which one you need.',
    'Not a generic checklist. If your account looks well run, the audit says so and stops there.',
    'Not a diagnosis of root cause. Where reporting shows an inconsistency, I will identify the inconsistency — establishing the technical cause requires access to the live account and tag setup.',
  ],
};

export const process: { number: string; title: string; body: string }[] = [
  {
    number: '01',
    title: 'You send what you have',
    body: 'Campaign exports, a screen share, read-only account access or screenshots. Whatever you already have is enough to start.',
  },
  {
    number: '02',
    title: 'I check the measurement first',
    body: 'Before performance, I establish which numbers in the account can carry a decision. This is the part most audits skip.',
  },
  {
    number: '03',
    title: 'You get a straight answer',
    body: 'What the data supports, where it stops, and the first two or three things I would look at — written plainly, not as a sales document.',
  },
];

export const evidenceNote = {
  heading: 'What this looks like in practice',
  body: 'The case studies on this site are the same work, done on real accounts and published with the limitations intact. They are the most honest preview of what you would receive.',
};

export const auditFaq: { question: string; answer: string }[] = [
  {
    question: 'What does the audit cost?',
    answer:
      'Nothing. It is an initial assessment based on the information you provide, not a paid engagement.',
  },
  {
    question: 'What do you need from me?',
    answer:
      'Whatever you already have. Campaign exports or read-only account access give the most useful result, but screenshots of your reporting are enough to spot the common problems.',
  },
  {
    question: 'Will you guarantee better results?',
    answer:
      'No. Nobody can guarantee lead volume, cost per lead or return on ad spend before seeing an account, and an audit that opens with a guarantee is selling something. What I can tell you is what your current data does and does not support.',
  },
  {
    question: 'What if my account is fine?',
    answer:
      'Then I will tell you that. A short answer confirming your setup is sound is a legitimate outcome and, in my experience, more common than agencies suggest.',
  },
];
