'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';

import { useAuth } from '@admin/components/auth/AuthProvider';
import { ErrorMessage, LoadingMessage } from '@admin/components/metrics/StateMessage';
import { DataTable, type Row } from '@admin/components/ui/DataTable';
import { Notice } from '@admin/components/ui/Notice';
import { DefinitionList, Panel, Surface } from '@admin/components/ui/Panel';
import { StatusBadge } from '@admin/components/ui/StatusBadge';
import { DocumentDraftEditor } from './DocumentDraftEditor';
import { metricDetailHref } from '@admin/lib/content/links';
import { documentStatusLabels, type DocumentRevisionRow, type DocumentStatus } from '@admin/lib/content/model';
import type { DocumentDetail, DocumentReferenceEntry, LinkedPhraseMatch } from '@admin/lib/content/repository';
import { formatDateTime } from '@admin/lib/format-date';
import type { DataError } from '@admin/lib/metrics/errors';

import { useContentRepository } from './ContentRepositoryProvider';

type DetailState = { status: 'loading' } | { status: 'error'; error: DataError } | { status: 'loaded'; detail: DocumentDetail };

const statusTone: Record<DocumentStatus, 'accent' | 'warning' | 'neutral'> = {
  published: 'accent',
  draft: 'warning',
  hidden: 'neutral',
};

const referenceColumns = [
  { key: 'field', label: 'Field path' },
  { key: 'metric', label: 'Metric' },
  { key: 'name', label: 'Name' },
  { key: 'format', label: 'Display format' },
  { key: 'state', label: 'State' },
] as const;

/**
 * Read-only detail of one document: metadata, the published revision's
 * metadata, whether the draft still equals it, the metrics its fields
 * reference and the linked phrases that restate them. Page content itself is
 * never received here (see ContentRepository.getDocumentDetail), and there
 * are no edit, publish, review or delete controls.
 */
