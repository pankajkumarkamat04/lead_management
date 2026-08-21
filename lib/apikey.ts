import { randomBytes } from 'node:crypto';

/**
 * Keys are prefixed so they are recognisable in logs and support tickets, and
 * long enough that guessing one is not feasible.
 */
export function generateApiKey(): string {
  return `lms_${randomBytes(24).toString('hex')}`;
}
