import type { LeadStatus, Role } from './constants';
import type { ActivityType } from './models/Lead';

/** Minimal shape used wherever a lead references a site or a user. */
export interface RefDTO {
  id: string;
  name: string;
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface SiteDTO {
  id: string;
  name: string;
  domain: string;
  apiKey: string;
  allowedOrigins: string[];
  defaultAssignee: RefDTO | null;
  isActive: boolean;
  leadCount: number;
  lastLeadAt: string | null;
  notes: string;
  createdAt: string;
}

export interface ActivityDTO {
  id: string;
  type: ActivityType;
  message: string;
  actor: RefDTO | null;
  createdAt: string;
}

export interface LeadDTO {
  id: string;
  site: RefDTO | null;
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  status: LeadStatus;
  assignedTo: RefDTO | null;
  assignedAt: string | null;
  value: number;
  tags: string[];
  customFields: Record<string, unknown>;
  meta: Record<string, string>;
  activities: ActivityDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
