import { redirect } from 'next/navigation';
import { LeadsExplorer, type LeadFilters } from '@/components/LeadsExplorer';
import { getCurrentUser } from '@/lib/auth/session';
import { getDirectory } from '@/lib/directory';

export const metadata = { title: 'Leads' };

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export default async function LeadsPage(props: PageProps<'/dashboard/leads'>) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const params = await props.searchParams;
  const { sites, agents } = await getDirectory(user);

  // Links from the overview cards arrive with filters already applied.
  // Owner filter is admin-only; agents always see only their assigned leads.
  const initialFilters: LeadFilters = {
    search: first(params.search),
    status: first(params.status),
    quality: first(params.quality),
    site: first(params.site),
    assignedTo: user.role === 'admin' ? first(params.assignedTo) : '',
  };

  return (
    <LeadsExplorer
      role={user.role}
      sites={sites}
      agents={agents}
      initialFilters={initialFilters}
    />
  );
}
