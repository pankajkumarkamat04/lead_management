import { redirect } from 'next/navigation';
import { MailManager } from '@/components/MailManager';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata = { title: 'Mail' };

export default async function MailPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return <MailManager role={user.role} />;
}
