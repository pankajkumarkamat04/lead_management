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
} from './ui';
import { apiFetch, formatDateTime } from '@/lib/client';
import { ROLES, type Role } from '@/lib/constants';
import type { UserDTO } from '@/lib/types';

type TeamMember = UserDTO & { openLeads?: number };

export function UsersManager({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<TeamMember | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ data: TeamMember[] }>('/api/users');
      setUsers(data.data);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleActive(user: TeamMember) {
    setError(null);
    try {
      const data = await apiFetch<{ user: UserDTO }>(`/api/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      setUsers((current) =>
        current.map((row) =>
          row.id === user.id
            ? { ...row, ...data.user, openLeads: row.openLeads }
            : row,
        ),
      );
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  async function removeUser(user: TeamMember) {
    if (
      !confirm(
        `Remove ${user.name}? Their open leads will return to the unassigned queue.`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      await apiFetch(`/api/users/${user.id}`, { method: 'DELETE' });
      setUsers((current) => current.filter((row) => row.id !== user.id));
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
            Team
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Admins manage sites and assignments. Agents only see their own leads.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Icon name="plus" />
          Add member
        </Button>
      </header>

      {error && <Alert>{error}</Alert>}

      {loading ? (
        <Card className="flex items-center justify-center py-16 text-slate-500">
          <Spinner className="mr-2" />
          Loading team…
        </Card>
      ) : users.length === 0 ? (
        <EmptyState
          title="No team members"
          description="Create an agent account to start assigning leads."
          action={
            <Button onClick={() => setShowCreate(true)}>Add member</Button>
          }
        />
      ) : (
        <>
          <Card className="hidden overflow-hidden p-0 md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Open leads</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Last login</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">
                        {user.name}
                        {user.id === currentUserId && (
                          <span className="ml-2 text-xs font-normal text-slate-400">
                            (you)
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">
                      {user.role}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {user.openLeads ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          user.isActive
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                            : 'bg-slate-100 text-slate-600 ring-slate-500/20'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {user.lastLoginAt
                        ? formatDateTime(user.lastLoginAt)
                        : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => setEditing(user)}
                          className="px-2.5 py-1.5"
                        >
                          Edit
                        </Button>
                        {user.id !== currentUserId && (
                          <>
                            <Button
                              variant="ghost"
                              onClick={() => toggleActive(user)}
                              className="px-2.5 py-1.5"
                            >
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => removeUser(user)}
                              className="px-2.5 py-1.5"
                            >
                              <Icon name="trash" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <ul className="space-y-3 md:hidden">
            {users.map((user) => (
              <li key={user.id}>
                <Card>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">
                      {user.role}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {user.openLeads ?? 0} open leads ·{' '}
                    {user.isActive ? 'Active' : 'Inactive'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setEditing(user)}
                    >
                      Edit
                    </Button>
                    {user.id !== currentUserId && (
                      <>
                        <Button
                          variant="ghost"
                          onClick={() => toggleActive(user)}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => removeUser(user)}
                        >
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      <UserFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add team member"
        onSaved={(user) => {
          setUsers((current) => [...current, { ...user, openLeads: 0 }]);
          setShowCreate(false);
        }}
      />

      <UserFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        user={editing}
        title="Edit team member"
        onSaved={(user) => {
          setUsers((current) =>
            current.map((row) =>
              row.id === user.id
                ? { ...row, ...user, openLeads: row.openLeads }
                : row,
            ),
          );
          setEditing(null);
        }}
      />
    </div>
  );
}

function UserFormModal({
  open,
  onClose,
  user,
  title,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  user?: TeamMember | null;
  title: string;
  onSaved: (user: UserDTO) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');

    try {
      if (user) {
        const body: Record<string, unknown> = {
          name: form.get('name'),
          role: form.get('role') as Role,
        };
        if (password) body.password = password;

        const data = await apiFetch<{ user: UserDTO }>(
          `/api/users/${user.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify(body),
          },
        );
        onSaved(data.user);
      } else {
        const data = await apiFetch<{ user: UserDTO }>('/api/users', {
          method: 'POST',
          body: JSON.stringify({
            name: form.get('name'),
            email: form.get('email'),
            password,
            role: form.get('role'),
          }),
        });
        onSaved(data.user);
      }
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
      description="Agents can only work leads assigned to them. Admins see everything."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert>{error}</Alert>}

        <Field label="Full name">
          <Input
            name="name"
            required
            defaultValue={user?.name ?? ''}
            placeholder="Alex Rivera"
          />
        </Field>

        {!user && (
          <Field label="Email">
            <Input
              name="email"
              type="email"
              required
              placeholder="alex@company.com"
            />
          </Field>
        )}

        <Field
          label={user ? 'New password' : 'Password'}
          hint={
            user
              ? 'Leave blank to keep the current password.'
              : 'At least 8 characters.'
          }
        >
          <Input
            name="password"
            type="password"
            required={!user}
            minLength={user ? undefined : 8}
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </Field>

        <Field label="Role">
          <Select name="role" defaultValue={user?.role ?? 'agent'}>
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role === 'admin' ? 'Admin' : 'Agent'}
              </option>
            ))}
          </Select>
        </Field>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Spinner />}
            {user ? 'Save changes' : 'Create member'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
