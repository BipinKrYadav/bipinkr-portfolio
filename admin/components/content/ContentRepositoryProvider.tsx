'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { useAuth, useBackendConnection } from '@admin/components/auth/AuthProvider';
import { readAuthConfig } from '@admin/lib/auth/config';
import { createContentPostgrestGateway } from '@admin/lib/content/postgrest-gateway';
import { createContentRepository, type ContentRepository } from '@admin/lib/content/repository';

export type ContentRepositoryState =
  | { status: 'loading' }
  | { status: 'unavailable'; reason: string }
  | { status: 'ready'; repository: ContentRepository };

const ContentRepositoryContext = createContext<ContentRepositoryState | null>(null);

/**
 * Supplies the read-only content repository, gated exactly like the metrics
 * repository: it exists only for an authenticated admin session with valid
 * Supabase settings. In every other state the screens get `unavailable` with
 * the reason, and no request is ever made. It reuses the existing auth client
 * for the access token; it does not create another Supabase client.
 */
export function ContentRepositoryProvider({ children }: { children: ReactNode }) {
  const { state: auth, client } = useAuth();
  const connection = useBackendConnection();
  const unavailableReason = connection.status === 'unavailable' ? connection.reason : null;

  const value = useMemo<ContentRepositoryState>(() => {
    if (auth.status === 'loading') return { status: 'loading' };
    if (auth.status !== 'authenticated') {
      return { status: 'unavailable', reason: unavailableReason ?? 'Not signed in.' };
    }
    const config = readAuthConfig();
    if (config.status !== 'configured') {
      return { status: 'unavailable', reason: 'Supabase settings are missing or invalid.' };
    }
    const gateway = createContentPostgrestGateway({
      url: config.url,
      publishableKey: config.publishableKey,
      getAccessToken: () => client.getAccessToken(),
    });
    return { status: 'ready', repository: createContentRepository(gateway) };
  }, [auth.status, client, unavailableReason]);

  return <ContentRepositoryContext.Provider value={value}>{children}</ContentRepositoryContext.Provider>;
}

export function useContentRepository(): ContentRepositoryState {
  const value = useContext(ContentRepositoryContext);
  if (!value) throw new Error('useContentRepository must be used inside <ContentRepositoryProvider>');
  return value;
}
