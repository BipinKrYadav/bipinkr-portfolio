'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { captureAttribution } from '@/lib/tracking/attribution';
import { exposeConsentApi } from '@/lib/tracking/consent';
import { ensureDataLayer } from '@/lib/tracking/dataLayer';
import { trackPageView } from '@/lib/tracking/events';

/**
 * Site-wide tracking runtime.
 *
 * Responsibilities, all of which must work whether or not any tracking ID is
 * configured:
 *
 * - Create `window.dataLayer` early, so events pushed before GTM loads are
 *   picked up when the container initialises.
 * - Capture campaign attribution once per session.
 * - Publish the consent API for a future consent platform.
 * - Emit `page_view` on the initial load and on every client-side route
 *   change, since a static export navigates without a document load.
 *
 * Renders nothing.
 *
 * Note for the GTM container: `page_view` is emitted for client-side route
 * changes ONLY. The initial view is left to the Google tag firing on
 * "Initialization - All Pages", so its automatic page view must stay ON and
 * this event must not be wired to a second page-view tag for the first load.
 * To record SPA navigations in GA4, add a GA4 Event tag named `page_view`
 * triggered on the custom event `page_view`.
 */
export function TrackingProvider() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  const isFirstPageView = useRef(true);

  // Runs once: dataLayer, attribution, consent API.
  useEffect(() => {
    ensureDataLayer();
    captureAttribution();
    exposeConsentApi();
  }, []);

  // Fires on client-side route changes only — see the note below.
  useEffect(() => {
    if (!pathname || lastPath.current === pathname) return;

    const isFirst = isFirstPageView.current;
    isFirstPageView.current = false;
    lastPath.current = pathname;

    /**
     * The first page view is NOT pushed.
     *
     * On a full document load the tag platform already records one by
     * itself: in GTM the Google tag fires on "Initialization - All Pages",
     * and in the direct-load fallback `gtag('config', …)` sends a page_view
     * on execution. Pushing our own here as well would give GA4 two hits
     * for a single page load.
     *
     * So responsibility is split cleanly:
     *   full page load   -> the tag platform's own page view
     *   client-side nav  -> this push, which the platform cannot see
     *
     * A static export navigates between routes without a document load, so
     * without this push those views would go unrecorded entirely.
     */
    if (isFirst) return;

    // Defer one frame: on a client-side navigation the document title is
    // swapped as part of the commit, so reading it synchronously here can
    // still return the previous page's title.
    const id = window.setTimeout(() => {
      trackPageView({
        page_path: pathname,
        page_title: typeof document !== 'undefined' ? document.title : undefined,
      });
    }, 0);

    return () => window.clearTimeout(id);
  }, [pathname]);

  return null;
}
