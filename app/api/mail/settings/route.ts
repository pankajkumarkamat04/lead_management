import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, apiHandler, parseBody } from '@/lib/api';
import { requireAdmin, requireUser } from '@/lib/auth/session';
import {
  getMailSettingsDoc,
  verifySmtpConnection,
} from '@/lib/mail';
import { serializeMailSettings } from '@/lib/serialize';

export const GET = apiHandler(async () => {
  // Agents need to know whether mail is ready before composing.
  await requireUser();
  const settings = await getMailSettingsDoc();
  return NextResponse.json({ settings: serializeMailSettings(settings) });
});

const updateSchema = z.object({
  enabled: z.boolean().optional(),
  host: z.string().trim().max(200).optional(),
  port: z.number().int().min(1).max(65535).optional(),
  secure: z.boolean().optional(),
  username: z.string().trim().max(200).optional(),
  /** Empty string keeps the current password; omit to leave unchanged. */
  password: z.string().max(500).optional(),
  fromName: z.string().trim().max(120).optional(),
  fromEmail: z.string().trim().email().or(z.literal('')).optional(),
  replyTo: z.string().trim().email().or(z.literal('')).optional(),
});

export const PUT = apiHandler(async (request) => {
  await requireAdmin();
  const input = await parseBody(request, updateSchema);
  const settings = await getMailSettingsDoc();

  if (input.enabled !== undefined) settings.enabled = input.enabled;
  if (input.host !== undefined) settings.host = input.host;
  if (input.port !== undefined) settings.port = input.port;
  if (input.secure !== undefined) settings.secure = input.secure;
  if (input.username !== undefined) settings.username = input.username;
  if (input.password !== undefined && input.password !== '') {
    settings.password = input.password;
  }
  if (input.fromName !== undefined) settings.fromName = input.fromName;
  if (input.fromEmail !== undefined) settings.fromEmail = input.fromEmail;
  if (input.replyTo !== undefined) settings.replyTo = input.replyTo;

  await settings.save();

  return NextResponse.json({ settings: serializeMailSettings(settings) });
});

export const POST = apiHandler(async (request) => {
  await requireAdmin();
  const body = await request.json().catch(() => ({}));
  const action = (body as { action?: string }).action;

  if (action !== 'test') {
    throw new ApiError(400, 'Unsupported action.');
  }

  const settings = await getMailSettingsDoc();

  try {
    await verifySmtpConnection(settings);
    settings.lastTestedAt = new Date();
    settings.lastTestOk = true;
    settings.lastTestError = '';
    await settings.save();
    return NextResponse.json({
      ok: true,
      settings: serializeMailSettings(settings),
    });
  } catch (error) {
    settings.lastTestedAt = new Date();
    settings.lastTestOk = false;
    settings.lastTestError =
      error instanceof Error ? error.message : 'Connection test failed.';
    await settings.save();
    throw new ApiError(400, settings.lastTestError);
  }
});
