import type { Metadata } from 'next';

import { DataTable } from '@admin/components/ui/DataTable';
import { Notice } from '@admin/components/ui/Notice';
import { PageHeader } from '@admin/components/ui/PageHeader';
import { Panel, Surface } from '@admin/components/ui/Panel';
import { StatusBadge } from '@admin/components/ui/StatusBadge';
import { releaseUiStates } from '@admin/lib/releases';

export const metadata: Metadata = { title: 'Releases' };

const historyColumns = [
  { key: 'release', label: 'Release' },
  { key: 'kind', label: 'Kind' },
  { key: 'state', label: 'State' },
  { key: 'summary', label: 'Summary' },
  { key: 'created', label: 'Created' },
  { key: 'live', label: 'Went live' },
] as const;

export default function ReleasesPage() {
  return (
    <>
      <PageHeader
        title="Releases"
        description="How changes reach the public site, and the history of each release."
        meta={<StatusBadge>Publishing not available</StatusBadge>}
      />

      <Notice tone="info" title="No publishing in this build" className="mb-6">
        The states below describe the release lifecycle. Nothing here creates, builds or deploys a release, and the
        public site is not affected by this interface.
      </Notice>

      <div className="space-y-8">
        <Panel title="Release lifecycle" description="UI states, with the backend status each one represents.">
          <Surface>
            <ol className="divide-y divide-line">
              {releaseUiStates.map((state, index) => (
                <li
                  key={state.state}
                  className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[2rem_9rem_minmax(0,1fr)_14rem] sm:items-center"
                >
                  <span className="text-xs text-ink-faint">{index + 1}</span>
                  <span>
                    <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
                  </span>
                  <span className="text-ink-soft">{state.description}</span>
                  <span className="text-xs text-ink-faint">
                    Backend: <code>{state.backend}</code>
                  </span>
                </li>
              ))}
            </ol>
          </Surface>
        </Panel>

        <Panel title="Release history">
          <DataTable
            caption="Release history"
            columns={historyColumns}
            emptyMessage="Releases appear here once the admin is connected."
          />
        </Panel>
      </div>
    </>
  );
}
