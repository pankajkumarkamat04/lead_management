import { redirect } from 'next/navigation';
import { SitesManager } from '@/components/SitesManager';
import { getCurrentUser } from '@/lib/auth/session';
import { getDirectory } from '@/lib/directory';

export const metadata = { title: 'Websites' };

export default async function SitesPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/dashboard');

  const { agents } = await getDirectory(user);

  return <SitesManager agents={agents} />;
}
