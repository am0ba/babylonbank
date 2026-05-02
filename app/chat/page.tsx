import { getSessionUser } from '@/lib/actions';
import { redirect } from 'next/navigation';
import ChatClient from './ChatClient';

export default async function ChatPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  return <ChatClient user={user} />;
}
