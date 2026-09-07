import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

import { TableOfContents } from '@/components/blocks/TableOfContents';
import { Container } from '@/components/ui/Container';
import { getNextCaseStudy } from '@/content/case-studies';
import type { CaseStudySection } from '@/content/types';
import { cn } from '@/lib/utils';

interface CaseStudyLayoutProps {
  sections: CaseStudySection[];
  children: ReactNode;
  /** Current slug, used to build the "next case study" link. */
  slug: string;
}

/**
 * Two-column editorial layout for case studies.
 *
 * Desktop gets a sticky table of contents in a narrow left column; mobile
 * gets a compact, horizontally scrollable section nav and no sticky
 * sidebar, so the reading column keeps the full width of the screen.
 */
export function CaseStudyLayout({ sections, children, slug }: CaseStudyLayoutProps) {
  const next = getNextCaseStudy(slug);

  return (
    <>
      {/* Mobile section navigation */}
      <div className="lg:hidden">
        <Container>
          <TableOfContents sections={sections} variant="inline" />
        </Container>
      </div>

      <div className="py-section-sm">
        <Container>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            <aside className="hidden lg:col-span-3 lg:block">
              <TableOfContents sections={sections} variant="sidebar" />
            </aside>

            <div className="lg:col-span-9 xl:col-span-8">{children}</div>
          </div>
        </Container>
      </div>

      {/* Next case study */}
      <div className="border-t border-line bg-paper-sunk py-section-sm">
        <Container>
          <p className="text-micro font-semibold uppercase tracking-[0.11em] text-ink-faint">
            Next case study
          </p>
          <Link
            href={`/case-studies/${next.slug}`}
            className={cn(
              'group mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between',
            )}
          >
            <span className="max-w-2xl font-serif text-display-sm text-ink">{next.cardTitle}</span>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-accent">
              Read case study
              <ArrowRight
                aria-hidden="true"
                className="h-4 w-4 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5"
              />
            </span>
          </Link>
        </Container>
      </div>
    </>
  );
}

/**
 * A section within a case study body. Owns the anchor id, the heading and
 * the vertical rhythm so individual case study pages stay declarative.
 */
export function CaseStudySection({
  id,
  heading,
  children,
  className,
}: {
  id: string;
  heading: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn('scroll-mt-28 border-t border-line pt-10 first:border-t-0 first:pt-0', className)}>
      <h2 className="font-serif text-display-sm text-ink">{heading}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** Consistent spacing between case study sections. */
export function CaseStudyBody({ children }: { children: ReactNode }) {
  return <div className="space-y-14">{children}</div>;
}
