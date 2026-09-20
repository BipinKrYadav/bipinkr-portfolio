import type { Metadata } from 'next';

import { DataTable, type Row } from '@admin/components/ui/DataTable';
import { PageHeader } from '@admin/components/ui/PageHeader';
import { Panel } from '@admin/components/ui/Panel';
import { StatusBadge } from '@admin/components/ui/StatusBadge';
import { caseStudyCatalog, snapshotSource } from '@admin/lib/snapshot-catalog';

export const metadata: Metadata = { title: 'Case Studies' };

const columns = [
  { key: 'order', label: '#', align: 'right' },
  { key: 'name', label: 'Case study' },
  { key: 'slug', label: 'Slug' },
  { key: 'industry', label: 'Industry' },
  { key: 'platform', label: 'Platform' },
  { key: 'status', label: 'Snapshot status' },
  { key: 'metrics', label: 'Metric references' },
] as const;

const rows: readonly Row[] = caseStudyCatalog.map((study) => ({
  key: study.slug,
  cells: [
    <span key="order" className="text-ink-soft">
      {study.order}
    </span>,
    <span key="name" className="font-medium text-ink">
      {study.name}
    </span>,
    <code key="slug" className="whitespace-nowrap text-xs">
      /case-studies/{study.slug}/
    </code>,
    study.industry,
    study.platform,
    <StatusBadge key="status" tone={study.status === 'published' ? 'accent' : 'warning'}>
      {study.status === 'published' ? 'Published' : study.status}
    </StatusBadge>,
    <span key="metrics" className="text-xs text-ink-faint">
      Not read yet
    </span>,
  ],
}));

export default function CaseStudiesPage() {
  return (
    <>
      <PageHeader
        title="Case Studies"
        description={`The ${caseStudyCatalog.length} published case studies, by approved card name and slug. Their figures stay in the metrics registry and are not repeated here.`}
        meta={<StatusBadge>Read-only</StatusBadge>}
      />

      <Panel title="Published case studies" description={`Read from ${snapshotSource} at build time. Slugs are locked.`}>
        <DataTable caption="Case studies" columns={columns} rows={rows} emptyMessage="" />
      </Panel>
    </>
  );
}
