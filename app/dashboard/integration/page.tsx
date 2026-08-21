import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { IntegrationGuide } from '@/components/IntegrationGuide';
import { getCurrentUser } from '@/lib/auth/session';
import { connectToDatabase } from '@/lib/db';
import { Site } from '@/lib/models/Site';
import { serializeSite } from '@/lib/serialize';

export const metadata = { title: 'Integration' };

export default async function IntegrationPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  await connectToDatabase();

  const sites =
    user.role === 'admin'
      ? await Site.find({}).sort({ name: 1 }).lean()
      : [];

  const headerStore = await headers();
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host');
  const proto = headerStore.get('x-forwarded-proto') ?? 'http';
  const baseUrl = host ? `${proto}://${host}` : '';

  return (
    <IntegrationGuide
      baseUrl={baseUrl}
      sites={sites.map(serializeSite)}
      isAdmin={user.role === 'admin'}
    />
  );
}
