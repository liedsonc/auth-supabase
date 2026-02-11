import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseAuthConfig } from './types';

export function createSupabaseClients(config: SupabaseAuthConfig) {
  const { supabaseUrl, supabaseAnonKey, supabaseServiceKey } = config;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing required Supabase configuration: supabaseUrl and supabaseAnonKey are required'
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : supabase;

  return {
    supabase,
    supabaseAdmin,
  };
}

export type { SupabaseClient };
