import crypto from 'crypto';

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}
