# Lead Desk — Site Integration Guide

Connect any website form to **Lead Desk** so enquiries from all of your brands land in one dashboard.

## Overview

1. Sign in as an **admin**.
2. Open **Websites** and add each domain (e.g. `maxkeys.online`).
3. Copy the site’s **API key**.
4. Set the dashboard public URL in `.env.local` (or your host env):

```
APP_URL=https://leads.yourdomain.com
# or just the domain — https is assumed:
# DOMAIN=leads.yourdomain.com
```

That makes the lead API:

```
POST https://leads.yourdomain.com/api/v1/leads
```

Point every site’s contact / quote form at that URL (also shown on the
**Integration** page after login).

5. Authenticate with the API key (see below).
6. New leads appear under **Leads**. If you set a **default assignee** on the site, they are assigned automatically.

---

## Authentication

Send the key in **one** of these ways:

| Method | Example |
|--------|---------|
| Header (preferred) | `X-Api-Key: lms_…` |
| Bearer token | `Authorization: Bearer lms_…` |
| Body / form field | `"apiKey": "lms_…"` or `<input name="apiKey" …>` |

CORS is enabled for browser posts. You can optionally restrict origins per site under **Websites → Edit → Allowed origins**.

---

## Request body

JSON or `application/x-www-form-urlencoded` / `multipart/form-data` are all accepted.

### Minimum

Provide **at least one** of:

- `name` (also accepts `fullName`, or `firstName` + `lastName`)
- `email`
- `phone` (also `tel`, `telephone`)

### Common optional fields

| Field | Purpose |
|-------|---------|
| `message` / `comments` / `notes` | Enquiry text |
| `company` | Company name |
| `source` | e.g. `contact-form`, `hero` |
| `page` | Full page URL |
| `referrer` | Document referrer |
| `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` | Campaign tracking |
| `tags` | Array of strings (JSON only) |
| `redirect` | After a successful HTML form post, browser is redirected here (303) |
| `_honey` | Honeypot — if filled, the submission is discarded silently |

Any **other** fields are stored on the lead as custom data and shown on the lead detail page.

---

## Responses

| Status | Meaning |
|--------|---------|
| `201` | Lead created — `{ "ok": true, "id": "…" }` |
| `200` | Duplicate within 60s — `{ "ok": true, "id": "…", "duplicate": true }` |
| `202` | Honeypot tripped — treated as success for bots |
| `401` | Missing / invalid API key |
| `403` | Site paused or origin not allowed |
| `422` | Missing name, email, and phone |

---

## Examples

### JavaScript (fetch)

```js
await fetch('https://YOUR-DASHBOARD-HOST/api/v1/leads', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': 'lms_YOUR_KEY',
  },
  body: JSON.stringify({
    name: 'Jane Cooper',
    email: 'jane@example.com',
    phone: '+1 555 0100',
    message: 'I need a quote.',
    page: window.location.href,
    source: 'contact-form',
  }),
});
```

### Plain HTML form

```html
<form action="https://YOUR-DASHBOARD-HOST/api/v1/leads" method="POST">
  <input type="hidden" name="apiKey" value="lms_YOUR_KEY" />
  <input type="hidden" name="page" id="lead-page" />
  <input type="text" name="name" required />
  <input type="email" name="email" />
  <input type="tel" name="phone" />
  <textarea name="message"></textarea>
  <input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off" />
  <button type="submit">Send</button>
</form>
<script>
  document.getElementById('lead-page').value = window.location.href;
</script>
```

### React (Create React App / Vite)

Store the key in an env var such as `REACT_APP_LEAD_API_KEY` or `VITE_LEAD_API_KEY`, then:

```js
export async function submitLead(fields) {
  const res = await fetch(process.env.REACT_APP_LEAD_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': process.env.REACT_APP_LEAD_API_KEY,
    },
    body: JSON.stringify({
      ...fields,
      page: window.location.href,
      source: 'react-form',
    }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Submit failed');
  return res.json();
}
```

### Wire into an existing site in this monorepo

For a CRA site such as `mac_antivirus`:

1. Add to `.env`:

```
REACT_APP_LEAD_ENDPOINT=https://YOUR-DASHBOARD-HOST/api/v1/leads
REACT_APP_LEAD_API_KEY=lms_…
```

2. In the contact form submit handler, call `fetch` as above instead of (or in addition to) any third-party form service.

---

## Roles inside the dashboard

| Role | Can do |
|------|--------|
| **Admin** | Manage websites & API keys, manage team, assign / reassign leads, see all leads, delete leads |
| **Agent** | View and update **only** leads assigned to them, add notes, change status |

---

## Security notes

- Browser-exposed keys behave like **publishable** keys. Restrict **Allowed origins** when you can, and **rotate** a key from Websites if it leaks.
- Prefer posting from your **own backend** when the form already hits a server; keep the key off the client.
- Never commit API keys or `AUTH_SECRET` to git.

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| CORS error in browser | Dashboard is reachable; OPTIONS returns 204; site is active |
| `401 Invalid API key` | Key matches the site; no extra spaces; site not deleted |
| `403 Origin not allowed` | Hostname is on the site’s allowed origins list (or clear the list) |
| Lead not visible to agent | Lead is unassigned or assigned to someone else — admin must assign it |
| Form “succeeds” but no lead | Honeypot field may be filled by autofill — rename or leave empty |

More copy-paste snippets are also available in the dashboard under **Integration**.