export function DocumentDetailView() {
  const params = useSearchParams();
  const docType = params.get('type') ?? '';
  const slug = params.get('slug') ?? '';
  const repositoryState = useContentRepository();
  const { state: auth } = useAuth();
  const [detailState, setDetailState] = useState<DetailState>({ status: 'loading' });
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (repositoryState.status !== 'ready') return;
    const result = await repositoryState.repository.getDocumentDetail(docType, slug);
    setDetailState(result.ok ? { status: 'loaded', detail: result.data } : { status: 'error', error: result.error });
  }, [repositoryState, docType, slug]);

  useEffect(() => {
    setDetailState({ status: 'loading' });
    void load();
  }, [load]);

  const actorLabel = useCallback(
    (userId: string | null) => {
      if (!userId) return 'the system (import)';
      if (auth.status === 'authenticated' && auth.identity.userId === userId) return auth.identity.email;
      return `user ${userId.slice(0, 8)}`;
    },
    [auth],
  );

  const back = (
    <Link href="/content/" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
      <ArrowLeft aria-hidden="true" className="h-4 w-4" />
      All documents
    </Link>
  );

  if (!docType || !slug) {
    return (
      <>
        {back}
        <NotFound message="No document was selected." />
      </>
    );
  }
  if (repositoryState.status === 'loading') return <LoadingMessage label="Checking authentication…" />;
  if (repositoryState.status === 'unavailable') {
    return (
      <>
        {back}
        <Notice tone="warning" title="No document data available">
          {repositoryState.reason} Nothing is shown until an MFA-verified admin session can read the database.
        </Notice>
      </>
    );
  }
  if (detailState.status === 'loading') return <LoadingMessage label={`Loading ${docType}/${slug}…`} />;
  if (detailState.status === 'error') {
    return (
      <>
        {back}
        {detailState.error.kind === 'not_found' ? <NotFound message={detailState.error.message} /> : <ErrorMessage error={detailState.error} />}
      </>
    );
  }

  const detail = detailState.detail;
  const { document, publishedRevision, publishedRevisionMissing, revisions, draftMatchesPublished, hasDraft, references, linkedPhrases } =
    detail;

  return (
    <>
      {back}

      <header className="mb-6 border-b border-line pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-md bg-paper-raised px-2 py-1 font-mono text-sm font-semibold text-ink ring-1 ring-line">{document.doc_type}</code>
          <span className="inline-flex items-center gap-1 text-xs text-ink-faint">
            <Lock aria-hidden="true" className="h-3.5 w-3.5" />
            Type and slug cannot be changed
          </span>
        </div>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">{document.slug}</h1>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge tone={statusTone[document.status]}>{documentStatusLabels[document.status]}</StatusBadge>
          <StatusBadge tone="accent">Draft editing</StatusBadge>{dirty ? <StatusBadge tone="warning">Unsaved changes</StatusBadge> : null}
        </div>
      </header>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-8">
          {notice ? <Notice tone="info" title={notice} /> : null}

          <Panel
            title="Edit draft"
            description="Edit approved editorial text fields. Protected tokens and structural fields stay locked. Save creates a revision but never publishes."
          >
            <Surface className="p-4">
              <DocumentDraftEditor
                detail={detail}
                onDirtyChange={setDirty}
                onSave={async (nextDraft, summary) => {
                  setNotice(null);
                  const saved = await repositoryState.repository.saveDocumentDraft(detail, nextDraft, summary);
                  if (saved.ok) {
                    setNotice('Draft saved as a new revision. It is not published.');
                    setDirty(false);
                    await load();
                  }
                  return saved;
                }}
              />
            </Surface>
          </Panel>

          <Panel
            title="Metric references"
            description={`${references.length} reference${references.length === 1 ? '' : 's'} recorded for this document's fields, by field path.`}
          >
            {references.length === 0 ? (
              <Notice tone="info" title="No metric references">
                No field of this document references a metric.
              </Notice>
            ) : (
              <DataTable caption="Metric references" columns={referenceColumns} rows={referenceRows(references)} emptyMessage="" />
            )}
          </Panel>

          {linkedPhrases.length > 0 ? (
            <Panel
              title="Linked phrases matching this document's metrics"
              description="Wording that restates a figure and needs review by hand when it changes. Shown here because it names a metric this document references, or is attached to this document."
            >
              <LinkedPhrases phrases={linkedPhrases} actorLabel={actorLabel} />
            </Panel>
          ) : null}

          <Panel
            title="Revision history"
            description="Newest first. Recorded by the database; revisions cannot be edited or deleted. Metadata only: revision content is not shown."
          >
            <RevisionHistory
              revisions={revisions}
              publishedRevisionId={document.published_revision_id}
              publishedRevisionMissing={publishedRevisionMissing}
              actorLabel={actorLabel}
            />
          </Panel>
        </div>

        <aside className="min-w-0 space-y-8" aria-label="Document state">
          <Panel title="Document">
            <Surface>
              <DefinitionList
                items={[
                  { term: 'Document type', detail: <code className="text-xs">{document.doc_type}</code> },
                  { term: 'Slug', detail: <code className="text-xs">{document.slug}</code> },
                  { term: 'Status', detail: documentStatusLabels[document.status] },
                  { term: 'Schema version', detail: document.schema_version },
                  { term: 'Sort order', detail: document.sort_order },
                  { term: 'Last updated', detail: formatDateTime(document.updated_at) },
                  {
                    term: 'Published revision ID',
                    detail: document.published_revision_id ? (
                      <code className="text-xs [overflow-wrap:anywhere]">{document.published_revision_id}</code>
                    ) : (
                      <span className="text-ink-faint">None</span>
                    ),
                  },
                ]}
              />
            </Surface>
          </Panel>

          <Panel title="Published revision" description="Metadata only. Revision content is not shown here.">
            <Surface>
              {publishedRevision ? (
                <DefinitionList
                  items={[
                    { term: 'Revision number', detail: publishedRevision.revision_number },
                    { term: 'Schema version', detail: publishedRevision.schema_version },
                    { term: 'Change summary', detail: publishedRevision.change_summary ?? <span className="text-ink-faint">None</span> },
                    {
                      term: 'Release ID',
                      detail: publishedRevision.release_id ?? <span className="text-ink-faint">None (not published through a release)</span>,
                    },
                    { term: 'Created', detail: formatDateTime(publishedRevision.created_at) },
                    { term: 'Created by', detail: actorLabel(publishedRevision.created_by) },
                  ]}
                />
              ) : publishedRevisionMissing ? (
                <p className="px-3 py-2 text-sm text-evidence-reported">
                  The document names a published revision that is not among the revisions returned. See Revision history.
                </p>
              ) : (
                <p className="px-3 py-2 text-sm text-ink-soft">No published revision.</p>
              )}
            </Surface>
          </Panel>

          <Panel title="Draft and publication">
            <Surface>
              <DefinitionList
                items={[
                  { term: 'Published revision', detail: publishedRevision ? `Yes, revision ${publishedRevision.revision_number}` : 'No' },
                  { term: 'Draft', detail: hasDraft ? 'Present' : 'None' },
                  { term: 'Draft vs published', detail: <DraftComparison matches={draftMatchesPublished} /> },
                  { term: 'Revisions recorded', detail: revisions.length },
                ]}
              />
              <p className="border-t border-line px-3 py-2 text-xs text-ink-faint">
                Compared structurally in your browser. The content itself is not displayed.
              </p>
            </Surface>
          </Panel>
        </aside>
      </div>
    </>
  );
}

function referenceRows(references: readonly DocumentReferenceEntry[]): Row[] {
  return references.map((entry, index) => {
    const firstOfField = index === 0 || references[index - 1].fieldPath !== entry.fieldPath;
    return {
      key: `${entry.fieldPath}|${entry.metricId}`,
      cells: [
        firstOfField ? (
          <code key="field" className="text-xs [overflow-wrap:anywhere]">
            {entry.fieldPath}
          </code>
        ) : (
          <span key="field" className="sr-only">
            {entry.fieldPath}
          </span>
        ),
        entry.metricKey ? (
          <Link key="metric" href={metricDetailHref(entry.metricKey)} className="font-mono text-xs font-medium text-accent hover:underline">
            {entry.metricKey}
          </Link>
        ) : (
          <span key="metric" className="text-xs text-ink-faint">
            Metric not visible
          </span>
        ),
        <span key="name" className="text-ink">
          {entry.metricName ?? '—'}
        </span>,
        entry.format ? (
          <code key="format" className="text-xs">
            {entry.format}
          </code>
        ) : (
          <span key="format" className="text-xs text-ink-faint">
            Default
          </span>
        ),
        entry.archivedAt ? (
          <StatusBadge key="state" tone="warning">
            Archived
          </StatusBadge>
        ) : (
          <StatusBadge key="state" tone="accent">
            Active
          </StatusBadge>
        ),
      ],
    };
  });
}

