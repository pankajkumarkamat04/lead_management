import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, apiHandler, parseBody } from '@/lib/api';
import { hashPassword } from '@/lib/auth/password';
import { requireAdmin } from '@/lib/auth/session';
import { ROLES } from '@/lib/constants';
import { isValidObjectId } from '@/lib/leads';
import { Lead } from '@/lib/models/Lead';
import { Site } from '@/lib/models/Site';
import { User } from '@/lib/models/User';
import { serializeUser } from '@/lib/serialize';

type Context = RouteContext<'/api/users/[id]'>;

const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8, 'Use at least 8 characters.').max(200).optional(),
});

export const PATCH = apiHandler(async (request, context: Context) => {
  const admin = await requireAdmin();
  const { id } = await context.params;
  if (!isValidObjectId(id)) throw new ApiError(404, 'User not found.');

  const input = await parseBody(request, updateUserSchema);
  const isSelf = String(admin._id) === id;

  // Without these two guards an administrator could remove their own access and
  // leave the dashboard with no way back in.
  if (isSelf && input.role && input.role !== 'admin') {
    throw new ApiError(400, 'You cannot remove your own administrator role.');
  }
  if (isSelf && input.isActive === false) {
    throw new ApiError(400, 'You cannot deactivate your own account.');
  }

  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found.');

  if (input.role && user.role === 'admin' && input.role !== 'admin') {
    const adminCount = await User.countDocuments({
      role: 'admin',
      isActive: true,
    });
    if (adminCount <= 1) {
      throw new ApiError(400, 'Keep at least one active administrator.');
    }
  }

  if (input.name !== undefined) user.name = input.name;
  if (input.role !== undefined) user.role = input.role;
  if (input.isActive !== undefined) user.isActive = input.isActive;
  if (input.password) user.passwordHash = await hashPassword(input.password);

  await user.save();

  return NextResponse.json({ user: serializeUser(user.toObject()) });
});

export const DELETE = apiHandler(async (_request, context: Context) => {
  const admin = await requireAdmin();
  const { id } = await context.params;
  if (!isValidObjectId(id)) throw new ApiError(404, 'User not found.');

  if (String(admin._id) === id) {
    throw new ApiError(400, 'You cannot delete your own account.');
  }

  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found.');

  if (user.role === 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      throw new ApiError(400, 'Keep at least one administrator account.');
    }
  }

  // Return their leads to the unassigned queue rather than losing them.
  await Lead.updateMany(
    { assignedTo: user._id },
    {
      $set: { assignedTo: null, assignedAt: null },
      $push: {
        activities: {
          type: 'assign',
          message: `Unassigned automatically when ${user.name}'s account was removed.`,
          actor: admin._id,
          createdAt: new Date(),
        },
      },
    },
  );

  await Site.updateMany(
    { defaultAssignee: user._id },
    { $set: { defaultAssignee: null } },
  );

  await user.deleteOne();

  return NextResponse.json({ ok: true });
});
