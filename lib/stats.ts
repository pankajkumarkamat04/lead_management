import { Types } from 'mongoose';
import { LEAD_STATUSES, type LeadStatus } from './constants';
import { scopeForUser } from './leads';
import { Lead } from './models/Lead';
import { Site } from './models/Site';
import { serializeLead } from './serialize';
import type { IUser } from './models/User';
import type { LeadDTO } from './types';

export interface DashboardStats {
  total: number;
  byStatus: Record<LeadStatus, number>;
  today: number;
  last7Days: number;
  unassigned: number;
  pipelineValue: number;
  wonValue: number;
  conversionRate: number;
  trend: { date: string; count: number }[];
  bySite: { id: string; name: string; count: number }[];
  recent: LeadDTO[];
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export async function getDashboardStats(user: IUser): Promise<DashboardStats> {
  const scope = scopeForUser(user);
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfDay(new Date(now.getTime() - 6 * 86_400_000));
  const trendStart = startOfDay(new Date(now.getTime() - 13 * 86_400_000));

  const [
    total,
    statusRows,
    today,
    last7Days,
    unassigned,
    valueRows,
    trendRows,
    siteRows,
    recentRows,
  ] = await Promise.all([
    Lead.countDocuments(scope),
    Lead.aggregate<{ _id: LeadStatus; count: number }>([
      { $match: scope },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Lead.countDocuments({ ...scope, createdAt: { $gte: todayStart } }),
    Lead.countDocuments({ ...scope, createdAt: { $gte: weekStart } }),
    // Agents never see the shared unassigned queue, so it is always zero.
    user.role === 'admin'
      ? Lead.countDocuments({ assignedTo: null })
      : Promise.resolve(0),
    Lead.aggregate<{ _id: string | null; open: number; won: number }>([
      { $match: scope },
      {
        $group: {
          _id: null,
          open: {
            $sum: {
              $cond: [{ $in: ['$status', ['new', 'contacted', 'qualified']] }, '$value', 0],
            },
          },
          won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, '$value', 0] } },
        },
      },
    ]),
    Lead.aggregate<{ _id: string; count: number }>([
      { $match: { ...scope, createdAt: { $gte: trendStart } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
    ]),
    Lead.aggregate<{ _id: unknown; count: number }>([
      { $match: scope },
      { $group: { _id: '$site', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Lead.find(scope)
      .select('-activities')
      .populate('site', 'name domain')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),
  ]);

  const byStatus = Object.fromEntries(
    LEAD_STATUSES.map((status) => [status, 0]),
  ) as Record<LeadStatus, number>;
  for (const row of statusRows) {
    if (row._id in byStatus) byStatus[row._id] = row.count;
  }

  const counts = new Map(trendRows.map((row) => [row._id, row.count]));
  const trend = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(trendStart.getTime() + index * 86_400_000);
    const key = date.toISOString().slice(0, 10);
    return { date: key, count: counts.get(key) ?? 0 };
  });

  const siteIds = siteRows
    .map((row) => row._id)
    .filter((id): id is Types.ObjectId => id != null);
  const sites = await Site.find({ _id: { $in: siteIds } })
    .select('name')
    .lean();
  const siteNames = new Map(
    sites.map((site) => [String(site._id), String(site.name)]),
  );

  const closed = byStatus.won + byStatus.lost;

  return {
    total,
    byStatus,
    today,
    last7Days,
    unassigned,
    pipelineValue: valueRows[0]?.open ?? 0,
    wonValue: valueRows[0]?.won ?? 0,
    conversionRate: closed > 0 ? Math.round((byStatus.won / closed) * 100) : 0,
    trend,
    bySite: siteRows.map((row) => ({
      id: String(row._id),
      name: siteNames.get(String(row._id)) ?? 'Unknown site',
      count: row.count,
    })),
    recent: recentRows.map(serializeLead),
  };
}
