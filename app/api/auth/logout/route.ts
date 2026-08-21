import { NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api';
import { endSession } from '@/lib/auth/session';

export const POST = apiHandler(async () => {
  await endSession();
  return NextResponse.json({ ok: true });
});
