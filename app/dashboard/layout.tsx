import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/DashboardShell';
import { getCurrentUser } from '@/lib/auth/session';
import { serializeUser } from '@/lib/serialize';

export default async function DashboardLayout({
  children,
}: LayoutProps<'/dashboard'>) {
  // `proxy.ts` already blocks signed-out visitors; this repeats the check so a
  // routing change can never expose a page, and gives us the user object.
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return <DashboardShell user={serializeUser(user)}>{children}</DashboardShell>;
}
