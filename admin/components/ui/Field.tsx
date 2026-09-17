import type { ReactNode } from 'react';

import { cn } from '@admin/lib/cn';

export const inputClass =
  'block w-full rounded-md border border-line-strong bg-paper-raised px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-faint focus-visible:border-accent disabled:cursor-not-allowed disabled:bg-paper-sunk disabled:text-ink-faint aria-[invalid=true]:border-evidence-limitation';

export const buttonClass = {
  primary:
    'inline-flex items-center justify-center gap-1.5 rounded-md bg-ink px-3.5 py-2 text-sm font-semibold text-ink-inverse hover:bg-night-raised disabled:cursor-not-allowed disabled:bg-line-strong disabled:text-ink-soft',
  secondary:
    'inline-flex items-center justify-center gap-1.5 rounded-md border border-line-strong bg-paper-raised px-3.5 py-2 text-sm font-semibold text-ink hover:bg-paper-sunk disabled:cursor-not-allowed disabled:text-ink-faint',
  danger:
    'inline-flex items-center justify-center gap-1.5 rounded-md border border-[#E3C6C0] bg-[#F9EDEA] px-3.5 py-2 text-sm font-semibold text-evidence-limitation hover:bg-[#F3DEDA] disabled:cursor-not-allowed disabled:opacity-60',
};

export function Field({
  id,
  label,
  hint,
  required,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-ink-soft">
        {label}
        {required ? <span className="ml-1 font-normal text-evidence-limitation">(required)</span> : null}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
