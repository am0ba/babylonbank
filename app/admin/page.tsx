import { getSessionUser } from '@/lib/actions';
import { redirect } from 'next/navigation';
import AdminClient from './AdminClient';

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    redirect('/');
  }
  return <AdminClient user={user} />;
}
