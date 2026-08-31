import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { debugLog, isServerDebugEnabled } from '@/lib/debug';
import { getAppUrl, getLeadsApiUrl } from '@/lib/env';

/**
 * Lightweight health/config check — only available when DEBUG=1.
 * Never exposes secrets; useful when wiring marketing sites to the intake API.
 */
export async function GET() {
  if (!isServerDebugEnabled()) {
    return NextResponse.json({ error: 'Debug mode is disabled.' }, { status: 404 });
  }

  let db = 'disconnected';
  try {
    await connectToDatabase();
    db = 'connected';
  } catch (error) {
    debugLog('debug/ping', 'Database connection failed', error);
    db = 'error';
  }

  const payload = {
    ok: true,
    time: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV ?? 'unknown',
    db,
    appUrl: getAppUrl(),
    leadsApiUrl: getLeadsApiUrl(),
    hasMongoUri: Boolean(process.env.MONGODB_URI),
    hasAuthSecret: Boolean(process.env.AUTH_SECRET),
  };

  debugLog('debug/ping', 'Health check', payload);
  return NextResponse.json(payload);
}
