import { StatusBadge } from '@admin/components/ui/StatusBadge';
import { releaseStatusLabels, type ReleaseRow } from '@admin/lib/releases/model';

export const releaseHref = (releaseId: number) => `/releases/detail/?id=${releaseId}`;

export function ReleaseStatusBadge({ status }: { status: ReleaseRow['status'] }) {
  const { label, tone } = releaseStatusLabels[status];
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}

/** "Release 3", "Release 1 (imported baseline)", "Release 5 (rollback)". */
export function releaseName(release: Pick<ReleaseRow, 'id' | 'origin' | 'kind'>): string {
  if (release.origin === 'baseline_import') return `Release ${release.id} (imported baseline)`;
  return release.kind === 'rollback' ? `Release ${release.id} (rollback)` : `Release ${release.id}`;
}
