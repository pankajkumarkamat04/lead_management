import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, apiHandler, parseBody } from '@/lib/api';
import { hashPassword } from '@/lib/auth/password';
import { requireAdmin } from '@/lib/auth/session';
import { ROLES } from '@/lib/constants';
import { Lead } from '@/lib/models/Lead';
import { User } from '@/lib/models/User';
import { serializeUser } from '@/lib/serialize';

export const GET = apiHandler(async () => {
  await requireAdmin();

  const users = await User.find({})
    .select('-passwordHash')
    .sort({ role: 1, name: 1 })
    .lean();

  // Open-lead counts make it obvious who has capacity before assigning more.
  const workload = await Lead.aggregate<{ _id: unknown; count: number }>([
    { $match: { assignedTo: { $ne: null }, status: { $nin: ['won', 'lost'] } } },
    { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
  ]);

  const counts = new Map(workload.map((row) => [String(row._id), row.count]));

  const data = users.map((user) => ({
    ...serializeUser(user),
    openLeads: counts.get(String(user._id)) ?? 0,
  }));

  return NextResponse.json({ data });
});

const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(120),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(8, 'Use at least 8 characters.').max(200),
  role: z.enum(ROLES).default('agent'),
});

export const POST = apiHandler(async (request) => {
  await requireAdmin();
  const input = await parseBody(request, createUserSchema);

  const email = input.email.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'Someone already uses that email address.');
  }

  const user = await User.create({
    name: input.name,
    email,
    passwordHash: await hashPassword(input.password),
    role: input.role,
  });

  return NextResponse.json(
    { user: serializeUser(user.toObject()) },
    { status: 201 },
  );
});
