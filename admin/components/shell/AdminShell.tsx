'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { LogIn, Menu, X } from 'lucide-react';

import { AuthStatusBadge } from '@admin/components/auth/AuthStatusBadge';
import { currentSection } from '@admin/lib/navigation';

import { SidebarNav } from './SidebarNav';

/**
 * Console layout: fixed sidebar on large screens, collapsible navigation
 * below `lg`, sticky top bar, and the main content area.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const section = currentSection(pathname);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-ink focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink-inverse"
      >
        Skip to content
      </a>

      <aside className="hidden bg-night text-ink-inverse lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
        <Brand />
        <SidebarNav pathname={pathname} />
        <p className="mt-auto border-t border-night-line px-5 py-4 text-xs leading-relaxed text-[#A9AFB8]">
          Operations console for bipinkr.in. Not linked from the public site.
        </p>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-paper-raised px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => setNavOpen((open) => !open)}
            aria-expanded={navOpen}
            aria-controls="mobile-navigation"
            className="-ml-1 inline-flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-paper-sunk lg:hidden"
          >
            {navOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
            <span className="sr-only">{navOpen ? 'Close navigation' : 'Open navigation'}</span>
          </button>
          <span className="whitespace-nowrap text-sm font-semibold lg:hidden">Admin</span>
          <p className="hidden truncate text-sm text-ink-soft lg:block">{section?.label ?? 'Admin'}</p>

          <div className="ml-auto flex items-center gap-3">
            <AuthStatusBadge />
            <Link
              href="/login/"
              className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-accent underline-offset-4 hover:underline"
            >
              <LogIn aria-hidden="true" className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Sign-in page</span>
            </Link>
          </div>
        </header>

        <div id="mobile-navigation" hidden={!navOpen} className="border-b border-night-line bg-night lg:hidden">
          <SidebarNav pathname={pathname} />
        </div>

        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[88rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex h-14 items-center gap-2.5 border-b border-night-line px-5">
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[#7FC6BC]" />
      <span className="text-sm font-semibold tracking-tight text-white">bipinkr.in</span>
      <span className="rounded-md border border-night-line px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-[#A9AFB8]">
        Admin
      </span>
    </div>
  );
}
