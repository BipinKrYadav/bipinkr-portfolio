import { Minus } from 'lucide-react';

import { EvidenceLabel } from '@/components/ui/EvidenceLabel';
import { cn } from '@/lib/utils';

interface LimitationBlockProps {
  heading?: string;
  intro: string;
  items: string[];
  /** Closing paragraph, e.g. scope of the review. */
  closing?: string;
  className?: string;
}

/**
 * The limitations block.
 *
 * Present on every case study. Styled as a considered part of the analysis
 * rather than as a warning banner — the tone is "here is where the evidence
 * stops", not "please do not sue me".
 */
export function LimitationBlock({
  heading,
  intro,
  items,
  closing,
  className,
}: LimitationBlockProps) {
  return (
    <div className={cn('rounded-card border border-line-strong bg-paper-sunk p-6 sm:p-8', className)}>
      <div className="flex flex-wrap items-center gap-3">
        {heading ? (
          <h3 className="font-serif text-display-sm text-ink">{heading}</h3>
        ) : null}
        <EvidenceLabel kind="limitation" />
      </div>

      <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-soft">{intro}</p>

      <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-0 sm:grid-cols-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-center gap-2.5 border-b border-line py-2.5 text-sm text-ink-soft last:border-b-0 sm:last:border-b sm:[&:nth-last-child(-n+2)]:border-b-0"
          >
            <Minus aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
            {item}
          </li>
        ))}
      </ul>

      {closing ? (
        <p className="mt-6 border-t border-line pt-5 text-[0.9375rem] leading-relaxed text-ink-soft">
          {closing}
        </p>
      ) : null}
    </div>
  );
}
