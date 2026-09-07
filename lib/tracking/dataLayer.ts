'use client';

import { trackingConfig } from './config';

/**
 * The dataLayer abstraction.
 *
 * This is the single place in the codebase that touches
 * `window.dataLayer.push`. Nothing else may call it directly — components
 * use the typed helpers in `./events`, which route through here.
 *
 * Every function is safe to call at any time: during SSR/static export,
 * before GTM loads, and when no tracking is configured at all. Nothing here
 * throws, because an analytics failure must never interrupt a real user
 * action such as submitting the contact form.
 */

export type DataLayerValue = string | number | boolean | null | undefined;
export type DataLayerPayload = Record<string, DataLayerValue | Record<string, DataLayerValue>>;

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/**
 * Ensures `window.dataLayer` exists.
 *
 * Pushes made before the GTM snippet runs are not lost: GTM adopts whatever
 * is already in the array when it initialises.
 */
export function ensureDataLayer(): unknown[] | null {
  if (typeof window === 'undefined') return null;
  if (!Array.isArray(window.dataLayer)) window.dataLayer = [];
  return window.dataLayer;
}

/** Strips undefined/null so events do not carry empty keys. */
function clean(payload: DataLayerPayload): DataLayerPayload {
  const result: DataLayerPayload = {};

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null || value === '') continue;
    result[key] = value;
  }

  return result;
}

/**
 * Pushes an arbitrary payload to the dataLayer.
 *
 * Prefer the typed helpers in `./events`. This is exported for the consent
 * and configuration pushes that are not user events.
 */
export function pushToDataLayer(payload: DataLayerPayload): void {
  try {
    const layer = ensureDataLayer();
    if (!layer) return;

    const cleaned = clean(payload);
    layer.push(cleaned);

    if (trackingConfig.debug) {
      // eslint-disable-next-line no-console
      console.debug('[tracking] dataLayer.push', cleaned);
    }
  } catch {
    // Deliberately swallowed. Tracking is never allowed to break the page.
  }
}

/**
 * Pushes a named event.
 *
 * Note for whoever configures the GTM container: the dataLayer is
 * append-only, so a parameter pushed by one event remains readable by a
 * later one. Read event parameters through GTM variables scoped to the
 * triggering event rather than assuming each push starts clean.
 */
export function pushEvent(event: string, params: DataLayerPayload = {}): void {
  pushToDataLayer({ event, ...params });
}

/**
 * A cryptographically random id, used for Meta event deduplication between
 * the browser Pixel and a future server-side Conversions API call.
 *
 * Contains no personal data — it identifies an *event*, not a person.
 */
export function createEventId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // Fall through to the non-crypto path below.
  }

  return `evt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
