import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { SupabaseAuthPort } from './supabase-auth-client';

/**
 * The single Supabase client for the admin panel.
 *
 * Created with the publishable (anon) key only. Session handling:
 *   * persistSession keeps the admin signed in across reloads;
 *   * autoRefreshToken renews the access token before it expires;
 *   * detectSessionInUrl completes invite and password-reset links;
 *   * PKCE is used for those links, so no token is left in the URL fragment.
 *
 * The session lives in this origin's localStorage under its own key. The admin
 * is served from its own origin with no third-party scripts, so nothing else
 * can read it; the database still re-checks every request against RLS.
 */

let client: SupabaseClient | null = null;

export function getSupabaseClient(url: string, publishableKey: string): SupabaseClient {
  client ??= createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: 'bipinkr-admin-auth',
    },
  });
  return client;
}

/**
 * The client as the narrow port the auth adapter needs. The Supabase types are
 * far wider than the handful of calls used, so this is the one place the two
 * are tied together.
 */
export const asAuthPort = (supabase: SupabaseClient): SupabaseAuthPort => supabase as unknown as SupabaseAuthPort;
