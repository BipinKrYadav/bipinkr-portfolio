import { StatusBadge, type BadgeTone } from '@admin/components/ui/StatusBadge';
import { verificationStateLabels } from '@admin/lib/metrics/changes';
import { evidenceStatusLabels, type EvidenceStatus, type VerificationState } from '@admin/lib/metrics/model';

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

export function ActivityBadge({ archivedAt }: { archivedAt: string | null }) {
  return archivedAt ? <StatusBadge tone="warning">Archived</StatusBadge> : <StatusBadge tone="accent">Active</StatusBadge>;
}
