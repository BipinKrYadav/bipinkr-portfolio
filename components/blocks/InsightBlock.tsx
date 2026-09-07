import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface InsightBlockProps {
  /** Small label above the insight, e.g. "Central insight". */
  kicker?: string;
  heading: ReactNode;
  children?: ReactNode;
  tone?: 'light' | 'accent' | 'dark';
  className?: string;
}

const tones = {
  light: 'border-line bg-paper-raised',
  accent: 'border-accent-line bg-accent-soft',
  dark: 'border-night-line bg-night text-ink-inverse on-night',
} as const;

/**
 * The "here is what this actually means" block. Used sparingly — once or
 * twice per case study — so it keeps its weight.
 */
export function InsightBlock({
  kicker,
  heading,
  children,
  tone = 'accent',
  className,
}: InsightBlockProps) {
  const dark = tone === 'dark';

  return (
    <aside className={cn('rounded-card border p-6 sm:p-8', tones[tone], className)}>
      {kicker ? (
        <p
          className={cn(
            'mb-3 text-micro font-semibold uppercase tracking-[0.11em]',
            dark ? 'text-[#7FC6BC]' : 'text-accent',
          )}
        >
          {kicker}
        </p>
      ) : null}

      <p
        className={cn(
          'font-serif text-display-sm leading-tight',
          dark ? 'text-ink-inverse' : 'text-ink',
        )}
      >
        {heading}
      </p>

      {children ? (
        <div
          className={cn(
            'mt-4 space-y-4 text-[1.0625rem] leading-relaxed',
            dark ? 'text-ink-inverse/70' : 'text-ink-soft',
          )}
        >
          {children}
        </div>
      ) : null}
    </aside>
  );
}
