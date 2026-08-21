import type {
  LeadQuality,
  LeadStatus,
  MailLogStatus,
  Role,
} from './constants';
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
  quality: LeadQuality;
  assignedTo: RefDTO | null;
  assignedAt: string | null;
  lastContactedAt: string | null;
  value: number;
  tags: string[];
  customFields: Record<string, unknown>;
  meta: Record<string, string>;
  activities: ActivityDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface MailSettingsDTO {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  /** True when a password is stored; the actual value is never returned. */
  hasPassword: boolean;
  fromName: string;
  fromEmail: string;
  replyTo: string;
  lastTestedAt: string | null;
  lastTestOk: boolean | null;
  lastTestError: string;
  configured: boolean;
}

export interface MailLogDTO {
  id: string;
  lead: RefDTO | null;
  templateKey: string;
  templateName: string;
  to: string;
  subject: string;
  body: string;
  status: MailLogStatus;
  error: string;
  sentBy: RefDTO | null;
  createdAt: string;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
