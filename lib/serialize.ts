import type {
  ActivityDTO,
  LeadDTO,
  RefDTO,
  SiteDTO,
  UserDTO,
} from './types';

type Loose = Record<string, unknown>;

function iso(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function str(value: unknown): string {
  return value == null ? '' : String(value);
}

/**
 * A reference field arrives either as a bare ObjectId or, after `.populate()`,
 * as a full document. Both collapse to the same `{ id, name }` shape.
 */
function toRef(value: unknown): RefDTO | null {
  if (!value) return null;

  if (typeof value === 'object' && value !== null && 'name' in value) {
    const doc = value as Loose;
    return { id: str(doc._id), name: str(doc.name) };
  }

  return { id: String(value), name: '' };
}

/**
 * These take `object` rather than a `Record` so Mongoose's document interfaces,
 * which have no index signature, can be passed without casting at every callsite.
 */
export function serializeUser(input: object): UserDTO {
  const user = input as Loose;

  return {
    id: str(user._id),
    name: str(user.name),
    email: str(user.email),
    role: user.role === 'admin' ? 'admin' : 'agent',
    isActive: user.isActive !== false,
    lastLoginAt: iso(user.lastLoginAt),
    createdAt: iso(user.createdAt) ?? '',
  };
}

export function serializeSite(input: object): SiteDTO {
  const site = input as Loose;

  return {
    id: str(site._id),
    name: str(site.name),
    domain: str(site.domain),
    apiKey: str(site.apiKey),
    allowedOrigins: Array.isArray(site.allowedOrigins)
      ? site.allowedOrigins.map(String)
      : [],
    defaultAssignee: toRef(site.defaultAssignee),
    isActive: site.isActive !== false,
    leadCount: Number(site.leadCount ?? 0),
    lastLeadAt: iso(site.lastLeadAt),
    notes: str(site.notes),
    createdAt: iso(site.createdAt) ?? '',
  };
}

function serializeActivity(input: object): ActivityDTO {
  const activity = input as Loose;

  return {
    id: str(activity._id),
    type: (activity.type as ActivityDTO['type']) ?? 'note',
    message: str(activity.message),
    actor: toRef(activity.actor),
    createdAt: iso(activity.createdAt) ?? '',
  };
}

export function serializeLead(input: object): LeadDTO {
  const lead = input as Loose;
  const meta = (lead.meta ?? {}) as Loose;

  return {
    id: str(lead._id),
    site: toRef(lead.site),
    name: str(lead.name),
    email: str(lead.email),
    phone: str(lead.phone),
    company: str(lead.company),
    message: str(lead.message),
    status: (lead.status as LeadDTO['status']) ?? 'new',
    assignedTo: toRef(lead.assignedTo),
    assignedAt: iso(lead.assignedAt),
    value: Number(lead.value ?? 0),
    tags: Array.isArray(lead.tags) ? lead.tags.map(String) : [],
    customFields: (lead.customFields ?? {}) as Record<string, unknown>,
    meta: Object.fromEntries(
      Object.entries(meta).map(([key, value]) => [key, str(value)]),
    ),
    activities: Array.isArray(lead.activities)
      ? lead.activities
          .map((activity) => serializeActivity(activity as object))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : [],
    createdAt: iso(lead.createdAt) ?? '',
    updatedAt: iso(lead.updatedAt) ?? '',
  };
}
