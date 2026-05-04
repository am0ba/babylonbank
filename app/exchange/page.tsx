import ExchangeClient from './ExchangeClient';
import { getSessionUser, getPublicStats } from '@/lib/actions';
import { redirect } from 'next/navigation';

export default async function Page() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }
  
  const stats = await getPublicStats();

  return <ExchangeClient user={user} stats={stats} />;
}
