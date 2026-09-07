import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { EvidenceLabel } from '@/components/ui/EvidenceLabel';
import type { CaseStudySummary } from '@/content/types';
import { cn } from '@/lib/utils';

interface CaseStudyCardProps {
  study: CaseStudySummary;
  className?: string;
  /** `feature` gives the card more room; used for the first card on wide grids. */
  layout?: 'default' | 'feature';
  /**
   * Heading level for the card title, so the surrounding page keeps a valid
   * outline. `h3` on the homepage, where cards sit beneath a section `h2`;
   * `h2` on the case study index, where they are the top-level content under
   * the page `h1`.
   */
  headingLevel?: 'h2' | 'h3';
}

export function CaseStudyCard({
  study,
  className,
  layout = 'default',
  headingLevel: Heading = 'h3',
}: CaseStudyCardProps) {
  const href = `/case-studies/${study.slug}`;

  return (
    <article
      className={cn(
        'group relative flex flex-col rounded-card border border-line bg-paper-raised p-6 transition-[border-color,box-shadow,transform] duration-300 hover:border-line-strong hover:shadow-lift motion-safe:hover:-translate-y-0.5 sm:p-8',
        className,
      )}
    >
      {/* Industry / platform */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-micro uppercase tracking-[0.09em] text-ink-faint">
        <span>{study.industry}</span>
        <span aria-hidden="true" className="text-line-strong">
          ·
        </span>
        <span>{study.platform}</span>
      </div>

      <Heading
        className={cn(
          'mt-4 font-serif text-ink',
          layout === 'feature' ? 'text-display-sm' : 'text-2xl leading-snug',
        )}
      >
        {/* Stretched link keeps the whole card clickable with one tab stop. */}
        <Link href={href} className="after:absolute after:inset-0 after:content-['']">
          {study.cardTitle}
        </Link>
      </Heading>

      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
        {study.cardDescription}
      </p>

      {/* Key metrics */}
      <dl className="mt-6 grid grid-cols-1 gap-4 border-t border-line pt-6 sm:grid-cols-3">
        {study.cardMetrics.map((metric) => (
          <div key={metric.label}>
            <dt className="sr-only">{metric.label}</dt>
            <dd>
              <p className="font-serif text-metric-sm tabular-nums text-ink">{metric.value}</p>
              <p className="mt-1.5 text-xs leading-snug text-ink-faint">{metric.label}</p>
              {metric.evidence ? (
                <div className="mt-2">
                  <EvidenceLabel kind={metric.evidence} size="xs" />
                </div>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>

      <p className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
        Read case study
        <ArrowRight
          aria-hidden="true"
          className="h-4 w-4 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5"
        />
      </p>
    </article>
  );
}
