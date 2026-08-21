import { cookies } from 'next/headers';
import { ApiError } from '../api';
import { connectToDatabase } from '../db';
import { SESSION_COOKIE, SESSION_MAX_AGE } from '../env';
import { User, type IUser } from '../models/User';
import { signSession, verifySession, type SessionPayload } from './jwt';

export async function startSession(payload: SessionPayload): Promise<void> {
  const token = await signSession(payload);
  const store = await cookies();

  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

/**
 * Reads the user fresh from the database rather than trusting the token body,
 * so a deactivated account or a role change takes effect on the next request
 * instead of when the token happens to expire.
 */
export async function getCurrentUser(): Promise<IUser | null> {
  const session = await getSession();
  if (!session) return null;

  await connectToDatabase();
  const user = await User.findById(session.userId).lean<IUser | null>();

  if (!user || !user.isActive) return null;
  return user;
}

export async function requireUser(): Promise<IUser> {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, 'You must be signed in.');
  return user;
}

export async function requireAdmin(): Promise<IUser> {
  const user = await requireUser();
  if (user.role !== 'admin') {
    throw new ApiError(403, 'This action requires an administrator account.');
  }
  return user;
}
