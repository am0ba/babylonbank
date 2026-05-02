import { getSessionUser } from '@/lib/actions';
import { redirect } from 'next/navigation';
import AccountsClient from './AccountsClient';

export default async function AccountsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return <AccountsClient user={user} />;
}
