'use client';

import { StatusBadge, type BadgeTone } from '@admin/components/ui/StatusBadge';
import type { AuthStatus } from '@admin/lib/auth/types';

import { useAuth } from './AuthProvider';

const labels: Record<AuthStatus, { label: string; tone: BadgeTone }> = {
  loading: { label: 'Checking session', tone: 'neutral' },
  unconfigured: { label: 'Auth not configured', tone: 'warning' },
  misconfigured: { label: 'Auth misconfigured', tone: 'danger' },
  signed_out: { label: 'Signed out', tone: 'neutral' },
  mfa_required: { label: 'MFA required', tone: 'info' },
  not_authorised: { label: 'Not authorised', tone: 'danger' },
  authenticated: { label: 'Signed in', tone: 'accent' },
};

export function AuthStatusBadge() {
  const { state } = useAuth();
  const { label, tone } = labels[state.status];
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}
