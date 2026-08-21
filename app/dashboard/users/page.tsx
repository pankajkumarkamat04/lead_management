import { redirect } from 'next/navigation';
import { UsersManager } from '@/components/UsersManager';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata = { title: 'Team' };

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/dashboard');

  return <UsersManager currentUserId={String(user._id)} />;
}
