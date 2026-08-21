import Link from 'next/link';
import { redirect } from 'next/navigation';
import { TrendChart } from '@/components/TrendChart';
import { Card, EmptyState, StatusBadge } from '@/components/ui';
import { getCurrentUser } from '@/lib/auth/session';
import { formatCurrency, formatRelative } from '@/lib/client';
import { LEAD_STATUSES, LEAD_STATUS_LABELS } from '@/lib/constants';
import { getDashboardStats } from '@/lib/stats';

export const metadata = { title: 'Overview' };

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
}) {
  return (
    <Card>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      {sublabel && <p className="mt-0.5 text-xs text-slate-500">{sublabel}</p>}
    </Card>
  );
}

export default async function OverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const stats = await getDashboardStats(user);
  const isAdmin = user.role === 'admin';
  const firstName = user.name.split(' ')[0];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
          Welcome back, {firstName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isAdmin
            ? 'A live view of every lead across all connected websites.'
            : 'Everything currently assigned to you.'}
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={isAdmin ? 'Total leads' : 'My leads'}
          value={stats.total}
          sublabel={`${stats.today} today`}
        />
        <StatCard
          label="Last 7 days"
          value={stats.last7Days}
          sublabel="New enquiries"
        />
        <StatCard
          label={isAdmin ? 'Unassigned' : 'Open'}
          value={
            isAdmin
              ? stats.unassigned
              : stats.byStatus.new + stats.byStatus.contacted + stats.byStatus.qualified
          }
          sublabel={isAdmin ? 'Waiting for an owner' : 'Still in play'}
        />
        <StatCard
          label="Win rate"
          value={`${stats.conversionRate}%`}
          sublabel={`${stats.byStatus.won} won · ${stats.byStatus.lost} lost`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Leads received
            </h2>
            <span className="text-xs text-slate-500">Last 14 days</span>
          </div>
          <TrendChart data={stats.trend} />
          <div className="mt-2 flex justify-between text-xs text-slate-400">
            <span>
              {new Date(stats.trend[0].date).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
              })}
            </span>
            <span>Today</span>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Pipeline by stage
          </h2>
          <ul className="space-y-3">
            {LEAD_STATUSES.map((status) => {
              const count = stats.byStatus[status];
              const share = stats.total ? (count / stats.total) * 100 : 0;

              return (
                <li key={status}>
                  <div className="flex items-center justify-between text-sm">
                    <Link
                      href={`/dashboard/leads?status=${status}`}
                      className="text-slate-600 hover:text-brand-700"
                    >
                      {LEAD_STATUS_LABELS[status]}
                    </Link>
                    <span className="font-medium text-slate-900">{count}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Open pipeline</dt>
              <dd className="font-medium text-slate-900">
                {formatCurrency(stats.pipelineValue)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Won value</dt>
              <dd className="font-medium text-emerald-700">
                {formatCurrency(stats.wonValue)}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Latest leads
            </h2>
            <Link
              href="/dashboard/leads"
              className="text-sm font-medium text-brand-700 hover:text-brand-800"
            >
              View all
            </Link>
          </div>

          {stats.recent.length === 0 ? (
            <EmptyState
              title="No leads yet"
              description={
                isAdmin
                  ? 'Connect a website on the Integration page and your first enquiry will appear here.'
                  : 'Leads assigned to you will show up here.'
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {stats.recent.map((lead) => (
                <li key={lead.id}>
                  <Link
                    href={`/dashboard/leads/${lead.id}`}
                    className="flex items-center gap-3 py-3 transition-colors hover:bg-slate-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {lead.name}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {lead.site?.name ?? 'Unknown site'}
                        {lead.email ? ` · ${lead.email}` : ''}
                      </span>
                    </span>
                    <StatusBadge status={lead.status} />
                    <span className="w-16 shrink-0 text-right text-xs text-slate-400">
                      {formatRelative(lead.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Leads by website
          </h2>

          {stats.bySite.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing to show yet.</p>
          ) : (
            <ul className="space-y-3">
              {stats.bySite.map((site) => {
                const share = stats.total ? (site.count / stats.total) * 100 : 0;
                return (
                  <li key={site.id}>
                    <div className="flex items-center justify-between text-sm">
                      <Link
                        href={`/dashboard/leads?site=${site.id}`}
                        className="truncate pr-2 text-slate-600 hover:text-brand-700"
                      >
                        {site.name}
                      </Link>
                      <span className="font-medium text-slate-900">
                        {site.count}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-400"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
