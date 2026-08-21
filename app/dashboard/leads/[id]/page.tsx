import { notFound, redirect } from 'next/navigation';
import { LeadDetail } from '@/components/LeadDetail';
import { getCurrentUser } from '@/lib/auth/session';
import { connectToDatabase } from '@/lib/db';
import { getDirectory } from '@/lib/directory';
import { isValidObjectId, scopeForUser } from '@/lib/leads';
import { Lead } from '@/lib/models/Lead';
import { serializeLead } from '@/lib/serialize';

export const metadata = { title: 'Lead detail' };

export default async function LeadDetailPage(
  props: PageProps<'/dashboard/leads/[id]'>,
) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const { id } = await props.params;
  if (!isValidObjectId(id)) notFound();

  await connectToDatabase();

  const [lead, { agents }] = await Promise.all([
    Lead.findOne({ _id: id, ...scopeForUser(user) })
      .populate('site', 'name domain')
      .populate('assignedTo', 'name email')
      .populate('activities.actor', 'name')
      .lean(),
    getDirectory(user),
  ]);

  if (!lead) notFound();

  return (
    <LeadDetail
      initialLead={serializeLead(lead)}
      agents={agents}
      role={user.role}
    />
  );
}
