import { StatusBadge } from '@admin/components/ui/StatusBadge';
import { formatBytes, formatDate, formatDateTime } from '@admin/lib/format-date';
import { evidenceRelationship } from '@admin/lib/metrics/changes';
import type { EvidenceLinkRow, MetricRow } from '@admin/lib/metrics/model';

const relationshipLabels = {
  before_verification: 'Linked before the last source check',
  after_verification: 'Linked after the last source check',
  no_verification: 'No source check recorded',
} as const;

/** Metadata of the private evidence linked to a metric. Never a file URL. */
export function EvidencePanel({
  metric,
  evidence,
  actorLabel,
}: {
  metric: MetricRow;
  evidence: readonly EvidenceLinkRow[];
  actorLabel: (userId: string | null) => string;
}) {
  if (evidence.length === 0) {
    return (
      <p className="text-sm text-ink-soft" role="status">
        No evidence files are linked to this metric. Uploading and linking evidence is not available yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line rounded-card border border-line bg-paper-raised">
      {evidence.map((link) => {
        const file = link.evidence_files;
        return (
          <li key={link.evidence_file_id} className="space-y-1.5 px-3 py-2.5 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-ink [overflow-wrap:anywhere]">{file?.original_filename ?? 'Evidence file'}</span>
              {file?.archived_at ? <StatusBadge tone="warning">File archived</StatusBadge> : null}
              {file?.contains_personal_data ? <StatusBadge tone="danger">Personal data</StatusBadge> : null}
            </div>
            {file ? (
              <p className="text-xs text-ink-soft">
                {file.description} · {file.mime_type} · {formatBytes(file.byte_size)}
              </p>
            ) : null}
            <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-2 gap-y-0.5 text-xs">
              <dt className="text-ink-faint">Locator (private)</dt>
              <dd className="[overflow-wrap:anywhere]">{link.locator ?? '—'}</dd>
              <dt className="text-ink-faint">Linked</dt>
              <dd>
                {formatDateTime(link.created_at)} by {actorLabel(link.created_by)}
              </dd>
              <dt className="text-ink-faint">Retention review</dt>
              <dd>{file?.retention_review_at ? formatDate(file.retention_review_at) : 'Not scheduled'}</dd>
              <dt className="text-ink-faint">Verification</dt>
              <dd>{relationshipLabels[evidenceRelationship(link, metric)]}</dd>
              <dt className="text-ink-faint">SHA-256</dt>
              <dd className="font-mono [overflow-wrap:anywhere]">{file?.sha256 ?? '—'}</dd>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}
