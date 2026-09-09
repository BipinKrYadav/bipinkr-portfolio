'use client';

import { attributionParams } from './attribution';
import { createEventId, pushEvent, type DataLayerPayload } from './dataLayer';

/**
 * The event taxonomy.
 *
 * This is the complete, closed set of events the site emits. Adding a new
 * one means adding it here — components never invent event names, and
 * nothing outside this file calls the dataLayer directly.
 *
 * Naming follows GA4 conventions (lower_snake_case) so events map cleanly
 * onto GA4, and from there into Google Ads conversions and Meta custom
 * events without a translation layer.
 */
export type TrackingEvent =
  /** A page was viewed, including client-side route changes. */
  | 'page_view'
  /** A case study page was viewed. Fires alongside page_view. */
  | 'case_study_view'
  /** The "Get a Free Ad Audit" CTA was clicked, anywhere on the site. */
  | 'audit_cta_click'
  /** A WhatsApp CTA was clicked. An intent signal — NOT a lead. */
  | 'whatsapp_click'
  /** The visitor meaningfully began filling in the contact form. */
  | 'contact_form_start'
  /** A valid submission was accepted locally and sent to the endpoint. */
  | 'contact_form_submit'
  /** THE conversion. Only after the endpoint confirms success. */
  | 'generate_lead'
  /** The resume was downloaded. */
  | 'resume_click'
  /** A LinkedIn link was followed. */
  | 'linkedin_click';

/**
 * Where on the site an interaction happened.
 *
 * A single event with a `location` parameter, rather than one event name per
 * button. This keeps the GA4 event list short and lets a GTM trigger match
 * the event once and segment on the parameter.
 */
export type CtaLocation =
  /** Homepage hero */
  | 'hero'
  /** Homepage closing CTA band */
  | 'home_final'
  /** Header and mobile menu */
  | 'navigation'
  /** Any of the four case study pages */
  | 'case_study'
  | 'case_studies_index'
  /** The blog hub and individual articles */
  | 'blog'
  | 'blog_article'
  /** The dedicated Free Ad Audit page */
  | 'free_ad_audit'
  | 'free_ad_audit_final'
  | 'services'
  | 'about'
  | 'contact'
  | 'resume'
  | 'privacy'
  /** The public /how-this-site-is-tracked explainer */
  | 'tracking'
  /** Persistent CTA bar on small screens */
  | 'mobile_bar'
  | 'thank_you'
  | 'footer';

/* ------------------------------------------------------------------ */
/* Page views                                                          */
/* ------------------------------------------------------------------ */

export function trackPageView(params: { page_path: string; page_title?: string }): void {
  pushEvent('page_view', {
    page_path: params.page_path,
    page_title: params.page_title,
    page_location: typeof window !== 'undefined' ? window.location.href : undefined,
  });
}

/**
 * Fires on a case study page, in addition to `page_view`.
 * Carries the slug and title only — never anything about the client.
 */
export function trackCaseStudyView(params: {
  case_study_slug: string;
  case_study_title: string;
}): void {
  pushEvent('case_study_view', {
    case_study_slug: params.case_study_slug,
    case_study_title: params.case_study_title,
  });
}

/* ------------------------------------------------------------------ */
/* Intent signals                                                      */
/* ------------------------------------------------------------------ */

export function trackAuditCtaClick(location: CtaLocation | string): void {
  pushEvent('audit_cta_click', { location });
}

/**
 * A WhatsApp click is an *intent* signal, not a confirmed lead.
 *
 * The site cannot observe whether a message was ever sent, so this event is
 * never counted as a conversion and never triggers `generate_lead`.
 */
export function trackWhatsAppClick(location: CtaLocation | string): void {
  pushEvent('whatsapp_click', { location });
}

export function trackResumeClick(location: CtaLocation | string): void {
  pushEvent('resume_click', { location });
}

export function trackLinkedInClick(location: CtaLocation | string): void {
  pushEvent('linkedin_click', { location });
}

/* ------------------------------------------------------------------ */
/* Contact form funnel                                                 */
/* ------------------------------------------------------------------ */

/** The visitor focused a form field for the first time. */
export function trackContactFormStart(): void {
  pushEvent('contact_form_start', { form_id: 'ad_audit_request' });
}

/**
 * Validation passed and the request is on its way to the endpoint.
 *
 * This is emphatically NOT the conversion — the submission can still fail.
 * It measures submit *attempts*, which is what you need to spot an endpoint
 * that has quietly broken.
 */
export function trackContactFormSubmit(params: { service?: string }): void {
  pushEvent('contact_form_submit', {
    form_id: 'ad_audit_request',
    service: params.service,
  });
}

/* ------------------------------------------------------------------ */
/* The conversion                                                      */
/* ------------------------------------------------------------------ */

export interface LeadPayload {
  /** Non-personal id for this event, shared with a future CAPI call. */
  event_id: string;
  /** Which service the enquiry selected. Not personal data. */
  service?: string;
  /** Self-reported monthly ad spend band. A range, never an exact figure. */
  ad_spend_band?: string;
}

/**
 * The primary website conversion.
 *
 * Fires exactly once, only after the form endpoint has confirmed the
 * submission was accepted, and only from the /thank-you page. It never fires
 * on a click, on validation, on a submit attempt, or when no endpoint is
 * configured.
 *
 * `event_id` exists so a future server-side Meta Conversions API call can
 * send the same id and have Meta deduplicate the pair. See
 * `docs/tracking-architecture.md`.
 *
 * No name, email, phone number, company name or free-text message is ever
 * included — only the categorical fields above plus campaign attribution.
 */
export function trackGenerateLead(payload: LeadPayload): void {
  const params: DataLayerPayload = {
    event_id: payload.event_id,
    service: payload.service,
    ad_spend_band: payload.ad_spend_band,
    lead_type: 'ad_audit_request',
    ...attributionParams(),
  };

  pushEvent('generate_lead', params);
}

export { createEventId };
