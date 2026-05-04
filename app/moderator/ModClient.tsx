'use client';
import { useState, useEffect } from 'react';
import { searchUsers, getPendingRequests, processRequest, adminChangeBalance, confirmWithdraw } from '@/lib/actions';
import { SECRET_TEXTURES } from '@/lib/textures';

export default function ModClient({ user, stats }: { user: any, stats?: any }) {
  const [targetUser, setTargetUser] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [withdrawCodes, setWithdrawCodes] = useState<Record<string, string>>({});

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

  const handleConfirmWithdraw = async (id: string) => {
    const code = withdrawCodes[id];
    if (!code || code.length < 4) return alert('Введите четырехзначный код');
    try {
      await confirmWithdraw(id, code);
      alert('Вывод подтвержден!');
      loadRequests();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="p-8 max-w-[1400px]">
      <h2 className="text-3xl font-bold mb-8 uppercase tracking-tight text-amber-500">Модер-Панель</h2>
      
      {stats && (
        <div className="bg-yellow-400/10 rounded-3xl p-6 border border-yellow-400/20 grid grid-cols-2 md:grid-cols-5 gap-4 items-center mb-8">
          <div className="col-span-2 md:col-span-1">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-2">Казна Сервера</p>
            <div className="flex flex-col gap-1">
              <p className="text-sm text-yellow-400 font-mono font-bold flex items-center gap-1.5">
                {stats.treasuryBalance} <img src={SECRET_TEXTURES.diamond} className="w-3.5 h-3.5 opacity-80 mix-blend-screen" alt="diamond" />
              </p>
              <p className="text-sm text-white font-mono font-bold flex items-center gap-1.5">
                {stats.treasuryNetherite} <img src={SECRET_TEXTURES.netherite} className="w-3.5 h-3.5" style={{ imageRendering: 'pixelated' }} alt="netherite" />
              </p>
              <p className="text-sm text-white font-mono font-bold flex items-center gap-1.5">
                {stats.treasuryGarant} <img src={SECRET_TEXTURES.garant} className="w-3.5 h-3.5" style={{ imageRendering: 'pixelated' }} alt="garant" />
              </p>
              <p className="text-sm text-white font-mono font-bold flex items-center gap-1.5">
                {stats.treasuryEchoShard} <img src={SECRET_TEXTURES.echo_shard} className="w-3.5 h-3.5" style={{ imageRendering: 'pixelated' }} alt="shard" />
              </p>
            </div>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Свободные Алмазы</p>
            <p className="text-xl text-white font-mono font-bold flex items-center">
              {stats.activeCirculation} <img src={SECRET_TEXTURES.diamond} className="w-4 h-4 ml-1 opacity-50" alt="diamond" />
            </p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Выдано Кредитов</p>
            <p className="text-xl text-red-500 font-mono font-bold flex items-center">
              {stats.issuedCredits} <img src={SECRET_TEXTURES.diamond} className="w-4 h-4 ml-1 opacity-50" alt="diamond" />
            </p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Депозиты Игроков</p>
            <p className="text-xl text-green-500 font-mono font-bold flex items-center">
              {stats.securedDeposits} <img src={SECRET_TEXTURES.diamond} className="w-4 h-4 ml-1 opacity-50" alt="diamond" />
            </p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Активные Игроки</p>
            <p className="text-xl text-white font-mono font-bold">{stats.totalPlayers}</p>
          </div>
        </div>
      )}

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
                 let parsed: any = null;
                 try {
                   parsed = JSON.parse(r.details);
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
                     <p className="text-xs text-zinc-500 font-mono flex items-center gap-1">Сумма: {r.amount} 
                       {r.req_type === 'withdraw_item' ? (
                         <img src={SECRET_TEXTURES[parsed?.itemType as keyof typeof SECRET_TEXTURES] || SECRET_TEXTURES.chest} className="w-4 h-4 object-contain" style={{ imageRendering: 'pixelated' }} />
                       ) : (
                         <img src={SECRET_TEXTURES.diamond} className="w-3 h-3 object-contain" style={{ imageRendering: 'pixelated' }} />
                       )}
                     </p>
                     {r.req_type !== 'withdraw' && r.req_type !== 'withdraw_item' && detailsMarkup}
                   </div>
                   {r.req_type === 'withdraw' || r.req_type === 'withdraw_item' ? (
                     <div className="flex gap-2 items-center w-full mt-2 border-t border-zinc-800 pt-3">
                       <input
                         type="text"
                         placeholder="Код от игрока"
                         value={withdrawCodes[r.id] || ''}
                         onChange={(e) => setWithdrawCodes({...withdrawCodes, [r.id]: e.target.value})}
                         className="flex-1 bg-black border border-zinc-700 px-3 py-1.5 rounded text-xs text-white"
                       />
                       <button onClick={() => handleConfirmWithdraw(r.id)} className="bg-amber-500 text-black text-xs px-3 py-1.5 rounded disabled:opacity-50 hover:bg-amber-400">
                         Выдать
                       </button>
                       <button onClick={() => handleProcessRequest(r.id, false)} className="bg-red-500/10 text-red-500 text-xs px-3 py-1.5 rounded hover:bg-red-500/20">Отклонить</button>
                     </div>
                   ) : (
                     <div className="flex gap-2">
                       <button onClick={() => handleProcessRequest(r.id, true)} className="bg-green-500/10 text-green-500 text-xs px-3 py-1.5 rounded disabled:opacity-50 hover:bg-green-500/20">Одобрить</button>
                       <button onClick={() => handleProcessRequest(r.id, false)} className="bg-red-500/10 text-red-500 text-xs px-3 py-1.5 rounded disabled:opacity-50 hover:bg-red-500/20">Отклонить</button>
                     </div>
                   )}
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
