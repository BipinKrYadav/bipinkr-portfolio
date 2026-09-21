'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ErrorMessage, LoadingMessage } from '@admin/components/metrics/StateMessage';
import { DataTable, type Row } from '@admin/components/ui/DataTable';
import { Notice } from '@admin/components/ui/Notice';
import { StatusBadge } from '@admin/components/ui/StatusBadge';
import { documentDetailHref } from '@admin/lib/content/links';
import { documentStatusLabels, type DocumentStatus } from '@admin/lib/content/model';
import type { DocumentListEntry } from '@admin/lib/content/repository';
import { formatDateTime } from '@admin/lib/format-date';
import type { DataError } from '@admin/lib/metrics/errors';

import { useContentRepository } from './ContentRepositoryProvider';

type ListState = { status: 'loading' } | { status: 'error'; error: DataError } | { status: 'loaded'; documents: DocumentListEntry[] };

const columns = [
  { key: 'type', label: 'Document type' },
  { key: 'slug', label: 'Slug' },
  { key: 'status', label: 'Status' },
  { key: 'schema', label: 'Schema version', align: 'right' },
  { key: 'order', label: 'Sort order', align: 'right' },
  { key: 'updated', label: 'Updated' },
  { key: 'refs', label: 'Metric references', align: 'right' },
] as const;

const statusTone: Record<DocumentStatus, 'accent' | 'warning' | 'neutral'> = {
  published: 'accent',
  draft: 'warning',
  hidden: 'neutral',
};

/**
 * The documents recorded in the database, read at runtime with the signed-in
 * admin's session. Metadata and counts only: page content is never requested.
 * Read-only — no edit, publish or delete controls.
 */
export function DocumentsList() {
  const repositoryState = useContentRepository();
  const [list, setList] = useState<ListState>({ status: 'loading' });

  useEffect(() => {
    if (repositoryState.status !== 'ready') return;
    let active = true;
    setList({ status: 'loading' });
    repositoryState.repository.listDocuments().then((result) => {
      if (!active) return;
      setList(result.ok ? { status: 'loaded', documents: result.data } : { status: 'error', error: result.error });
    });
    return () => {
      active = false;
    };
  }, [repositoryState]);

  if (repositoryState.status === 'loading') return <LoadingMessage label="Checking authentication…" />;
  if (repositoryState.status === 'unavailable') {
    return (
      <Notice tone="warning" title="No document data available">
        {repositoryState.reason} Nothing is shown until an MFA-verified admin session can read the database.
      </Notice>
    );
  }
  if (list.status === 'loading') return <LoadingMessage label="Loading documents…" />;
  if (list.status === 'error') return <ErrorMessage error={list.error} />;
  if (list.documents.length === 0) {
    return (
      <Notice tone="info" title="No documents in the database">
        The database has no document rows this session can read.
      </Notice>
    );
  }

  const rows: Row[] = list.documents.map((document) => ({
    key: document.id,
    cells: [
      <code key="type" className="text-xs">
        {document.doc_type}
      </code>,
      <Link key="slug" href={documentDetailHref(document.doc_type, document.slug)} className="whitespace-nowrap font-mono text-xs font-medium text-accent hover:underline">
        {document.slug}
      </Link>,
      <StatusBadge key="status" tone={statusTone[document.status]}>
        {documentStatusLabels[document.status]}
      </StatusBadge>,
      <span key="schema" className="tabular-nums">
        {document.schema_version}
      </span>,
      <span key="order" className="tabular-nums">
        {document.sort_order}
      </span>,
      <span key="updated" className="whitespace-nowrap text-xs text-ink-soft">
        {formatDateTime(document.updated_at)}
      </span>,
      <span key="refs" className="tabular-nums">
        {document.referenceCount}
      </span>,
    ],
  }));

  return (
    <div className="space-y-2">
      <DataTable caption="Documents in the database" columns={columns} rows={rows} emptyMessage="" />
      <p className="text-xs text-ink-faint">
        {list.documents.length} document{list.documents.length === 1 ? '' : 's'} ·{' '}
        {list.documents.reduce((total, document) => total + document.referenceCount, 0)} metric references
      </p>
    </div>
  );
}
