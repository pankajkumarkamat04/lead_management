/**
 * Opt-in debug logging for local troubleshooting.
 *
 * Enable with DEBUG=1 in `.env.local`. Client components also need
 * NEXT_PUBLIC_DEBUG=1 to log in the browser console.
 */

const SENSITIVE_KEYS =
  /^(password|passwordHash|token|authorization|apiKey|api_key|x-api-key)$/i;

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function isServerDebugEnabled(): boolean {
  return isTruthy(process.env.DEBUG);
}

export function isClientDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return isTruthy(process.env.NEXT_PUBLIC_DEBUG);
}

function redactValue(key: string, value: unknown): unknown {
  if (SENSITIVE_KEYS.test(key)) {
    if (typeof value === 'string' && value.length > 0) {
      return `${value.slice(0, 4)}…(${value.length} chars)`;
    }
    return '[redacted]';
  }

  if (Array.isArray(value)) {
    return value.map((item, index) => redactValue(String(index), item));
  }

  if (value && typeof value === 'object') {
    return redactObject(value as Record<string, unknown>);
  }

  return value;
}

export function redactObject(
  input: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    out[key] = redactValue(key, value);
  }
  return out;
}

function write(
  level: 'log' | 'warn' | 'error',
  scope: string,
  message: string,
  data?: unknown,
) {
  const prefix = `[LeadDesk:${scope}]`;
  if (data === undefined) {
    console[level](prefix, message);
    return;
  }
  console[level](prefix, message, data);
}

export function debugLog(
  scope: string,
  message: string,
  data?: unknown,
): void {
  if (!isServerDebugEnabled()) return;
  write('log', scope, message, data);
}

export function debugWarn(
  scope: string,
  message: string,
  data?: unknown,
): void {
  if (!isServerDebugEnabled()) return;
  write('warn', scope, message, data);
}

export function debugError(
  scope: string,
  message: string,
  data?: unknown,
): void {
  if (!isServerDebugEnabled()) return;
  write('error', scope, message, data);
}

export function clientDebug(
  scope: string,
  message: string,
  data?: unknown,
): void {
  if (!isClientDebugEnabled()) return;
  write('log', scope, message, data);
}
