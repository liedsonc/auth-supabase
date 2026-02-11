import type { AuthClient, AuthResult, AuthSession } from '@liedsonc/core-auth-kit';
import { createSupabaseClients } from './supabase-client';
import { hashPassword, verifyPassword } from './utils/password';
import { generateToken } from './utils/token';
import type { SupabaseAuthConfig } from './types';
import { getConfigFromEnvOrThrow } from './env-config';

let emailService: ReturnType<typeof import('./utils/resend-email').createResendEmailService> | null = null;

export function createSupabaseAuthAdapter(config: SupabaseAuthConfig): AuthClient {
  const { supabaseUrl, supabaseAnonKey, supabaseServiceKey } = config;
  const { supabaseAdmin } = createSupabaseClients(config);

  const APP_URL = config.appUrl || 'http://localhost:3000';
  const APP_NAME = config.appName || 'App';
  const RESEND_API_KEY = config.resendApiKey;
  const RESEND_FROM_EMAIL = config.resendFromEmail || 'noreply@example.com';
  const RESEND_FROM_NAME = config.resendFromName;

  if (RESEND_API_KEY) {
    const { createResendEmailService } = require('./utils/resend-email');
    emailService = createResendEmailService({
      apiKey: RESEND_API_KEY,
      from: RESEND_FROM_EMAIL,
      fromName: RESEND_FROM_NAME,
      appName: APP_NAME,
    });
  }

  return {
    async login(email: string, password: string): Promise<AuthResult> {
      try {
        const { data: user, error } = await supabaseAdmin
          .from('users')
          .select('id, email, password_hash, email_verified')
          .eq('email', email.toLowerCase().trim())
          .single();

        if (error || !user) {
          return {
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password',
            },
          };
        }

        const isValidPassword = await verifyPassword(password, user.password_hash);

        if (!isValidPassword) {
          return {
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Invalid email or password',
            },
          };
        }

        return {
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              emailVerified: user.email_verified,
            },
          },
        };
      } catch (error) {
        console.error('Login error:', error);
        return {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An error occurred during login',
          },
        };
      }
    },

    async register(email: string, password: string): Promise<AuthResult> {
      try {
        const normalizedEmail = email.toLowerCase().trim();

        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', normalizedEmail)
          .single();

        if (existingUser) {
          return {
            success: false,
            error: {
              code: 'DUPLICATE_EMAIL',
              message: 'An account with this email already exists',
            },
          };
        }

        const passwordHash = await hashPassword(password);
        const verificationToken = generateToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        const { data: newUser, error: userError } = await supabaseAdmin
          .from('users')
          .insert({
            email: normalizedEmail,
            password_hash: passwordHash,
            email_verified: false,
          })
          .select('id')
          .single();

        if (userError || !newUser) {
          return {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Failed to create account',
            },
          };
        }

        const { error: tokenError } = await supabaseAdmin
          .from('verification_tokens')
          .insert({
            user_id: newUser.id,
            token: verificationToken,
            expires_at: expiresAt.toISOString(),
          });

        if (tokenError) {
          console.error('Failed to create verification token:', tokenError);
        }

        if (emailService) {
          try {
            await emailService.sendVerificationEmail(normalizedEmail, verificationToken, APP_URL);
          } catch (emailError) {
            console.error('Failed to send verification email:', emailError);
          }
        }

        return {
          success: true,
          data: {
            user: {
              id: newUser.id,
              email: normalizedEmail,
              emailVerified: false,
            },
          },
        };
      } catch (error) {
        console.error('Register error:', error);
        return {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An error occurred during registration',
          },
        };
      }
    },

    async logout(): Promise<void> {
    },

    async forgotPassword(email: string): Promise<AuthResult> {
      try {
        const normalizedEmail = email.toLowerCase().trim();

        const { data: user } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', normalizedEmail)
          .single();

        if (!user) {
          return {
            success: true,
          };
        }

        const resetToken = generateToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1);

        await supabaseAdmin
          .from('password_reset_tokens')
          .insert({
            user_id: user.id,
            token: resetToken,
            expires_at: expiresAt.toISOString(),
            used: false,
          });

        if (emailService) {
          try {
            await emailService.sendPasswordResetEmail(normalizedEmail, resetToken, APP_URL);
          } catch (emailError) {
            console.error('Failed to send password reset email:', emailError);
          }
        }

        return {
          success: true,
        };
      } catch (error) {
        console.error('Forgot password error:', error);
        return {
          success: true,
        };
      }
    },

    async resetPassword(token: string, newPassword: string): Promise<AuthResult> {
      try {
        const { data: resetTokenData, error: tokenError } = await supabaseAdmin
          .from('password_reset_tokens')
          .select('id, user_id, expires_at, used')
          .eq('token', token)
          .single();

        if (tokenError || !resetTokenData) {
          return {
            success: false,
            error: {
              code: 'INVALID_TOKEN',
              message: 'Invalid or expired reset token',
            },
          };
        }

        if (resetTokenData.used) {
          return {
            success: false,
            error: {
              code: 'INVALID_TOKEN',
              message: 'This reset token has already been used',
            },
          };
        }

        const expiresAt = new Date(resetTokenData.expires_at);
        if (expiresAt < new Date()) {
          return {
            success: false,
            error: {
              code: 'EXPIRED',
              message: 'This reset token has expired',
            },
          };
        }

        const passwordHash = await hashPassword(newPassword);

        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ password_hash: passwordHash })
          .eq('id', resetTokenData.user_id);

        if (updateError) {
          return {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Failed to update password',
            },
          };
        }

        await supabaseAdmin
          .from('password_reset_tokens')
          .update({ used: true })
          .eq('id', resetTokenData.id);

        return {
          success: true,
        };
      } catch (error) {
        console.error('Reset password error:', error);
        return {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An error occurred during password reset',
          },
        };
      }
    },

    async verifyEmail(token: string): Promise<AuthResult> {
      try {
        const { data: verificationTokenData, error: tokenError } = await supabaseAdmin
          .from('verification_tokens')
          .select('id, user_id, expires_at')
          .eq('token', token)
          .single();

        if (tokenError || !verificationTokenData) {
          return {
            success: false,
            error: {
              code: 'INVALID_TOKEN',
              message: 'Invalid or expired verification token',
            },
          };
        }

        const expiresAt = new Date(verificationTokenData.expires_at);
        if (expiresAt < new Date()) {
          await supabaseAdmin
            .from('verification_tokens')
            .delete()
            .eq('id', verificationTokenData.id);

          return {
            success: false,
            error: {
              code: 'EXPIRED',
              message: 'This verification token has expired',
            },
          };
        }

        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ email_verified: true })
          .eq('id', verificationTokenData.user_id);

        if (updateError) {
          return {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: 'Failed to verify email',
            },
          };
        }

        await supabaseAdmin
          .from('verification_tokens')
          .delete()
          .eq('id', verificationTokenData.id);

        return {
          success: true,
        };
      } catch (error) {
        console.error('Verify email error:', error);
        return {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An error occurred during email verification',
          },
        };
      }
    },

    async getSession(): Promise<AuthSession | null> {
      return null;
    },
  };
}

export function getSupabaseAuthClient(): AuthClient {
  const config = getConfigFromEnvOrThrow();
  return createSupabaseAuthAdapter(config);
}
