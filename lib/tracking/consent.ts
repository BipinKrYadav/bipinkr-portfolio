'use client';

import { consentRequired } from './config';
import { pushToDataLayer } from './dataLayer';

/**
 * Consent integration point.
 *
 * This file is deliberately *not* a consent management platform. It ships no
 * banner, stores no consent record and makes no legal determination — doing
 * any of that badly is worse than not doing it. What it provides is the
 * plumbing a real CMP needs, so one can be dropped in without touching any
 * other file.
 *
 * When `NEXT_PUBLIC_CONSENT_MODE=required`, Google Consent Mode v2 defaults
 * are pushed as *denied* before GTM loads. Google's tags then hold off on
 * writing cookies or sending identifiers until consent is granted.
 *
 * When the mode is `off` (the default), no consent signal is sent and tags
 * behave normally. Use that only where consent is genuinely not required, or
 * where a CMP outside this site already handles it.
 */

export type ConsentSignal = 'granted' | 'denied';

export interface ConsentState {
  /** GA4 and other measurement tags. */
  analytics_storage: ConsentSignal;
  /** Google Ads remarketing and conversion cookies. */
  ad_storage: ConsentSignal;
  /** Sending ad-click identifiers to Google. */
  ad_user_data: ConsentSignal;
  /** Personalised advertising. */
  ad_personalization: ConsentSignal;
}

const DENIED: ConsentState = {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
};

const GRANTED: ConsentState = {
  analytics_storage: 'granted',
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
};

/**
 * The inline script that must run *before* the GTM snippet.
 *
 * It defines gtag() and sets Consent Mode v2 defaults to denied. It is
 * emitted as a raw string because it has to execute synchronously ahead of
 * the container — see `components/tracking/TrackingScripts.tsx`.
 *
 * `wait_for_update` gives a CMP 500ms to report a stored decision before
 * tags evaluate, which avoids losing measurement for returning visitors who
 * have already consented.
 */
export const CONSENT_DEFAULT_SCRIPT = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  'analytics_storage': 'denied',
  'ad_storage': 'denied',
  'ad_user_data': 'denied',
  'ad_personalization': 'denied',
  'wait_for_update': 500
});
gtag('set', 'ads_data_redaction', true);
`.trim();

type GtagArgs = ['consent', 'update', ConsentState];

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    /** Exposed so a CMP can drive consent without importing this module. */
    __bkTrackingConsent?: (state: Partial<ConsentState> | 'granted' | 'denied') => void;
  }
}

function sendConsentUpdate(state: ConsentState): void {
  try {
    if (typeof window === 'undefined') return;

    if (typeof window.gtag === 'function') {
      const args: GtagArgs = ['consent', 'update', state];
      window.gtag(...args);
    } else {
      // gtag() is only defined when consent mode is active; fall back to a
      // plain push so a GTM-side consent trigger can still react.
      pushToDataLayer({ ...state });
    }

    pushToDataLayer({ event: 'consent_update', ...state });
  } catch {
    // Never allowed to break the page.
  }
}

/** Grants all categories. Call this from a real CMP's accept handler. */
export function grantConsent(): void {
  sendConsentUpdate(GRANTED);
}

/** Explicitly denies all categories. */
export function denyConsent(): void {
  sendConsentUpdate(DENIED);
}

/** Fine-grained update, for a CMP with per-category toggles. */
export function updateConsent(partial: Partial<ConsentState>): void {
  sendConsentUpdate({ ...DENIED, ...partial });
}

/**
 * Publishes the consent API on `window` so a tag-managed or third-party CMP
 * can call it without a bundler import:
 *
 *   window.__bkTrackingConsent('granted')
 *   window.__bkTrackingConsent({ analytics_storage: 'granted' })
 *
 * No-op unless consent mode is `required`.
 */
export function exposeConsentApi(): void {
  if (typeof window === 'undefined' || !consentRequired) return;

  window.__bkTrackingConsent = (state) => {
    if (state === 'granted') return grantConsent();
    if (state === 'denied') return denyConsent();
    return updateConsent(state);
  };
}
