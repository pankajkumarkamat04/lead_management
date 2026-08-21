import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { HydratedDocument } from 'mongoose';
import {
  LEAD_QUALITY_LABELS,
  LEAD_STATUS_LABELS,
  type LeadQuality,
  type LeadStatus,
} from './constants';
import {
  MAIL_SETTINGS_KEY,
  MailSettings,
  type IMailSettings,
} from './models/MailSettings';
import type { ILead } from './models/Lead';
import type { IUser } from './models/User';

export async function getMailSettingsDoc(): Promise<
  HydratedDocument<IMailSettings>
> {
  let doc = await MailSettings.findOne({ key: MAIL_SETTINGS_KEY });
  if (!doc) {
    doc = await MailSettings.create({ key: MAIL_SETTINGS_KEY });
  }
  return doc;
}

export function createTransport(settings: IMailSettings): Transporter {
  return nodemailer.createTransport({
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    auth:
      settings.username || settings.password
        ? {
            user: settings.username,
            pass: settings.password,
          }
        : undefined,
  });
}

export function assertMailReady(settings: IMailSettings): void {
  if (!settings.enabled) {
    throw new Error('Email is disabled. Enable it under Mail settings.');
  }
  if (!settings.host || !settings.fromEmail) {
    throw new Error('SMTP host and from email are required.');
  }
}

/** Replaces `{{name}}` style tokens in a template string. */
export function applyTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    return vars[key] ?? '';
  });
}

export function buildLeadMailVars(
  lead: ILead & { site?: { name?: string } | null },
  agent: IUser,
): Record<string, string> {
  const siteName =
    lead.site && typeof lead.site === 'object' && 'name' in lead.site
      ? String(lead.site.name ?? '')
      : '';

  return {
    name: lead.name || '',
    email: lead.email || '',
    phone: lead.phone || '',
    company: lead.company || '',
    message: lead.message || '',
    site: siteName,
    status: LEAD_STATUS_LABELS[lead.status as LeadStatus] ?? lead.status,
    quality:
      LEAD_QUALITY_LABELS[lead.quality as LeadQuality] ?? lead.quality ?? '',
    agent: agent.name || '',
  };
}

export async function sendSmtpMail(options: {
  to: string;
  subject: string;
  body: string;
  settings?: IMailSettings;
}): Promise<{ messageId: string }> {
  const settings = options.settings ?? (await getMailSettingsDoc());
  assertMailReady(settings);

  const transport = createTransport(settings);
  const from = settings.fromName
    ? `"${settings.fromName}" <${settings.fromEmail}>`
    : settings.fromEmail;

  const info = await transport.sendMail({
    from,
    to: options.to,
    replyTo: settings.replyTo || undefined,
    subject: options.subject,
    text: options.body,
    html: options.body.replace(/\n/g, '<br />'),
  });

  return { messageId: String(info.messageId ?? '') };
}

export async function verifySmtpConnection(
  settings: IMailSettings,
): Promise<void> {
  if (!settings.host) {
    throw new Error('SMTP host is required.');
  }
  const transport = createTransport(settings);
  await transport.verify();
}
