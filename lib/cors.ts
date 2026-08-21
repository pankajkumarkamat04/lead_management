/**
 * The ingestion endpoint is called straight from browsers on customer sites, so
 * every response needs CORS headers — including the error responses, otherwise
 * the browser hides the real status behind an opaque network error.
 */
export function corsHeaders(origin: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

/** Compares an `Origin` header against a site's allowlist. */
export function isOriginAllowed(
  origin: string | null,
  allowed: string[],
): boolean {
  // An empty allowlist means the API key alone controls access, which is the
  // default because marketing pages are often served from several hostnames.
  if (!allowed.length) return true;
  if (!origin) return true; // Server-to-server calls send no Origin header.

  let host: string;
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }

  return allowed.some((entry) => {
    const cleaned = entry
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/+$/, '');
    if (!cleaned) return false;
    return host === cleaned || host.endsWith(`.${cleaned}`);
  });
}
