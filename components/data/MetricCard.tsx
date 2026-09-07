import type { Metric } from '@/content/types';
import { EvidenceLabel } from '@/components/ui/EvidenceLabel';
import { cn } from '@/lib/utils';

interface MetricCardProps extends Metric {
  /** `card` has a border and background; `bare` sits in a divided grid. */
  variant?: 'card' | 'bare';
  tone?: 'light' | 'dark';
  size?: 'lg' | 'md' | 'sm';
  className?: string;
  /** Hide the evidence chip where a shared caption already covers it. */
  hideEvidence?: boolean;
}

const sizeClasses = {
  lg: 'text-metric-lg',
  md: 'text-metric',
  sm: 'text-metric-sm',
} as const;

export function MetricCard({
  value,
  label,
  note,
  evidence,
  variant = 'card',
  tone = 'light',
  size = 'md',
  className,
  hideEvidence = false,
}: MetricCardProps) {
  const dark = tone === 'dark';

  return (
    <div
      className={cn(
        variant === 'card' &&
          (dark
            ? 'rounded-card border border-night-line bg-night-raised p-5 sm:p-6'
            : 'rounded-card border border-line bg-paper-raised p-5 shadow-card sm:p-6'),
        variant === 'bare' && 'py-1',
        className,
      )}
    >
      <p
        className={cn(
          'metric-numeral font-serif',
          sizeClasses[size],
          dark ? 'text-ink-inverse' : 'text-ink',
        )}
      >
        {value}
      </p>

      <p
        className={cn(
          'mt-2 text-sm leading-snug',
          dark ? 'text-ink-inverse/70' : 'text-ink-soft',
        )}
      >
        {label}
      </p>

      {note ? (
        <p className={cn('mt-1.5 text-xs leading-relaxed', dark ? 'text-ink-inverse/50' : 'text-ink-faint')}>
          {note}
        </p>
      ) : null}

      {evidence && !hideEvidence ? (
        <div className="mt-3">
          <EvidenceLabel kind={evidence} size="xs" />
        </div>
      ) : null}
    </div>
  );
}

interface MetricGridProps {
  metrics: Metric[];
  columns?: 2 | 3 | 4;
  variant?: 'card' | 'bare';
  tone?: 'light' | 'dark';
  size?: 'lg' | 'md' | 'sm';
  className?: string;
  hideEvidence?: boolean;
}

const columnClasses = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
} as const;

export function MetricGrid({
  metrics,
  columns = 4,
  variant = 'card',
  tone = 'light',
  size = 'md',
  className,
  hideEvidence,
}: MetricGridProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-4', columnClasses[columns], className)}>
      {metrics.map((metric) => (
        <MetricCard
          key={`${metric.value}-${metric.label}`}
          {...metric}
          variant={variant}
          tone={tone}
          size={size}
          hideEvidence={hideEvidence}
        />
      ))}
    </div>
  );
}
