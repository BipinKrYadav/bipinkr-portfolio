import type { ReactNode } from 'react';

import { cn } from '@admin/lib/cn';

export type BadgeTone = 'neutral' | 'info' | 'accent' | 'warning' | 'danger';

// Same muted chip palette as the public site's evidence labels.
const tones: Record<BadgeTone, string> = {
  neutral: 'border-line-strong bg-paper-sunk text-ink-soft',
  info: 'border-[#C7D2E4] bg-[#EEF2F8] text-evidence-calculated',
  accent: 'border-accent-line bg-accent-soft text-accent-ink',
  warning: 'border-[#E2D3B0] bg-[#F8F2E4] text-evidence-reported',
  danger: 'border-[#E3C6C0] bg-[#F9EDEA] text-evidence-limitation',
};

export function StatusBadge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-pill border px-2 py-0.5 text-xs font-semibold',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
