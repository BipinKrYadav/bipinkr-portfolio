import { metric } from '@/lib/metrics';

import type { Metric } from './types';

/**
 * The four public-safe headline figures, used by the homepage proof strip
 * and the About evidence snapshot.
 *
 * These describe *documented campaign activity*. They deliberately do not
 * describe revenue, qualified leads, bookings or client business outcomes,
 * none of which the available evidence establishes.
 *
 * Values and evidence grades come from the canonical metric registry
 * (content/evidence/metrics).
 */
export const proofMetrics: Metric[] = [
  metric('site.spend_total', 'documented ad spend', { lowerBoundMarker: true }),
  metric('re.form_submissions', 'Meta form submissions'),
  metric('site.accounts', 'ad accounts documented'),
  metric('site.evidence_months', 'campaign evidence'),
];

export const proofMethodologyNote =
  'Based on documented campaign exports and analysis. Metrics have defined limitations and are presented conservatively.';
