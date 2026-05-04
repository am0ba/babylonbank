import ExchangeClient from './ExchangeClient';
import { getSessionUser } from '@/lib/actions';
import { redirect } from 'next/navigation';

export default async function Page() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }
  
  if (user.role !== 'admin') {
    redirect('/');
  }

  return <ExchangeClient user={user} />;
}
