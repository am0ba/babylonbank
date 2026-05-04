import { getSessionUser, getPublicStats } from '@/lib/actions';
import { redirect } from 'next/navigation';
import ModClient from './ModClient';

export default async function ModPage() {
  const user = await getSessionUser();
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
    redirect('/');
  }
  const stats = await getPublicStats();
  return <ModClient user={user} stats={stats} />;
}
