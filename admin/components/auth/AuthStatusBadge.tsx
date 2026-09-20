'use client';

import { StatusBadge, type BadgeTone } from '@admin/components/ui/StatusBadge';
import { authStatusLabels } from '@admin/lib/auth/access';
import type { AuthStatus } from '@admin/lib/auth/types';

import { useAuth } from './AuthProvider';

const tones: Record<AuthStatus, BadgeTone> = {
  loading: 'neutral',
  unconfigured: 'warning',
  misconfigured: 'danger',
  unavailable: 'danger',
  signed_out: 'neutral',
  mfa_setup_required: 'warning',
  mfa_required: 'info',
  not_authorised: 'danger',
  authenticated: 'accent',
};

export function AuthStatusBadge() {
  const { state } = useAuth();
  return <StatusBadge tone={tones[state.status]}>{authStatusLabels[state.status]}</StatusBadge>;
}
