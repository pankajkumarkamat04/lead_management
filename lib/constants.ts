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

/** How hot / promising a lead looks to the sales desk. */
export const LEAD_QUALITIES = [
  'unrated',
  'hot',
  'warm',
  'cold',
  'junk',
] as const;
export type LeadQuality = (typeof LEAD_QUALITIES)[number];

export const LEAD_QUALITY_LABELS: Record<LeadQuality, string> = {
  unrated: 'Unrated',
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
  junk: 'Junk',
};

export const LEAD_QUALITY_STYLES: Record<LeadQuality, string> = {
  unrated: 'bg-slate-50 text-slate-600 ring-slate-500/20',
  hot: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  warm: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  cold: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  junk: 'bg-slate-100 text-slate-500 ring-slate-500/20',
};

export const MAIL_LOG_STATUSES = ['sent', 'failed'] as const;
export type MailLogStatus = (typeof MAIL_LOG_STATUSES)[number];

export const MAIL_LOG_STATUS_LABELS: Record<MailLogStatus, string> = {
  sent: 'Sent',
  failed: 'Failed',
};

export const MAIL_LOG_STATUS_STYLES: Record<MailLogStatus, string> = {
  sent: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  failed: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};
