export interface SupabaseAuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
  appUrl?: string;
  appName?: string;
  resendApiKey?: string;
  resendFromEmail?: string;
  resendFromName?: string;
}

export interface SupabaseUser {
  id: string;
  email: string;
  email_verified: boolean;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface SupabaseVerificationToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface SupabasePasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

export interface SupabaseSession {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
}
