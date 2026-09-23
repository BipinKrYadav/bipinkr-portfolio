import { StatusBadge, type BadgeTone } from '@admin/components/ui/StatusBadge';
import { verificationStateLabels } from '@admin/lib/metrics/changes';
import { evidenceStatusLabels, type EvidenceStatus, type VerificationState } from '@admin/lib/metrics/model';
import type { PublishedState } from '@admin/lib/metrics/published-baseline';

const evidenceTones: Record<EvidenceStatus, BadgeTone> = {
  verified: 'accent',
  documented: 'neutral',
  calculated: 'info',
  reported: 'warning',
  unverified: 'warning',
  limitation: 'danger',
  recommendation: 'info',
};

export function EvidenceStatusBadge({ status }: { status: EvidenceStatus | null }) {
  return status ? (
    <StatusBadge tone={evidenceTones[status]}>{evidenceStatusLabels[status]}</StatusBadge>
  ) : (
    <StatusBadge>Not graded</StatusBadge>
  );
}

const verificationTones: Record<VerificationState, BadgeTone> = {
  verified_current: 'accent',
  changed_since_verification: 'warning',
  not_verified: 'neutral',
};

export function VerificationBadge({ state }: { state: VerificationState }) {
  return <StatusBadge tone={verificationTones[state]}>{verificationStateLabels[state].label}</StatusBadge>;
}

export const publishedStateLabels: Record<PublishedState['state'], { label: string; description: string }> = {
  matches: {
    label: 'Matches published',
    description: 'The live site shows exactly these published fields.',
  },
  differs: {
    label: 'Draft differs from published',
    description: 'Saved edits are drafts. The live site still shows the published baseline until a release publishes them.',
  },
  not_published: {
    label: 'Not published',
    description: 'The published snapshot does not contain this metric, so the live site does not show it.',
  },
};

const publishedTones: Record<PublishedState['state'], BadgeTone> = { matches: 'accent', differs: 'warning', not_published: 'neutral' };

export function PublishedStateBadge({ state }: { state: PublishedState }) {
  return <StatusBadge tone={publishedTones[state.state]}>{publishedStateLabels[state.state].label}</StatusBadge>;
}

export function ActivityBadge({ archivedAt }: { archivedAt: string | null }) {
  return archivedAt ? <StatusBadge tone="warning">Archived</StatusBadge> : <StatusBadge tone="accent">Active</StatusBadge>;
}
