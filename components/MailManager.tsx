'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  Spinner,
} from './ui';
import { apiFetch, formatDateTime } from '@/lib/client';
import {
  MAIL_LOG_STATUS_LABELS,
  MAIL_LOG_STATUS_STYLES,
  type Role,
} from '@/lib/constants';
import { HARDCODED_MAIL_TEMPLATES } from '@/lib/mail-templates';
import type { MailLogDTO, MailSettingsDTO, Paginated } from '@/lib/types';

export function MailManager({ role }: { role: Role }) {
  const isAdmin = role === 'admin';
  const [tab, setTab] = useState<'settings' | 'logs'>(
    isAdmin ? 'settings' : 'logs',
  );

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Mail
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Connect SMTP, email leads with built-in templates, and review every
          message sent from Lead Desk.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-px">
        {(
          [
            ...(isAdmin
              ? [{ id: 'settings' as const, label: 'Connection' }]
              : []),
            { id: 'logs' as const, label: 'Mail log' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
              tab === item.id
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'settings' && isAdmin && (
        <>
          <MailSettingsPanel />
          <Card>
            <h2 className="mb-2 text-sm font-semibold text-slate-900">
              Built-in templates
            </h2>
            <p className="mb-3 text-sm text-slate-500">
              Templates are fixed in code (`lib/mail-templates.ts`). Agents pick
              one when emailing a lead.
            </p>
            <ul className="space-y-2">
              {HARDCODED_MAIL_TEMPLATES.map((template) => (
                <li
                  key={template.id}
                  className="rounded-lg bg-slate-50 px-3 py-2 text-sm ring-1 ring-slate-200"
                >
                  <span className="font-medium text-slate-900">
                    {template.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {template.subject}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
      {tab === 'logs' && <MailLogsPanel />}
    </div>
  );
}

function MailSettingsPanel() {
  const [settings, setSettings] = useState<MailSettingsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ settings: MailSettingsDTO }>(
        '/api/mail/settings',
      );
      setSettings(data.settings);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    const form = new FormData(event.currentTarget);
    try {
      const data = await apiFetch<{ settings: MailSettingsDTO }>(
        '/api/mail/settings',
        {
          method: 'PUT',
          body: JSON.stringify({
            enabled: form.get('enabled') === 'on',
            host: form.get('host'),
            port: Number(form.get('port') ?? 587),
            secure: form.get('secure') === 'on',
            username: form.get('username'),
            password: form.get('password'),
            fromName: form.get('fromName'),
            fromEmail: form.get('fromEmail'),
            replyTo: form.get('replyTo'),
          }),
        },
      );
      setSettings(data.settings);
      setSuccess('Mail connection saved.');
      (
        event.currentTarget.elements.namedItem('password') as HTMLInputElement
      ).value = '';
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setPending(false);
    }
  }

  async function onTest() {
    setTesting(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiFetch<{ settings: MailSettingsDTO }>(
        '/api/mail/settings',
        {
          method: 'POST',
          body: JSON.stringify({ action: 'test' }),
        },
      );
      setSettings(data.settings);
      setSuccess('SMTP connection verified successfully.');
    } catch (caught) {
      setError((caught as Error).message);
      await load();
    } finally {
      setTesting(false);
    }
  }

  if (loading || !settings) {
    return (
      <Card className="flex items-center justify-center py-16 text-slate-500">
        <Spinner className="mr-2" />
        Loading connection…
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={onSave} className="space-y-4">
        {error && <Alert>{error}</Alert>}
        {success && <Alert tone="success">{success}</Alert>}

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={settings.enabled}
            className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Enable outbound email
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SMTP host">
            <Input
              name="host"
              defaultValue={settings.host}
              placeholder="smtp.gmail.com"
              required
            />
          </Field>
          <Field label="Port">
            <Input
              name="port"
              type="number"
              defaultValue={settings.port}
              min={1}
              max={65535}
              required
            />
          </Field>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            name="secure"
            defaultChecked={settings.secure}
            className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Use TLS / SSL (secure)
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Username">
            <Input
              name="username"
              defaultValue={settings.username}
              autoComplete="off"
            />
          </Field>
          <Field
            label="Password"
            hint={
              settings.hasPassword
                ? 'Leave blank to keep the current password.'
                : undefined
            }
          >
            <Input
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={settings.hasPassword ? '••••••••' : ''}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From name">
            <Input name="fromName" defaultValue={settings.fromName} />
          </Field>
          <Field label="From email">
            <Input
              name="fromEmail"
              type="email"
              defaultValue={settings.fromEmail}
              required
            />
          </Field>
        </div>

        <Field label="Reply-to (optional)">
          <Input
            name="replyTo"
            type="email"
            defaultValue={settings.replyTo}
            placeholder="support@yourdomain.com"
          />
        </Field>

        {settings.lastTestedAt && (
          <p className="text-xs text-slate-500">
            Last test {formatDateTime(settings.lastTestedAt)} —{' '}
            {settings.lastTestOk ? 'OK' : settings.lastTestError || 'Failed'}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            onClick={onTest}
            disabled={testing || pending}
          >
            {testing && <Spinner />}
            Test connection
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            Save connection
          </Button>
        </div>
      </form>
    </Card>
  );
}

function MailLogsPanel() {
  const [result, setResult] = useState<Paginated<MailLogDTO> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<MailLogDTO | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (status) params.set('status', status);
      const data = await apiFetch<Paginated<MailLogDTO>>(
        `/api/mail/logs?${params}`,
      );
      setResult(data);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Select
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value);
          }}
          className="w-auto min-w-40"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </Select>
      </div>

      {error && <Alert>{error}</Alert>}

      {loading && !result ? (
        <Card className="flex items-center justify-center py-16 text-slate-500">
          <Spinner className="mr-2" />
          Loading mail log…
        </Card>
      ) : !result?.data.length ? (
        <EmptyState
          title="No emails logged yet"
          description="When you email a lead from the lead page, every send appears here with status and full content."
        />
      ) : (
        <>
          <Card className="overflow-hidden p-0">
            <ul className="divide-y divide-slate-100">
              {result.data.map((log) => (
                <li key={log.id}>
                  <button
                    type="button"
                    onClick={() => setViewing(log)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {log.subject}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        To {log.to}
                        {log.templateName ? ` · ${log.templateName}` : ''}
                        {log.lead?.name ? ` · ${log.lead.name}` : ''}
                        {log.sentBy?.name ? ` · by ${log.sentBy.name}` : ''}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${MAIL_LOG_STATUS_STYLES[log.status]}`}
                    >
                      {MAIL_LOG_STATUS_LABELS[log.status]}
                    </span>
                    <span className="w-28 shrink-0 text-right text-xs text-slate-400">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {result.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Page {result.page} of {result.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={page >= result.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={viewing?.subject ?? 'Email'}
        description={
          viewing
            ? `To ${viewing.to} · ${formatDateTime(viewing.createdAt)}`
            : undefined
        }
      >
        {viewing && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${MAIL_LOG_STATUS_STYLES[viewing.status]}`}
              >
                {MAIL_LOG_STATUS_LABELS[viewing.status]}
              </span>
              {viewing.templateName && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {viewing.templateName}
                </span>
              )}
            </div>
            {viewing.error && <Alert>{viewing.error}</Alert>}
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-800 ring-1 ring-slate-200">
              {viewing.body}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
}
