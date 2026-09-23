'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { useAuth, useBackendConnection } from '@admin/components/auth/AuthProvider';
import { readAuthConfig } from '@admin/lib/auth/config';
import { createPostgrestGateway } from '@admin/lib/metrics/postgrest-gateway';
import { createMetricsRepository, type MetricsRepository } from '@admin/lib/metrics/repository';
import type { PublishedBaselineIndex } from '@admin/lib/metrics/published-baseline';
import type { SnapshotReferenceIndex } from '@admin/lib/metrics/snapshot-references';

export type RepositoryState =
  | { status: 'loading' }
  | { status: 'unavailable'; reason: string }
  | { status: 'ready'; repository: MetricsRepository };

const RepositoryContext = createContext<RepositoryState | null>(null);

/**
 * Supplies the metrics repository. It exists only for an authenticated admin
 * session with valid Supabase settings; in every other state the screens get
 * `unavailable` with the reason, and no request is ever made.
 */
export function MetricsRepositoryProvider({
  children,
  snapshotReferences,
  publishedBaseline,
}: {
  children: ReactNode;
  /** Build-time index of metric uses in the published snapshot (lib/snapshot-catalog.ts). */
  snapshotReferences: SnapshotReferenceIndex;
  /** Build-time fingerprints of the published metrics (lib/snapshot-catalog.ts). */
  publishedBaseline: PublishedBaselineIndex;
}) {
  const { state: auth, client } = useAuth();
  const connection = useBackendConnection();
  const unavailableReason = connection.status === 'unavailable' ? connection.reason : null;

  // Recreated only when the session state changes, so screens do not refetch on every render.
  const value = useMemo<RepositoryState>(() => {
    if (auth.status === 'loading') return { status: 'loading' };
    if (auth.status !== 'authenticated') {
      return { status: 'unavailable', reason: unavailableReason ?? 'Not signed in.' };
    }
    const config = readAuthConfig();
    if (config.status !== 'configured') {
      return { status: 'unavailable', reason: 'Supabase settings are missing or invalid.' };
    }
    const gateway = createPostgrestGateway({
      url: config.url,
      publishableKey: config.publishableKey,
      getAccessToken: () => client.getAccessToken(),
    });
    return { status: 'ready', repository: createMetricsRepository(gateway, snapshotReferences, publishedBaseline) };
  }, [auth.status, client, unavailableReason, snapshotReferences, publishedBaseline]);

  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>;
}

export function useMetricsRepository(): RepositoryState {
  const value = useContext(RepositoryContext);
  if (!value) throw new Error('useMetricsRepository must be used inside <MetricsRepositoryProvider>');
  return value;
}
