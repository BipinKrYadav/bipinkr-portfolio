import type { ReleaseKind, ReleaseStatus } from './data/types';

/**
 * Release states shown in the admin. These are labels for the UI only; the
 * pipeline that moves releases between them is a later phase. Each maps to
 * the backend's public.releases status (see supabase/migrations, 2 of 7).
 */
export type ReleaseUiState = 'draft' | 'validation' | 'queued' | 'building' | 'deployed' | 'failed' | 'rolled_back';

export interface ReleaseUiStateDefinition {
  state: ReleaseUiState;
  label: string;
  description: string;
  backend: string;
  tone: 'neutral' | 'info' | 'accent' | 'warning' | 'danger';
}

export const releaseUiStates: readonly ReleaseUiStateDefinition[] = [
  {
    state: 'draft',
    label: 'Draft',
    description: 'Unpublished changes exist. No release has been created for them.',
    backend: 'No release row',
    tone: 'neutral',
  },
  {
    state: 'validation',
    label: 'Validation',
    description: 'The snapshot is being generated and checked.',
    backend: 'validating',
    tone: 'info',
  },
  {
    state: 'queued',
    label: 'Queued',
    description: 'Validated, snapshot frozen, waiting for the build.',
    backend: 'queued',
    tone: 'info',
  },
  {
    state: 'building',
    label: 'Building',
    description: 'The static site is being built and uploaded.',
    backend: 'building, built, deploying',
    tone: 'info',
  },
  {
    state: 'deployed',
    label: 'Deployed',
    description: 'This release is live on bipinkr.in.',
    backend: 'live',
    tone: 'accent',
  },
  {
    state: 'failed',
    label: 'Failed',
    description: 'Stopped at a recorded stage. The live site is unchanged.',
    backend: 'failed',
    tone: 'danger',
  },
  {
    state: 'rolled_back',
    label: 'Rolled back',
    description: 'Was live, then replaced by a rollback release.',
    backend: 'superseded, by a release of kind rollback',
    tone: 'warning',
  },
];

/**
 * UI state for a release row. `supersededByKind` is the kind of the release
 * that replaced it, when it has been superseded. A release superseded by an
 * ordinary publish has no UI state of its own and returns null.
 */
export function releaseUiState(status: ReleaseStatus, supersededByKind?: ReleaseKind): ReleaseUiState | null {
  switch (status) {
    case 'validating':
      return 'validation';
    case 'queued':
      return 'queued';
    case 'building':
    case 'built':
    case 'deploying':
      return 'building';
    case 'live':
      return 'deployed';
    case 'failed':
      return 'failed';
    case 'superseded':
      return supersededByKind === 'rollback' ? 'rolled_back' : null;
  }
}
