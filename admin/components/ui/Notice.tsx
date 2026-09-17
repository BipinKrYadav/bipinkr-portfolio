import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@admin/lib/cn';

type NoticeTone = 'info' | 'warning' | 'danger';

const tones: Record<NoticeTone, { className: string; icon: typeof Info }> = {
  info: { className: 'border-[#C7D2E4] bg-[#EEF2F8] text-evidence-calculated', icon: Info },
  warning: { className: 'border-[#E2D3B0] bg-[#F8F2E4] text-evidence-reported', icon: TriangleAlert },
  danger: { className: 'border-[#E3C6C0] bg-[#F9EDEA] text-evidence-limitation', icon: CircleAlert },
};

export function Notice({
  tone,
  title,
  children,
  className,
}: {
  tone: NoticeTone;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  const { className: toneClass, icon: Icon } = tones[tone];

  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-card border px-4 py-3', toneClass, className)}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 text-sm [overflow-wrap:anywhere]">
        <p className="font-semibold">{title}</p>
        {children ? <div className="mt-0.5 text-ink-soft">{children}</div> : null}
      </div>
    </div>
  );
}
