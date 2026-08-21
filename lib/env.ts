/**
 * Central place for reading configuration. Each getter throws on first use when
 * the variable is missing so a misconfigured deploy fails loudly instead of
 * silently signing tokens with `undefined`.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export function getMongoUri(): string {
  return required('MONGODB_URI');
}

export function getAuthSecret(): Uint8Array {
  const secret = required('AUTH_SECRET');
  if (secret.length < 32) {
    throw new Error('AUTH_SECRET must be at least 32 characters long.');
  }
  return new TextEncoder().encode(secret);
}

export const SESSION_COOKIE = 'lms_session';

/** Seven days, expressed in seconds for cookie maxAge and JWT expiry alike. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
