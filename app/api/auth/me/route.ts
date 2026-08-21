import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { serializeUser } from '@/lib/serialize';

export const GET = apiHandler(async () => {
  const user = await requireUser();
  return NextResponse.json({ user: serializeUser(user) });
});
