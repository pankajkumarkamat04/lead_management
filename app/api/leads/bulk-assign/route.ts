import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';
import { ApiError, apiHandler, parseBody } from '@/lib/api';
import { requireAdmin } from '@/lib/auth/session';
import { isValidObjectId } from '@/lib/leads';
import { Lead } from '@/lib/models/Lead';
import { User } from '@/lib/models/User';

const bulkAssignSchema = z.object({
  leadIds: z.array(z.string()).min(1, 'Select at least one lead.'),
  /** `null` returns the selected leads to the unassigned queue. */
  assignedTo: z.string().nullable(),
});

export const POST = apiHandler(async (request) => {
  const admin = await requireAdmin();
  const { leadIds, assignedTo } = await parseBody(request, bulkAssignSchema);

  const ids = leadIds.filter(isValidObjectId).map((id) => new Types.ObjectId(id));
  if (!ids.length) throw new ApiError(400, 'Select at least one valid lead.');

  const now = new Date();

  if (assignedTo === null || assignedTo === '') {
    const result = await Lead.updateMany(
      { _id: { $in: ids } },
      {
        $set: { assignedTo: null, assignedAt: null },
        $push: {
          activities: {
            type: 'assign',
            message: 'Lead moved back to the unassigned queue.',
            actor: admin._id,
            createdAt: now,
          },
        },
      },
    );
    return NextResponse.json({ updated: result.modifiedCount });
  }

  if (!Types.ObjectId.isValid(assignedTo)) {
    throw new ApiError(400, 'Choose a valid team member.');
  }

  const assignee = await User.findById(assignedTo).select('name isActive');
  if (!assignee || !assignee.isActive) {
    throw new ApiError(404, 'That team member is not available.');
  }

  const result = await Lead.updateMany(
    { _id: { $in: ids } },
    {
      $set: { assignedTo: assignee._id, assignedAt: now },
      $push: {
        activities: {
          type: 'assign',
          message: `Lead assigned to ${assignee.name}.`,
          actor: admin._id,
          createdAt: now,
        },
      },
    },
  );

  return NextResponse.json({ updated: result.modifiedCount });
});
