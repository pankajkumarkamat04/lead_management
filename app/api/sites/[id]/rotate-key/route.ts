import { NextResponse } from 'next/server';
import { ApiError, apiHandler } from '@/lib/api';
import { generateApiKey } from '@/lib/apikey';
import { requireAdmin } from '@/lib/auth/session';
import { isValidObjectId } from '@/lib/leads';
import { Site } from '@/lib/models/Site';
import { serializeSite } from '@/lib/serialize';

export const POST = apiHandler(
  async (_request, context: RouteContext<'/api/sites/[id]/rotate-key'>) => {
    await requireAdmin();
    const { id } = await context.params;
    if (!isValidObjectId(id)) throw new ApiError(404, 'Site not found.');

    const site = await Site.findByIdAndUpdate(
      id,
      { apiKey: generateApiKey() },
      { new: true },
    )
      .populate('defaultAssignee', 'name email')
      .lean();

    if (!site) throw new ApiError(404, 'Site not found.');

    return NextResponse.json({ site: serializeSite(site) });
  },
);
