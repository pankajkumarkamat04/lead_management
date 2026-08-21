'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Modal } from './Modal';
import { Icon } from './icons';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Select,
  Spinner,
  Textarea,
} from './ui';
import { apiFetch, formatDateTime, formatRelative } from '@/lib/client';
import type { SiteDTO, UserDTO } from '@/lib/types';

export function SitesManager({ agents }: { agents: UserDTO[] }) {
  const [sites, setSites] = useState<SiteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<SiteDTO | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ data: SiteDTO[] }>('/api/sites');
      setSites(data.data);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyKey(site: SiteDTO) {
    try {
      await navigator.clipboard.writeText(site.apiKey);
      setCopiedId(site.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError('Could not copy the API key. Select it manually.');
    }
  }

  async function rotateKey(site: SiteDTO) {
    if (
      !confirm(
        `Rotate the API key for ${site.name}? Forms using the old key will stop working until you update them.`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      const data = await apiFetch<{ site: SiteDTO }>(
        `/api/sites/${site.id}/rotate-key`,
        { method: 'POST' },
      );
      setSites((current) =>
        current.map((row) => (row.id === site.id ? data.site : row)),
      );
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  async function toggleActive(site: SiteDTO) {
    setError(null);
    try {
      const data = await apiFetch<{ site: SiteDTO }>(`/api/sites/${site.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !site.isActive }),
      });
      setSites((current) =>
        current.map((row) => (row.id === site.id ? data.site : row)),
      );
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  async function removeSite(site: SiteDTO) {
    if (!confirm(`Delete ${site.name}? This only works if it has no leads.`)) {
      return;
    }
    setError(null);
    try {
      await apiFetch(`/api/sites/${site.id}`, { method: 'DELETE' });
      setSites((current) => current.filter((row) => row.id !== site.id));
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Websites
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Each site gets its own API key. Use that key on the matching form.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Icon name="plus" />
          Add website
        </Button>
      </header>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <Card className="flex items-center justify-center py-16 text-slate-500">
          <Spinner className="mr-2" />
          Loading websites…
        </Card>
      ) : sites.length === 0 ? (
        <EmptyState
          title="No websites connected"
          description="Add your first site, then paste its API key into the contact form."
          action={
            <Button onClick={() => setShowCreate(true)}>Add website</Button>
          }
        />
      ) : (
        <ul className="space-y-4">
          {sites.map((site) => (
            <li key={site.id}>
              <Card className="p-0 overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold text-slate-900">
                        {site.name}
                      </h2>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          site.isActive
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                            : 'bg-slate-100 text-slate-600 ring-slate-500/20'
                        }`}
                      >
                        {site.isActive ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">{site.domain}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setEditing(site)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => toggleActive(site)}
                    >
                      {site.isActive ? 'Pause' : 'Activate'}
                    </Button>
                    <Button variant="danger" onClick={() => removeSite(site)}>
                      <Icon name="trash" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Leads
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {site.leadCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Last lead
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {site.lastLeadAt
                        ? formatRelative(site.lastLeadAt)
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Default assignee
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {site.defaultAssignee?.name ?? 'Unassigned queue'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Added
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {formatDateTime(site.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    API key
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="max-w-full truncate rounded-md bg-white px-2.5 py-1.5 font-mono text-xs text-slate-800 ring-1 ring-slate-200">
                      {site.apiKey}
                    </code>
                    <Button
                      variant="secondary"
                      onClick={() => copyKey(site)}
                      className="px-2.5"
                    >
                      <Icon name={copiedId === site.id ? 'check' : 'copy'} />
                      {copiedId === site.id ? 'Copied' : 'Copy'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => rotateKey(site)}
                      className="px-2.5"
                    >
                      <Icon name="refresh" />
                      Rotate
                    </Button>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <SiteFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        agents={agents}
        title="Add website"
        onSaved={(site) => {
          setSites((current) =>
            [...current, site].sort((a, b) => a.name.localeCompare(b.name)),
          );
          setShowCreate(false);
        }}
      />

      <SiteFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        agents={agents}
        site={editing}
        title="Edit website"
        onSaved={(site) => {
          setSites((current) =>
            current.map((row) => (row.id === site.id ? site : row)),
          );
          setEditing(null);
        }}
      />
    </div>
  );
}

function SiteFormModal({
  open,
  onClose,
  agents,
  site,
  title,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  agents: UserDTO[];
  site?: SiteDTO | null;
  title: string;
  onSaved: (site: SiteDTO) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const assignee = String(form.get('defaultAssignee') ?? '');
    const originsRaw = String(form.get('allowedOrigins') ?? '');
    const allowedOrigins = originsRaw
      .split(/[\n,]+/)
      .map((value) => value.trim())
      .filter(Boolean);

    const body = {
      name: form.get('name'),
      domain: form.get('domain'),
      notes: form.get('notes'),
      defaultAssignee: assignee || null,
      allowedOrigins,
    };

    try {
      const data = site
        ? await apiFetch<{ site: SiteDTO }>(`/api/sites/${site.id}`, {
            method: 'PATCH',
            body: JSON.stringify(body),
          })
        : await apiFetch<{ site: SiteDTO }>('/api/sites', {
            method: 'POST',
            body: JSON.stringify(body),
          });
      onSaved(data.site);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setPending(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description="Give each marketing site a name and domain so leads stay organised."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}

        <Field label="Display name">
          <Input
            name="name"
            required
            defaultValue={site?.name ?? ''}
            placeholder="MaxKeys"
          />
        </Field>

        <Field label="Domain" hint="Without https:// — e.g. maxkeys.online">
          <Input
            name="domain"
            required
            defaultValue={site?.domain ?? ''}
            placeholder="maxkeys.online"
          />
        </Field>

        <Field
          label="Allowed origins"
          hint="Optional. One hostname per line. Leave blank to accept posts from any origin (API key still required)."
        >
          <Textarea
            name="allowedOrigins"
            rows={3}
            defaultValue={site?.allowedOrigins.join('\n') ?? ''}
            placeholder={'maxkeys.online\nwww.maxkeys.online'}
          />
        </Field>

        <Field label="Default assignee">
          <Select
            name="defaultAssignee"
            defaultValue={site?.defaultAssignee?.id ?? ''}
          >
            <option value="">Unassigned queue</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Notes">
          <Textarea
            name="notes"
            rows={2}
            defaultValue={site?.notes ?? ''}
            placeholder="Optional internal note"
          />
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            {site ? 'Save changes' : 'Create website'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
