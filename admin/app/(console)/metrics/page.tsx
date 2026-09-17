import type { Metadata } from 'next';

import { DataTable } from '@admin/components/ui/DataTable';
import { PageHeader } from '@admin/components/ui/PageHeader';
import { Panel, Surface } from '@admin/components/ui/Panel';
import { StatusBadge } from '@admin/components/ui/StatusBadge';
import { evidenceStatusLabels, verificationStateLabels } from '@admin/lib/data/types';

export const metadata: Metadata = { title: 'Metrics' };

const columns = [
  { key: 'metric_key', label: 'Metric key' },
  { key: 'value', label: 'Value', align: 'right' },
  { key: 'kind', label: 'Kind' },
  { key: 'unit', label: 'Unit' },
  { key: 'precision', label: 'Precision' },
  { key: 'verification', label: 'Verification status' },
  { key: 'evidence_status', label: 'Evidence status' },
  { key: 'updated_at', label: 'Last updated' },
] as const;

export default function MetricsPage() {
  return (
    <>
      <PageHeader
        title="Metrics"
        description="Canonical figures the public site renders. Read-only in this build: editing, evidence status changes and verification arrive with the backend connection."
        meta={<StatusBadge>Read-only</StatusBadge>}
      />

      <div className="mb-3 flex flex-wrap gap-3" aria-label="Filters (not available yet)" role="group">
        <label className="flex flex-col text-xs font-medium text-ink-soft">
          Search metric keys
          <input
            type="search"
            disabled
            placeholder="Metric key"
            className="mt-1 w-64 rounded-md border border-line-strong bg-paper-sunk px-3 py-1.5 text-sm text-ink-faint"
          />
        </label>
        <label className="flex flex-col text-xs font-medium text-ink-soft">
          Kind
          <select disabled className="mt-1 rounded-md border border-line-strong bg-paper-sunk px-2 py-1.5 text-sm text-ink-faint">
            <option>All kinds</option>
          </select>
        </label>
        <label className="flex flex-col text-xs font-medium text-ink-soft">
          Needs review
          <select disabled className="mt-1 rounded-md border border-line-strong bg-paper-sunk px-2 py-1.5 text-sm text-ink-faint">
            <option>All metrics</option>
          </select>
        </label>
      </div>

      <DataTable
        caption="Metrics"
        columns={columns}
        emptyMessage="Metrics are read from the database once the admin is connected. Values are never copied into this interface."
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <Panel
          title="Verification status"
          description="Derived from the verification record. It never changes by itself when a value is edited."
        >
          <Surface>
            <ul className="divide-y divide-line text-sm">
              {Object.entries(verificationStateLabels).map(([state, { label, description }]) => (
                <li key={state} className="px-4 py-2.5">
                  <p className="font-medium text-ink">{label}</p>
                  <p className="text-xs text-ink-soft">{description}</p>
                </li>
              ))}
            </ul>
          </Surface>
        </Panel>

        <Panel
          title="Evidence status"
          description="Set by an admin, with a reason, through a dedicated action. Never computed."
        >
          <Surface className="flex flex-wrap gap-2 p-4">
            {Object.values(evidenceStatusLabels).map((label) => (
              <StatusBadge key={label}>{label}</StatusBadge>
            ))}
          </Surface>
        </Panel>
      </div>
    </>
  );
}
