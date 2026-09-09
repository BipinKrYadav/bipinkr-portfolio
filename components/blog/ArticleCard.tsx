import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import type { BlogArticleSummary } from '@/content/types';
import { cn } from '@/lib/utils';

interface ArticleCardProps {
  article: BlogArticleSummary;
  className?: string;
  /** Heading level, so each page keeps a valid outline. */
  headingLevel?: 'h2' | 'h3';
}

/** Formats an ISO date for display. Falls back to the raw value. */
function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function ArticleCard({
  article,
  className,
  headingLevel: Heading = 'h2',
}: ArticleCardProps) {
  return (
    <article
      className={cn(
        'group relative flex flex-col rounded-card border border-line bg-paper-raised p-6 transition-[border-color,box-shadow,transform] duration-300 hover:border-line-strong hover:shadow-lift motion-safe:hover:-translate-y-0.5 sm:p-8',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-micro uppercase tracking-[0.09em] text-ink-faint">
        <span>{article.theme}</span>
        <span aria-hidden="true" className="text-line-strong">
          ·
        </span>
        <span>{article.readingMinutes} min read</span>
      </div>

      <Heading className="mt-4 font-serif text-2xl leading-snug text-ink">
        {/* Stretched link keeps the whole card clickable with one tab stop. */}
        <Link href={`/blog/${article.slug}`} className="after:absolute after:inset-0 after:content-['']">
          {article.cardTitle}
        </Link>
      </Heading>

      <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">{article.excerpt}</p>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-5">
        <time dateTime={article.datePublished} className="text-xs text-ink-faint">
          {formatDate(article.datePublished)}
        </time>
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
          Read article
          <ArrowRight
            aria-hidden="true"
            className="h-4 w-4 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </article>
  );
}
