import { EvidenceLabel } from '@/components/ui/EvidenceLabel';
import type { Metric } from '@/content/types';
import { cn } from '@/lib/utils';

interface ProofStripProps {
  metrics: Metric[];
  note?: string;
  tone?: 'light' | 'dark';
  className?: string;
}

/**
 * The four headline evidence figures.
 *
 * The methodology note is not fine print to be hidden — it is rendered at
 * a readable size directly beneath the numbers, because the qualification
 * is part of the claim rather than a disclaimer bolted onto it.
 */
export function ProofStrip({ metrics, note, tone = 'light', className }: ProofStripProps) {
  const dark = tone === 'dark';

  return (
    <div className={cn(className)}>
      <dl
        className={cn(
          'grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4',
          dark ? 'divide-night-line' : 'divide-line',
        )}
      >
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className={cn(
              'lg:border-l lg:pl-6 lg:first:border-l-0 lg:first:pl-0',
              dark ? 'lg:border-night-line' : 'lg:border-line',
            )}
          >
            <dt className="sr-only">{metric.label}</dt>
            <dd>
              <p
                className={cn(
                  'font-serif text-metric tabular-nums',
                  dark ? 'text-ink-inverse' : 'text-ink',
                )}
              >
                {metric.value}
              </p>
              <p
                className={cn(
                  'mt-2 text-sm leading-snug',
                  dark ? 'text-ink-inverse/70' : 'text-ink-soft',
                )}
              >
                {metric.label}
              </p>
              {metric.evidence ? (
                <div className="mt-3">
                  <EvidenceLabel kind={metric.evidence} size="xs" />
                </div>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>

      {note ? (
        <p
          className={cn(
            'mt-10 max-w-[66ch] border-l-2 pl-4 text-[0.875rem] leading-relaxed',
            dark ? 'border-night-line text-ink-inverse/60' : 'border-line-strong text-ink-faint',
          )}
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}
