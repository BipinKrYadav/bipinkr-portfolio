import type { Metadata } from 'next';

import { AuthStatusBadge } from '@admin/components/auth/AuthStatusBadge';
import { StatCard } from '@admin/components/ui/ConnectionState';
import { DataTable } from '@admin/components/ui/DataTable';
import { PageHeader } from '@admin/components/ui/PageHeader';
import { DefinitionList, Panel, Surface } from '@admin/components/ui/Panel';
import { StatusBadge } from '@admin/components/ui/StatusBadge';
import { auditColumns } from '@admin/lib/columns';

export const metadata: Metadata = { title: 'Dashboard' };

const summaryCards = [
  { label: 'Published release', description: 'The release currently live on bipinkr.in.' },
  { label: 'Draft changes', description: 'Metric and document edits that have not been published.' },
  {
    label: 'Metrics requiring review',
    description: 'Metrics never verified, changed since verification, or linked to wording that needs review.',
  },
  {
    label: 'Evidence requiring review',
    description: 'Evidence files due a retention review, or media awaiting redaction confirmation.',
  },
  { label: 'Last publish', description: 'When the most recent release went live, and who published it.' },
  { label: 'Audit activity', description: 'Recent admin changes recorded in the audit log.' },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Release state, work waiting for review and recent admin activity. Every figure here comes from the backend; none is shown until it is connected."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => (
          <StatCard key={card.label} label={card.label} description={card.description} />
        ))}
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Recent audit activity" description="Latest entries from the append-only audit log.">
          <DataTable
            caption="Recent audit activity"
            columns={auditColumns}
            emptyMessage="Audit entries appear here once the admin is connected."
          />
        </Panel>

        <Panel title="Backend status">
          <Surface>
            <DefinitionList
              layout="inline"
              items={[
                { term: 'Authentication', detail: <AuthStatusBadge /> },
                { term: 'Database', detail: <StatusBadge>Not connected</StatusBadge> },
                { term: 'Private storage', detail: <StatusBadge>Not connected</StatusBadge> },
                { term: 'Publishing', detail: <StatusBadge>Not available</StatusBadge> },
              ]}
            />
          </Surface>
        </Panel>
      </div>
    </>
  );
}
