'use client';

import { createEventId } from './dataLayer';

/**
 * Lead handoff between the contact form and /thank-you.
 *
 * The conversion event is fired on /thank-you rather than in the form
 * handler, because "reached the thank-you page after a confirmed submission"
 * is a stronger definition of a conversion than "the fetch resolved".
 *
 * That handoff needs three guarantees:
 *
 * 1. `generate_lead` fires only for a submission the endpoint accepted.
 *    A visitor who navigates to /thank-you directly converts nothing.
 * 2. It fires once. Refreshing /thank-you must not double-count.
 * 3. It carries no personal data. Only the service, the ad spend band and
 *    a random event id cross this boundary — never name, email, phone,
 *    company or the message body.
 */

const PENDING_KEY = 'bk_pending_lead';
const FIRED_KEY = 'bk_fired_leads';

export interface PendingLead {
  /** Random, non-personal. Shared with a future server-side CAPI call. */
  eventId: string;
  /** Categorical selection from the form. */
  service?: string;
  /** Self-reported spend band — a range, never an exact figure. */
  adSpendBand?: string;
  /** Milliseconds since epoch, used to expire a stale handoff. */
  createdAt: number;
}

/** A handoff older than this is ignored, so a stale tab cannot convert. */
const MAX_AGE_MS = 30 * 60 * 1000;

/**
 * Records a confirmed submission, immediately before navigating to
 * /thank-you. Called only after the endpoint returned a success response.
 */
export function storePendingLead(input: {
  service?: string;
  adSpendBand?: string;
}): PendingLead {
  const lead: PendingLead = {
    eventId: createEventId(),
    service: input.service,
    adSpendBand: input.adSpendBand,
    createdAt: Date.now(),
  };

  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(lead));
  } catch {
    // Storage unavailable. The thank-you page will simply not fire the
    // conversion, which is the correct failure direction: under-count
    // rather than invent a conversion that cannot be substantiated.
  }

  return lead;
}

function readFiredIds(): string[] {
  try {
    const raw = sessionStorage.getItem(FIRED_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(parsed) ? (parsed.filter((v) => typeof v === 'string') as string[]) : [];
  } catch {
    return [];
  }
}

function markFired(eventId: string): void {
  try {
    const fired = readFiredIds();
    if (!fired.includes(eventId)) fired.push(eventId);
    // Keep the list bounded; only recent ids matter for de-duplication.
    sessionStorage.setItem(FIRED_KEY, JSON.stringify(fired.slice(-20)));
  } catch {
    // Non-fatal.
  }
}

/**
 * Claims the pending lead exactly once.
 *
 * Returns the lead the first time it is called after a confirmed
 * submission, and `null` on every subsequent call — including after a page
 * refresh, because the pending record is removed as part of claiming it and
 * its id is recorded in the fired list.
 */
export function claimPendingLead(): PendingLead | null {
  if (typeof window === 'undefined') return null;

  let lead: PendingLead | null = null;

  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    lead = JSON.parse(raw) as PendingLead;
  } catch {
    return null;
  }

  if (!lead || typeof lead.eventId !== 'string') return null;

  // Remove first: even if anything below throws, the record cannot be
  // claimed a second time.
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {
    // Non-fatal.
  }

  if (!Number.isFinite(lead.createdAt) || Date.now() - lead.createdAt > MAX_AGE_MS) return null;
  if (readFiredIds().includes(lead.eventId)) return null;

  markFired(lead.eventId);
  return lead;
}

/**
 * Whether this visitor reached /thank-you through a real submission.
 * Used only to choose which copy to show — never to fire a conversion.
 */
export function hasPendingLead(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(PENDING_KEY) !== null;
  } catch {
    return false;
  }
}
