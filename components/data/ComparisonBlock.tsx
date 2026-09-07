import { Info } from 'lucide-react';

import { EvidenceLabel } from '@/components/ui/EvidenceLabel';
import type { EvidenceKind } from '@/content/types';
import { cn } from '@/lib/utils';

export interface ComparisonPanel {
  title: string;
  /** Optional headline figure for the panel. */
  headlineValue?: string;
  headlineLabel?: string;
  headlineEvidence?: EvidenceKind;
  rows: { term: string; value: string; evidence?: EvidenceKind }[];
  /** Panel-specific caveat, rendered inside the panel. */
  caveat?: string;
}

interface ComparisonBlockProps {
  panels: ComparisonPanel[];
  intro?: string;
  /** The shared caution. Always rendered — this is the point of the block. */
  caution: string;
  className?: string;
}

/**
 * Side-by-side comparison with no winner.
 *
 * Both panels are styled identically on purpose: no highlight, no green
 * tick, no ordering that implies a ranking. Where two things are being
 * shown together precisely because they are *not* comparable, the visual
 * design must not quietly argue the opposite.
 */
export function ComparisonBlock({ panels, intro, caution, className }: ComparisonBlockProps) {
  return (
    <div className={cn('not-prose', className)}>
      {intro ? <p className="mb-6 text-[1.0625rem] leading-relaxed text-ink-soft">{intro}</p> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {panels.map((panel) => (
          <div
            key={panel.title}
            className="flex flex-col rounded-card border border-line bg-paper-raised p-6"
          >
            <h3 className="text-micro font-semibold uppercase tracking-[0.09em] text-ink-faint">
              {panel.title}
            </h3>

            {panel.headlineValue ? (
              <div className="mt-3 border-b border-line pb-5">
                <p className="font-serif text-metric tabular-nums text-ink">{panel.headlineValue}</p>
                {panel.headlineLabel ? (
                  <p className="mt-1.5 text-sm text-ink-soft">{panel.headlineLabel}</p>
                ) : null}
                {panel.headlineEvidence ? (
                  <div className="mt-3">
                    <EvidenceLabel kind={panel.headlineEvidence} size="xs" />
                  </div>
                ) : null}
              </div>
            ) : null}

            <dl className={cn('space-y-0', panel.headlineValue ? 'mt-2' : 'mt-4')}>
              {panel.rows.map((row) => (
                <div
                  key={row.term}
                  className="flex items-baseline justify-between gap-4 border-b border-line py-3 last:border-b-0"
                >
                  <dt className="text-sm text-ink-soft">{row.term}</dt>
                  <dd className="flex items-center gap-2 text-right">
                    <span className="font-medium tabular-nums text-ink">{row.value}</span>
                    {row.evidence ? <EvidenceLabel kind={row.evidence} size="xs" /> : null}
                  </dd>
                </div>
              ))}
            </dl>

            {panel.caveat ? (
              <p className="mt-4 rounded-sm bg-paper-sunk px-3 py-2.5 text-[0.8125rem] leading-relaxed text-ink-soft">
                {panel.caveat}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      <p className="mt-4 flex gap-2.5 rounded-card border border-line-strong bg-paper-sunk p-4 text-[0.875rem] leading-relaxed text-ink-soft">
        <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />
        <span className="max-w-[66ch]">{caution}</span>
      </p>
    </div>
  );
}
