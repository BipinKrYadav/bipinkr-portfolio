'use client';

import { useEffect, useRef, useState } from 'react';

import { trackGenerateLead } from '@/lib/tracking/events';
import { claimPendingLead } from '@/lib/tracking/lead';

interface LeadConversionProps {
  /** Rendered when the visitor arrived from a confirmed submission. */
  confirmed: React.ReactNode;
  /** Rendered when the page was opened directly, with nothing to confirm. */
  direct: React.ReactNode;
}

/**
 * Fires the primary conversion, exactly once, and picks the page copy.
 *
 * The `generate_lead` event is emitted here and nowhere else. It requires a
 * pending-lead record written by the contact form *after* the endpoint
 * confirmed the submission, so none of the following can trigger it:
 *
 * - opening or focusing the form
 * - clicking any CTA, including WhatsApp
 * - failing validation
 * - clicking submit
 * - a submission that errored or was rejected by the endpoint
 * - submitting with no form endpoint configured
 * - refreshing this page, or opening its URL directly
 *
 * `claimPendingLead()` removes the record as it reads it, so a refresh finds
 * nothing to claim.
 *
 * Until the effect has run, neither branch renders. That avoids a flash of
 * "nothing to confirm" for someone who did just convert — a hydration-safe
 * default that errs toward showing nothing rather than the wrong thing.
 */
export function LeadConversion({ confirmed, direct }: LeadConversionProps) {
  const [state, setState] = useState<'pending' | 'confirmed' | 'direct'>('pending');
  const claimed = useRef(false);

  useEffect(() => {
    // Strict Mode runs effects twice in development; claim only once.
    if (claimed.current) return;
    claimed.current = true;

    const lead = claimPendingLead();

    if (!lead) {
      setState('direct');
      return;
    }

    trackGenerateLead({
      event_id: lead.eventId,
      service: lead.service,
      ad_spend_band: lead.adSpendBand,
    });

    setState('confirmed');
  }, []);

  if (state === 'pending') return null;
  return <>{state === 'confirmed' ? confirmed : direct}</>;
}
