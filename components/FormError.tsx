'use client';

import { getErrorDetails, getErrorMessage } from '@/lib/errors';
import { Alert } from './ui';

/** Renders API / validation / network errors with optional field-level bullets. */
export function FormError({ error }: { error: string | null }) {
  if (!error) return null;

  const lines = error
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const headline = lines[0] ?? 'Something went wrong. Please try again.';
  const details = lines
    .slice(1)
    .map((line) => line.replace(/^•\s*/, '').trim())
    .filter(Boolean);

  return (
    <Alert>
      <p>{headline}</p>
      {details.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs">
          {details.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </Alert>
  );
}

/** Store a caught value as a display-ready error string. */
export function captureError(error: unknown): string {
  return getErrorMessage(error);
}
