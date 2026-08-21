import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { z } from 'zod';
import { ApiError, apiHandler, parseBody } from '@/lib/api';
import { requireAdmin } from '@/lib/auth/session';
import { isValidObjectId } from '@/lib/leads';
import { Lead } from '@/lib/models/Lead';
import { Site } from '@/lib/models/Site';
import { serializeSite } from '@/lib/serialize';

type Context = RouteContext<'/api/sites/[id]'>;

const updateSiteSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  domain: z.string().trim().min(1).max(200).optional(),
  allowedOrigins: z.array(z.string().trim()).optional(),
  defaultAssignee: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const PATCH = apiHandler(async (request, context: Context) => {
  await requireAdmin();
  const { id } = await context.params;
  if (!isValidObjectId(id)) throw new ApiError(404, 'Site not found.');

  const input = await parseBody(request, updateSiteSchema);

  const site = await Site.findById(id);
  if (!site) throw new ApiError(404, 'Site not found.');

  if (input.name !== undefined) site.name = input.name;
  if (input.domain !== undefined) {
    site.domain = input.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  }
  if (input.allowedOrigins !== undefined) {
    site.allowedOrigins = input.allowedOrigins.filter(Boolean);
  }
  if (input.isActive !== undefined) site.isActive = input.isActive;
  if (input.notes !== undefined) site.notes = input.notes;
  if (input.defaultAssignee !== undefined) {
    site.defaultAssignee =
      input.defaultAssignee && Types.ObjectId.isValid(input.defaultAssignee)
        ? new Types.ObjectId(input.defaultAssignee)
        : null;
  }

  await site.save();
  await site.populate('defaultAssignee', 'name email');

  return NextResponse.json({ site: serializeSite(site.toObject()) });
});

export const DELETE = apiHandler(async (_request, context: Context) => {
  await requireAdmin();
  const { id } = await context.params;
  if (!isValidObjectId(id)) throw new ApiError(404, 'Site not found.');

  // Deleting a site would orphan its leads, so require the operator to clear
  // them out first rather than silently cascading.
  const leadCount = await Lead.countDocuments({ site: id });
  if (leadCount > 0) {
    throw new ApiError(
      409,
      `This site still has ${leadCount} lead${leadCount === 1 ? '' : 's'}. Deactivate it instead, or delete its leads first.`,
    );
  }

  const site = await Site.findByIdAndDelete(id);
  if (!site) throw new ApiError(404, 'Site not found.');

  return NextResponse.json({ ok: true });
});
