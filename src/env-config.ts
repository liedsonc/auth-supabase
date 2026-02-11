import type { SupabaseAuthConfig } from './types';

export function getConfigFromEnv(): SupabaseAuthConfig {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'App';
  const resendApiKey = process.env.RESEND_API_KEY;
  const resendFromEmail = process.env.RESEND_FROM_EMAIL;
  const resendFromName = process.env.RESEND_FROM_NAME;

  return {
    supabaseUrl: supabaseUrl || '',
    supabaseAnonKey: supabaseAnonKey || '',
    supabaseServiceKey: supabaseServiceKey || '',
    appUrl,
    appName,
    resendApiKey,
    resendFromEmail,
    resendFromName,
  };
}

export function getConfigFromEnvOrThrow(): SupabaseAuthConfig {
  const config = getConfigFromEnv();
  const missing: string[] = [];

  if (!config.supabaseUrl) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!config.supabaseAnonKey) {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  if (!config.supabaseServiceKey) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Please configure these in your .env file.`
    );
  }

  return config;
}
