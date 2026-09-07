import type { ServiceContent } from '@/content/types';
import { cn } from '@/lib/utils';

interface ServiceCardProps {
  service: ServiceContent;
  /** `compact` for the homepage grid, `full` for the services page. */
  variant?: 'compact' | 'full';
  className?: string;
  /** Heading level, so each page keeps a valid outline. */
  headingLevel?: 'h3' | 'h2';
  index?: number;
}

export function ServiceCard({
  service,
  variant = 'compact',
  className,
  headingLevel: Heading = 'h3',
  index,
}: ServiceCardProps) {
  const Icon = service.icon;

  if (variant === 'compact') {
    return (
      <article
        className={cn(
          'flex flex-col rounded-card border border-line bg-paper-raised p-6 transition-colors duration-300 hover:border-line-strong sm:p-7',
          className,
        )}
      >
        <Icon aria-hidden="true" className="h-5 w-5 text-accent" />
        <Heading className="mt-4 text-lg font-semibold leading-snug text-ink">
          {service.title}
        </Heading>
        <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">{service.summary}</p>
      </article>
    );
  }

  return (
    <article
      id={service.slug}
      className={cn('scroll-mt-28 border-t border-line pt-10', className)}
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <div className="flex items-center gap-3">
            {typeof index === 'number' ? (
              <span className="font-serif text-sm tabular-nums text-ink-faint">
                {String(index + 1).padStart(2, '0')}
              </span>
            ) : null}
            <Icon aria-hidden="true" className="h-5 w-5 text-accent" />
          </div>

          <Heading className="mt-4 font-serif text-display-sm text-ink">{service.title}</Heading>

          <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-soft">
            {service.description}
          </p>

          {service.bestFor ? (
            <div className="mt-6">
              <h3 className="text-micro font-semibold uppercase tracking-[0.11em] text-ink-faint">
                Best suited for
              </h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {service.bestFor.map((item) => (
                  <li
                    key={item}
                    className="rounded-pill border border-line bg-paper-sunk px-3 py-1 text-xs text-ink-soft"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="lg:col-span-7">
          <div className="rounded-card border border-line bg-paper-raised p-6 sm:p-7">
            <h3 className="text-micro font-semibold uppercase tracking-[0.11em] text-ink-faint">
              What this includes
            </h3>
            <ul className="mt-4 grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              {service.includes.map((item) => (
                <li
                  key={item}
                  className="border-b border-line py-2.5 text-sm text-ink-soft last:border-b-0 sm:[&:nth-last-child(-n+1)]:border-b-0"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {service.principle ? (
            <p className="mt-4 border-l-2 border-accent-line bg-accent-soft/50 px-4 py-3.5 text-[0.9375rem] leading-relaxed text-ink-soft">
              {service.principle}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
