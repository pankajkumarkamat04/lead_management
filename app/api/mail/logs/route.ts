import { NextResponse } from 'next/server';
import { Types } from 'mongoose';
import { apiHandler } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { isValidObjectId } from '@/lib/leads';
import { MailLog } from '@/lib/models/MailLog';
import { serializeMailLog } from '@/lib/serialize';
import type { MailLogDTO, Paginated } from '@/lib/types';

export const GET = apiHandler(async (request) => {
  const user = await requireUser();
  const params = request.nextUrl.searchParams;

  const page = Math.max(1, Number(params.get('page') ?? 1) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(params.get('pageSize') ?? 20) || 20));

  const filter: Record<string, unknown> = {};
  const leadId = params.get('lead')?.trim();
  if (leadId && isValidObjectId(leadId)) {
    filter.lead = new Types.ObjectId(leadId);
  }

  const status = params.get('status')?.trim();
  if (status === 'sent' || status === 'failed') {
    filter.status = status;
  }

  // Agents only see mail they sent, unless filtering a specific lead they can access
  // (lead-scoped checks happen on the lead page which already scopes the lead).
  if (user.role !== 'admin' && !leadId) {
    filter.sentBy = user._id;
  }

  const [rows, total] = await Promise.all([
    MailLog.find(filter)
      .populate('lead', 'name')
      .populate('sentBy', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean(),
    MailLog.countDocuments(filter),
  ]);

  const payload: Paginated<MailLogDTO> = {
    data: rows.map(serializeMailLog),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };

  return NextResponse.json(payload);
});
