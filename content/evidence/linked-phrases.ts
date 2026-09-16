import type { LinkedPhrase } from '../../lib/metrics/types';

/**
 * Wording that restates a canonical metric in words instead of rendering it.
 *
 * These phrases are deliberately left as written. Generating them — turning
 * 34.9% into "roughly a third", or choosing between "increased" and "fell" —
 * would mean the software choosing claim wording, which is exactly the kind
 * of judgement this site keeps human. Instead, each is tied to the metrics it
 * depends on, so any change to those metrics can flag the wording for review.
 */
export const linkedPhrases: readonly LinkedPhrase[] = [
  {
    location: 'content/case-studies/meta-lead-generation.ts › summary.title (SEO title, og:title, H1, breadcrumb)',
    phrase: 'From ₹106.66 to ₹32.29 CPL',
    metricIds: ['re.cohort_2025.cpl', 're.cohort_2026.cpl'],
    reason:
      'Editorial title copy is independently controlled by policy: it quotes these figures but never updates automatically. Review by hand when either metric changes.',
  },
  {
    location: 'content/pages/home.ts › whyWorkWithMe',
    phrase: 'roughly a third of documented spend',
    metricIds: ['audit.unreliable_share'],
    reason: 'Qualitative restatement of 34.9%.',
  },
  {
    location: 'content/case-studies/measurement-audit.ts › situation',
    phrase: 'For roughly a third of the documented spend',
    metricIds: ['audit.unreliable_share'],
    reason: 'Qualitative restatement of 34.9%.',
  },
  {
    location: 'content/pages/about.ts › measurementLesson',
    phrase: 'roughly',
    metricIds: ['audit.unreliable_share'],
    reason: 'Qualifier in front of the rendered share; review if the share becomes exact.',
  },
  {
    location: 'content/case-studies/meta-lead-generation.ts › cohortObservations',
    phrase: 'Spend increased approximately … / Lead volume increased approximately … / Reported CPL fell …',
    metricIds: ['re.cohort.spend_multiple', 're.cohort.lead_multiple', 're.cohort.cpl_change_pct'],
    reason: 'The multiples and percentage render from the registry; the direction words (“increased”, “fell”) do not.',
  },
  {
    location: 'content/case-studies/meta-lead-generation.ts › summary.subtitle',
    phrase: 'while reported CPL fell',
    metricIds: ['re.cohort.cpl_change_pct'],
    reason: 'Direction word; the percentage renders from the registry.',
  },
  {
    location: 'content/case-studies/meta-lead-generation.ts › campaignsIntro',
    phrase: 'close to',
    metricIds: ['re.top5.cpl_spread'],
    reason: 'Approximation wording in front of the rendered 1.8×.',
  },
  {
    location: 'content/case-studies/preschool-google-ads.ts › accounts[A].intro',
    phrase: 'a large volume of clicks at around a rupee each',
    metricIds: ['pre.account_a.pmax.clicks', 'pre.account_a.pmax.cpc'],
    reason: 'Qualitative restatement of 8,537 clicks at ₹1.01.',
  },
  {
    location: 'content/case-studies/preschool-google-ads.ts › accounts[A].intro',
    phrase: 'In the conversions column it shows nothing.',
    metricIds: ['pre.account_a.pmax.recorded_conversions'],
    reason: 'Restates 0 recorded conversions in words.',
  },
  {
    location: 'content/case-studies/preschool-google-ads.ts › accounts[B].intro',
    phrase: 'Nearly two thousand recorded clicks … a single recorded conversion between them',
    metricIds: ['pre.account_b.smart.clicks', 'pre.account_b.search.clicks', 'pre.account_b.recorded_conversions'],
    reason: 'Approximates 1,171 + 759 clicks and restates 1 conversion; the grammar depends on the values.',
  },
  {
    location: 'content/case-studies/preschool-google-ads.ts › accounts[B].intro',
    phrase: 'recorded nothing … nearly four times as much for fewer clicks and recorded one conversion',
    metricIds: [
      'pre.account_b.smart.recorded_conversions',
      'pre.account_b.search.spend',
      'pre.account_b.smart.spend',
      'pre.account_b.search.clicks',
      'pre.account_b.smart.clicks',
      'pre.account_b.search.recorded_conversions',
    ],
    reason: 'Comparative wording (≈3.8× spend, fewer clicks, singular “conversion”) that no formatter can safely generate.',
  },
  {
    location: 'content/case-studies/preschool-google-ads.ts › accounts[B].caution',
    phrase: 'One recorded conversion is not a performance signal.',
    metricIds: ['pre.account_b.recorded_conversions'],
    reason: 'Sentence grammar depends on the value being one.',
  },
  {
    location: 'content/case-studies/preschool-google-ads.ts › accounts[C].intro',
    phrase: 'The smallest budget … spent slightly more for more clicks and recorded none',
    metricIds: ['pre.account_c.spend', 'pre.account_c.search_2.spend', 'pre.account_c.search_2.clicks', 'pre.account_c.search_2.recorded_conversions'],
    reason: 'Comparative wording about the relative values.',
  },
  {
    location: 'content/blog/google-ads-conversion-tracking.ts › problem',
    phrase: 'twenty thousand rupees',
    metricIds: ['pre.total.spend'],
    reason: 'Approximation of ₹20,187.56 in words.',
  },
  {
    location: 'content/blog/google-ads-conversion-tracking.ts › spendMetrics',
    phrase: '0 — conversion actions actively recording in the reviewed setup',
    metricIds: ['pre.account_a.conversion_actions.actively_recording'],
    reason:
      'Not rendered from the registry: the article scopes the figure to “the reviewed setup” (three accounts) while the recorded diagnostic belongs to account A. Kept as published until the scope is confirmed.',
  },
  {
    location: 'content/case-studies/measurement-audit.ts › failureModesNote',
    phrase: 'The three spend figures above',
    metricIds: ['audit.unreliable_spend'],
    reason: 'Counts the formula’s terms in words.',
  },
  {
    location: 'content/case-studies/measurement-audit.ts › failureModes[03]',
    phrase: 'In one preschool account … nothing at all in the conversions column … A campaign recording 0 conversions',
    metricIds: ['pre.account_a.pmax.recorded_conversions', 'pre.account_a.conversion_actions.unverified'],
    reason: 'Describes account A and its Performance Max campaign in words; the caution states the principle about a zero rather than rendering the figure.',
  },
  {
    location: 'content/case-studies/measurement-audit.ts › failureModes[04]',
    phrase: 'two (further) preschool accounts and Meta website lead campaigns',
    metricIds: ['audit.incomplete_tracking.sources', 'audit.incomplete_tracking.spend'],
    reason: 'Breakdown of the 3 sources; the component counts are not stored as metrics.',
  },
  {
    location: 'content/case-studies/preschool-google-ads.ts › accounts[A].note / heroMetrics',
    phrase: 'The two campaigns above … in one campaign',
    metricIds: ['pre.account_a.pmax.spend', 'pre.account_a.search.spend', 'pre.account_a.pmax.reported_funnel_leads'],
    reason: 'Counts rows and scopes the “171 vs 0” figure in words.',
  },
  {
    location: 'content/blog/google-ads-conversion-tracking.ts › beforeScaling / notConfirmedClosing',
    phrase: 'the zero-conversion campaign … A campaign showing 0 recorded conversions',
    metricIds: ['pre.account_a.pmax.recorded_conversions'],
    reason: 'Restates the Performance Max zero in words; the second sentence states the general principle.',
  },
  {
    location: 'content/case-studies/cross-channel-real-estate.ts › comparisonCaution / limitationBody',
    phrase: 'one of those definitions is not reliable in this dataset',
    metricIds: ['cc.google.reported_conversion_rate_1', 'cc.google.reported_conversion_rate_2', 'cc.google.reported_conversion_rate_3'],
    reason: 'The claim that Google conversion reporting is unreliable rests on these reported rates.',
  },
];
