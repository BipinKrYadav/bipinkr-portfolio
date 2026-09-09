import type { BlogArticleSummary, CaseStudySection, DataTableContent } from '../types';

/**
 * Every figure on this page comes from the preschool Google Ads and
 * measurement audit case studies. Terminology is deliberately identical to
 * those pages: "recorded conversion", "reported lead-funnel leads",
 * "verified conversion". Nothing here asserts a business outcome, a
 * technical cause, or a winner between campaign types.
 */
export const summary: BlogArticleSummary = {
  slug: 'google-ads-conversion-tracking',
  title: 'Why Google Ads Conversion Numbers Don’t Always Tell the Full Story',
  cardTitle: 'Why Google Ads conversion numbers don’t always tell the full story',
  description:
    'A conversion number can look precise while the measurement behind it is incomplete. What I check in a Google Ads account before trusting the conversion column — with figures from three real preschool accounts.',
  excerpt:
    'Across three preschool Google Ads accounts, ₹20,187.56 of documented spend produced 12 recorded conversions — and one campaign reported 171 lead-funnel leads while its conversion column showed zero. Here is what I check before treating any conversion number as a basis for optimisation.',
  theme: 'Tracking & Measurement',
  datePublished: '2026-09-09',
  dateModified: '2026-09-09',
  readingMinutes: 9,
};

export const sections: CaseStudySection[] = [
  { id: 'introduction', navLabel: 'Introduction', heading: 'Introduction' },
  { id: 'the-problem', navLabel: 'The problem', heading: 'A precise number is not the same as a reliable one' },
  { id: 'what-i-checked', navLabel: 'What I checked', heading: 'What I checked before trusting the numbers' },
  { id: 'pmax-vs-search', navLabel: 'PMax vs Search', heading: 'An example: two campaign types, two measurement states' },
  { id: 'three-columns', navLabel: 'Three different columns', heading: 'Clicks, reported leads and recorded conversions are three different things' },
  { id: 'verified-conversion', navLabel: 'What “verified” means', heading: 'What a “verified conversion” means here' },
  { id: 'not-confirmed', navLabel: 'What this does not show', heading: 'What this data does not confirm' },
  { id: 'checklist', navLabel: 'Checklist', heading: 'A practical Google Ads measurement checklist' },
  { id: 'before-scaling', navLabel: 'Before scaling', heading: 'What I would fix before scaling any of this' },
  { id: 'takeaway', navLabel: 'Takeaway', heading: 'The takeaway' },
];

export const intro = [
  'A Google Ads account will give you a conversion number to two decimal places. It will not tell you whether that number describes anything real.',
  'That gap is not a rare edge case. It is the single most common problem I find when I open an account for the first time, and it matters more than any bid adjustment — because every optimisation decision you make afterwards inherits it.',
  'What follows is what I actually check, illustrated with figures from three preschool Google Ads accounts I reviewed. The numbers are all documented in the campaign exports. What they show is a measurement problem; what they emphatically do not show is which campaign produced real business outcomes.',
];

export const problem = [
  'Across the three accounts, the exports record ₹20,187.56 of documented spend and 12 recorded conversions. Split by account: 4 in the first, 1 in the second, 7 in the third.',
  'Twelve conversions on twenty thousand rupees is a figure you could act on. You could pause the accounts with fewer, shift budget to the account with seven, and write a confident sentence about cost per conversion.',
  'You would be wrong to — because before any of that arithmetic means anything, the conversion column has to be recording reliably. In these accounts it was not.',
];

export const spendMetrics = [
  { value: '₹20,187.56', label: 'documented spend across three accounts', evidence: 'documented' as const },
  { value: '12', label: 'recorded conversions in total', evidence: 'verified' as const },
  { value: '0', label: 'conversion actions actively recording in the reviewed setup', evidence: 'documented' as const },
];

