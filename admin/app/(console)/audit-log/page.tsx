import type { Metadata } from 'next';

import { DataTable } from '@admin/components/ui/DataTable';
import { PageHeader } from '@admin/components/ui/PageHeader';
import { StatusBadge } from '@admin/components/ui/StatusBadge';
import { auditColumns } from '@admin/lib/columns';

export const metadata: Metadata = { title: 'Audit Log' };

export default function AuditLogPage() {
  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Every change to admin data, recorded by the database. Entries cannot be edited or deleted by anyone, including the owner."
        meta={<StatusBadge>Append-only</StatusBadge>}
      />

      <div className="mb-3 flex flex-wrap gap-3" role="group" aria-label="Filters (not available yet)">
        <label className="flex flex-col text-xs font-medium text-ink-soft">
          Resource
          <select disabled className="mt-1 rounded-md border border-line-strong bg-paper-sunk px-2 py-1.5 text-sm text-ink-faint">
            <option>All resources</option>
          </select>
        </label>
        <label className="flex flex-col text-xs font-medium text-ink-soft">
          From
          <input type="date" disabled className="mt-1 rounded-md border border-line-strong bg-paper-sunk px-2 py-1 text-sm text-ink-faint" />
        </label>
        <label className="flex flex-col text-xs font-medium text-ink-soft">
          To
          <input type="date" disabled className="mt-1 rounded-md border border-line-strong bg-paper-sunk px-2 py-1 text-sm text-ink-faint" />
        </label>
      </div>

      <DataTable
        caption="Audit log"
        columns={auditColumns}
        emptyMessage="This screen does not read the audit log yet; entries are recorded in the database either way. No entries are ever invented for display."
      />
    </>
  );
}
