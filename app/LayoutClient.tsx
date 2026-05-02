'use client';
import { useRouter, usePathname } from 'next/navigation';
import { logoutUser } from '@/lib/actions';
import Link from 'next/link';
import { LayoutDashboard, Wallet, Briefcase, MessageSquare, ShieldAlert, ShieldCheck, DatabaseZap } from 'lucide-react';

export default function LayoutClient({ user, children }: { user: any; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logoutUser();
    router.refresh(); 
  };

  const navLinks = [
    { name: 'Главная', href: '/', icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: 'Счета', href: '/accounts', icon: <Wallet className="w-4 h-4" /> },
    { name: 'Услуги', href: '/services', icon: <Briefcase className="w-4 h-4" /> },
    { name: 'Чат', href: '/chat', icon: <MessageSquare className="w-4 h-4" /> },
  ];

  if (user?.role === 'admin' || user?.role === 'moderator' || user?.nick?.toLowerCase() === 'abe_aba') {
    navLinks.push({ name: 'Модер-Панель', href: '/moderator', icon: <ShieldAlert className="w-4 h-4" /> });
  }
  
  if (user?.role === 'admin' || user?.nick?.toLowerCase() === 'abe_aba') {
    navLinks.push({ name: 'Админ-Панель', href: '/admin', icon: <ShieldCheck className="w-4 h-4" /> });
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-zinc-800 flex flex-col p-6 shrink-0 relative bg-black z-10">
        <div className="flex items-center gap-3 mb-8 md:mb-12">
          <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center text-black font-bold text-xl leading-none">B</div>
          <h1 className="text-xl font-bold tracking-tight uppercase">Вавилон</h1>
        </div>
        
        <nav className="space-y-2 flex-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} className={`px-4 py-3 rounded-xl font-bold flex items-center gap-3 transition-colors text-sm ${isActive ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/10' : 'text-zinc-500 hover:text-white hover:bg-zinc-900/50'}`}>
                {link.icon} {link.name}
              </Link>
            );
          })}
        </nav>

        <button onClick={handleLogout} className="mt-8 text-zinc-500 hover:text-white uppercase text-xs font-bold w-full text-left transition-colors">
          Выйти из системы
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 w-full overflow-x-hidden relative">
        {user?.isMock && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-8 py-4 flex items-start gap-4">
            <DatabaseZap className="text-amber-500 shrink-0 mt-1" />
            <div>
              <p className="text-sm font-bold text-amber-500 uppercase tracking-wider">Супабейс временно отключен (Режим Быстрого Входа)</p>
              <p className="text-xs text-zinc-400 mt-1 font-mono max-w-3xl">
                Вы вошли как мок-администратор, потому что база данныхSupabase не настроена корректно. Вы можете просматривать интерфейс.<br/><br/>
                <b>Как починить:</b> перейдите в SQL Editor в Supabase и выполните этот код, чтобы создать правильную структуру:
              </p>
              <pre className="mt-4 bg-black/50 p-4 rounded-xl border border-amber-500/30 text-[10px] text-amber-500/70 overflow-x-auto font-mono">
{`-- 1. Таблица пользователей
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nick TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'user', -- 'user', 'moderator', 'admin'
  emida_coins INTEGER DEFAULT 0,
  subscription_active BOOLEAN DEFAULT false,
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Таблица счетов (раздельные и срочные счета)
CREATE TABLE IF NOT EXISTS public.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'active', -- 'active' (активный), 'term' (срочный)
  balance INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  term_days INTEGER DEFAULT 0,
  can_replenish BOOLEAN DEFAULT false,
  can_withdraw BOOLEAN DEFAULT false,
  interest_rate INTEGER DEFAULT 0,
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Таблица транзакций (история)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  fee INTEGER DEFAULT 0,
  tx_type TEXT NOT NULL, -- 'transfer', 'system_add', 'system_remove', 'liquidation', 'subscription'
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Таблица заявок
CREATE TABLE IF NOT EXISTS public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  req_type TEXT NOT NULL, 
  amount INTEGER NOT NULL DEFAULT 0,
  details TEXT,
  status TEXT DEFAULT 'pending', 
  term_days INTEGER DEFAULT 0,
  interest_rate INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. Сообщения
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- Создание аккаунта Казны
DO $$
DECLARE
  treasury_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE nick = 'Вавилон_Казна') THEN
    INSERT INTO public.users (nick, password, role) VALUES ('Вавилон_Казна', '123456', 'admin') RETURNING id INTO treasury_id;
    INSERT INTO public.accounts (user_id, name, account_type, balance, is_primary) VALUES (treasury_id, 'Счет Казны', 'active', 0, true);
  END IF;
END $$;
`}
              </pre>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
