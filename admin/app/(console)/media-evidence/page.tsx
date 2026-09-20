import type { Metadata } from 'next';

import { StatCard } from '@admin/components/ui/ConnectionState';
import { DataTable } from '@admin/components/ui/DataTable';
import { Notice } from '@admin/components/ui/Notice';
import { PageHeader } from '@admin/components/ui/PageHeader';
import { Panel } from '@admin/components/ui/Panel';
import { StatusBadge } from '@admin/components/ui/StatusBadge';

export const metadata: Metadata = { title: 'Media & Evidence' };

const mediaColumns = [
  { key: 'file', label: 'File' },
  { key: 'kind', label: 'Kind' },
  { key: 'type', label: 'Type' },
  { key: 'size', label: 'Size', align: 'right' },
  { key: 'alt', label: 'Alt text' },
  { key: 'redaction', label: 'Redaction confirmed' },
  { key: 'usage', label: 'Used in' },
] as const;

const evidenceColumns = [
  { key: 'file', label: 'File' },
  { key: 'description', label: 'Description' },
  { key: 'type', label: 'Type' },
  { key: 'size', label: 'Size', align: 'right' },
  { key: 'personal', label: 'Personal data' },
  { key: 'retention', label: 'Retention review' },
] as const;

const linkColumns = [
  { key: 'metric', label: 'Metric key' },
  { key: 'file', label: 'Evidence file' },
  { key: 'locator', label: 'Locator (private)' },
  { key: 'linked', label: 'Linked' },
] as const;

export default function MediaEvidencePage() {
  return (
    <>
      <PageHeader
        title="Media & Evidence"
        description="Media originals, private evidence files and the links between evidence and metrics. Read-only: uploads are not available in this build."
        meta={<StatusBadge>Uploads not available</StatusBadge>}
      />

      <Notice tone="info" title="Private files" className="mb-6">
        Evidence files and media originals are kept in private storage buckets. They will open only through
        short-lived signed links requested after sign-in. This interface never shows, stores or builds file URLs.
      </Notice>

      <div className="space-y-8">
        <Panel title="Verification status" description="Evidence coverage for metrics.">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Metrics with linked evidence" description="Metrics that have at least one evidence file." />
            <StatCard label="Metrics without evidence" description="Graded metrics with no evidence file linked." />
            <StatCard
              label="Files awaiting review"
              description="Retention reviews due, or screenshots without redaction confirmed."
            />
          </div>
        </Panel>

        <Panel title="Media assets" description="Images and documents used on the public site (bucket: media-originals).">
          <DataTable
            caption="Media assets"
            columns={mediaColumns}
            emptyMessage="This screen does not read media metadata yet."
          />
        </Panel>

        <Panel title="Evidence files" description="Campaign exports, screenshots and records (bucket: evidence). Never published.">
          <DataTable
            caption="Evidence files"
            columns={evidenceColumns}
            emptyMessage="This screen does not read evidence metadata yet."
          />
        </Panel>

        <Panel title="Linked evidence" description="Which evidence file supports which metric.">
          <DataTable
            caption="Linked evidence"
            columns={linkColumns}
            emptyMessage="This screen does not read metric–evidence links yet."
          />
        </Panel>
      </div>
    </>
  );
}
