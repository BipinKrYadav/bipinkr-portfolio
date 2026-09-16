import type { Cohort } from '@/content/case-studies/meta-lead-generation';
import { cn } from '@/lib/utils';

interface CohortBarsProps {
  cohorts: Cohort[];
  labelPrimary: string;
  labelSecondary: string;
  className?: string;
}

interface BarProps {
  ratio: number;
  value: string;
  emphasis?: boolean;
}

/**
 * A single proportional bar. Width is set inline because the ratio is
 * data-driven; there is no Tailwind class for "38.9% wide".
 */
function Bar({ ratio, value, emphasis = false }: BarProps) {
  // Floor the width so a very small value is still a visible mark.
  const width = Math.max(ratio * 100, 3);

  return (
    <div className="flex items-center gap-3">
      <div className="h-7 flex-1 overflow-hidden rounded-sm bg-paper-sunk" aria-hidden="true">
        <div
          className={cn(
            'h-full rounded-sm motion-safe:animate-fade-in',
            emphasis ? 'bg-accent' : 'bg-ink/25',
          )}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="w-24 shrink-0 text-right font-serif text-metric-sm tabular-nums text-ink">
        {value}
      </span>
    </div>
  );
}

/**
 * A value's length relative to the largest value in its series, 0–1.
 * A missing value draws no length (the bar keeps its minimum mark).
 */
function relativeTo(values: (number | null)[]) {
  const max = Math.max(0, ...values.map((value) => value ?? 0));
  return (value: number | null) => (value === null || max <= 0 ? 0 : value / max);
}

/**
 * Cohort comparison for the Meta lead generation case study.
 *
 * Two measures are shown separately — cost per lead and lead volume —
 * because they move in opposite directions and overlaying them on one
 * axis would imply a relationship the data does not establish.
 *
 * Bar lengths are computed from the cohorts' metric values, each measure
 * scaled against its own largest value, so a changed figure redraws the
 * chart instead of leaving a stale hand-typed ratio behind.
 */
export function CohortBars({ cohorts, labelPrimary, labelSecondary, className }: CohortBarsProps) {
  const cplRatio = relativeTo(cohorts.map((cohort) => cohort.cplValue));
  const leadRatio = relativeTo(cohorts.map((cohort) => cohort.leadsValue));

  return (
    <figure className={cn('rounded-card border border-line bg-paper-raised p-6 sm:p-8', className)}>
      <figcaption className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-micro font-semibold uppercase tracking-[0.09em] text-ink">
          {labelPrimary}
        </span>
        <span className="text-micro uppercase tracking-[0.09em] text-ink-faint">
          {labelSecondary}
        </span>
      </figcaption>

      <div className="space-y-8">
        <div>
          <h3 className="mb-4 text-sm font-semibold text-ink-soft">Cost per lead</h3>
          <div className="space-y-3">
            {cohorts.map((cohort, index) => (
              <div key={`cpl-${cohort.name}`}>
                <p className="mb-1.5 text-xs uppercase tracking-[0.08em] text-ink-faint">
                  {cohort.name}
                </p>
                <Bar
                  ratio={cplRatio(cohort.cplValue)}
                  value={cohort.cpl}
                  emphasis={index === cohorts.length - 1}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-line pt-8">
          <h3 className="mb-4 text-sm font-semibold text-ink-soft">Recorded leads</h3>
          <div className="space-y-3">
            {cohorts.map((cohort, index) => (
              <div key={`leads-${cohort.name}`}>
                <p className="mb-1.5 text-xs uppercase tracking-[0.08em] text-ink-faint">
                  {cohort.name}
                </p>
                <Bar
                  ratio={leadRatio(cohort.leadsValue)}
                  value={cohort.leads}
                  emphasis={index === cohorts.length - 1}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* The underlying numbers, so the bars are never the only source. */}
      <dl className="mt-8 grid grid-cols-1 gap-4 border-t border-line pt-6 sm:grid-cols-2">
        {cohorts.map((cohort) => (
          <div key={`detail-${cohort.name}`}>
            <dt className="text-micro font-semibold uppercase tracking-[0.09em] text-ink-faint">
              {cohort.name}
            </dt>
            <dd className="mt-1.5 text-sm text-ink-soft">
              <span className="tabular-nums text-ink">{cohort.spend}</span> spend ·{' '}
              <span className="tabular-nums text-ink">{cohort.leads}</span> leads ·{' '}
              <span className="tabular-nums text-ink">{cohort.cpl}</span> CPL
            </dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}
