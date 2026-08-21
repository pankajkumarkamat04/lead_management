import { NextResponse, type NextRequest } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import { connectToDatabase } from './db';

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function jsonError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Validation failed', details: error.issues },
      { status: 422 },
    );
  }

  // Duplicate key on a unique index (email, apiKey).
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === 11000
  ) {
    return NextResponse.json(
      { error: 'That record already exists.' },
      { status: 409 },
    );
  }

  console.error('[api] Unhandled error:', error);
  return NextResponse.json(
    { error: 'Something went wrong. Please try again.' },
    { status: 500 },
  );
}

/**
 * Wraps a route handler so every route gets a live database connection and a
 * consistent JSON error shape without repeating try/catch in each file.
 */
export function apiHandler<A extends unknown[]>(
  handler: (request: NextRequest, ...args: A) => Promise<Response>,
) {
  return async (request: NextRequest, ...args: A): Promise<Response> => {
    try {
      await connectToDatabase();
      return await handler(request, ...args);
    } catch (error) {
      return jsonError(error);
    }
  };
}

export async function parseBody<T>(
  request: NextRequest,
  schema: ZodType<T>,
): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError(400, 'Request body must be valid JSON.');
  }
  return schema.parse(raw);
}
