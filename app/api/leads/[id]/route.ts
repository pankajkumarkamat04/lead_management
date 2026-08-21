import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';
import { ApiError, apiHandler, parseBody } from '@/lib/api';
import { requireAdmin, requireUser } from '@/lib/auth/session';
import { LEAD_QUALITIES, LEAD_QUALITY_LABELS, LEAD_STATUSES, LEAD_STATUS_LABELS } from '@/lib/constants';
import { isValidObjectId, scopeForUser } from '@/lib/leads';
import { Lead, type ILeadActivity } from '@/lib/models/Lead';
import { Site } from '@/lib/models/Site';
import { User } from '@/lib/models/User';
import { serializeLead } from '@/lib/serialize';

type Context = RouteContext<'/api/leads/[id]'>;

async function loadLeadId(context: Context): Promise<string> {
  const { id } = await context.params;
  if (!isValidObjectId(id)) throw new ApiError(404, 'Lead not found.');
  return id;
}

export const GET = apiHandler(async (_request, context: Context) => {
  const user = await requireUser();
  const id = await loadLeadId(context);

  const lead = await Lead.findOne({ _id: id, ...scopeForUser(user) })
    .populate('site', 'name domain')
    .populate('assignedTo', 'name email')
    .populate('activities.actor', 'name')
    .lean();

  if (!lead) throw new ApiError(404, 'Lead not found.');

  return NextResponse.json({ lead: serializeLead(lead) });
});

const updateLeadSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email().or(z.literal('')).optional(),
  phone: z.string().trim().max(50).optional(),
  company: z.string().trim().max(200).optional(),
  message: z.string().trim().max(5000).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
  quality: z.enum(LEAD_QUALITIES).optional(),
  assignedTo: z.string().nullable().optional(),
  value: z.number().min(0).optional(),
  tags: z.array(z.string().trim()).optional(),
  /** Marks the lead as contacted right now (Call / Email quick actions). */
  markContacted: z.boolean().optional(),
});

export const PATCH = apiHandler(async (request, context: Context) => {
  const user = await requireUser();
  const id = await loadLeadId(context);
  const input = await parseBody(request, updateLeadSchema);

  const lead = await Lead.findOne({ _id: id, ...scopeForUser(user) });
  if (!lead) throw new ApiError(404, 'Lead not found.');

  const activities: Partial<ILeadActivity>[] = [];
  const now = new Date();

  if (input.status && input.status !== lead.status) {
    activities.push({
      type: 'status',
      message: `Status changed from ${LEAD_STATUS_LABELS[lead.status]} to ${LEAD_STATUS_LABELS[input.status]}.`,
      actor: user._id,
      createdAt: now,
    });
    lead.status = input.status;
  }

  if (input.quality && input.quality !== lead.quality) {
    activities.push({
      type: 'quality',
      message: `Quality changed from ${LEAD_QUALITY_LABELS[lead.quality ?? 'unrated']} to ${LEAD_QUALITY_LABELS[input.quality]}.`,
      actor: user._id,
      createdAt: now,
    });
    lead.quality = input.quality;
  }

  if (input.markContacted) {
    lead.lastContactedAt = now;
    if (lead.status === 'new') {
      activities.push({
        type: 'status',
        message: `Status changed from ${LEAD_STATUS_LABELS.new} to ${LEAD_STATUS_LABELS.contacted}.`,
        actor: user._id,
        createdAt: now,
      });
      lead.status = 'contacted';
    }
    activities.push({
      type: 'note',
      message: 'Marked as contacted.',
      actor: user._id,
      createdAt: now,
    });
  }

  // Reassignment is an administrator action; agents can work a lead but cannot
  // move it off their own queue or pull one from someone else.
  if (input.assignedTo !== undefined) {
    if (user.role !== 'admin') {
      throw new ApiError(403, 'Only administrators can reassign leads.');
    }

    const nextId = input.assignedTo;
    const currentId = lead.assignedTo ? String(lead.assignedTo) : null;

    if (nextId !== currentId) {
      if (nextId === null || nextId === '') {
        lead.assignedTo = null;
        lead.assignedAt = null;
        activities.push({
          type: 'assign',
          message: 'Lead moved back to the unassigned queue.',
          actor: user._id,
          createdAt: now,
        });
      } else {
        if (!Types.ObjectId.isValid(nextId)) {
          throw new ApiError(400, 'Choose a valid team member.');
        }
        const assignee = await User.findById(nextId).select('name isActive');
        if (!assignee || !assignee.isActive) {
          throw new ApiError(404, 'That team member is not available.');
        }
        lead.assignedTo = assignee._id;
        lead.assignedAt = now;
        activities.push({
          type: 'assign',
          message: `Lead assigned to ${assignee.name}.`,
          actor: user._id,
          createdAt: now,
        });
      }
    }
  }

  if (input.name !== undefined) lead.name = input.name;
  if (input.email !== undefined) lead.email = input.email;
  if (input.phone !== undefined) lead.phone = input.phone;
  if (input.company !== undefined) lead.company = input.company;
  if (input.message !== undefined) lead.message = input.message;
  if (input.value !== undefined) lead.value = input.value;
  if (input.tags !== undefined) lead.tags = input.tags;

  if (activities.length) {
    lead.activities.push(...(activities as ILeadActivity[]));
  }

  await lead.save();
  await lead.populate([
    { path: 'site', select: 'name domain' },
    { path: 'assignedTo', select: 'name email' },
    { path: 'activities.actor', select: 'name' },
  ]);

  return NextResponse.json({ lead: serializeLead(lead.toObject()) });
});

export const DELETE = apiHandler(async (_request, context: Context) => {
  await requireAdmin();
  const id = await loadLeadId(context);

  const lead = await Lead.findByIdAndDelete(id).select('site');
  if (!lead) throw new ApiError(404, 'Lead not found.');

  await Site.updateOne({ _id: lead.site }, { $inc: { leadCount: -1 } });

  return NextResponse.json({ ok: true });
});
