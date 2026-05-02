import { getSessionUser } from '@/lib/actions';
import { redirect } from 'next/navigation';
import ServicesClient from './ServicesClient';

export default async function ServicesPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return <ServicesClient user={user} />;
}
