import DashboardClient from './DashboardClient';
import { getSessionUser } from '@/lib/actions';
import { redirect } from 'next/navigation';

export default async function Page() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  return <DashboardClient user={user} />;
}
