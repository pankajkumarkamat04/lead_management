/**
 * Client-side helpers for turning API and network failures into messages
 * users can act on.
 */

export class ApiClientError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}

type ZodIssue = {
  path?: (string | number)[];
  message?: string;
};

function formatZodIssues(details: unknown): string[] {
  if (!Array.isArray(details)) return [];

  return details
    .map((issue) => {
      if (!issue || typeof issue !== 'object') return null;
      const row = issue as ZodIssue;
      const field = row.path?.length
        ? row.path.map(String).join('.')
        : 'Field';
      const message = row.message?.trim();
      if (!message) return null;
      return field === 'Field' ? message : `${field}: ${message}`;
    })
    .filter((line): line is string => Boolean(line));
}

/** Human-readable lines for validation `details` from the API. */
export function getErrorDetails(error: unknown): string[] {
  if (error instanceof ApiClientError) {
    return formatZodIssues(error.details);
  }
  return [];
}

/** Primary message plus optional validation bullet lines. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    const lines = getErrorDetails(error);
    if (lines.length > 0) {
      return `${error.message}\n${lines.map((line) => `• ${line}`).join('\n')}`;
    }
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  return 'Something went wrong. Please try again.';
}

export function isApiClientError(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError;
}

export function isUnauthorized(error: unknown): boolean {
  return isApiClientError(error) && error.status === 401;
}

export function isNetworkError(error: unknown): boolean {
  return isApiClientError(error) && error.status === 0;
}
