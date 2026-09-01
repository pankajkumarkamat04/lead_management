'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { captureError, FormError } from '@/components/FormError';
import { Modal } from './Modal';
import { Icon } from './icons';
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  QualityBadge,
  Select,
  Spinner,
  StatusBadge,
  Textarea,
} from './ui';
import { apiFetch, formatCurrency, formatDateTime, formatDateTimeFull, formatRelative } from '@/lib/client';
import {
  LEAD_QUALITIES,
  LEAD_QUALITY_LABELS,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  MAIL_LOG_STATUS_LABELS,
  MAIL_LOG_STATUS_STYLES,
  type Role,
} from '@/lib/constants';
import type {
  ActivityDTO,
  LeadDTO,
  MailLogDTO,
  MailSettingsDTO,
  Paginated,
  UserDTO,
} from '@/lib/types';
import type { ActivityType } from '@/lib/models/Lead';
import { HARDCODED_MAIL_TEMPLATES } from '@/lib/mail-templates';

type ActivityFilter = 'all' | ActivityType;

export function LeadDetail({
  initialLead,
  agents,
  role,
}: {
  initialLead: LeadDTO;
  agents: UserDTO[];
  role: Role;
}) {
  const router = useRouter();
  const isAdmin = role === 'admin';
  const [lead, setLead] = useState(initialLead);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState('');
  const [notePending, setNotePending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [mailLogs, setMailLogs] = useState<MailLogDTO[]>([]);
  const [mailLogError, setMailLogError] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');

  const loadMailLogs = useCallback(async () => {
    setMailLogError(null);
    try {
      const data = await apiFetch<Paginated<MailLogDTO>>(
        `/api/mail/logs?lead=${lead.id}&pageSize=10`,
      );
      setMailLogs(data.data);
    } catch (caught) {
      setMailLogError(captureError(caught));
    }
  }, [lead.id]);

  useEffect(() => {
    void loadMailLogs();
  }, [loadMailLogs]);

  async function patch(body: Record<string, unknown>) {
    setPending(true);
    setError(null);
    try {
      const data = await apiFetch<{ lead: LeadDTO }>(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      setLead(data.lead);
      return true;
    } catch (caught) {
      setError(captureError(caught));
      return false;
    } finally {
      setPending(false);
    }
  }

  async function onStatusChange(status: string) {
    await patch({ status });
  }

  async function onQualityChange(quality: string) {
    await patch({ quality });
  }

  async function onAssignChange(assignedTo: string) {
    await patch({
      assignedTo: assignedTo === 'unassigned' ? null : assignedTo,
    });
  }

  async function onMarkContacted() {
    await patch({ markContacted: true });
  }

  async function onSaveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await patch({
      name: form.get('name'),
      email: form.get('email'),
      phone: form.get('phone'),
      company: form.get('company'),
      message: form.get('message'),
      value: Number(form.get('value') ?? 0) || 0,
    });
    if (ok) setEditing(false);
  }

  async function onAddNote(event: FormEvent) {
    event.preventDefault();
    if (!note.trim()) return;
    setNotePending(true);
    setError(null);
    try {
      const data = await apiFetch<{ lead: LeadDTO }>(
        `/api/leads/${lead.id}/notes`,
        {
          method: 'POST',
          body: JSON.stringify({ message: note.trim() }),
        },
      );
      setLead(data.lead);
      setNote('');
    } catch (caught) {
      setError(captureError(caught));
    } finally {
      setNotePending(false);
    }
  }

  async function onDelete() {
    if (!confirm('Delete this lead permanently? This cannot be undone.')) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      await apiFetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
      router.replace('/dashboard/leads');
      router.refresh();
    } catch (caught) {
      setError(captureError(caught));
      setPending(false);
    }
  }

  const metaEntries = Object.entries(lead.meta).filter(([, value]) => Boolean(value));
  const customEntries = Object.entries(lead.customFields).filter(
    ([, value]) => value != null && String(value).trim() !== '',
  );

  const activityLog: ActivityDTO[] =
    lead.activities.length > 0
      ? lead.activities
      : [
          {
            id: 'received',
            type: 'created',
            message: `Lead received from ${lead.site?.name ?? 'website'}.`,
            actor: null,
            createdAt: lead.createdAt,
          },
        ];

  const filteredActivities =
    activityFilter === 'all'
      ? activityLog
      : activityLog.filter((item) => item.type === activityFilter);

  const statusChanges = activityLog.filter((item) => item.type === 'status');

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/dashboard/leads"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          <Icon name="back" />
          Back to leads
        </Link>
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              {lead.name}
            </h1>
            <StatusBadge status={lead.status} />
            <QualityBadge quality={lead.quality} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {lead.site?.name ?? 'Unknown site'}
            {lead.assignedTo?.name ? ` · Owner ${lead.assignedTo.name}` : ' · Unassigned'}
          </p>
        </div>

        {isAdmin && (
          <Button variant="danger" onClick={onDelete} disabled={pending}>
            <Icon name="trash" />
            Delete
          </Button>
        )}
      </header>

      {/* Received timestamp — primary “when did this arrive?” signal */}
      <Card className="border-l-4 border-l-brand-600">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
              Lead received
            </p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
              {formatDateTimeFull(lead.createdAt)}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {formatRelative(lead.createdAt)}
              {lead.meta.source ? ` · via ${lead.meta.source}` : ''}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs font-medium text-slate-500">Last updated</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {formatDateTime(lead.updatedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Last contact</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {formatDateTime(lead.lastContactedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Assigned</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {formatDateTime(lead.assignedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Lead ID</dt>
              <dd className="mt-0.5 break-all font-mono text-xs text-slate-700">
                {lead.id}
              </dd>
            </div>
          </dl>
        </div>
      </Card>

      {/* Quick actions */}
      <Card className="flex flex-wrap gap-2 p-3">
        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
            onClick={() => {
              void patch({ markContacted: true });
            }}
          >
            <Icon name="phone" />
            Call
          </a>
        )}
        <Button
          variant="secondary"
          onClick={() => setShowEmail(true)}
          disabled={!lead.email}
          title={lead.email ? undefined : 'Add an email address first'}
        >
          <Icon name="mail" />
          Email lead
        </Button>
        <Button
          variant="secondary"
          onClick={onMarkContacted}
          disabled={pending}
        >
          <Icon name="check" />
          Mark contacted
        </Button>
        {lead.email && (
          <a
            href={`mailto:${lead.email}`}
            className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Open mail app
          </a>
        )}
      </Card>

      {error && <FormError error={error} />}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Contact details
              </h2>
              {!editing && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-sm font-medium text-brand-700 hover:text-brand-800"
                >
                  Edit
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={onSaveDetails} className="space-y-4">
                <Field label="Name">
                  <Input name="name" defaultValue={lead.name} required />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email">
                    <Input name="email" type="email" defaultValue={lead.email} />
                  </Field>
                  <Field label="Phone">
                    <Input name="phone" defaultValue={lead.phone} />
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Company">
                    <Input name="company" defaultValue={lead.company} />
                  </Field>
                  <Field label="Estimated value">
                    <Input
                      name="value"
                      type="number"
                      min="0"
                      step="1"
                      defaultValue={lead.value}
                    />
                  </Field>
                </div>
                <Field label="Message">
                  <Textarea name="message" rows={4} defaultValue={lead.message} />
                </Field>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={pending}>
                    {pending && <Spinner />}
                    Save
                  </Button>
                </div>
              </form>
            ) : (
              <dl className="grid gap-4 sm:grid-cols-2">
                <Detail label="Email">
                  {lead.email ? (
                    <a
                      href={`mailto:${lead.email}`}
                      className="inline-flex items-center gap-1.5 text-brand-700 hover:underline"
                    >
                      <Icon name="mail" className="size-3.5" />
                      {lead.email}
                    </a>
                  ) : (
                    '—'
                  )}
                </Detail>
                <Detail label="Phone">
                  {lead.phone ? (
                    <a
                      href={`tel:${lead.phone}`}
                      className="inline-flex items-center gap-1.5 text-brand-700 hover:underline"
                    >
                      <Icon name="phone" className="size-3.5" />
                      {lead.phone}
                    </a>
                  ) : (
                    '—'
                  )}
                </Detail>
                <Detail label="Company">{lead.company || '—'}</Detail>
                <Detail label="Value">{formatCurrency(lead.value)}</Detail>
                <Detail label="Status">
                  <StatusBadge status={lead.status} />
                </Detail>
                <Detail label="Quality">
                  <QualityBadge quality={lead.quality} />
                </Detail>
                {lead.message && (
                  <div className="sm:col-span-2">
                    <Detail label="Message">
                      <p className="whitespace-pre-wrap text-slate-700">
                        {lead.message}
                      </p>
                    </Detail>
                  </div>
                )}
              </dl>
            )}
          </Card>

          <Card>
            <h2 className="mb-4 text-sm font-semibold text-slate-900">
              Full lead details
            </h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Detail label="Received (exact)">
                {formatDateTimeFull(lead.createdAt)}
              </Detail>
              <Detail label="Received (relative)">
                {formatRelative(lead.createdAt)}
              </Detail>
              <Detail label="Last updated">
                {formatDateTimeFull(lead.updatedAt)}
              </Detail>
              <Detail label="Last contacted">
                {lead.lastContactedAt
                  ? formatDateTimeFull(lead.lastContactedAt)
                  : 'Never'}
              </Detail>
              <Detail label="Assigned at">
                {lead.assignedAt ? formatDateTimeFull(lead.assignedAt) : '—'}
              </Detail>
              <Detail label="Assigned to">
                {lead.assignedTo?.name ?? 'Unassigned'}
              </Detail>
              <Detail label="Website">{lead.site?.name ?? '—'}</Detail>
              <Detail label="Pipeline status">
                {LEAD_STATUS_LABELS[lead.status]}
              </Detail>
              <Detail label="Lead quality">
                {LEAD_QUALITY_LABELS[lead.quality]}
              </Detail>
              <Detail label="Estimated value">
                {formatCurrency(lead.value)}
              </Detail>
              <Detail label="Tags">
                {lead.tags.length > 0 ? lead.tags.join(', ') : 'None'}
              </Detail>
              <Detail label="Lead ID">
                <span className="break-all font-mono text-xs">{lead.id}</span>
              </Detail>
            </dl>
          </Card>

          {(customEntries.length > 0 || metaEntries.length > 0) && (
            <Card>
              <h2 className="mb-4 text-sm font-semibold text-slate-900">
                Source & tracking data
              </h2>
              <dl className="grid gap-3 sm:grid-cols-2">
                {metaEntries.map(([key, value]) => (
                  <Detail key={key} label={labelize(key)}>
                    <span className="break-all">{value}</span>
                  </Detail>
                ))}
                {customEntries.map(([key, value]) => (
                  <Detail key={key} label={labelize(key)}>
                    <span className="break-all">{String(value)}</span>
                  </Detail>
                ))}
              </dl>
            </Card>
          )}

          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">
                Emails to this lead
              </h2>
              <Button
                variant="ghost"
                className="px-2 py-1 text-xs"
                onClick={() => setShowEmail(true)}
                disabled={!lead.email}
              >
                Compose
              </Button>
            </div>
            {mailLogError && (
              <FormError error={mailLogError} />
            )}
            {mailLogs.length === 0 && !mailLogError ? (
              <p className="text-sm text-slate-500">No emails sent yet.</p>
            ) : mailLogs.length === 0 ? null : (
              <ul className="divide-y divide-slate-100">
                {mailLogs.map((log) => (
                  <li key={log.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {log.subject}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {formatDateTime(log.createdAt)}
                          {log.sentBy?.name ? ` · ${log.sentBy.name}` : ''}
                        </p>
                        {log.error && (
                          <p className="mt-1 text-xs text-rose-600">{log.error}</p>
                        )}
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${MAIL_LOG_STATUS_STYLES[log.status]}`}
                      >
                        {MAIL_LOG_STATUS_LABELS[log.status]}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-xs text-slate-500">
                      {log.body}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Activity &amp; change log
              </h2>
              <p className="text-xs text-slate-500">
                {activityLog.length} event{activityLog.length === 1 ? '' : 's'}
              </p>
            </div>

            <form onSubmit={onAddNote} className="mb-5 space-y-3">
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Add a note about this lead…"
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={notePending || !note.trim()}>
                  {notePending && <Spinner />}
                  Add note
                </Button>
              </div>
            </form>

            <div className="mb-4 flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'status', label: 'Status' },
                  { id: 'quality', label: 'Quality' },
                  { id: 'assign', label: 'Assign' },
                  { id: 'email', label: 'Email' },
                  { id: 'note', label: 'Notes' },
                  { id: 'created', label: 'Created' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActivityFilter(tab.id)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                    activityFilter === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                  {tab.id === 'status' && statusChanges.length > 0
                    ? ` (${statusChanges.length})`
                    : ''}
                </button>
              ))}
            </div>

            {filteredActivities.length === 0 ? (
              <p className="text-sm text-slate-500">
                No {activityFilter === 'all' ? '' : `${activityFilter} `}
                events yet.
              </p>
            ) : (
              <ol className="relative space-y-4 border-l border-slate-200 pl-4">
                {filteredActivities.map((activity) => (
                  <li key={activity.id} className="relative">
                    <span
                      className={`absolute -left-[1.35rem] top-1.5 size-2.5 rounded-full ring-4 ring-white ${activityDotClass(activity.type)}`}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <ActivityTypeBadge type={activity.type} />
                      <time
                        dateTime={activity.createdAt}
                        className="text-xs text-slate-500"
                        title={formatDateTimeFull(activity.createdAt)}
                      >
                        {formatDateTimeFull(activity.createdAt)}
                        <span className="text-slate-400">
                          {' '}
                          · {formatRelative(activity.createdAt)}
                        </span>
                      </time>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-800">
                      {activity.message}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      By {activity.actor?.name ?? 'System'}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-slate-900">
              Lead management
            </h2>
            <Field label="Pipeline status">
              <Select
                value={lead.status}
                onChange={(event) => onStatusChange(event.target.value)}
                disabled={pending}
              >
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {LEAD_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="mt-4">
              <Field label="Lead quality">
                <Select
                  value={lead.quality}
                  onChange={(event) => onQualityChange(event.target.value)}
                  disabled={pending}
                >
                  {LEAD_QUALITIES.map((quality) => (
                    <option key={quality} value={quality}>
                      {LEAD_QUALITY_LABELS[quality]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {isAdmin && (
              <div className="mt-4">
                <Field label="Assigned to">
                  <Select
                    value={lead.assignedTo?.id ?? 'unassigned'}
                    onChange={(event) => onAssignChange(event.target.value)}
                    disabled={pending}
                  >
                    <option value="unassigned">Unassigned</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            )}

            {!isAdmin && (
              <p className="mt-4 text-sm text-slate-500">
                Owner:{' '}
                <span className="font-medium text-slate-800">
                  {lead.assignedTo?.name ?? 'Unassigned'}
                </span>
              </p>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-900">
              Timestamps
            </h2>
            <dl className="space-y-3 text-sm">
              <Detail label="Received">
                <span className="block">{formatDateTimeFull(lead.createdAt)}</span>
                <span className="text-xs text-slate-500">
                  {formatRelative(lead.createdAt)}
                </span>
              </Detail>
              <Detail label="Last updated">
                <span className="block">{formatDateTimeFull(lead.updatedAt)}</span>
                <span className="text-xs text-slate-500">
                  {formatRelative(lead.updatedAt)}
                </span>
              </Detail>
              <Detail label="Assigned">
                {lead.assignedAt ? (
                  <>
                    <span className="block">
                      {formatDateTimeFull(lead.assignedAt)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatRelative(lead.assignedAt)}
                    </span>
                  </>
                ) : (
                  '—'
                )}
              </Detail>
              <Detail label="Last contact">
                {lead.lastContactedAt ? (
                  <>
                    <span className="block">
                      {formatDateTimeFull(lead.lastContactedAt)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatRelative(lead.lastContactedAt)}
                    </span>
                  </>
                ) : (
                  'Never'
                )}
              </Detail>
            </dl>
          </Card>

          {statusChanges.length > 0 && (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-slate-900">
                Status history
              </h2>
              <ol className="space-y-3">
                {statusChanges.map((item) => (
                  <li key={item.id} className="text-sm">
                    <p className="text-slate-800">{item.message}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDateTimeFull(item.createdAt)}
                      {item.actor?.name ? ` · ${item.actor.name}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      </div>

      <EmailLeadModal
        open={showEmail}
        onClose={() => setShowEmail(false)}
        lead={lead}
        onSent={(updated) => {
          setLead(updated);
          setShowEmail(false);
          void loadMailLogs();
        }}
      />
    </div>
  );
}

function EmailLeadModal({
  open,
  onClose,
  lead,
  onSent,
}: {
  open: boolean;
  onClose: () => void;
  lead: LeadDTO;
  onSent: (lead: LeadDTO) => void;
}) {
  const [mailReady, setMailReady] = useState(true);
  const [templateId, setTemplateId] = useState(HARDCODED_MAIL_TEMPLATES[0]?.id ?? '');
  const [subject, setSubject] = useState(HARDCODED_MAIL_TEMPLATES[0]?.subject ?? '');
  const [body, setBody] = useState(HARDCODED_MAIL_TEMPLATES[0]?.body ?? '');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    const first = HARDCODED_MAIL_TEMPLATES[0];
    setTemplateId(first?.id ?? '');
    setSubject(first?.subject ?? '');
    setBody(first?.body ?? '');

    void (async () => {
      try {
        const settings = await apiFetch<{ settings: MailSettingsDTO }>(
          '/api/mail/settings',
        );
        setMailReady(settings.settings.enabled && settings.settings.configured);
      } catch (caught) {
        setMailReady(false);
        setError(captureError(caught));
      }
    })();
  }, [open]);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const template = HARDCODED_MAIL_TEMPLATES.find((row) => row.id === id);
    if (!template) return;
    setSubject(template.subject);
    setBody(template.body);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const data = await apiFetch<{ lead: LeadDTO }>(
        `/api/leads/${lead.id}/email`,
        {
          method: 'POST',
          body: JSON.stringify({
            subject,
            body,
            templateId: templateId || null,
            applyVars: true,
          }),
        },
      );
      onSent(data.lead);
    } catch (caught) {
      setError(captureError(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Email lead"
      description={`Sending to ${lead.email || '—'}`}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {!mailReady && (
          <Alert tone="info">
            Mail is not connected yet. An admin must configure SMTP under{' '}
            <Link href="/dashboard/mail" className="font-medium underline">
              Mail → Connection
            </Link>
            .
          </Alert>
        )}
        {error && <FormError error={error} />}

        <Field label="Template">
          <Select
            value={templateId}
            onChange={(event) => applyTemplate(event.target.value)}
          >
            {HARDCODED_MAIL_TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
            <option value="">Custom message</option>
          </Select>
        </Field>

        <Field label="Subject">
          <Input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            required
            placeholder="Thanks for contacting us, {{name}}"
          />
        </Field>

        <Field
          label="Message"
          hint="Placeholders like {{name}} and {{site}} are filled automatically."
        >
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
            rows={10}
            placeholder="Hi {{name}}, …"
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending || !lead.email || !mailReady}>
            {pending && <Spinner />}
            Send email
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ActivityTypeBadge({ type }: { type: ActivityType }) {
  const labels: Record<ActivityType, string> = {
    created: 'Created',
    note: 'Note',
    status: 'Status',
    quality: 'Quality',
    assign: 'Assign',
    email: 'Email',
  };
  const styles: Record<ActivityType, string> = {
    created: 'bg-slate-100 text-slate-700',
    note: 'bg-sky-50 text-sky-700',
    status: 'bg-violet-50 text-violet-700',
    quality: 'bg-orange-50 text-orange-700',
    assign: 'bg-amber-50 text-amber-800',
    email: 'bg-emerald-50 text-emerald-700',
  };

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${styles[type]}`}
    >
      {labels[type]}
    </span>
  );
}

function activityDotClass(type: ActivityType): string {
  switch (type) {
    case 'status':
      return 'bg-violet-500';
    case 'quality':
      return 'bg-orange-500';
    case 'email':
      return 'bg-emerald-500';
    case 'assign':
      return 'bg-amber-500';
    case 'note':
      return 'bg-sky-500';
    default:
      return 'bg-brand-500';
  }
}

function Detail({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

function labelize(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}
