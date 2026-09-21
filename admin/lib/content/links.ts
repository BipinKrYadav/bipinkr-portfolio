/**
 * In-app links for the Documents screens. Static export: every detail route is
 * one page, and the record is chosen by query string after sign-in.
 */

export const documentDetailHref = (docType: string, slug: string): string =>
  `/content/detail/?type=${encodeURIComponent(docType)}&slug=${encodeURIComponent(slug)}`;

/** Same form as the Metrics list's links (components/metrics/MetricsList.tsx). */
export const metricDetailHref = (metricKey: string): string => `/metrics/detail/?key=${encodeURIComponent(metricKey)}`;
