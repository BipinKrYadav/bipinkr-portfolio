import * as source from '../../../content/pages/contact';
import { documentContent } from '../document';

/**
 * Contact and thank-you page copy. Snapshot document `contact`; TypeScript
 * fallback: content/pages/contact.ts.
 *
 * The form configuration (service and spend options, form copy, setup notice)
 * is deliberately not in the snapshot: its labels are submitted to the form
 * provider and sent as tracking parameters, and ContactForm is a client
 * component that reads it directly from content/pages/contact.ts.
 */
const content = documentContent('contact', source);

export const { contactContent, auditOffer, thankYouContent, recruiterCta } = content;

export {
  adSpendOptions,
  formCopy,
  serviceOptions,
  setupNotice,
  type ServiceOption,
} from '../../../content/pages/contact';
