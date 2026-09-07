'use client';

import { ArrowRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

import { WhatsAppButton } from '@/components/contact/WhatsAppButton';
import { Button } from '@/components/ui/Button';
import { PRIMARY_CTA } from '@/content/navigation';
import { hasWhatsApp } from '@/content/site-config';
import { cn } from '@/lib/utils';

/**
 * Persistent CTA bar for small screens.
 *
 * The header's "Get a Free Ad Audit" button is hidden below the `sm`
 * breakpoint — there is not room for it beside the wordmark and the menu
 * toggle — so on a phone the primary action is two taps away behind the
 * menu for the entire page. This bar closes that gap without touching the
 * header layout or the desktop design.
 *
 * Restraint, deliberately:
 * - Only below `lg`, where the header CTA is not already visible.
 * - Only after the hero has been scrolled past, so it never covers the
 *   hero's own CTA or competes with it.
 * - Hidden on /contact and /thank-you, where it would be pointing at the
 *   page the visitor is already on.
 * - No countdown, no scarcity, no dismissal nag. It is the same offer in a
 *   more reachable place.
 *
 * To remove it entirely, delete the <MobileCtaBar /> line in app/layout.tsx.
 */

/** Routes where a persistent "go to contact" CTA would be redundant. */
const HIDDEN_ON = ['/contact', '/thank-you'];

export function MobileCtaBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // Roughly one viewport: past the hero on every page.
      setVisible(window.scrollY > window.innerHeight * 0.85);
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const hidden = HIDDEN_ON.some((route) => pathname === route || pathname === `${route}/`);
  if (hidden) return null;

  return (
    <>
      {/*
        Flow spacer, so the bar never covers the last of the footer when the
        visitor scrolls to the very bottom. Only present while the bar is.
      */}
      {visible ? <div aria-hidden="true" className="h-20 lg:hidden" /> : null}

      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur-sm lg:hidden',
          'transition-transform duration-300 ease-out motion-reduce:transition-none',
          visible ? 'translate-y-0' : 'translate-y-full',
        )}
        // Removed from the accessibility tree and the tab order while off
        // screen, so keyboard users never focus an invisible control.
        aria-hidden={!visible}
        inert={!visible}
      >
        <div
          className="mx-auto flex max-w-container items-center gap-2 px-5 py-3"
          // Clears the iOS home indicator.
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <Button
            href={PRIMARY_CTA.href}
            size="md"
            fullWidth={!hasWhatsApp}
            className="flex-1"
            analyticsEvent="audit_cta_click"
            analyticsProps={{ location: 'mobile_bar' }}
            trailingIcon={<ArrowRight aria-hidden="true" className="h-4 w-4" />}
          >
            {PRIMARY_CTA.label}
          </Button>

          <WhatsAppButton location="mobile_bar" label="WhatsApp" className="shrink-0" />
        </div>
      </div>
    </>
  );
}
