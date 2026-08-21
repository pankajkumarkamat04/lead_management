import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';
import { ApiError, apiHandler, parseBody } from '@/lib/api';
import { requireAdmin, requireUser } from '@/lib/auth/session';
import { generateApiKey } from '@/lib/apikey';
import { Site } from '@/lib/models/Site';
import { serializeSite } from '@/lib/serialize';

export const GET = apiHandler(async () => {
  // Agents need site names to read and filter their leads, but the API key is
  // an administrator secret, so it is stripped from their copy of the list.
  const user = await requireUser();

  const sites = await Site.find({})
    .populate('defaultAssignee', 'name email')
    .sort({ name: 1 })
    .lean();

  const data = sites.map(serializeSite).map((site) =>
    user.role === 'admin' ? site : { ...site, apiKey: '' },
  );

  return NextResponse.json({ data });
});

const createSiteSchema = z.object({
  name: z.string().trim().min(1, 'Give the site a name.').max(120),
  domain: z.string().trim().min(1, 'Add the site domain.').max(200),
  allowedOrigins: z.array(z.string().trim()).optional(),
  defaultAssignee: z.string().nullable().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const POST = apiHandler(async (request) => {
  await requireAdmin();
  const input = await parseBody(request, createSiteSchema);

  const defaultAssignee =
    input.defaultAssignee && Types.ObjectId.isValid(input.defaultAssignee)
      ? new Types.ObjectId(input.defaultAssignee)
      : null;

  const domain = input.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');

  const existing = await Site.findOne({ domain: domain.toLowerCase() });
  if (existing) {
    throw new ApiError(409, 'A site with that domain already exists.');
  }

  const site = await Site.create({
    name: input.name,
    domain,
    apiKey: generateApiKey(),
    allowedOrigins: input.allowedOrigins ?? [],
    defaultAssignee,
    notes: input.notes ?? '',
  });

  await site.populate('defaultAssignee', 'name email');

  return NextResponse.json(
    { site: serializeSite(site.toObject()) },
    { status: 201 },
  );
});