export const checks: { title: string; body: string }[] = [
  {
    title: 'Is anything being recorded at all?',
    body: 'Whether the account records conversions, and in which column. An empty conversion column and a broken conversion column look identical from the dashboard.',
  },
  {
    title: 'Is the number arithmetically possible?',
    body: 'Conversions and conversion rates checked against recorded click volume. A conversion rate above 100% is not automatically wrong, but it is always a reason to stop and look.',
  },
  {
    title: 'What do the platform’s own diagnostics say?',
    body: 'Google flags conversion actions as unverified, inactive, or recording no recent conversions. This is free information that most accounts never read.',
  },
  {
    title: 'Are the values real values?',
    body: 'Placeholder conversion values — a flat ₹1, for instance — quietly poison every value-based metric downstream, including ROAS.',
  },
  {
    title: 'Do the reports agree with each other?',
    body: 'Campaign-level and account-level figures should reconcile. Where they do not, at least one of them is describing something other than what you think.',
  },
  {
    title: 'Are campaign types measured on the same terms?',
    body: 'Comparing two campaign types is meaningless if one is recording conversions and the other is not.',
  },
  {
    title: 'Is each conversion action verified and active?',
    body: 'An action that exists is not the same as an action that is currently firing.',
  },
  {
    title: 'Can a recorded event be tied to a business event?',
    body: 'The hardest question, and the one that matters most: does anything in the account correspond to something a person at the business would recognise as an enquiry?',
  },
];

export const checksNote =
  'These are the same eight checks I ran across five of my own ad accounts before treating any of their numbers as optimisation truth.';

export const comparisonIntro =
  'Two campaign types in the same preschool account, shown side by side because they were measured on completely different terms — not because one of them won.';

export const comparisonPanels = [
  {
    title: 'Performance Max',
    rows: [
      { term: 'Spend', value: '₹8,637.27', evidence: 'documented' as const },
      { term: 'Clicks', value: '8,537', evidence: 'documented' as const },
      { term: 'CPC', value: '₹1.01', evidence: 'calculated' as const },
      { term: 'Reported lead-funnel leads', value: '171', evidence: 'reported' as const },
      { term: 'Recorded conversions', value: '0', evidence: 'verified' as const },
    ],
  },
  {
    title: 'Search',
    rows: [
      { term: 'Spend', value: '₹928.39', evidence: 'documented' as const },
      { term: 'Clicks', value: '7', evidence: 'documented' as const },
      { term: 'CPC', value: '₹132.63', evidence: 'calculated' as const },
      { term: 'Recorded conversions', value: '4', evidence: 'verified' as const },
    ],
  },
];

export const comparisonCaution =
  'This is not evidence that Search outperformed Performance Max. The Search campaign recorded seven clicks — far too small a sample — and the account’s measurement was unreliable across the board. The sample and measurement conditions are not comparable enough to support that conclusion.';

export const pmaxState = {
  heading: 'Same campaign, two measurement states',
  reported: { value: '171', label: 'reported lead-funnel leads' },
  recorded: { value: '0', label: 'recorded conversions in the platform’s conversion column' },
  caution:
    'These are two different reports of the same campaign, not a before-and-after. This is not evidence that the campaign produced no enquiries; it is evidence that the account cannot currently tell you whether it did.',
};

export const threeColumnsIntro =
  'The single most useful habit in paid search is refusing to let three different numbers collapse into one word.';

export const threeColumnsTerms: { term: string; body: string }[] = [
  {
    term: 'A click',
    body: 'Somebody arrived. It says nothing about who they were or what they wanted, and 8,537 of them at ₹1.01 each is a traffic figure, not a lead figure.',
  },
  {
    term: 'A reported lead-funnel lead',
    body: 'A number the platform surfaces in one of its own reports. It is real reporting, but it is not the conversion column, and the two do not have to agree — as the 171 against 0 above demonstrates.',
  },
  {
    term: 'A recorded conversion',
    body: 'An event the platform logged in its conversions column. It is the strongest of the three, and it is still only a statement about the platform, not about the business.',
  },
];

export const threeColumnsClosing =
  'Collapse those three into “leads” and you will end up defending a number you cannot substantiate the first time a client asks where it came from.';

