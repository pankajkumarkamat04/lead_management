import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, apiHandler, parseBody } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { isValidObjectId, scopeForUser } from '@/lib/leads';
import { Lead } from '@/lib/models/Lead';
import { serializeLead } from '@/lib/serialize';

const noteSchema = z.object({
  message: z.string().trim().min(1, 'Write a note first.').max(4000),
});

export const POST = apiHandler(
  async (request, context: RouteContext<'/api/leads/[id]/notes'>) => {
    const user = await requireUser();
    const { id } = await context.params;
    if (!isValidObjectId(id)) throw new ApiError(404, 'Lead not found.');

    const { message } = await parseBody(request, noteSchema);

    const lead = await Lead.findOneAndUpdate(
      { _id: id, ...scopeForUser(user) },
      {
        $push: {
          activities: {
            type: 'note',
            message,
            actor: user._id,
            createdAt: new Date(),
          },
        },
      },
      { new: true },
    )
      .populate('site', 'name domain')
      .populate('assignedTo', 'name email')
      .populate('activities.actor', 'name')
      .lean();

    if (!lead) throw new ApiError(404, 'Lead not found.');

    return NextResponse.json({ lead: serializeLead(lead) }, { status: 201 });
  },
);
