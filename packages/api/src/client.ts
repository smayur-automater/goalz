import { createClient, type SupabaseClient, type SupportedStorage } from '@supabase/supabase-js';

export type GoalzClient = SupabaseClient;

export interface GoalzClientOptions {
  url: string;
  /** The public anon key. Safe in the client: Row Level Security protects the data. */
  anonKey: string;
  /**
   * Where the session is kept. Native apps must pass encrypted storage (Expo SecureStore
   * via a large-value adapter). Web defaults to localStorage.
   */
  storage?: SupportedStorage;
  /** Web only: pick up the session from the URL after a magic-link or OAuth redirect. */
  detectSessionInUrl?: boolean;
}

export function createGoalzClient({
  url,
  anonKey,
  storage,
  detectSessionInUrl = false,
}: GoalzClientOptions): GoalzClient {
  if (!url || !anonKey) {
    throw new Error('Missing Supabase URL or anon key. Copy .env.example to .env.local.');
  }
  return createClient(url, anonKey, {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl,
      // PKCE: the redirect carries a one-time code, never the tokens themselves.
      flowType: 'pkce',
    },
  });
}
