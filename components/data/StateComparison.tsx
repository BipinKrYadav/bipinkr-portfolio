import { EvidenceLabel } from '@/components/ui/EvidenceLabel';
import { cn } from '@/lib/utils';

interface StatePanel {
  value: string;
  label: string;
  evidence: 'reported' | 'verified';
}

interface StateComparisonProps {
  heading: string;
  reported: StatePanel;
  recorded: StatePanel;
  caution: string;
  className?: string;
}

/**
 * "Same campaign, two measurement states."
 *
 * Deliberately joined by "vs" and never by an arrow. An arrow would read as
 * "171 leads became 0 leads", which is a claim about outcomes. These are two
 * different reports of the same campaign, which is a claim about measurement.
 */
export function StateComparison({
  heading,
  reported,
  recorded,
  caution,
  className,
}: StateComparisonProps) {
  const panels = [reported, recorded];

  return (
    <figure
      className={cn('not-prose rounded-card border border-line bg-paper-raised p-6 sm:p-8', className)}
    >
      <figcaption className="mb-6 text-micro font-semibold uppercase tracking-[0.11em] text-ink-faint">
        {heading}
      </figcaption>

      <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center">
        {panels.map((panel, index) => (
          <div key={panel.label} className="contents">
            <div className="flex-1 rounded-card border border-line bg-paper-sunk px-5 py-6 text-center">
              <p className="font-serif text-metric-lg tabular-nums text-ink">{panel.value}</p>
              <p className="mx-auto mt-2.5 max-w-[22rem] text-sm leading-snug text-ink-soft">
                {panel.label}
              </p>
              <div className="mt-3.5 flex justify-center">
                <EvidenceLabel kind={panel.evidence} size="xs" />
              </div>
            </div>

            {index === 0 ? (
              <div
                className="shrink-0 self-center px-1 text-micro font-semibold uppercase tracking-[0.11em] text-ink-faint"
                aria-hidden="true"
              >
                vs
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <p className="mt-6 border-t border-line pt-5 text-[0.875rem] leading-relaxed text-ink-soft">
        {caution}
      </p>
    </figure>
  );
}
