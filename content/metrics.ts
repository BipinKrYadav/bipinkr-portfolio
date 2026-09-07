import type { Metric } from './types';

/**
 * The four public-safe headline figures, used by the homepage proof strip
 * and the About evidence snapshot.
 *
 * These describe *documented campaign activity*. They deliberately do not
 * describe revenue, qualified leads, bookings or client business outcomes,
 * none of which the available evidence establishes.
 */
export const proofMetrics: Metric[] = [
  {
    value: '₹1.11L+',
    label: 'documented ad spend',
    evidence: 'documented',
  },
  {
    value: '1,617',
    label: 'Meta form submissions',
    evidence: 'verified',
  },
  {
    value: '5',
    label: 'ad accounts documented',
    evidence: 'documented',
  },
  {
    value: '15 months',
    label: 'campaign evidence',
    evidence: 'documented',
  },
];

export const proofMethodologyNote =
  'Based on documented campaign exports and analysis. Metrics have defined limitations and are presented conservatively.';
