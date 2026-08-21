'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { Icon } from './icons';
import {
  Alert,
  Button,
  Card,
  Field,
  Input,
  Select,
  Spinner,
  StatusBadge,
  Textarea,
} from './ui';
import { apiFetch, formatCurrency, formatDateTime } from '@/lib/client';
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  type Role,
} from '@/lib/constants';
import type { LeadDTO, UserDTO } from '@/lib/types';

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
      setError((caught as Error).message);
      return false;
    } finally {
      setPending(false);
    }
  }

  async function onStatusChange(status: string) {
    await patch({ status });
  }

  async function onAssignChange(assignedTo: string) {
    await patch({
      assignedTo: assignedTo === 'unassigned' ? null : assignedTo,
    });
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
      setError((caught as Error).message);
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
      setError((caught as Error).message);
      setPending(false);
    }
  }

  const metaEntries = Object.entries(lead.meta).filter(
    ([, value]) => Boolean(value),
  );
  const customEntries = Object.entries(lead.customFields).filter(
    ([, value]) => value != null && String(value).trim() !== '',
  );

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
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              {lead.name}
            </h1>
            <StatusBadge status={lead.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {lead.site?.name ?? 'Unknown site'}
            {' · '}
            Received {formatDateTime(lead.createdAt)}
          </p>
        </div>

        {isAdmin && (
          <Button variant="danger" onClick={onDelete} disabled={pending}>
            <Icon name="trash" />
            Delete
          </Button>
        )}
      </header>

      {error && <Alert>{error}</Alert>}

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
                    <Input
                      name="email"
                      type="email"
                      defaultValue={lead.email}
                    />
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
                  <Textarea
                    name="message"
                    rows={4}
                    defaultValue={lead.message}
                  />
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

          {(customEntries.length > 0 || metaEntries.length > 0) && (
            <Card>
              <h2 className="mb-4 text-sm font-semibold text-slate-900">
                Source data
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
            <h2 className="mb-4 text-sm font-semibold text-slate-900">
              Activity
            </h2>

            <form onSubmit={onAddNote} className="mb-5 space-y-3">
              <Textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                placeholder="Add a note about this lead…"
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={notePending || !note.trim()}
                >
                  {notePending && <Spinner />}
                  Add note
                </Button>
              </div>
            </form>

            {lead.activities.length === 0 ? (
              <p className="text-sm text-slate-500">No activity yet.</p>
            ) : (
              <ol className="relative space-y-4 border-l border-slate-200 pl-4">
                {lead.activities.map((activity) => (
                  <li key={activity.id} className="relative">
                    <span className="absolute -left-[1.3rem] top-1.5 size-2 rounded-full bg-brand-500 ring-4 ring-white" />
                    <p className="text-sm text-slate-800">{activity.message}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {activity.actor?.name ?? 'System'}
                      {' · '}
                      {formatDateTime(activity.createdAt)}
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
              Pipeline
            </h2>
            <Field label="Status">
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
              Timeline
            </h2>
            <dl className="space-y-3 text-sm">
              <Detail label="Created">{formatDateTime(lead.createdAt)}</Detail>
              <Detail label="Updated">{formatDateTime(lead.updatedAt)}</Detail>
              <Detail label="Assigned">
                {formatDateTime(lead.assignedAt)}
              </Detail>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
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
