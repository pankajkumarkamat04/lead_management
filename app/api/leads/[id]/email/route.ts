import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiError, apiHandler, parseBody } from '@/lib/api';
import { requireUser } from '@/lib/auth/session';
import { isValidObjectId, scopeForUser } from '@/lib/leads';
import {
  applyTemplate,
  buildLeadMailVars,
  sendSmtpMail,
} from '@/lib/mail';
import { getHardcodedTemplate } from '@/lib/mail-templates';
import { Lead } from '@/lib/models/Lead';
import { MailLog } from '@/lib/models/MailLog';
import { serializeLead, serializeMailLog } from '@/lib/serialize';

const sendSchema = z.object({
  subject: z.string().trim().min(1, 'Add a subject.').max(300),
  body: z.string().trim().min(1, 'Add a message.').max(20_000),
  /** Hardcoded template id from `lib/mail-templates.ts`. */
  templateId: z.string().nullable().optional(),
  applyVars: z.boolean().optional().default(true),
});

export const POST = apiHandler(
  async (request, context: RouteContext<'/api/leads/[id]/email'>) => {
    const user = await requireUser();
    const { id } = await context.params;
    if (!isValidObjectId(id)) throw new ApiError(404, 'Lead not found.');

    const input = await parseBody(request, sendSchema);

    const lead = await Lead.findOne({ _id: id, ...scopeForUser(user) }).populate(
      'site',
      'name domain',
    );
    if (!lead) throw new ApiError(404, 'Lead not found.');

    if (!lead.email) {
      throw new ApiError(400, 'This lead has no email address.');
    }

    const hardcoded = getHardcodedTemplate(input.templateId);
    const vars = buildLeadMailVars(lead, user);
    const subject = input.applyVars
      ? applyTemplate(input.subject, vars)
      : input.subject;
    const body = input.applyVars ? applyTemplate(input.body, vars) : input.body;

    const now = new Date();
    const templateKey = hardcoded?.id ?? '';
    const templateName = hardcoded?.name ?? '';

    try {
      await sendSmtpMail({ to: lead.email, subject, body });

      const log = await MailLog.create({
        lead: lead._id,
        templateKey,
        templateName,
        to: lead.email,
        subject,
        body,
        status: 'sent',
        sentBy: user._id,
      });

      lead.lastContactedAt = now;
      if (lead.status === 'new') lead.status = 'contacted';
      lead.activities.push({
        type: 'email',
        message: hardcoded
          ? `Email sent (${hardcoded.name}): ${subject}`
          : `Email sent: ${subject}`,
        actor: user._id,
        createdAt: now,
      } as never);
      await lead.save();

      await lead.populate([
        { path: 'site', select: 'name domain' },
        { path: 'assignedTo', select: 'name email' },
        { path: 'activities.actor', select: 'name' },
      ]);
      await log.populate([
        { path: 'lead', select: 'name' },
        { path: 'sentBy', select: 'name' },
      ]);

      return NextResponse.json({
        lead: serializeLead(lead.toObject()),
        log: serializeMailLog(log.toObject()),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to send email.';

      const log = await MailLog.create({
        lead: lead._id,
        templateKey,
        templateName,
        to: lead.email,
        subject,
        body,
        status: 'failed',
        error: message,
        sentBy: user._id,
      });

      lead.activities.push({
        type: 'email',
        message: `Email failed: ${subject} — ${message}`,
        actor: user._id,
        createdAt: now,
      } as never);
      await lead.save();

      await log.populate([
        { path: 'lead', select: 'name' },
        { path: 'sentBy', select: 'name' },
      ]);

      throw new ApiError(502, message, {
        log: serializeMailLog(log.toObject()),
      });
    }
  },
);
