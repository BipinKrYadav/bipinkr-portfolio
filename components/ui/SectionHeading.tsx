import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  eyebrow?: string;
  heading: ReactNode;
  subheading?: ReactNode;
  /** Heading level — keeps the document outline correct per page. */
  as?: 'h2' | 'h3';
  align?: 'left' | 'center';
  tone?: 'light' | 'dark';
  className?: string;
  id?: string;
  /** Optional action rendered opposite the heading on wide screens. */
  action?: ReactNode;
}

export function SectionHeading({
  eyebrow,
  heading,
  subheading,
  as: Tag = 'h2',
  align = 'left',
  tone = 'light',
  className,
  id,
  action,
}: SectionHeadingProps) {
  const centred = align === 'center';

  return (
    <div
      className={cn(
        'flex flex-col gap-6 md:flex-row md:items-end md:justify-between',
        centred && 'md:flex-col md:items-center',
        className,
      )}
    >
      <div className={cn('max-w-2xl', centred && 'mx-auto text-center')}>
        {eyebrow ? (
          <p
            className={cn(
              'eyebrow-label mb-3',
              tone === 'dark' && 'text-[#7FC6BC]',
            )}
          >
            {eyebrow}
          </p>
        ) : null}

        <Tag
          id={id}
          className={cn(
            'font-serif text-display-sm',
            tone === 'dark' ? 'text-ink-inverse' : 'text-ink',
          )}
        >
          {heading}
        </Tag>

        {subheading ? (
          <p
            className={cn(
              'mt-4 text-[1.0625rem] leading-relaxed',
              tone === 'dark' ? 'text-ink-inverse/70' : 'text-ink-soft',
            )}
          >
            {subheading}
          </p>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
