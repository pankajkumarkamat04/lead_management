/**
 * Thin wrapper around `fetch` for the dashboard's client components: sends and
 * expects JSON, and turns an error response into a thrown `Error` carrying the
 * server's message so forms can show something useful.
 */
import { clientDebug, redactObject } from './debug';
import { ApiClientError } from './errors';

function debugBody(body: RequestInit['body']): unknown {
  if (typeof body !== 'string') return body;
  try {
    const parsed = JSON.parse(body) as Record<string, unknown>;
    return redactObject(parsed);
  } catch {
    return body;
  }
}

function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  const next = encodeURIComponent(
    `${window.location.pathname}${window.location.search}`,
  );
  window.location.assign(`/login?next=${next}`);
}

export async function apiFetch<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  clientDebug('client', `${init.method ?? 'GET'} ${url}`, {
    body: debugBody(init.body),
  });

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiClientError(
      'Could not reach the server. Check your connection and try again.',
      0,
    );
  }

  const payload = await response.json().catch(() => null);

  clientDebug('client', `Response ${response.status} ${url}`, payload);

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? String((payload as { error: unknown }).error)
        : response.status >= 500
          ? 'The server encountered an error. Please try again shortly.'
          : `Request failed (${response.status}). Please try again.`;

    const details =
      payload && typeof payload === 'object' && 'details' in payload
        ? (payload as { details: unknown }).details
        : undefined;

    if (
      response.status === 401 &&
      !url.includes('/api/auth/login') &&
      typeof window !== 'undefined'
    ) {
      redirectToLogin();
    }

    throw new ApiClientError(message, response.status, details);
  }

  return payload as T;
}

export function formatDate(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Full stamp with weekday + seconds — used on lead detail for received time. */
export function formatDateTimeFull(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** Compact "3h ago" style stamp used in tables and the activity timeline. */
export function formatRelative(value: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;

  return formatDate(value);
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);
}
