import './globals.css';
import { ReactNode } from 'react';
import { getSessionUser } from '@/lib/actions';
import LayoutClient from './LayoutClient';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  return (
    <html lang="ru">
      <body className="min-h-[100dvh] bg-black text-white font-sans selection:bg-yellow-400/30">
        {user ? (
          <LayoutClient user={user}>{children}</LayoutClient>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
