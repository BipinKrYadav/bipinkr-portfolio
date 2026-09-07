'use client';

import {
  trackAuditCtaClick,
  trackContactFormStart,
  trackLinkedInClick,
  trackResumeClick,
  trackWhatsAppClick,
  type TrackingEvent,
} from './tracking/events';

/**
 * Compatibility layer for the original `track()` API.
 *
 * The tracking architecture now lives in `lib/tracking/*`, with the
 * dataLayer as the single transport and one typed helper per event. This
 * module stays because `components/ui/Button.tsx` — and therefore every CTA
 * on the site — already calls `track(event, props)`, and changing that call
 * signature would mean touching a dozen files for no behavioural gain.
 *
 * Prefer importing the typed helpers from `@/lib/tracking/events` directly
 * in new code.
 *
 * Events not routable from a click handler (`page_view`, `case_study_view`,
 * `contact_form_submit`, `generate_lead`) are deliberately absent here: they
 * have their own call sites with required parameters that a generic click
 * wrapper cannot supply.
 */

export type AnalyticsEvent = Extract<
  TrackingEvent,
  'audit_cta_click' | 'whatsapp_click' | 'resume_click' | 'linkedin_click' | 'contact_form_start'
>;

export type AnalyticsProps = Record<string, string | number | boolean | undefined>;

/**
 * Records an interaction. Safe to call anywhere: when nothing is configured
 * the push lands in an inert `window.dataLayer` array and goes nowhere.
 * Never throws — analytics must not interrupt a real user action.
 */
export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  const location = typeof props?.location === 'string' ? props.location : 'unknown';

  switch (event) {
    case 'audit_cta_click':
      return trackAuditCtaClick(location);
    case 'whatsapp_click':
      return trackWhatsAppClick(location);
    case 'resume_click':
      return trackResumeClick(location);
    case 'linkedin_click':
      return trackLinkedInClick(location);
    case 'contact_form_start':
      return trackContactFormStart();
  }
}

/**
 * Convenience wrapper for onClick handlers.
 *
 * `onClick={trackClick('whatsapp_click', { location: 'footer' })}`
 */
export function trackClick(event: AnalyticsEvent, props?: AnalyticsProps) {
  return () => track(event, props);
}
