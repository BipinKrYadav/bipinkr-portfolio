'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { useAuth, useBackendConnection } from '@admin/components/auth/AuthProvider';
import { readAuthConfig } from '@admin/lib/auth/config';
import { createReleasesPostgrestGateway } from '@admin/lib/releases/postgrest-gateway';
import { createReleasesRepository, type ReleasesRepository } from '@admin/lib/releases/repository';

export type ReleasesRepositoryState =
  | { status: 'loading' }
  | { status: 'unavailable'; reason: string }
  | { status: 'ready'; repository: ReleasesRepository };

const ReleasesRepositoryContext = createContext<ReleasesRepositoryState | null>(null);

/**
 * Supplies the releases repository, gated like the metrics and content
 * repositories: it exists only for an authenticated admin session with valid
 * Supabase settings, and in every other state no request is ever made. It
 * reuses the existing auth client for the access token.
 */
export function ReleasesRepositoryProvider({ children }: { children: ReactNode }) {
  const { state: auth, client } = useAuth();
  const connection = useBackendConnection();
  const unavailableReason = connection.status === 'unavailable' ? connection.reason : null;

  const value = useMemo<ReleasesRepositoryState>(() => {
    if (auth.status === 'loading') return { status: 'loading' };
    if (auth.status !== 'authenticated') {
      return { status: 'unavailable', reason: unavailableReason ?? 'Not signed in.' };
    }
    const config = readAuthConfig();
    if (config.status !== 'configured') {
      return { status: 'unavailable', reason: 'Supabase settings are missing or invalid.' };
    }
    const gateway = createReleasesPostgrestGateway({
      url: config.url,
      publishableKey: config.publishableKey,
      getAccessToken: () => client.getAccessToken(),
    });
    return { status: 'ready', repository: createReleasesRepository(gateway) };
  }, [auth.status, client, unavailableReason]);

  return <ReleasesRepositoryContext.Provider value={value}>{children}</ReleasesRepositoryContext.Provider>;
}

export function useReleasesRepository(): ReleasesRepositoryState {
  const value = useContext(ReleasesRepositoryContext);
  if (!value) throw new Error('useReleasesRepository must be used inside <ReleasesRepositoryProvider>');
  return value;
}
