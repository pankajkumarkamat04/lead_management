import { NextResponse, type NextRequest } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { corsHeaders, isOriginAllowed } from '@/lib/cors';
import { Lead } from '@/lib/models/Lead';
import { Site } from '@/lib/models/Site';

/**
 * Public lead intake. This is the only endpoint your websites talk to, and it
 * is authenticated with a per-site API key rather than a user session.
 */

/** Fields consumed directly; anything else on the payload becomes a custom field. */
const KNOWN_FIELDS = new Set([
  'name',
  'fullName',
  'full_name',
  'firstName',
  'first_name',
  'lastName',
  'last_name',
  'email',
  'phone',
  'tel',
  'telephone',
  'company',
  'message',
  'comments',
  'notes',
  'source',
  'page',
  'referrer',
  'apiKey',
  'api_key',
  'redirect',
  'tags',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
]);

/** Common honeypot input names; a filled one means a bot submitted the form. */
const HONEYPOT_FIELDS = ['_honey', '_gotcha', 'honeypot', 'website_url'];

function text(value: unknown, max = 5000): string {
  if (value == null) return '';
  return String(value).trim().slice(0, max);
}

async function readPayload(
  request: NextRequest,
): Promise<Record<string, unknown>> {
  const contentType = request.headers.get('content-type') ?? '';

  // Supports plain HTML forms, which post url-encoded or multipart bodies.
  if (
    contentType.includes('application/x-www-form-urlencoded') ||
    contentType.includes('multipart/form-data')
  ) {
    const formData = await request.formData();
    return Object.fromEntries(
      Array.from(formData.entries()).map(([key, value]) => [
        key,
        typeof value === 'string' ? value : value.name,
      ]),
    );
  }

  try {
    const parsed = await request.json();
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function resolveName(payload: Record<string, unknown>): string {
  const direct = text(
    payload.name ?? payload.fullName ?? payload.full_name,
    200,
  );
  if (direct) return direct;

  const first = text(payload.firstName ?? payload.first_name, 100);
  const last = text(payload.lastName ?? payload.last_name, 100);
  return [first, last].filter(Boolean).join(' ');
}

export async function OPTIONS(request: NextRequest) {
  // The API key travels in a header, so it is not available during preflight.
  // Origin enforcement therefore happens on the POST itself.
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get('origin')),
  });
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const headers = corsHeaders(origin);

  const json = (body: unknown, status: number) =>
    NextResponse.json(body, { status, headers });

  try {
    const payload = await readPayload(request);

    const apiKey =
      request.headers.get('x-api-key')?.trim() ||
      request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() ||
      text(payload.apiKey ?? payload.api_key, 200);

    if (!apiKey) {
      return json({ error: 'Missing API key.' }, 401);
    }

    await connectToDatabase();

    const site = await Site.findOne({ apiKey }).select(
      'name isActive allowedOrigins defaultAssignee',
    );

    if (!site) return json({ error: 'Invalid API key.' }, 401);
    if (!site.isActive) {
      return json({ error: 'This site is not accepting leads.' }, 403);
    }

    if (!isOriginAllowed(origin, site.allowedOrigins)) {
      return json({ error: 'Origin not allowed for this site.' }, 403);
    }

    // Silently accept bot submissions so the bot sees success and moves on,
    // while nothing reaches the pipeline.
    const trapped = HONEYPOT_FIELDS.some((field) => text(payload[field]));
    if (trapped) return json({ ok: true, id: null }, 202);

    const name = resolveName(payload);
    const email = text(payload.email, 200).toLowerCase();
    const phone = text(payload.phone ?? payload.tel ?? payload.telephone, 50);

    if (!name && !email && !phone) {
      return json(
        { error: 'Provide at least a name, email address, or phone number.' },
        422,
      );
    }

    const customFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      if (KNOWN_FIELDS.has(key) || HONEYPOT_FIELDS.includes(key)) continue;
      customFields[key.slice(0, 60)] = text(value, 1000);
    }

    const forwardedFor = request.headers.get('x-forwarded-for') ?? '';
    const ip = forwardedFor.split(',')[0]?.trim() ?? '';

    // Guards against double-clicked submit buttons creating duplicate leads.
    if (email || phone) {
      const recent = await Lead.findOne({
        site: site._id,
        createdAt: { $gte: new Date(Date.now() - 60_000) },
        ...(email ? { email } : { phone }),
      }).select('_id');

      if (recent) {
        return json({ ok: true, id: String(recent._id), duplicate: true }, 200);
      }
    }

    const assignedTo = site.defaultAssignee ?? null;

    const lead = await Lead.create({
      site: site._id,
      name: name || email || phone,
      email,
      phone,
      company: text(payload.company, 200),
      message: text(payload.message ?? payload.comments ?? payload.notes),
      status: 'new',
      assignedTo,
      assignedAt: assignedTo ? new Date() : null,
      tags: Array.isArray(payload.tags) ? payload.tags.map((t) => text(t, 40)) : [],
      customFields,
      meta: {
        source: text(payload.source, 100) || 'website',
        page: text(payload.page, 500),
        referrer: text(payload.referrer ?? request.headers.get('referer'), 500),
        ip,
        userAgent: text(request.headers.get('user-agent'), 500),
        utmSource: text(payload.utm_source, 100),
        utmMedium: text(payload.utm_medium, 100),
        utmCampaign: text(payload.utm_campaign, 100),
        utmTerm: text(payload.utm_term, 100),
        utmContent: text(payload.utm_content, 100),
      },
      activities: [
        {
          type: 'created',
          message: `Lead captured from ${site.name}.`,
          actor: null,
          createdAt: new Date(),
        },
      ],
    });

    await Site.updateOne(
      { _id: site._id },
      { $inc: { leadCount: 1 }, $set: { lastLeadAt: new Date() } },
    );

    // Lets a no-JavaScript HTML form land on a thank-you page.
    const redirect = text(payload.redirect, 500);
    if (redirect) {
      return NextResponse.redirect(redirect, { status: 303, headers });
    }

    return json({ ok: true, id: String(lead._id) }, 201);
  } catch (error) {
    console.error('[api/v1/leads] Failed to capture lead:', error);
    return json({ error: 'Could not save the lead. Please try again.' }, 500);
  }
}
