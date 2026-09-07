import { ChevronDown, ChevronRight } from 'lucide-react';

import type { FlowNode } from '@/content/types';
import { cn } from '@/lib/utils';

interface FlowDiagramProps {
  nodes: FlowNode[];
  /** `chain` is the horizontal funnel; `stack` is the vertical diagnosis. */
  layout?: 'chain' | 'stack';
  tone?: 'light' | 'dark';
  className?: string;
  /** Rendered under the diagram. */
  note?: string;
}

const stateStyles = {
  ok: {
    light: 'border-accent-line bg-accent-soft text-accent-ink',
    dark: 'border-[#2E5F59] bg-[#12312E] text-[#9FD8D0]',
    marker: 'bg-accent',
    srLabel: 'Working',
  },
  uncertain: {
    light: 'border-[#E2D3B0] bg-[#F8F2E4] text-evidence-reported',
    dark: 'border-[#5A4C2E] bg-[#2E2718] text-[#D9C288]',
    marker: 'bg-evidence-reported',
    srLabel: 'Unreliable',
  },
  unknown: {
    light: 'border-line-strong bg-paper-sunk text-ink-faint',
    dark: 'border-night-line bg-night-raised text-ink-inverse/45',
    marker: 'bg-ink-faint',
    srLabel: 'Not established',
  },
} as const;

/**
 * Linear flow diagram.
 *
 * Used for the funnel (Ad → Landing Page → Lead → Qualification → Business
 * Outcome) and for the measurement chain, where node `state` shows exactly
 * where evidence stops supporting the next step.
 */
export function FlowDiagram({
  nodes,
  layout = 'chain',
  tone = 'light',
  className,
  note,
}: FlowDiagramProps) {
  const dark = tone === 'dark';
  const vertical = layout === 'stack';

  return (
    <figure className={cn('not-prose', className)}>
      <ol
        className={cn(
          'flex',
          vertical
            ? 'flex-col gap-0'
            : 'flex-col gap-0 md:flex-row md:items-stretch md:gap-0',
        )}
      >
        {nodes.map((node, index) => {
          const isLast = index === nodes.length - 1;
          const style = node.state ? stateStyles[node.state] : null;

          return (
            <li
              key={node.label}
              className={cn(
                'flex',
                // `min-w-0` lets a flex child shrink below its content width.
                // Without it a six-node chain overflows the viewport at the
                // md breakpoint instead of wrapping its text.
                vertical ? 'flex-col' : 'flex-col md:min-w-0 md:flex-1 md:flex-row md:items-center',
              )}
            >
              <div
                className={cn(
                  'flex-1 rounded-card border px-4 py-3.5',
                  style
                    ? style[dark ? 'dark' : 'light']
                    : dark
                      ? 'border-night-line bg-night-raised text-ink-inverse'
                      : 'border-line bg-paper-raised text-ink',
                )}
              >
                <div className="flex items-start gap-2">
                  {style ? (
                    <>
                      <span
                        aria-hidden="true"
                        className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', style.marker)}
                      />
                      <span className="sr-only">{style.srLabel}: </span>
                    </>
                  ) : null}
                  <div>
                    <p className="text-sm font-semibold leading-snug">{node.label}</p>
                    {node.note ? (
                      <p
                        className={cn(
                          'mt-1 text-xs leading-relaxed',
                          style ? 'opacity-80' : dark ? 'text-ink-inverse/55' : 'text-ink-faint',
                        )}
                      >
                        {node.note}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              {!isLast ? (
                <div
                  aria-hidden="true"
                  className={cn(
                    'flex items-center justify-center',
                    vertical ? 'py-2' : 'py-2 md:px-2 md:py-0',
                  )}
                >
                  <ChevronDown
                    className={cn(
                      'h-4 w-4',
                      vertical ? '' : 'md:hidden',
                      dark ? 'text-ink-inverse/35' : 'text-line-strong',
                    )}
                  />
                  {!vertical ? (
                    <ChevronRight
                      className={cn(
                        'hidden h-4 w-4 md:block',
                        dark ? 'text-ink-inverse/35' : 'text-line-strong',
                      )}
                    />
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {note ? (
        <figcaption
          className={cn(
            'mt-5 border-l-2 pl-3 text-[0.8125rem] leading-relaxed',
            dark ? 'border-night-line text-ink-inverse/60' : 'border-line-strong text-ink-faint',
          )}
        >
          {note}
        </figcaption>
      ) : null}
    </figure>
  );
}
