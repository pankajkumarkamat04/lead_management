'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  StatusBadge,
  Textarea,
} from './ui';
import { apiFetch, formatRelative } from '@/lib/client';
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type Role } from '@/lib/constants';
import type { LeadDTO, Paginated, SiteDTO, UserDTO } from '@/lib/types';

export interface LeadFilters {
  search: string;
  status: string;
  site: string;
  assignedTo: string;
}

const PAGE_SIZE = 25;

export function LeadsExplorer({
  role,
  sites,
  agents,
  initialFilters,
}: {
  role: Role;
  sites: SiteDTO[];
  agents: UserDTO[];
  initialFilters: LeadFilters;
}) {
  const isAdmin = role === 'admin';

  const [filters, setFilters] = useState<LeadFilters>(initialFilters);
  const [searchDraft, setSearchDraft] = useState(initialFilters.search);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<LeadDTO> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [bulkTarget, setBulkTarget] = useState('');
  const [bulkPending, setBulkPending] = useState(false);

  // Typing in the search box should not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) =>
        current.search === searchDraft
          ? current
          : { ...current, search: searchDraft },
      );
    }, 350);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.status) params.set('status', filters.status);
    if (filters.site) params.set('site', filters.site);
    if (filters.assignedTo) params.set('assignedTo', filters.assignedTo);
    params.set('page', String(page));
    params.set('pageSize', String(PAGE_SIZE));
    return params;
  }, [filters, page]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<Paginated<LeadDTO>>(`/api/leads?${query}`);
      setResult(data);
      setSelected(new Set());
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  // Keep the address bar shareable without triggering a Next.js navigation.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const visible = new URLSearchParams(query);
    visible.delete('pageSize');
    if (visible.get('page') === '1') visible.delete('page');
    const search = visible.toString();
    window.history.replaceState(
      null,
      '',
      search ? `?${search}` : window.location.pathname,
    );
  }, [query]);

  function updateFilter(key: keyof LeadFilters, value: string) {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setPage(1);
    setSearchDraft('');
    setFilters({ search: '', status: '', site: '', assignedTo: '' });
  }

  const leads = result?.data ?? [];
  const hasFilters = Boolean(
    filters.search || filters.status || filters.site || filters.assignedTo,
  );

  function toggleOne(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((current) =>
      current.size === leads.length
        ? new Set()
        : new Set(leads.map((lead) => lead.id)),
    );
  }

  async function runBulkAssign() {
    setBulkPending(true);
    setError(null);
    try {
      await apiFetch('/api/leads/bulk-assign', {
        method: 'POST',
        body: JSON.stringify({
          leadIds: Array.from(selected),
          assignedTo: bulkTarget === 'unassigned' ? null : bulkTarget,
        }),
      });
      setBulkTarget('');
      await load();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBulkPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Leads
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {result
              ? `${result.total} lead${result.total === 1 ? '' : 's'}${hasFilters ? ' matching your filters' : ''}`
              : 'Loading…'}
          </p>
        </div>

        <Button onClick={() => setShowCreate(true)}>
          <Icon name="plus" />
          Add lead
        </Button>
      </header>

      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            />
            <Input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search name, email, phone…"
              className="pl-9"
              aria-label="Search leads"
            />
          </div>

          <Select
            value={filters.status}
            onChange={(event) => updateFilter('status', event.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {LEAD_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>

          <Select
            value={filters.site}
            onChange={(event) => updateFilter('site', event.target.value)}
            aria-label="Filter by website"
          >
            <option value="">All websites</option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </Select>

          {isAdmin && (
            <Select
              value={filters.assignedTo}
              onChange={(event) => updateFilter('assignedTo', event.target.value)}
              aria-label="Filter by assignee"
            >
              <option value="">Anyone</option>
              <option value="unassigned">Unassigned</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </Select>
          )}
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            Clear filters
          </button>
        )}
      </Card>

      {error && <Alert>{error}</Alert>}

      {isAdmin && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-white">
          <span className="text-sm font-medium">
            {selected.size} selected
          </span>
          <Select
            value={bulkTarget}
            onChange={(event) => setBulkTarget(event.target.value)}
            aria-label="Assign selected leads to"
            className="w-auto min-w-44 flex-1 sm:flex-none"
          >
            <option value="">Assign to…</option>
            <option value="unassigned">Unassigned queue</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </Select>
          <Button
            onClick={runBulkAssign}
            disabled={!bulkTarget || bulkPending}
            className="bg-white text-slate-900 hover:bg-slate-100"
          >
            {bulkPending && <Spinner />}
            Apply
          </Button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-sm text-slate-300 hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}

      {loading && !result ? (
        <Card className="flex items-center justify-center py-16 text-slate-500">
          <Spinner className="mr-2" />
          Loading leads…
        </Card>
      ) : leads.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No leads match those filters' : 'No leads yet'}
          description={
            hasFilters
              ? 'Try widening your search or clearing the filters.'
              : 'Connect a website on the Integration page, or add a lead by hand.'
          }
          action={
            hasFilters ? (
              <Button variant="secondary" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : (
              <Button onClick={() => setShowCreate(true)}>Add lead</Button>
            )
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden p-0 md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  {isAdmin && (
                    <th scope="col" className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        aria-label="Select all leads on this page"
                        checked={
                          leads.length > 0 && selected.size === leads.length
                        }
                        onChange={toggleAll}
                        className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                    </th>
                  )}
                  <th scope="col" className="px-4 py-3 font-medium">Lead</th>
                  <th scope="col" className="px-4 py-3 font-medium">Website</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  {isAdmin && (
                    <th scope="col" className="px-4 py-3 font-medium">Owner</th>
                  )}
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Received
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50">
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${lead.name}`}
                          checked={selected.has(lead.id)}
                          onChange={() => toggleOne(lead.id)}
                          className="size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className="font-medium text-slate-900 hover:text-brand-700"
                      >
                        {lead.name}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {[lead.email, lead.phone].filter(Boolean).join(' · ') ||
                          'No contact details'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {lead.site?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-slate-600">
                        {lead.assignedTo?.name || (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-right text-slate-500">
                      {formatRelative(lead.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {leads.map((lead) => (
              <li key={lead.id}>
                <Link
                  href={`/dashboard/leads/${lead.id}`}
                  className="block rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">
                        {lead.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {lead.site?.name ?? '—'}
                      </p>
                    </div>
                    <StatusBadge status={lead.status} />
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-slate-500">
                    {lead.email && <p className="truncate">{lead.email}</p>}
                    {lead.phone && <p>{lead.phone}</p>}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-500">
                    <span>
                      {lead.assignedTo?.name ?? 'Unassigned'}
                    </span>
                    <span>{formatRelative(lead.createdAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {result && result.totalPages > 1 && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-slate-500">
                Page {result.page} of {result.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={result.page <= 1 || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={result.page >= result.totalPages || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <AddLeadModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        sites={sites}
        agents={agents}
        isAdmin={isAdmin}
        onCreated={() => {
          setShowCreate(false);
          void load();
        }}
      />
    </div>
  );
}

function AddLeadModal({
  open,
  onClose,
  sites,
  agents,
  isAdmin,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  sites: SiteDTO[];
  agents: UserDTO[];
  isAdmin: boolean;
  onCreated: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const assignedTo = String(form.get('assignedTo') ?? '');

    try {
      await apiFetch('/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          site: form.get('site'),
          name: form.get('name'),
          email: form.get('email'),
          phone: form.get('phone'),
          company: form.get('company'),
          message: form.get('message'),
          value: Number(form.get('value') ?? 0) || 0,
          assignedTo: assignedTo || null,
        }),
      });
      onCreated();
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
      title="Add a lead"
      description="For enquiries that arrive by phone, email, or in person."
    >
      {sites.length === 0 ? (
        <Alert tone="info">
          Add a website first — every lead belongs to one of your sites.
        </Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}

          <Field label="Website">
            <Select name="site" required defaultValue={sites[0]?.id}>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Name">
            <Input name="name" required placeholder="Jane Cooper" />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email">
              <Input name="email" type="email" placeholder="jane@example.com" />
            </Field>
            <Field label="Phone">
              <Input name="phone" placeholder="+1 555 0100" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company">
              <Input name="company" placeholder="Optional" />
            </Field>
            <Field label="Estimated value">
              <Input name="value" type="number" min="0" step="1" defaultValue={0} />
            </Field>
          </div>

          {isAdmin && (
            <Field label="Assign to" hint="Leave blank to hold in the unassigned queue.">
              <Select name="assignedTo" defaultValue="">
                <option value="">Unassigned</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Notes">
            <Textarea name="message" rows={3} placeholder="What did they ask about?" />
          </Field>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner />}
              Save lead
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
