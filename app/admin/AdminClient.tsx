'use client';
import { useState } from 'react';
import { searchUsers, adminAccrueInterest } from '@/lib/actions';

export default function AdminClient({ user }: { user: any }) {
  const [targetUser, setTargetUser] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (val: string) => {
    setTargetUser(val);
    if (val.length >= 1) {
      const results = await searchUsers(val);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  };

  const handleAccrueInterests = async () => {
    setLoading(true);
    try {
      const res = await adminAccrueInterest();
      alert(res.message);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-[1400px]">
      <h2 className="text-3xl font-bold mb-8 uppercase tracking-tight text-red-500">Админ-Панель</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
        <div className="bg-zinc-900 border border-red-500/30 rounded-3xl p-6 relative">
          <h3 className="font-bold uppercase text-xs text-red-500 tracking-wider mb-6">Назначение Ролей</h3>
          
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Никнейм пользователя</label>
              <input
                type="text" value={targetUser} onChange={e => handleSearch(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-red-500 font-mono text-sm"
              />
              {suggestions.length > 0 && (
                <ul className="absolute top-full left-0 right-0 bg-zinc-900 border border-zinc-800 rounded-xl mt-1 overflow-hidden z-50">
                  {suggestions.map(s => (
                    <li key={s} onClick={() => {setTargetUser(s); setSuggestions([]);}} className="px-4 py-2 hover:bg-red-500 hover:text-black cursor-pointer font-mono text-sm">
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="flex gap-4 pt-4 mt-6">
              <button className="flex-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 font-bold uppercase py-3 rounded-xl hover:bg-amber-500/20 text-sm transition-colors">
                Дать Модератора
              </button>
              <button className="flex-1 bg-zinc-800 border border-zinc-700 text-zinc-400 font-bold uppercase py-3 rounded-xl hover:bg-zinc-700 text-sm transition-colors">
                Забрать Права
              </button>
            </div>
            <p className="text-[10px] uppercase text-zinc-500 font-mono mt-4">Требуется таблица user_roles.</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-yellow-500/30 rounded-3xl p-6 relative">
          <h3 className="font-bold uppercase text-xs text-yellow-500 tracking-wider mb-6">Финансы</h3>
          
          <div className="space-y-4">
            <button disabled={loading} onClick={handleAccrueInterests} className="w-full bg-yellow-400 text-black font-bold uppercase py-3.5 rounded-xl hover:bg-yellow-500 transition-colors disabled:opacity-50 text-sm flex justify-center items-center gap-2">
              <span>Симуляция времени (Начислить % на вклады)</span>
            </button>
            <p className="text-[10px] uppercase text-zinc-500 font-mono mt-4">Единоразовое начисление текущей % ставки на все срочные счета.</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-blue-500/30 rounded-3xl p-6 relative">
          <h3 className="font-bold text-xs text-blue-500 mb-6 italic">NOVA PAY Тест</h3>
          
          <div className="space-y-4">
            <a href="/novapay/pay?merchant=Вавилон_Казна&amount=10&item=Тестовая Лицензия&callback=/admin" className="block w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors text-center text-sm shadow-[0_4px_16px_rgba(37,99,235,0.2)]">
              Оплатить 10 Алмазов (NOVA PAY)
            </a>
            <p className="text-[10px] text-zinc-500 mt-4 leading-relaxed">
              Демонстрационный платеж. Списание будет произведено в пользу казны. Комиссия составит 10% или 5% с подпиской. Проверьте интеграцию платежного интерфейса с авто-комиссией. Попробуйте передать параметры merchant, amount, item в URL для любых нужд.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-red-500/30 rounded-3xl p-6 relative">
        <h3 className="font-bold uppercase text-xs text-red-500 tracking-wider mb-4">База Данных: Требуемые Миграции</h3>
        <p className="text-sm font-mono text-zinc-400 mb-4">
          Если вы сталкиваетесь с ошибками при открытии счетов или создании кредитов, выполните следующий скрипт в SQL Editor вашего Supabase проекта, чтобы добавить недостающие столбцы:
        </p>
        <pre className="bg-black/50 border border-zinc-800 p-4 rounded-xl text-xs text-green-400 overflow-x-auto">
{`ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS term_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS can_replenish BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS can_withdraw BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS interest_rate INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.requests
ADD COLUMN IF NOT EXISTS term_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS interest_rate INTEGER DEFAULT 0;`}
        </pre>
      </div>
    </div>
  );
}
