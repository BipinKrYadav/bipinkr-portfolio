import type { ReactNode } from 'react';

import { Notice } from '@admin/components/ui/Notice';
import type { DataError } from '@admin/lib/metrics/errors';

const errorTitles: Record<DataError['kind'], string> = {
  unavailable: 'Database unavailable',
  unauthenticated: 'Signed out',
  permission_denied: 'Permission denied',
  validation: 'Not saved: check the details',
  not_found: 'Not found',
  conflict: 'Changed by someone else',
  unknown: 'Something went wrong',
};

export function LoadingMessage({ label }: { label: string }) {
  return (
    <p role="status" className="rounded-card border border-line bg-paper-raised px-4 py-8 text-center text-sm text-ink-soft">
      {label}
    </p>
  );
}

export function UnavailableMessage({ reason }: { reason: string }) {
  return (
    <Notice tone="warning" title="No metric data available">
      {reason} Nothing is shown until an MFA-verified admin session can read the database.
    </Notice>
  );
}

export function ErrorMessage({ error, className }: { error: DataError; className?: string }) {
  return (
    <Notice tone={error.kind === 'validation' || error.kind === 'conflict' ? 'warning' : 'danger'} title={errorTitles[error.kind]} className={className}>
      <p>{error.message}</p>
      {error.details && error.details.length > 0 ? (
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {error.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      ) : null}
    </Notice>
  );
}

export function SuccessMessage({ title, children, className }: { title: string; children?: ReactNode; className?: string }) {
  return (
    <Notice tone="success" title={title} className={className}>
      {children}
    </Notice>
  );
}
