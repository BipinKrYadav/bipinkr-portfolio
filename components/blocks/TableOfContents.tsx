'use client';

import { useEffect, useState } from 'react';

import type { CaseStudySection } from '@/content/types';
import { cn } from '@/lib/utils';

interface TableOfContentsProps {
  sections: CaseStudySection[];
  /** `sidebar` is the sticky desktop column; `inline` is the mobile chip row. */
  variant: 'sidebar' | 'inline';
  className?: string;
}

/**
 * Case study section navigation with scroll tracking.
 *
 * The active section is a progressive enhancement: without JavaScript the
 * links are ordinary anchors and still work. `rootMargin` biases detection
 * towards the section occupying the upper third of the viewport.
 */
export function TableOfContents({ sections, variant, className }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections]);

  if (variant === 'inline') {
    return (
      <nav
        aria-label="Sections in this case study"
        className={cn('table-scroll border-y border-line py-3', className)}
      >
        <ul className="flex w-max gap-2">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={activeId === section.id ? 'true' : undefined}
                className={cn(
                  'inline-block whitespace-nowrap rounded-pill border px-3 py-1.5 text-xs transition-colors',
                  activeId === section.id
                    ? 'border-accent bg-accent-soft font-semibold text-accent-ink'
                    : 'border-line bg-paper-raised text-ink-soft',
                )}
              >
                {section.navLabel}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Sections in this case study" className={cn('sticky top-28', className)}>
      <h2 className="text-micro font-semibold uppercase tracking-[0.11em] text-ink-faint">
        On this page
      </h2>

      <ul className="mt-4 space-y-0.5 border-l border-line">
        {sections.map((section) => {
          const active = activeId === section.id;

          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  '-ml-px block border-l py-1.5 pl-4 text-sm transition-colors',
                  active
                    ? 'border-accent font-medium text-ink'
                    : 'border-transparent text-ink-faint hover:border-line-strong hover:text-ink-soft',
                )}
              >
                {section.navLabel}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
