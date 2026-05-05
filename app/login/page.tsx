'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { loginUser } from '@/lib/actions';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const router = useRouter();
  const [nick, setNick] = useState('');
  const [password, setPassword] = useState('');
  const [deviceCode, setDeviceCode] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isSubmittingRef = useRef(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setLoading(true);
    setError('');

    try {
      const res = await loginUser(nick, password);
      if (res?.error) {
        throw new Error(res.error);
      }
      
      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden text-foreground font-sans">
      <div className="w-full max-w-sm relative z-10">
        <div className="mb-10 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center text-black dark:text-white font-bold text-2xl shadow-lg shadow-yellow-400/20">
            B
          </div>
          <h1 className="text-2xl font-bold tracking-tight uppercase text-foreground">Вавилон</h1>
        </div>

        <form onSubmit={handleLogin} className="bg-card text-card-foreground shadow-sm border border-border p-8 rounded-2xl shadow-xl">
          {error && (
            <div className={`mb-6 p-4 border rounded-xl text-xs font-bold uppercase bg-red-500/10 border-red-500/20 text-red-500`}>
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5 tracking-wider">Никнейм</label>
              <input
                type="text" required value={nick} onChange={e => setNick(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 transition-all font-sans text-sm"
                placeholder="vavilon_user"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase text-muted-foreground mb-1.5 tracking-wider">Пароль</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 transition-all font-sans text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black dark:text-white font-bold font-medium rounded-xl px-4 py-4 mt-8 flex items-center justify-center transition-all disabled:opacity-50 text-sm"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'АВТОРИЗАЦИЯ'}
            </button>
          </div>

          <div className="mt-6 flex flex-col items-center gap-4">
            <Link href="/register" className="text-xs uppercase font-bold text-muted-foreground hover:text-foreground transition-colors">
              НЕТ АККАУНТА? РЕГИСТРАЦИЯ
            </Link>
          </div>
        </form>

        <p className="mt-8 text-center text-[10px] font-sans text-muted-foreground uppercase ">
          Кодекс ВАВИЛОН (Ред. 11.0)
        </p>
      </div>
    </div>
  );
}
