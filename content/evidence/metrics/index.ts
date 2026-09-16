import type { MetricDefinition } from '../../../lib/metrics/types';
import { crossChannelMetrics } from './cross-channel';
import { measurementAuditMetrics } from './measurement-audit';
import { metaRealEstateMetrics } from './meta-real-estate';
import { preschoolMetrics } from './preschool';
import { siteMetrics } from './site';

/**
 * The canonical metric registry — the single source for every
 * evidence-backed figure on the site.
 *
 * Datasets:
 *   site   Site-wide headline figures
 *   re     Meta lead generation, residential real estate
 *   audit  Measurement audit
 *   pre    Preschool Google Ads accounts
 *   cc     Cross-channel Meta + Google
 *
 * See docs/metric-registry.md for the model and the rules for changing a figure.
 */
export const metricDefinitions: readonly MetricDefinition[] = [
  ...siteMetrics,
  ...metaRealEstateMetrics,
  ...measurementAuditMetrics,
  ...preschoolMetrics,
  ...crossChannelMetrics,
];
