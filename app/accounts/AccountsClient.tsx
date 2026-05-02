'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createNewAccount, executeTransfer, deleteAccount } from '@/lib/actions';
import { SECRET_TEXTURES } from '@/lib/textures';

export default function AccountsClient({ user }: { user: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState('active'); // active or term
  
  const [transferModal, setTransferModal] = useState<string | null>(null);
  const [transferParams, setTransferParams] = useState({ targetNick: '', targetAccountId: '', transferType: 'player', note: '', amount: '' });

  const [deleteModal, setDeleteModal] = useState<any>(null); // store account obj
  const [deleteTargetAcc, setDeleteTargetAcc] = useState('');

  const [termDays, setTermDays] = useState(30);
  const [canReplenish, setCanReplenish] = useState(false);
  const [canWithdraw, setCanWithdraw] = useState(false);
  const [termAmount, setTermAmount] = useState('');
  const [termFromAcc, setTermFromAcc] = useState('');

  const activeAccounts = user.accountsList.filter((a:any) => a.account_type === 'active');
  const termAccounts = user.accountsList.filter((a:any) => a.account_type === 'term');
  const allAccounts = user.accountsList;

  const calculateRate = () => {
    let base = termDays === 7 ? 3 : termDays === 30 ? 8 : termDays === 90 ? 15 : 1;
    if (canReplenish) base -= 1;
    if (canWithdraw) base -= 2;
    return Math.max(1, base);
  };
  const currentRate = calculateRate();
  const expectedProfit = Math.floor((parseInt(termAmount) || 0) * (currentRate / 100));

  const handleCreate = async () => {
    if (!accountName) return alert('Введите название счета');
    if (accountType === 'term') {
      if (!termAmount || parseInt(termAmount) <= 0) return alert('Укажите сумму');
      if (!termFromAcc) return alert('Укажите счет списания');
    }
    setLoading(true);
    try {
      const res = await createNewAccount(
        accountName, 
        accountType,
        accountType === 'term' ? parseInt(termAmount) : undefined,
        accountType === 'term' ? termFromAcc : undefined,
        accountType === 'term' ? { days: termDays, canReplenish, canWithdraw, rate: currentRate } : undefined
      );
      alert(res.message);
      setAccountName('');
      setTermAmount('');
      router.refresh();
    } catch(err:any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (accountId: string) => {
    if (transferParams.transferType === 'own' && (!transferParams.targetAccountId || !transferParams.amount)) return alert('Заполните все поля');
    if (transferParams.transferType !== 'own' && (!transferParams.targetNick || !transferParams.amount)) return alert('Заполните все поля');
    
    setLoading(true);
    try {
      const res = await executeTransfer({
        amount: transferParams.amount,
        transferType: transferParams.transferType as any,
        fromAccountId: accountId,
        targetNick: transferParams.transferType !== 'own' ? transferParams.targetNick : undefined,
        targetAccountId: transferParams.transferType === 'own' ? transferParams.targetAccountId : undefined,
        note: transferParams.note
      });
      alert(res.message);
      setTransferModal(null);
      setTransferParams({ targetNick: '', targetAccountId: '', transferType: 'player', note: '', amount: '' });
      router.refresh();
    } catch(err:any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    if (deleteModal.balance > 0 && !deleteTargetAcc) return alert('Выберите счет для перевода средств');
    
    setLoading(true);
    try {
      const res = await deleteAccount(deleteModal.id, deleteTargetAcc || undefined);
      alert(res.message);
      setDeleteModal(null);
      setDeleteTargetAcc('');
      router.refresh();
    } catch(err:any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-[1400px]">
      <h2 className="text-3xl font-bold mb-8 uppercase tracking-tight">Ваши Счета</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800">
             <h3 className="text-sm font-bold uppercase text-zinc-400 mb-6 flex items-center justify-between">
               Активные счета
               <span className="text-xs text-zinc-600 font-mono">Доступны для переводов</span>
             </h3>
             <div className="space-y-4">
               {activeAccounts.map((a:any) => (
                 <div key={a.id} className="relative group bg-black/50 border border-zinc-800 p-4 rounded-xl flex flex-col justify-center overflow-hidden">
                   <div className="flex justify-between items-center transition-all duration-300 group-hover:opacity-10">
                     <div>
                       <p className="text-sm font-bold text-white">{a.name} {a.is_primary && <span className="ml-2 text-[10px] bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded uppercase">Основной</span>}</p>
                       <p className="text-[10px] text-zinc-500 font-mono mt-1">{a.id}</p>
                     </div>
                     <p className="text-xl font-bold text-yellow-400 flex items-center gap-1">{a.balance} <img src={SECRET_TEXTURES.diamond} className="w-5 h-5 object-contain" alt="diamond" /></p>
                   </div>
                   
                   <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/80">
                      <button onClick={() => setTransferModal(a.id)} className="bg-yellow-400 text-black px-4 py-2 font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-yellow-500 transition-colors">
                        Перевод
                      </button>
                      {!a.is_primary && (
                        <button onClick={() => setDeleteModal(a)} className="bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-2 font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-red-500 hover:text-white transition-colors">
                          Закрыть
                        </button>
                      )}
                    </div>
                 </div>
               ))}
             </div>
             
             <div className="mt-6 bg-yellow-400/10 p-4 border border-yellow-400/20 rounded-xl">
               <h4 className="text-xs font-bold uppercase mb-2 text-yellow-400">Пополнение и Снятие</h4>
               <p className="text-[11px] text-zinc-400 leading-relaxed font-mono">
                 Прямое управление наличными алмазами доступно только через официальные банкоматы. 
                 Ближайший пункт пополнения — <span className="text-white">НА СПАВНЕ</span>.
               </p>
             </div>
          </div>

          {termAccounts.length > 0 && (
            <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800">
               <h3 className="text-sm font-bold uppercase text-zinc-400 mb-6 flex items-center justify-between">
                 Срочные Счета
                 <span className="text-xs text-zinc-600 font-mono">Под % ставки (Капитализация)</span>
               </h3>
               <div className="space-y-4">
                 {termAccounts.map((a:any) => (
                   <div key={a.id} className="relative group bg-black/50 border border-zinc-800 p-4 rounded-xl flex flex-col justify-center overflow-hidden">
                      <div className="flex justify-between items-center transition-all duration-300 group-hover:opacity-10">
                        <div>
                          <p className="text-sm font-bold text-white">{a.name} {!a.can_withdraw && <span className="ml-2 text-[10px] bg-red-400/20 text-red-400 px-2 py-0.5 rounded uppercase">БЕЗ СНЯТИЯ</span>}</p>
                          <p className="text-[10px] text-zinc-500 font-mono mt-1">{a.id}</p>
                        </div>
                        <p className="text-xl font-bold text-green-500 flex items-center gap-1">{a.balance} <img src={SECRET_TEXTURES.diamond} className="w-5 h-5 object-contain" alt="diamond" /></p>
                      </div>
                      
                      <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/80">
                        {a.can_withdraw && (
                          <button onClick={() => setTransferModal(a.id)} className="bg-yellow-400 text-black px-4 py-2 font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-yellow-500 transition-colors">
                            Снятие
                          </button>
                        )}
                        {!(a.account_type === 'term' && !a.can_withdraw && a.balance > 0) && (
                          <button onClick={() => setDeleteModal(a)} className="bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-2 font-bold uppercase tracking-wider text-xs rounded-xl hover:bg-red-500 hover:text-white transition-colors">
                            Закрыть
                          </button>
                        )}
                      </div>
                    </div>
                 ))}
               </div>
            </div>
          )}
        </div>

        <div className="bg-zinc-900/50 rounded-3xl p-8 border border-zinc-800 flex flex-col justify-center items-center text-center sticky top-8">
           <img src={SECRET_TEXTURES.chest} className="w-16 h-16 opacity-50 mb-4" />
           <h3 className="text-sm font-bold uppercase text-zinc-400 mb-2">Создать новый счет</h3>
           <p className="text-xs text-zinc-500 max-w-xs font-mono mb-6">Выпущено: {user.accountsList.length}/4 счетов.</p>
           
           <div className="w-full text-left space-y-4">
             <div>
               <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Название счета</label>
               <input
                 type="text" value={accountName} onChange={e=>setAccountName(e.target.value)}
                 className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-yellow-400 font-mono text-sm"
                 placeholder="Копилка, Мой Вклад и т.д."
               />
             </div>
             <div>
               <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Тип счета</label>
               <select 
                 value={accountType} onChange={e=>setAccountType(e.target.value)}
                 className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-yellow-400 font-mono text-sm"
               >
                 <option value="active">Активный счет (Переводы без комиссии)</option>
                 <option value="term">Срочный вклад (Настройка параметров)</option>
               </select>
             </div>

             {accountType === 'term' && (
               <div className="bg-black/50 p-4 rounded-xl border border-zinc-800 space-y-4">
                 <div>
                   <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Срок вклада (Дней)</label>
                   <select value={termDays} onChange={e=>setTermDays(parseInt(e.target.value))} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-yellow-400 font-mono text-xs">
                     <option value={7}>7 дней</option>
                     <option value={30}>30 дней</option>
                     <option value={90}>90 дней</option>
                   </select>
                 </div>
                 
                 <div>
                   <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Счет списания</label>
                   <select value={termFromAcc} onChange={e=>setTermFromAcc(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-yellow-400 font-mono text-xs">
                     <option value="">Выберите активный счет...</option>
                     {activeAccounts.map((a:any) => (
                       <option key={a.id} value={a.id}>{a.name} ({a.balance} алмазов)</option>
                     ))}
                   </select>
                 </div>

                 <div>
                   <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Сумма вклада</label>
                   <input type="number" value={termAmount} onChange={e=>setTermAmount(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:border-yellow-400 font-mono text-xs" placeholder="0" />
                 </div>

                 <div className="flex items-center justify-between">
                   <label className="text-[10px] font-bold uppercase text-zinc-500">Пополнение (+)</label>
                   <input type="checkbox" checked={canReplenish} onChange={e=>setCanReplenish(e.target.checked)} className="accent-yellow-400" />
                 </div>
                 <div className="flex items-center justify-between">
                   <label className="text-[10px] font-bold uppercase text-zinc-500">Досрочное снятие</label>
                   <input type="checkbox" checked={canWithdraw} onChange={e=>setCanWithdraw(e.target.checked)} className="accent-yellow-400" />
                 </div>

                 <div className="pt-3 border-t border-zinc-800 flex justify-between items-end">
                   <div>
                     <div className="text-[10px] font-bold uppercase text-zinc-500">Ставка:</div>
                     <div className="text-xl font-bold text-green-500">{currentRate}%</div>
                   </div>
                   <div className="text-right">
                     <div className="text-[10px] font-bold uppercase text-zinc-500">Ожидаемый Доход:</div>
                     <div className="text-sm font-bold text-yellow-400 font-mono flex items-center justify-end gap-1">+{expectedProfit} <img src={SECRET_TEXTURES.diamond} className="w-3 h-3 object-contain" alt="diamond"/></div>
                   </div>
                 </div>
               </div>
             )}
             <button disabled={loading || user.accountsList.length >= 4} onClick={handleCreate} className="w-full mt-2 bg-yellow-400 text-black hover:bg-yellow-500 font-bold uppercase px-6 py-3 rounded-xl text-xs transition-colors disabled:opacity-50">
               {loading ? 'Создание...' : 'Открыть счет'}
             </button>
           </div>
        </div>
      </div>
      {transferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-md w-full relative z-50">
            <button onClick={() => setTransferModal(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white text-xl">&times;</button>
            <h3 className="text-xl font-bold uppercase mb-6 text-yellow-400">Сделать перевод</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Тип перевода</label>
                <select
                  value={transferParams.transferType} onChange={e=>setTransferParams({...transferParams, transferType: e.target.value})}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-yellow-400 font-mono text-sm"
                >
                  <option value="player">Другому игроку</option>
                  <option value="own">Между своими счетами</option>
                  <option value="service">Оплата услуг / Погашение задолженности</option>
                </select>
              </div>
              
              {transferParams.transferType === 'own' ? (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Куда (Счет зачисления)</label>
                  <select
                    value={transferParams.targetAccountId} onChange={e=>setTransferParams({...transferParams, targetAccountId: e.target.value})}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-yellow-400 font-mono text-sm"
                  >
                    <option value="">Выберите счет...</option>
                    {allAccounts.map((a:any) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.balance} алмазов, {a.account_type === 'active' ? 'Активный' : 'Срочный'})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Кому (Никнейм)</label>
                  <input
                    type="text" value={transferParams.targetNick} onChange={e=>setTransferParams({...transferParams, targetNick: e.target.value})}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-yellow-400 font-mono text-sm"
                    placeholder="vavilon_user"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Назначение (Комментарий)</label>
                <input
                  type="text" value={transferParams.note} onChange={e=>setTransferParams({...transferParams, note: e.target.value})} maxLength={100}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-yellow-400 font-mono text-sm"
                  placeholder="За аренду, подарок... (опционально)"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Сумма (Алмазы)</label>
                <input
                  type="number" min="1" value={transferParams.amount} onChange={e=>setTransferParams({...transferParams, amount: e.target.value})}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-yellow-400 font-mono text-sm"
                  placeholder="0"
                />
              </div>
              <button disabled={loading} onClick={() => handleTransfer(transferModal)} className="w-full mt-2 bg-yellow-400 text-black hover:bg-yellow-500 font-bold uppercase px-6 py-3 rounded-xl text-sm transition-colors disabled:opacity-50">
                {loading ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-red-500/30 p-8 rounded-3xl max-w-md w-full relative z-50">
            <button onClick={() => { setDeleteModal(null); setDeleteTargetAcc(''); }} className="absolute top-4 right-4 text-zinc-500 hover:text-white text-xl">&times;</button>
            <h3 className="text-lg font-bold uppercase mb-2 text-red-500">Закрытие счета</h3>
            <p className="text-xs text-zinc-400 mb-6 font-mono">Вы уверены, что хотите закрыть счет "{deleteModal.name}"?</p>
            
            {deleteModal.balance > 0 && (
              <div className="mb-6 space-y-4">
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                  <p className="text-xs font-bold text-red-400 mb-1">На счете остались средства: {deleteModal.balance} <img src={SECRET_TEXTURES.diamond} className="w-3 h-3 object-contain inline-block" alt="diamond"/></p>
                  <p className="text-[10px] text-zinc-400">Перед закрытием переведите остаток на другой ваш счет.</p>
                </div>
                <div>
                   <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Куда перевести остаток?</label>
                   <select
                     value={deleteTargetAcc} onChange={e=>setDeleteTargetAcc(e.target.value)}
                     className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-red-400 font-mono text-sm"
                   >
                     <option value="">Выберите счет...</option>
                     {allAccounts.filter((a:any) => a.id !== deleteModal.id).map((a:any) => (
                       <option key={a.id} value={a.id}>{a.name} ({a.balance} алмазов)</option>
                     ))}
                   </select>
                </div>
              </div>
            )}
            
            <button disabled={loading} onClick={handleDelete} className="w-full bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white font-bold uppercase px-6 py-3 rounded-xl text-sm transition-colors disabled:opacity-50">
              {loading ? 'Обработка...' : 'Подтвердить закрытие'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
