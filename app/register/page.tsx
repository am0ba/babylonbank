'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { registerUser, createInitialAccount } from '@/lib/actions';
import Link from 'next/link';
import { Loader2, FileText, X } from 'lucide-react';

function EulaModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-8 relative flex flex-col max-h-[80vh]">
        <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold uppercase tracking-wider mb-6 flex items-center gap-3">
          <FileText className="text-yellow-400" /> Кодекс Вавилона
        </h2>
        <div className="flex-1 overflow-y-auto pr-4 space-y-4 text-sm text-zinc-300 font-mono">
          <p>Настоящий кодекс является официальным документом взаимодействия между Пользователем и Банком 'Вавилон'.</p>
          <div className="space-y-2">
            <h3 className="text-white font-bold uppercase">1. Общие положения</h3>
            <p className="pl-4 border-l-2 border-zinc-800">1.1. Единственной расчетной единицей являются «Алмазы».</p>
            <p className="pl-4 border-l-2 border-zinc-800">1.2. Пользователь обязуется следить за балансом.</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-bold uppercase">2. Комиссии и сборы (БЛАНК Т-03, У-09)</h3>
            <p className="pl-4 border-l-2 border-zinc-800">2.1. Внутренние переводы между счетами и пользователями облагаются комиссией 5% (2% для Premium).</p>
            <p className="pl-4 border-l-2 border-zinc-800">2.2. Ликвидация аккаунта подразумевает удержание 30%.</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-bold uppercase">3. Кредитные обязательства</h3>
            <p className="pl-4 border-l-2 border-zinc-800">3.1. Если долг превышает порог в 512 Алмазов, аккаунт блокируется до полного погашения долга.</p>
            <p className="pl-4 border-l-2 border-zinc-800">3.2. Кредиты выдаются только под залог.</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-white font-bold uppercase">4. Модерация и контроль</h3>
            <p className="pl-4 border-l-2 border-zinc-800">4.1. Администрация и модераторы имеют право на проверку логов и истории переводов для предотвращения махинаций.</p>
          </div>
        </div>
        <div className="pt-6 mt-6 border-t border-zinc-800">
          <button onClick={onClose} className="w-full bg-yellow-400 text-black font-bold uppercase py-3 rounded-xl hover:bg-yellow-500 transition-colors">
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Register() {
  const router = useRouter();
  const [nick, setNick] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [eulaAccepted, setEulaAccepted] = useState(false);
  const [eulaModalOpen, setEulaModalOpen] = useState(false);
  
  const [showAccountCreation, setShowAccountCreation] = useState(false);
  const [registeredUserId, setRegisteredUserId] = useState('');
  const [accountName, setAccountName] = useState('Основной Счет');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if(!eulaAccepted) throw new Error('Необходимо принять условия Кодекса Вавилона');
      if(nick.length < 3) throw new Error('Никнейм должен быть длиннее 3 символов');
      if(password.length < 4) throw new Error('Пароль слишком короткий');

      const res = await registerUser(nick, password);
      
      if (res?.error) {
        throw new Error(res.error);
      }
      
      if (res?.userId) {
        setRegisteredUserId(res.userId);
        setShowAccountCreation(true);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (showAccountCreation) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white font-sans">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-xl w-full max-w-md text-center">
          <h2 className="text-2xl font-bold uppercase tracking-widest mb-4 text-yellow-400">Счет успешно открыт</h2>
          <p className="text-zinc-400 mb-8 text-sm">Ваш идентификатор зарегистрирован. Пожалуйста, создайте ваш первый активный счет.</p>
          <input 
            type="text" 
            value={accountName} 
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Название счета (например: Основной)"
            className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 mb-4"
          />
          <button 
            onClick={async () => {
              setLoading(true);
              try {
                await createInitialAccount(registeredUserId, accountName || 'Основной');
                router.push('/');
                router.refresh();
              } catch (err: any) {
                alert(err.message);
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold uppercase tracking-wider rounded-xl px-4 py-4 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'СОЗДАТЬ И ВОЙТИ'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden text-white font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-yellow-400/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-sm relative z-10">
        <div className="mb-10 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 border-2 border-yellow-400 rounded-xl flex items-center justify-center text-yellow-400 font-bold text-2xl shadow-lg shadow-yellow-400/10 bg-black">
            B
          </div>
          <h1 className="text-xl font-bold tracking-tight uppercase text-white mt-1">Регистрация</h1>
        </div>

        <form onSubmit={handleRegister} className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-xl">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold uppercase tracking-wider">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5 tracking-wider">Новый Никнейм</label>
              <input
                type="text" required value={nick} onChange={e => setNick(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 transition-all font-mono text-sm"
                placeholder="vavilon_new"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5 tracking-wider">Новый Пароль</label>
              <input
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 transition-all font-mono text-sm"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-start gap-3 mt-4 pt-2">
              <input
                type="checkbox"
                id="eula"
                checked={eulaAccepted}
                onChange={(e) => setEulaAccepted(e.target.checked)}
                className="mt-1 bg-black border-zinc-800 text-yellow-400 focus:ring-yellow-400 rounded cursor-pointer"
              />
              <label htmlFor="eula" className="text-[11px] text-zinc-400 leading-tight">
                Я подтверждаю, что ознакомлен и согласен с условиями официального документа: {' '}
                <button type="button" onClick={() => setEulaModalOpen(true)} className="text-yellow-400 hover:underline font-bold uppercase">
                  Кодекс «Вавилон»
                </button>
              </label>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full border-2 border-yellow-400 hover:bg-yellow-400 text-yellow-400 hover:text-black font-bold uppercase tracking-wider rounded-xl px-4 py-4 mt-8 flex items-center justify-center transition-all disabled:opacity-50 text-sm"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'СОЗДАТЬ АККАУНТ'}
            </button>
          </div>

          <div className="mt-6 flex flex-col items-center gap-4">
            <Link href="/login" className="text-xs uppercase font-bold text-zinc-500 hover:text-white transition-colors">
              УЖЕ ЕСТЬ АККАУНТ? ВХОД
            </Link>
          </div>
        </form>
      </div>
      <EulaModal isOpen={eulaModalOpen} onClose={() => setEulaModalOpen(false)} />
    </div>
  );
}
