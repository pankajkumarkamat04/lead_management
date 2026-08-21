/**
 * Built-in email templates used when messaging a lead.
 * Edit this file to change wording — there is no template admin UI.
 */
export interface HardcodedMailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export const HARDCODED_MAIL_TEMPLATES: HardcodedMailTemplate[] = [
  {
    id: 'first-reply',
    name: 'First reply',
    subject: 'Thanks for contacting {{site}}, {{name}}',
    body: `Hi {{name}},

Thank you for reaching out through {{site}}. We received your enquiry and a specialist will follow up with you shortly.

If your matter is urgent, reply to this email or call us and we will prioritise your request.

Best regards,
{{agent}}`,
  },
  {
    id: 'follow-up',
    name: 'Follow-up',
    subject: 'Following up on your enquiry — {{site}}',
    body: `Hi {{name}},

Just checking in on your recent enquiry with {{site}}. We are happy to help with pricing, installation, or anything else you need.

Reply to this email whenever you are ready and we will take it from there.

Best regards,
{{agent}}`,
  },
  {
    id: 'quote',
    name: 'Quote / pricing',
    subject: 'Your quote from {{site}}',
    body: `Hi {{name}},

Thanks for your interest in our products through {{site}}.

Please reply with the devices or plan you need and we will send you today's best price, along with setup support if you want it.

Best regards,
{{agent}}`,
  },
  {
    id: 'support',
    name: 'Support help',
    subject: 'We can help with your support request',
    body: `Hi {{name}},

We received your support message via {{site}}:

"{{message}}"

A specialist is reviewing this and will get back to you as soon as possible. If you have screenshots, error codes, or device details, reply with those and we can resolve it faster.

Best regards,
{{agent}}`,
  },
];

export function getHardcodedTemplate(
  id: string | null | undefined,
): HardcodedMailTemplate | null {
  if (!id) return null;
  return HARDCODED_MAIL_TEMPLATES.find((template) => template.id === id) ?? null;
}
