import { StatusBadge } from '@admin/components/ui/StatusBadge';
import { formatDateTime } from '@admin/lib/format-date';
import { versionPublication, type VersionChange, type VersionEntry, type VersionPublication } from '@admin/lib/metrics/changes';
import { describeFormula } from '@admin/lib/metrics/formula';
import { evidenceStatusLabels, humanise, kindLabels, precisionLabels, type EvidenceStatus, type MetricKind, type MetricRow, type ValuePrecision } from '@admin/lib/metrics/model';
import { displayValue } from '@admin/lib/metrics/values';

const changeKindLabels: Record<VersionEntry['changeKind'], string> = {
  insert: 'Created',
  update: 'Edited',
  evidence_status_changed: 'Evidence status changed',
  verification_confirmed: 'Verification confirmed',
  archived: 'Archived',
};

const fieldLabels: Record<VersionChange['field'], string> = {
  value: 'Value',
  formula: 'Formula',
  kind: 'Kind',
  precision: 'Precision',
  evidence_status: 'Evidence status',
  archived_at: 'Archived',
};

function show(field: VersionChange['field'], value: unknown, metric: MetricRow): string {
  if (value === null || value === undefined) return '—';
  switch (field) {
    case 'value':
      return displayValue(metric, value as number);
    case 'formula':
      return describeFormula(value);
    case 'kind':
      return kindLabels[value as MetricKind] ?? String(value);
    case 'precision':
      return precisionLabels[value as ValuePrecision] ?? String(value);
    case 'evidence_status':
      return evidenceStatusLabels[value as EvidenceStatus] ?? String(value);
    case 'archived_at':
      return formatDateTime(value as string);
  }
}

function PublicationLabel({ publication }: { publication: VersionPublication }) {
  if (publication.state === 'published') return <StatusBadge tone="accent">Published · release {publication.releaseId}</StatusBadge>;
  if (publication.state === 'baseline') return <StatusBadge tone="accent">Published baseline</StatusBadge>;
  return <StatusBadge tone="warning">Draft — not published</StatusBadge>;
}

/** Read-only history from public.metric_versions (append-only in the database). */
export function VersionHistory({
  metric,
  versions,
  inPublishedSnapshot,
  actorLabel,
}: {
  metric: MetricRow;
  versions: readonly VersionEntry[];
  /** Whether the published snapshot contains this metric (its first version is then the imported baseline). */
  inPublishedSnapshot: boolean;
  actorLabel: (userId: string | null) => string;
}) {
  if (versions.length === 0) {
    return (
      <p className="text-sm text-ink-soft" role="status">
        No version history recorded.
      </p>
    );
  }

  return (
    <ol className="divide-y divide-line rounded-card border border-line bg-paper-raised">
      {versions.map((entry) => (
        <li key={entry.id} className="px-3 py-3 text-sm">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-xs text-ink-faint">v{entry.number}</span>
            <span className="font-semibold text-ink">{changeKindLabels[entry.changeKind]}</span>
            <PublicationLabel publication={versionPublication(entry, inPublishedSnapshot)} />
            <span className="text-xs text-ink-soft">
              {formatDateTime(entry.changedAt)} · {actorLabel(entry.changedBy)}
            </span>
          </div>

          {entry.changes.length > 0 ? (
            <table className="mt-2 w-full border-collapse text-xs">
              <caption className="sr-only">Changes in version {entry.number}</caption>
              <thead className="sr-only">
                <tr>
                  <th scope="col">Field</th>
                  <th scope="col">Previous</th>
                  <th scope="col">Current</th>
                </tr>
              </thead>
              <tbody>
                {entry.changes.map((change) => (
                  <tr key={change.field} className="align-top">
                    <th scope="row" className="w-28 py-0.5 pr-2 text-left font-medium text-ink-soft">
                      {fieldLabels[change.field]}
                    </th>
                    <td className="py-0.5 pr-2 text-ink-faint [overflow-wrap:anywhere]">
                      {entry.changeKind === 'insert' ? '' : show(change.field, change.before, metric)}
                    </td>
                    <td className="py-0.5 text-ink [overflow-wrap:anywhere]">
                      {entry.changeKind === 'insert' ? '' : '→ '}
                      {show(change.field, change.after, metric)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {entry.changeKind === 'verification_confirmed' ? (
            <p className="mt-1 text-xs text-ink-soft">Value at check: {displayValue(metric, entry.verifiedValue)}</p>
          ) : null}
          {entry.otherFields.length > 0 ? (
            <p className="mt-1 text-xs text-ink-soft">Also changed: {entry.otherFields.map(humanise).join(', ')}</p>
          ) : null}
          <p className="mt-1 text-xs">
            <span className="text-ink-soft">Reason: </span>
            {entry.reason ?? <span className="text-ink-faint">None recorded</span>}
          </p>
        </li>
      ))}
    </ol>
  );
}
