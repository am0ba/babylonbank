import NovaPayClient from './NovaPayClient';
import { getSessionUser } from '@/lib/actions';
import { redirect } from 'next/navigation';

export default async function Page({ searchParams }: { searchParams: any }) {
  const user = await getSessionUser();
  const searchParamsAwaited = await searchParams; // In Next 15 searchParams is a promise
  
  // They can still view the login screen if not logged in
  return <NovaPayClient user={user} searchParams={searchParamsAwaited} />;
}
