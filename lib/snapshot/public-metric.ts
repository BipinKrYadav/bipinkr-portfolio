import {
  PRIVATE_METRIC_FIELDS,
  type MetricDefinition,
  type PublicMetricDefinition,
} from '../metrics/types';

/** A metric definition without its private fields, preserving field order. */
export function toPublicMetric(definition: MetricDefinition): PublicMetricDefinition {
  const excluded = new Set<string>(PRIVATE_METRIC_FIELDS);
  const entries = Object.entries(definition).filter(([key]) => !excluded.has(key));
  return Object.fromEntries(entries) as PublicMetricDefinition;
}
