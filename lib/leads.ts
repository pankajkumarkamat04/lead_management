import { Types, type QueryFilter } from 'mongoose';
import { LEAD_STATUSES, type LeadStatus } from './constants';
import type { ILead } from './models/Lead';
import type { IUser } from './models/User';

/**
 * The single source of truth for row-level access: administrators see every
 * lead, agents only ever see the leads assigned to them. Every read and write
 * path composes this so a missing check cannot leak another agent's pipeline.
 */
export function scopeForUser(user: IUser): QueryFilter<ILead> {
  return user.role === 'admin' ? {} : { assignedTo: user._id };
}

/** Escapes user input before it is used inside a regular expression. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isValidObjectId(value: string): boolean {
  return Types.ObjectId.isValid(value) && String(new Types.ObjectId(value)) === value;
}

export interface LeadQuery {
  search?: string;
  status?: string;
  site?: string;
  assignedTo?: string;
  from?: string;
  to?: string;
}

/** Translates dashboard filter query params into a MongoDB filter. */
export function buildLeadFilter(
  params: URLSearchParams,
  user: IUser,
): QueryFilter<ILead> {
  const filter: QueryFilter<ILead> = { ...scopeForUser(user) };

  const search = params.get('search')?.trim();
  if (search) {
    const pattern = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { name: pattern },
      { email: pattern },
      { phone: pattern },
      { company: pattern },
      { message: pattern },
    ];
  }

  const status = params.get('status')?.trim();
  if (status) {
    const requested = status
      .split(',')
      .map((value) => value.trim())
      .filter((value): value is LeadStatus =>
        (LEAD_STATUSES as readonly string[]).includes(value),
      );
    if (requested.length) filter.status = { $in: requested };
  }

  const site = params.get('site')?.trim();
  if (site && isValidObjectId(site)) {
    filter.site = new Types.ObjectId(site);
  }

  // Agents are already pinned to their own leads by `scopeForUser`, so this
  // filter is only meaningful for administrators.
  const assignedTo = params.get('assignedTo')?.trim();
  if (assignedTo && user.role === 'admin') {
    if (assignedTo === 'unassigned') {
      filter.assignedTo = null;
    } else if (isValidObjectId(assignedTo)) {
      filter.assignedTo = new Types.ObjectId(assignedTo);
    }
  }

  const from = params.get('from');
  const to = params.get('to');
  if (from || to) {
    const range: Record<string, Date> = {};
    if (from && !Number.isNaN(Date.parse(from))) range.$gte = new Date(from);
    if (to && !Number.isNaN(Date.parse(to))) {
      // Treat the end date as inclusive of the whole day.
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      range.$lte = end;
    }
    if (Object.keys(range).length) filter.createdAt = range;
  }

  return filter;
}
