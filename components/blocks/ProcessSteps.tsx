import type { ProcessStep } from '@/content/types';
import { cn } from '@/lib/utils';

interface ProcessStepsProps {
  steps: ProcessStep[];
  className?: string;
  tone?: 'light' | 'dark';
}

/**
 * The five-step working process, rendered as a numbered sequence with a
 * connecting rule — a sequence, not a set of independent cards.
 */
export function ProcessSteps({ steps, className, tone = 'light' }: ProcessStepsProps) {
  const dark = tone === 'dark';

  return (
    <ol className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5', className)}>
      {steps.map((step, index) => (
        <li
          key={step.number}
          className={cn(
            'relative pt-8 lg:pr-6',
            index !== 0 && 'sm:pt-8',
          )}
        >
          {/* Connecting rule along the top of each step. */}
          <div
            aria-hidden="true"
            className={cn(
              'absolute inset-x-0 top-0 h-px lg:right-0',
              dark ? 'bg-night-line' : 'bg-line',
            )}
          />
          <div
            aria-hidden="true"
            className={cn(
              'absolute left-0 top-0 h-px w-8',
              dark ? 'bg-ink-inverse/60' : 'bg-accent',
            )}
          />

          <p
            className={cn(
              'font-serif text-sm tabular-nums',
              dark ? 'text-ink-inverse/45' : 'text-ink-faint',
            )}
          >
            {step.number}
          </p>

          <h3
            className={cn(
              'mt-3 text-base font-semibold',
              dark ? 'text-ink-inverse' : 'text-ink',
            )}
          >
            {step.title}
          </h3>

          <p
            className={cn(
              'mt-2 pb-8 text-sm leading-relaxed',
              dark ? 'text-ink-inverse/65' : 'text-ink-soft',
            )}
          >
            {step.description}
          </p>
        </li>
      ))}
    </ol>
  );
}
