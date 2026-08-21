export const ROLES = ['admin', 'agent'] as const;
export type Role = (typeof ROLES)[number];

export const LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'won',
  'lost',
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** Statuses that close a lead out of the active pipeline. */
export const CLOSED_STATUSES: LeadStatus[] = ['won', 'lost'];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  won: 'Won',
  lost: 'Lost',
};

/** Tailwind classes per status, shared by badges across the dashboard. */
export const LEAD_STATUS_STYLES: Record<LeadStatus, string> = {
  new: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  contacted: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  qualified: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  won: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  lost: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};
