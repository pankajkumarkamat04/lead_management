import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';
import { ApiError, apiHandler, parseBody } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { LEAD_STATUSES } from '@/lib/constants';
import { buildLeadFilter } from '@/lib/leads';
import { Lead } from '@/lib/models/Lead';
import { Site } from '@/lib/models/Site';
import { serializeLead } from '@/lib/serialize';
import type { LeadDTO, Paginated } from '@/lib/types';

const MAX_PAGE_SIZE = 100;

export const GET = apiHandler(async (request) => {
  const user = await requireUser();
  const params = request.nextUrl.searchParams;

  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(params.get('pageSize') ?? 25) || 25),
  );

  const filter = buildLeadFilter(params, user);

  const [rows, total] = await Promise.all([
    Lead.find(filter)
      .select('-activities')
      .populate('site', 'name domain')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    Lead.countDocuments(filter),
  ]);

  const payload: Paginated<LeadDTO> = {
    data: rows.map(serializeLead),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };

  return NextResponse.json(payload);
});

const createLeadSchema = z.object({
  site: z.string().min(1, 'Choose a site.'),
  name: z.string().trim().min(1, 'Name is required.').max(200),
  email: z.string().trim().email('Enter a valid email.').or(z.literal('')).optional(),
  phone: z.string().trim().max(50).optional(),
  company: z.string().trim().max(200).optional(),
  message: z.string().trim().max(5000).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  assignedTo: z.string().nullable().optional(),
  value: z.number().min(0).optional(),
  tags: z.array(z.string().trim()).optional(),
});

export const POST = apiHandler(async (request) => {
  const user = await requireUser();
  const input = await parseBody(request, createLeadSchema);

  if (!Types.ObjectId.isValid(input.site)) {
    throw new ApiError(400, 'Choose a valid site.');
  }

  const site = await Site.findById(input.site).select('_id');
  if (!site) throw new ApiError(404, 'That site no longer exists.');

  // An agent creating a lead by hand always owns it; only admins may hand a
  // lead to someone else at creation time.
  const assignedTo =
    user.role === 'admin'
      ? input.assignedTo && Types.ObjectId.isValid(input.assignedTo)
        ? new Types.ObjectId(input.assignedTo)
        : null
      : user._id;

  const lead = await Lead.create({
    site: site._id,
    name: input.name,
    email: input.email ?? '',
    phone: input.phone ?? '',
    company: input.company ?? '',
    message: input.message ?? '',
    status: input.status ?? 'new',
    assignedTo,
    assignedAt: assignedTo ? new Date() : null,
    value: input.value ?? 0,
    tags: input.tags ?? [],
    meta: { source: 'manual' },
    activities: [
      {
        type: 'created',
        message: `Lead added manually by ${user.name}.`,
        actor: user._id,
        createdAt: new Date(),
      },
    ],
  });

  await Site.updateOne(
    { _id: site._id },
    { $inc: { leadCount: 1 }, $set: { lastLeadAt: new Date() } },
  );

  await lead.populate([
    { path: 'site', select: 'name domain' },
    { path: 'assignedTo', select: 'name email' },
  ]);

  return NextResponse.json(
    { lead: serializeLead(lead.toObject()) },
    { status: 201 },
  );
});
