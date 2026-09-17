import { useId, type ReactNode } from 'react';

import { cn } from '@admin/lib/cn';

export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className={cn('min-w-0', className)}>
      <div className="mb-2.5 flex flex-wrap items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 id={headingId} className="text-sm font-semibold text-ink">
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-xs text-ink-soft">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** A bordered surface for panel content that is not a table. */
export function Surface({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('rounded-card border border-line bg-paper-raised', className)}>{children}</div>;
}

/**
 * Label/value rows inside a Surface. `columns` aligns labels in a fixed column
 * for longer values; `inline` suits short values in narrow panels.
 */
export function DefinitionList({
  items,
  layout = 'columns',
}: {
  items: readonly { term: string; detail: ReactNode }[];
  layout?: 'columns' | 'inline';
}) {
  return (
    <dl className="divide-y divide-line text-sm">
      {items.map((item) => (
        <div
          key={item.term}
          className={cn(
            'px-4 py-2.5',
            layout === 'columns'
              ? 'grid gap-1 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4'
              : 'flex flex-wrap items-center justify-between gap-x-4 gap-y-1',
          )}
        >
          <dt className="text-ink-soft">{item.term}</dt>
          <dd className="min-w-0 text-ink">{item.detail}</dd>
        </div>
      ))}
    </dl>
  );
}
