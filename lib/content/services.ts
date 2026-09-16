import * as source from '../../content/services';
import { documentContent } from './document';

/** Services, process steps and funnel. Snapshot document `services`; TypeScript fallback: content/services.ts. */
const content = documentContent('services', source);

export const {
  services,
  servicesPageContent,
  funnelNodes,
  funnelContent,
  processSteps,
  servicesCta,
} = content;
