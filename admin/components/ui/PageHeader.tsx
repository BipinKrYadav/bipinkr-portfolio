import type { ReactNode } from 'react';

export function PageHeader({ title, description, meta }: { title: string; description: string; meta?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-ink-soft">{description}</p>
      </div>
      {meta ? <div className="flex shrink-0 flex-wrap items-center gap-2">{meta}</div> : null}
    </header>
  );
}
