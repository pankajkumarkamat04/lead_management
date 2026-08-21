import { SignJWT, jwtVerify } from 'jose';
import { getAuthSecret, SESSION_MAX_AGE } from '../env';
import type { Role } from '../constants';

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

/**
 * Kept free of any database or Node-only import so the route guard in `proxy.ts`
 * can verify sessions on the Edge runtime.
 */
export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getAuthSecret());
}

export async function verifySession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getAuthSecret(), {
      algorithms: ['HS256'],
    });

    if (!payload.sub) return null;

    return {
      userId: payload.sub,
      email: String(payload.email ?? ''),
      name: String(payload.name ?? ''),
      role: payload.role === 'admin' ? 'admin' : 'agent',
    };
  } catch {
    // Expired, tampered with, or signed by a rotated secret.
    return null;
  }
}
