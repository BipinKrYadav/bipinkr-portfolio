'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { mobileNav, primaryNav, PRIMARY_CTA } from '@/content/navigation';
import { siteConfig } from '@/content/site-config';
import { cn } from '@/lib/utils';

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close the mobile panel whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Hairline border appears only once the page has scrolled.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Escape closes the panel and returns focus to the toggle.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    // Prevent the page behind the panel from scrolling.
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 bg-paper/90 backdrop-blur-sm transition-colors duration-200',
        scrolled || open ? 'border-b border-line' : 'border-b border-transparent',
      )}
    >
      <Container className="flex h-[var(--header-height)] items-center justify-between gap-6">
        <Link
          href="/"
          className="rounded-sm font-serif text-lg font-semibold tracking-tight text-ink"
        >
          {siteConfig.name}
        </Link>

        {/* Desktop navigation */}
        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {primaryNav.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive(link.href) ? 'page' : undefined}
                  className={cn(
                    'rounded-sm text-[0.9375rem] transition-colors',
                    isActive(link.href)
                      ? 'font-medium text-ink'
                      : 'text-ink-soft hover:text-ink',
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Button
            href={PRIMARY_CTA.href}
            size="sm"
            className="hidden sm:inline-flex"
            analyticsEvent="audit_cta_click"
            analyticsProps={{ location: 'navigation' }}
          >
            {PRIMARY_CTA.label}
          </Button>

          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            className="-mr-2 inline-flex h-11 w-11 items-center justify-center rounded-sm text-ink lg:hidden"
          >
            {open ? (
              <X aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Menu aria-hidden="true" className="h-5 w-5" />
            )}
            <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          </button>
        </div>
      </Container>

      {/* Mobile navigation panel */}
      <div
        id="mobile-navigation"
        ref={panelRef}
        hidden={!open}
        className="border-t border-line bg-paper lg:hidden"
      >
        <Container className="py-6">
          <nav aria-label="Mobile">
            <ul className="flex flex-col">
              {mobileNav.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive(link.href) ? 'page' : undefined}
                    className={cn(
                      'flex items-center justify-between border-b border-line py-3.5 text-base',
                      isActive(link.href) ? 'font-medium text-ink' : 'text-ink-soft',
                    )}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <Button
            href={PRIMARY_CTA.href}
            size="lg"
            fullWidth
            className="mt-6"
            analyticsEvent="audit_cta_click"
            analyticsProps={{ location: 'navigation' }}
          >
            {PRIMARY_CTA.label}
          </Button>
        </Container>
      </div>
    </header>
  );
}
