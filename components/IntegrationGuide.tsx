'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Icon } from './icons';
import { Alert, Button, Card, Select } from './ui';
import type { SiteDTO } from '@/lib/types';

export function IntegrationGuide({
  baseUrl,
  leadsApiUrl,
  sites,
  isAdmin,
}: {
  baseUrl: string;
  /** Prefers APP_URL / DOMAIN from env, then the request host. */
  leadsApiUrl: string;
  sites: SiteDTO[];
  isAdmin: boolean;
}) {
  const [siteId, setSiteId] = useState(sites[0]?.id ?? '');
  const [copied, setCopied] = useState<string | null>(null);

  const site = sites.find((row) => row.id === siteId) ?? sites[0];
  const endpoint = leadsApiUrl || (baseUrl ? `${baseUrl}/api/v1/leads` : '/api/v1/leads');
  const apiKey = site?.apiKey ?? 'lms_your_api_key_here';

  const snippets = useMemo(
    () => ({
      fetch: `fetch('${endpoint}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': '${apiKey}',
  },
  body: JSON.stringify({
    name: 'Jane Cooper',
    email: 'jane@example.com',
    phone: '+1 555 0100',
    message: 'I need help with antivirus setup.',
    page: window.location.href,
    source: 'contact-form',
  }),
})
  .then((res) => res.json())
  .then((data) => console.log('Lead saved', data))
  .catch((err) => console.error(err));`,
      html: `<form action="${endpoint}" method="POST">
  <input type="hidden" name="apiKey" value="${apiKey}" />
  <input type="hidden" name="page" id="lead-page" />
  <input type="text" name="name" placeholder="Full name" required />
  <input type="email" name="email" placeholder="Email" />
  <input type="tel" name="phone" placeholder="Phone" />
  <textarea name="message" placeholder="How can we help?"></textarea>
  <!-- Honeypot — leave empty; bots that fill it are ignored -->
  <input type="text" name="_honey" style="display:none" tabindex="-1" autocomplete="off" />
  <button type="submit">Send</button>
</form>
<script>
  document.getElementById('lead-page').value = window.location.href;
</script>`,
      react: `async function submitLead(form) {
  const response = await fetch('${endpoint}', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': process.env.REACT_APP_LEAD_API_KEY, // or NEXT_PUBLIC_…
    },
    body: JSON.stringify({
      name: form.name,
      email: form.email,
      phone: form.phone,
      message: form.message,
      page: window.location.href,
      source: 'react-form',
      utm_source: new URLSearchParams(window.location.search).get('utm_source') || '',
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Could not submit');
  }

  return response.json(); // { ok: true, id: '…' }
}`,
    }),
    [apiKey, endpoint],
  );

  async function copy(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Integration
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Point every website form at one endpoint. Each site uses its own API
          key so leads land under the right brand.
        </p>
      </header>

      {!isAdmin && (
        <Alert tone="info">
          Ask an administrator for the API key of the website you need to
          connect. Agents can read this guide but cannot view keys.
        </Alert>
      )}

      {isAdmin && sites.length === 0 && (
        <Alert tone="info">
          <Link href="/dashboard/sites" className="font-medium underline">
            Add a website
          </Link>{' '}
          first — you will get an API key to paste into the snippets below.
        </Alert>
      )}

      <Card className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Endpoint</h2>
        <p className="text-sm text-slate-500">
          Set <code className="text-xs">APP_URL</code> or{' '}
          <code className="text-xs">DOMAIN</code> in{' '}
          <code className="text-xs">.env.local</code> so this URL is fixed for
          every site you connect.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-md bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-800 ring-1 ring-slate-200">
            POST {endpoint || '/api/v1/leads'}
          </code>
          <Button
            variant="secondary"
            className="px-2.5"
            onClick={() => copy('endpoint', endpoint)}
          >
            <Icon name={copied === 'endpoint' ? 'check' : 'copy'} />
            {copied === 'endpoint' ? 'Copied' : 'Copy'}
          </Button>
        </div>
        {baseUrl && (
          <p className="text-xs text-slate-400">
            Base: <code>{baseUrl}</code>
          </p>
        )}

        {isAdmin && sites.length > 0 && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Website (for code samples)
            </label>
            <Select
              value={site?.id ?? ''}
              onChange={(event) => setSiteId(event.target.value)}
              className="max-w-sm"
            >
              {sites.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name} · {row.domain}
                </option>
              ))}
            </Select>
            {site && (
              <p className="mt-2 break-all font-mono text-xs text-slate-500">
                Key: {site.apiKey}
              </p>
            )}
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">
          Required fields
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>
            Send at least one of <code className="text-xs">name</code>,{' '}
            <code className="text-xs">email</code>, or{' '}
            <code className="text-xs">phone</code>.
          </li>
          <li>
            Authenticate with header{' '}
            <code className="text-xs">X-Api-Key</code> or{' '}
            <code className="text-xs">Authorization: Bearer …</code>, or include{' '}
            <code className="text-xs">apiKey</code> in the body (HTML forms).
          </li>
          <li>
            Optional: <code className="text-xs">message</code>,{' '}
            <code className="text-xs">company</code>,{' '}
            <code className="text-xs">page</code>,{' '}
            <code className="text-xs">source</code>, UTM fields, and any other
            custom fields (stored as custom data).
          </li>
        </ul>
      </Card>

      <Snippet
        title="JavaScript fetch"
        code={snippets.fetch}
        copied={copied === 'fetch'}
        onCopy={() => copy('fetch', snippets.fetch)}
      />

      <Snippet
        title="Plain HTML form"
        code={snippets.html}
        copied={copied === 'html'}
        onCopy={() => copy('html', snippets.html)}
      />

      <Snippet
        title="React / Next.js"
        code={snippets.react}
        copied={copied === 'react'}
        onCopy={() => copy('react', snippets.react)}
      />

      <Card className="space-y-2 text-sm text-slate-600">
        <h2 className="text-sm font-semibold text-slate-900">Tips</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Production example:{' '}
            <code className="text-xs">APP_URL=https://leads.yourdomain.com</code>{' '}
            → API{' '}
            <code className="text-xs">
              https://leads.yourdomain.com/api/v1/leads
            </code>
            .
          </li>
          <li>
            Prefer putting the API key in a server-side env var when possible.
            Browser forms expose the key — treat it like a publishable key and
            rotate it if leaked.
          </li>
          <li>
            Duplicate submissions from the same email/phone within 60 seconds
            are ignored.
          </li>
          <li>
            Fill a hidden <code className="text-xs">_honey</code> field and the
            lead is discarded (bot trap).
          </li>
          <li>
            Full write-up lives in the repo at{' '}
            <code className="text-xs">docs/INTEGRATION.md</code>.
          </li>
        </ul>
      </Card>
    </div>
  );
}

function Snippet({
  title,
  code,
  copied,
  onCopy,
}: {
  title: string;
  code: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <Button variant="secondary" className="px-2.5" onClick={onCopy}>
          <Icon name={copied ? 'check' : 'copy'} />
          {copied ? 'Copied' : 'Copy'}
        </Button>
      </div>
      <pre className="overflow-x-auto bg-slate-950 p-5 text-xs leading-relaxed text-slate-100">
        <code>{code}</code>
      </pre>
    </Card>
  );
}
