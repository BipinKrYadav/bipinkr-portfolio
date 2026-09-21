import type { Metadata } from 'next';

import { DocumentsList } from '@admin/components/content/DocumentsList';
import { DataTable, type Row } from '@admin/components/ui/DataTable';
import { Notice } from '@admin/components/ui/Notice';
import { PageHeader } from '@admin/components/ui/PageHeader';
import { Panel } from '@admin/components/ui/Panel';
import { StatusBadge } from '@admin/components/ui/StatusBadge';
import { caseStudyCatalog, snapshotDocument, snapshotSource, type SnapshotDocumentSummary } from '@admin/lib/snapshot-catalog';

export const metadata: Metadata = { title: 'Documents / Content' };

interface ContentSection {
  name: string;
  route: string;
  /** backend public.document_type, or null when none exists yet */
  documentType: string | null;
  documents: readonly SnapshotDocumentSummary[];
  sourceNote?: string;
}

const sections: readonly ContentSection[] = [
  {
    name: 'Home',
    route: '/',
    documentType: 'homepage',
    documents: [snapshotDocument('homepage'), snapshotDocument('proofStrip')],
  },
  { name: 'About', route: '/about/', documentType: 'about', documents: [snapshotDocument('about')] },
  { name: 'Services', route: '/services/', documentType: 'services', documents: [snapshotDocument('services')] },
  { name: 'Contact', route: '/contact/', documentType: 'contact', documents: [snapshotDocument('contact')] },
  {
    name: 'Case Studies',
    route: '/case-studies/',
    documentType: 'case_study_index, case_study',
    documents: [snapshotDocument('caseStudyIndex'), ...caseStudyCatalog],
  },
  {
    name: 'Free Ad Audit',
    route: '/free-ad-audit/',
    documentType: null,
    documents: [],
    sourceNote: 'Page code only (app/free-ad-audit). Not in the snapshot.',
  },
  {
    name: 'Blog',
    route: '/blog/',
    documentType: 'blog_post',
    documents: [],
    sourceNote: 'TypeScript modules (content/blog). Not in the snapshot.',
  },
];

const columns = [
  { key: 'section', label: 'Section' },
  { key: 'route', label: 'Public route' },
  { key: 'type', label: 'Document type' },
  { key: 'source', label: 'Current source' },
  { key: 'status', label: 'Snapshot status' },
  { key: 'draft', label: 'Draft changes' },
] as const;

const rows: readonly Row[] = sections.map((section) => ({
  key: section.name,
  cells: [
    <span key="name" className="font-medium text-ink">
      {section.name}
    </span>,
    <code key="route" className="whitespace-nowrap text-xs">
      {section.route}
    </code>,
    section.documentType ? (
      <code key="type" className="text-xs">
        {section.documentType}
      </code>
    ) : (
      <StatusBadge key="type" tone="warning">
        None yet
      </StatusBadge>
    ),
    <span key="source" className="text-xs text-ink-soft">
      {section.documents.length > 0
        ? `${section.documents.length} snapshot document${section.documents.length > 1 ? 's' : ''} (${section.documents
            .map((document) => document.slug)
            .join(', ')})`
        : section.sourceNote}
    </span>,
    section.documents.length > 0 ? (
      <StatusBadge key="status" tone={section.documents.every((d) => d.status === 'published') ? 'accent' : 'warning'}>
        {section.documents.every((d) => d.status === 'published') ? 'Published' : 'Mixed'}
      </StatusBadge>
    ) : (
      <StatusBadge key="status">Not in snapshot</StatusBadge>
    ),
    <span key="draft" className="text-xs text-ink-faint">
      Not read yet
    </span>,
  ],
}));

export default function ContentPage() {
  return (
    <>
      <PageHeader
        title="Documents / Content"
        description="The page documents the public site is built from. Read-only: document editing, drafts and revisions are not built yet."
        meta={<StatusBadge>Read-only</StatusBadge>}
      />

      <div className="space-y-8">
        <Panel
          title="Documents in the database"
          description="Read after sign-in with your session. Metadata and metric-reference counts only; page content is not loaded."
        >
          <DocumentsList />
        </Panel>

        <Panel title="Sections">
          <Notice tone="info" title="Source of this list" className="mb-4">
            Document names and status are read from <code>{snapshotSource}</code> when the admin is built. No page copy
            or figures are shown or changed here.
          </Notice>
          <DataTable caption="Content sections" columns={columns} rows={rows} emptyMessage="" />
        </Panel>
      </div>
    </>
  );
}
