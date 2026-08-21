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

/**
 * Turns `https://leads.example.com/`, `leads.example.com`, or
 * `http://localhost:3000` into a clean origin with no trailing slash.
 * Bare domains default to https.
 */
export function normalizePublicUrl(value: string): string {
  let url = value.trim().replace(/\/+$/, '');
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

/**
 * Public base URL of this dashboard.
 *
 * Set either in `.env.local`:
 * - `APP_URL=https://leads.example.com`  (preferred)
 * - `DOMAIN=leads.example.com`           (same thing; https assumed)
 *
 * Used to build the lead intake URL shown in the Integration page and docs.
 * Pass `fallback` (usually the current request origin) when the env var is unset.
 */
export function getAppUrl(fallback = ''): string {
  const raw =
    process.env.APP_URL?.trim() ||
    process.env.DOMAIN?.trim() ||
    fallback;
  return normalizePublicUrl(raw);
}

/** Full public lead intake endpoint: `{APP_URL}/api/v1/leads`. */
export function getLeadsApiUrl(fallbackBase = ''): string {
  const base = getAppUrl(fallbackBase);
  return base ? `${base}/api/v1/leads` : '/api/v1/leads';
}

export const SESSION_COOKIE = 'lms_session';

/** Seven days, expressed in seconds for cookie maxAge and JWT expiry alike. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
