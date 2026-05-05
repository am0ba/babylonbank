import './globals.css';
import { ReactNode } from 'react';
import { getSessionUser } from '@/lib/actions';
import LayoutClient from './LayoutClient';
import { ThemeProvider } from '@/components/ThemeProvider';
import NextTopLoader from 'nextjs-toploader';

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();

  return (
    <html lang="ru" suppressHydrationWarning>
      <body className="min-h-[100dvh] bg-background text-foreground font-sans selection:bg-yellow-400/30">
        <NextTopLoader color="#facc15" showSpinner={false} />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {user ? (
            <LayoutClient user={user}>{children}</LayoutClient>
          ) : (
            children
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
