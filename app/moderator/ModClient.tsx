'use client';
import { useState, useEffect } from 'react';
import { searchUsers, getPendingRequests, processRequest, adminChangeBalance } from '@/lib/actions';
import { SECRET_TEXTURES } from '@/lib/textures';

export default function ModClient({ user }: { user: any }) {
  const [targetUser, setTargetUser] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    const list = await getPendingRequests();
    setRequests(list);
  };

  const handleSearch = async (val: string) => {
    setTargetUser(val);
    if (val.length >= 1) {
      const results = await searchUsers(val);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  };

  const changeBalance = async (isAdd: boolean) => {
    const num = parseInt(amount);
    if (isNaN(num) || num <= 0) return alert('Bad amount');
    try {
      await adminChangeBalance(targetUser, num, isAdd);
      alert('Success');
      setTargetUser(''); setAmount('');
    } catch(err: any) { alert(err.message); }
  };

  const handleProcessRequest = async (id: string, approve: boolean) => {
    try {
      await processRequest(id, approve);
      alert('Успех');
      loadRequests();
    } catch(err: any) { alert(err.message); }
  };

  return (
    <div className="p-8 max-w-[1400px]">
      <h2 className="text-3xl font-bold mb-8 uppercase tracking-tight text-amber-500">Модер-Панель</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-zinc-900 border border-amber-500/30 rounded-3xl p-6">
          <h3 className="font-bold uppercase text-xs text-amber-500 tracking-wider mb-6">Управление Балансом Игроков</h3>
          
          <div className="space-y-4">
            <div className="relative">
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Никнейм игрока</label>
              <input
                type="text" value={targetUser} onChange={e => handleSearch(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 font-mono text-sm"
              />
              {suggestions.length > 0 && (
                <ul className="absolute top-full left-0 right-0 bg-zinc-900 border border-zinc-800 rounded-xl mt-1 overflow-hidden z-50">
                  {suggestions.map(s => (
                    <li key={s} onClick={() => {setTargetUser(s); setSuggestions([]);}} className="px-4 py-2 hover:bg-amber-500 hover:text-black cursor-pointer font-mono text-sm">
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Сумма</label>
              <input
                type="number" value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 font-mono text-sm"
              />
            </div>
            
            <div className="flex gap-4 pt-4 border-t border-zinc-800 mt-6">
              <button onClick={() => changeBalance(true)} className="flex-1 bg-green-500/10 border border-green-500/20 text-green-500 font-bold uppercase py-3 rounded-xl hover:bg-green-500/20 text-sm transition-colors">
                Пополнить (+)
              </button>
              <button onClick={() => changeBalance(false)} className="flex-1 bg-red-500/10 border border-red-500/20 text-red-500 font-bold uppercase py-3 rounded-xl hover:bg-red-500/20 text-sm transition-colors">
                Снять (-)
              </button>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-amber-500/30 rounded-3xl p-6">
           <h3 className="font-bold uppercase text-xs text-amber-500 tracking-wider mb-6">Заявки на Кредит/Депозит</h3>
           {requests.length === 0 ? <p className="text-sm font-mono text-zinc-500">Нет новых заявок.</p> : (
             <div className="space-y-4 max-h-[400px] overflow-y-auto">
               {requests.map(r => {
                 let detailsMarkup = <p className="text-xs text-zinc-500 font-mono mt-1">Детали: {r.details}</p>;
                 try {
                   const parsed = JSON.parse(r.details);
                   if (parsed && typeof parsed === 'object' && parsed.payback) {
                     let typeName = 'Потребительский';
                     if (parsed.creditType === 'business') typeName = 'Развитие бизнеса';
                     if (parsed.creditType === 'building') typeName = 'Стройка/Инфраструктура';

                     detailsMarkup = (
                       <div className="mt-2 space-y-1 bg-black/40 p-3 rounded-lg border border-red-500/20 text-xs text-zinc-400 font-mono">
                         <p><span className="text-red-400 font-bold">Тип:</span> {typeName}</p>
                         <p><span className="text-red-400 font-bold">Цель:</span> {parsed.reason}</p>
                         <p><span className="text-red-400 font-bold">Срок:</span> {parsed.termDays} дней</p>
                         <p><span className="text-red-400 font-bold">Ставка:</span> {parsed.rate}%</p>
                         <p className="text-red-400 font-bold mt-2 border-t border-red-500/20 pt-1">К возврату: {parsed.payback} алмазов</p>
                       </div>
                     );
                   }
                 } catch(e) {}
                 
                 return (
                 <div key={r.id} className="bg-black/50 border border-zinc-800 p-4 rounded-xl flex flex-col gap-3">
                   <div>
                     <p className="text-sm font-bold text-white mb-1"><span className="text-amber-500 uppercase mr-2">{r.req_type}</span> от {r.users?.nick}</p>
                     <p className="text-xs text-zinc-500 font-mono">Тело (на руки): {r.amount} <img src={SECRET_TEXTURES.diamond} className="w-3 h-3 inline-block opacity-70"/></p>
                     {detailsMarkup}
                   </div>
                   <div className="flex gap-2">
                     <button onClick={() => handleProcessRequest(r.id, true)} className="bg-green-500/10 text-green-500 text-xs px-3 py-1.5 rounded disabled:opacity-50 hover:bg-green-500/20">Одобрить</button>
                     <button onClick={() => handleProcessRequest(r.id, false)} className="bg-red-500/10 text-red-500 text-xs px-3 py-1.5 rounded disabled:opacity-50 hover:bg-red-500/20">Отклонить</button>
                   </div>
                 </div>
                 );
               })}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
