import * as source from '../../content/metrics';
import { documentContent } from './document';

/** The four headline figures. Snapshot document `proofStrip`; TypeScript fallback: content/metrics.ts. */
const content = documentContent('proofStrip', source);

export const { proofMetrics, proofMethodologyNote } = content;