export const threeColumnsTable: DataTableContent = {
  caption: 'What each column can and cannot establish',
  columns: [
    { key: 'metric', header: 'Column' },
    { key: 'establishes', header: 'Establishes' },
    { key: 'cannot', header: 'Cannot establish' },
  ],
  rows: [
    { metric: 'Clicks', establishes: 'Someone arrived on the site', cannot: 'Intent, relevance, or whether they enquired' },
    { metric: 'Reported lead-funnel leads', establishes: 'A platform report surfaced a figure', cannot: 'That the conversion column agrees' },
    { metric: 'Recorded conversions', establishes: 'The platform logged a defined event', cannot: 'That the event reached the business' },
    { metric: 'Business outcome', establishes: '—', cannot: 'Anything, until CRM data is connected back' },
  ],
};

export const verifiedMeaning = {
  term: 'Verified conversion',
  definition: 'A conversion recorded in the platform’s own conversions column.',
  excludes: [
    'An independently verified business outcome',
    'A confirmed admission',
    'A confirmed enquiry',
    'A confirmed qualified lead',
  ],
  note:
    'Every use of “recorded” or “verified conversion” in this article carries the narrow meaning above and nothing more. It is the same definition used throughout the case studies on this site.',
};

export const notConfirmedIntro =
  'It is worth being explicit about the ceiling here. This review was carried out on exported reporting. It does not confirm:';

export const notConfirmed: string[] = [
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

export const notConfirmedClosing =
  'That last one deserves emphasis, because it is the conclusion the numbers most invite and least support. A campaign showing 0 recorded conversions has not been shown to produce nothing. It has been shown to be unmeasured — and those are very different findings with very different responses.';

export const checklist: { title: string; body: string }[] = [
  {
    title: 'Open the conversion actions list first, not the campaign list',
    body: 'Check status, last recorded conversion, and attribution setting for every action before looking at a single performance figure.',
  },
  {
    title: 'Divide conversions by clicks yourself',
    body: 'Do not trust the displayed conversion rate. Calculate it and see whether the result is physically plausible.',
  },
  {
    title: 'Read the diagnostics Google already gives you',
    body: 'Unverified actions, no-recent-conversions warnings and inactive tags are surfaced by the platform and routinely ignored.',
  },
  {
    title: 'Check conversion values for placeholders',
    body: 'A uniform ₹1 across conversions is a default, not a price — and anything built on it, ROAS included, is fiction.',
  },
  {
    title: 'Compare campaign types on measurement, not performance',
    body: 'Before asking which campaign type performed better, confirm both were being measured the same way.',
  },
  {
    title: 'Trace one conversion end to end',
    body: 'Pick a single recorded conversion and follow it to something the business recognises. If you cannot, you have found the real problem.',
  },
];

export const beforeScaling = [
  'The instinct with an account like this is to reallocate: move budget away from the campaign showing zero and towards the one showing seven. That instinct is exactly backwards.',
  'Nothing in this data establishes that the zero-conversion campaign underperformed. It establishes that the account could not measure it. Moving budget on that basis is not optimisation — it is acting on the absence of information as though it were information.',
  'What I would fix first, in order: get every conversion action verified and firing; define one conversion that corresponds to a real business event; make both campaign types record it identically; then connect that event back to whatever the business uses to track enquiries.',
  'Only after that does the performance question — which campaign type actually works here — become answerable. It is a slower path, and it is the only one that produces an answer worth having.',
];

export const takeaway = {
  heading: 'A conversion number is a claim, and claims can be checked.',
  body: [
    'The account in this article was not broken in a dramatic way. Campaigns delivered, clicks arrived, budgets spent. It simply could not answer the one question it was being asked, and nothing on the dashboard said so.',
    'Before you optimise against a conversion number, spend twenty minutes establishing whether it deserves to be optimised against. It is the least glamorous work in performance marketing and reliably the highest-return.',
  ],
};

export const relatedCaseStudies = [
  {
    slug: 'preschool-google-ads',
    label: 'When Google Ads Numbers Don’t Tell the Whole Story',
    reason: 'The full diagnosis across all three preschool accounts, campaign by campaign.',
  },
  {
    slug: 'measurement-audit',
    label: 'I Audited My Own Ad Accounts Before Optimising Them',
    reason: 'The wider audit across five Meta and Google accounts these checks came from.',
  },
];

export const relatedServices = [
  { href: '/services/#google-ads', label: 'Google Ads & Search Acquisition' },
  { href: '/services/#tracking-measurement', label: 'Tracking & Measurement' },
];