function RevisionHistory({
  revisions,
  publishedRevisionId,
  publishedRevisionMissing,
  actorLabel,
}: {
  revisions: readonly DocumentRevisionRow[];
  publishedRevisionId: string | null;
  publishedRevisionMissing: boolean;
  actorLabel: (userId: string | null) => string;
}) {
  return (
    <div className="space-y-3">
      {publishedRevisionMissing ? (
        <Notice tone="warning" title="Published revision not found">
          The document names a published revision that is not among the revisions returned, so no revision is marked as
          published. Nothing is shown in its place.
        </Notice>
      ) : publishedRevisionId === null ? (
        <p className="text-xs text-ink-soft">No published revision.</p>
      ) : null}

      {revisions.length === 0 ? (
        <Notice tone="info" title="No revisions recorded">
          The database returned no revisions for this document.
        </Notice>
      ) : (
        <ol className="divide-y divide-line rounded-card border border-line bg-paper-raised">
          {revisions.map((revision) => {
            const published = publishedRevisionId !== null && revision.id === publishedRevisionId;
            return (
              <li key={revision.id} className="space-y-1.5 px-3 py-2.5 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">Revision #{revision.revision_number}</span>
                  {published ? <StatusBadge tone="accent">Published · current</StatusBadge> : null}
                </div>
                <p className="text-xs text-ink-soft">{revision.change_summary ?? 'No change summary.'}</p>
                <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-xs">
                  <dt className="text-ink-faint">Schema version</dt>
                  <dd>{revision.schema_version}</dd>
                  <dt className="text-ink-faint">Release ID</dt>
                  <dd>{revision.release_id ?? 'None (not published through a release)'}</dd>
                  <dt className="text-ink-faint">Created</dt>
                  <dd>{formatDateTime(revision.created_at)}</dd>
                  <dt className="text-ink-faint">Created by</dt>
                  <dd>{actorLabel(revision.created_by)}</dd>
                </dl>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function DraftComparison({ matches }: { matches: boolean | null }) {
  if (matches === null) return <span className="text-ink-faint">Not compared (no published revision)</span>;
  return matches ? (
    <StatusBadge tone="accent">Identical to the published revision</StatusBadge>
  ) : (
    <StatusBadge tone="warning">Differs from the published revision</StatusBadge>
  );
}

function LinkedPhrases({ phrases, actorLabel }: { phrases: readonly LinkedPhraseMatch[]; actorLabel: (userId: string | null) => string }) {
  return (
    <ul className="divide-y divide-line rounded-card border border-line bg-paper-raised">
      {phrases.map((phrase) => (
        <li key={phrase.id} className="space-y-1.5 px-3 py-2.5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink">&ldquo;{phrase.phrase}&rdquo;</span>
            {phrase.relation === 'attached' ? (
              <StatusBadge tone="accent">Attached to this document</StatusBadge>
            ) : (
              <StatusBadge tone="info">{phrase.document_id ? 'Attached to another document' : 'Not attached to a document'}</StatusBadge>
            )}
            {phrase.reviewed_at ? (
              <StatusBadge tone="neutral">Reviewed {formatDateTime(phrase.reviewed_at)}</StatusBadge>
            ) : (
              <StatusBadge tone="warning">Not reviewed</StatusBadge>
            )}
          </div>
          <p className="text-xs text-ink-soft">{phrase.reason}</p>
          <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-xs">
            <dt className="text-ink-faint">Location</dt>
            <dd className="[overflow-wrap:anywhere]">{phrase.location}</dd>
            <dt className="text-ink-faint">Matched metrics</dt>
            <dd className="flex flex-wrap gap-x-2">
              {phrase.matchedKeys.length > 0
                ? phrase.matchedKeys.map((key) => (
                    <Link key={key} href={metricDetailHref(key)} className="font-mono text-accent hover:underline">
                      {key}
                    </Link>
                  ))
                : 'None (attached directly)'}
            </dd>
            {phrase.reviewed_at ? (
              <>
                <dt className="text-ink-faint">Reviewed by</dt>
                <dd>{actorLabel(phrase.reviewed_by)}</dd>
              </>
            ) : null}
          </dl>
        </li>
      ))}
    </ul>
  );
}

function NotFound({ message }: { message: ReactNode }) {
  return (
    <Notice tone="warning" title="Document not found">
      <p>{message}</p>
      <p className="mt-1">
        <Link href="/content/" className="font-medium text-accent hover:underline">
          Back to all documents
        </Link>
      </p>
    </Notice>
  );
}
