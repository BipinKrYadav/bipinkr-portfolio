import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

interface ScaleStep {
  label: string;
  value: string;
  tone: 'neutral' | 'flag';
}

interface ScaleFunnelProps {
  steps: ScaleStep[];
  className?: string;
  note?: string;
}

/**
 * Vertical narrowing visual for the measurement audit: total documented
 * spend, then the portion where the reporting did not hold up, then that
 * portion as a share.
 *
 * Each step gets a progressively narrower card, which carries the "this is
 * a subset of the row above" relationship without needing a chart library.
 */
export function ScaleFunnel({ steps, className, note }: ScaleFunnelProps) {
  return (
    <figure className={cn('not-prose', className)}>
      <ol className="mx-auto flex max-w-2xl flex-col items-stretch">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          // Each successive step is inset, narrowing the visual funnel.
          const inset = index * 8;

          return (
            <li key={step.label} style={{ paddingInline: `${inset}%` }}>
              <div
                className={cn(
                  'rounded-card border px-5 py-5 text-center',
                  step.tone === 'flag'
                    ? 'border-[#E2D3B0] bg-[#F8F2E4]'
                    : 'border-line bg-paper-raised',
                )}
              >
                <p
                  className={cn(
                    'font-serif tabular-nums',
                    index === 0 ? 'text-metric' : 'text-metric-sm',
                    step.tone === 'flag' ? 'text-evidence-reported' : 'text-ink',
                  )}
                >
                  {step.value}
                </p>
                <p className="mt-2 text-sm leading-snug text-ink-soft">{step.label}</p>
              </div>

              {!isLast ? (
                <div aria-hidden="true" className="flex justify-center py-2">
                  <ChevronDown className="h-4 w-4 text-line-strong" />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {note ? (
        <figcaption className="mx-auto mt-5 max-w-2xl border-l-2 border-line-strong pl-3 text-[0.8125rem] leading-relaxed text-ink-faint">
          {note}
        </figcaption>
      ) : null}
    </figure>
  );
}
