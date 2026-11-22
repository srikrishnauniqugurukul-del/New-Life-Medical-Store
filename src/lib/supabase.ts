import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Browser-safe Supabase client.
 * Uses ONLY the publishable (anon) key. Never uses or references SUPABASE_SECRET_KEY.
 */
let cachedClient: SupabaseClient | null = null;

export function getBrowserSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  if (!url || !publishableKey) {
    return null;
  }

  cachedClient = createClient(url, publishableKey, {
    auth: {
      persistSession: false, // Keep tokens in memory; server verifies Bearer JWT
      autoRefreshToken: true,
    },
  });

  return cachedClient;
}
