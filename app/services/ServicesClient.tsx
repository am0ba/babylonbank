'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SECRET_TEXTURES } from '@/lib/textures';
import { executeTransfer, executeLiquidate, submitRequest, searchUsers, subscribe, createNewAccount } from '@/lib/actions';
import SignaturePad from '@/app/components/SignaturePad';

export default function ServicesClient({ user }: { user: any }) {
  const router = useRouter();
  const [target, setTarget] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [amount, setAmount] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const [transferType, setTransferType] = useState<'player' | 'own' | 'service'>('player');
  const [targetAccountId, setTargetAccountId] = useState('');
  const [note, setNote] = useState('');

  const [showContract, setShowContract] = useState(false);
  const [activeForm, setActiveForm] = useState<'none' | 'credit' | 'deposit'>('none');
  const [formParams, setFormParams] = useState({ amount: '', details: '' });
  const [showOther, setShowOther] = useState(false);

  const [termDays, setTermDays] = useState(30);
  const [canReplenish, setCanReplenish] = useState(false);
  const [canWithdraw, setCanWithdraw] = useState(false);
  const [termFromAcc, setTermFromAcc] = useState('');

  const [hasSignedContract, setHasSignedContract] = useState(false);
  const [hasSignedService, setHasSignedService] = useState(false);
  
  const [creditType, setCreditType] = useState('consumer');

  const calculateRate = () => {
    let base = termDays === 7 ? 3 : termDays === 30 ? 8 : termDays === 90 ? 15 : 1;
    if (canReplenish) base -= 1;
    if (canWithdraw) base -= 2;
    return Math.max(1, base);
  };
  const currentRate = calculateRate();
  const expectedProfit = Math.floor((parseInt(formParams.amount) || 0) * (currentRate / 100));

  const calculateCreditRate = () => {
    let base = termDays === 7 ? 10 : termDays === 30 ? 25 : termDays === 90 ? 50 : 15;
    if (creditType === 'business') {
      base = Math.floor(base * 0.7);
    } else if (creditType === 'building') {
      base = Math.floor(base * 0.5);
    }
    return base;
  };
  const creditRate = calculateCreditRate();
  const expectedPayback = Math.floor((parseInt(formParams.amount) || 0) * (1 + creditRate / 100));

  const activeAccounts = user.accountsList.filter((a:any) => a.account_type === 'active');
  const allAccounts = user.accountsList;

  const handleSubscribeClick = () => {
    setShowContract(true);
    setHasSignedContract(false);
  };

  const handleServiceClick = (type: 'credit' | 'deposit') => {
    setActiveForm(type);
    setFormParams({ amount: '', details: '' });
    setHasSignedService(false);
  };

  const confirmService = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(formParams.amount);
    if (!val || isNaN(val) || val <= 0) return setMsg({text: 'Укажите корректную сумму', type: 'error'});
    
    setLoading(true);
    try {
      if (activeForm === 'deposit') {
        if (!termFromAcc) throw new Error('Укажите счет списания');
        await createNewAccount(
          'Срочный Депозит', 
          'term', 
          val, 
          termFromAcc, 
          { days: termDays, canReplenish, canWithdraw, rate: currentRate }
        );
        setMsg({text: 'Срочный депозит успешно открыт.', type: 'success'});
      } else {
        const payload = JSON.stringify({
          termDays,
          rate: creditRate,
          payback: expectedPayback,
          reason: formParams.details || 'Не указано',
          creditType
        });
        await submitRequest(activeForm, val, payload);
        setMsg({text: 'Заявка на кредит успешно отправлена на рассмотрение.', type: 'success'});
      }
      setActiveForm('none');
      router.refresh();
    } catch(err: any) {
      setMsg({text: err.message, type: 'error'});
    } finally { setLoading(false); }
  };

  const confirmSubscribe = async () => {
    setLoading(true);
    try {
      const res = await subscribe();
      setMsg({text: res.message, type: 'success'});
      setShowContract(false);
      router.refresh();
    } catch(err: any) {
      setMsg({text: err.message, type: 'error'});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (target.length >= 1 && transferType !== 'own') {
      timeoutId = setTimeout(async () => {
        const users = await searchUsers(target);
        setSuggestions(users.filter(u => u.toLowerCase() !== user.nick.toLowerCase() && u.toLowerCase().startsWith(target.toLowerCase())));
      }, 300);
    } else {
      setSuggestions([]);
    }
    return () => clearTimeout(timeoutId);
  }, [target, user.nick, transferType]);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setMsg({ text: '', type: '' });
    try {
      const res = await executeTransfer({
        amount,
        transferType,
        fromAccountId: fromAccountId || undefined,
        targetNick: transferType !== 'own' ? target : undefined,
        targetAccountId: transferType === 'own' ? targetAccountId : undefined,
        note
      });
      setMsg({ text: res.message, type: 'success' });
      setTarget(''); setAmount(''); setNote(''); router.refresh();
    } catch(err: any) {
      setMsg({ text: err.message, type: 'error' });
    } finally { setLoading(false); }
  };

  const [liquidationStep, setLiquidationStep] = useState(0);

  const handleLiquidate = async () => {
    if (liquidationStep === 0) {
      setLiquidationStep(1);
      return;
    }
    setLoading(true);
    try {
      const res = await executeLiquidate();
      setMsg({ text: res.message || 'Успех', type: 'success' });
      setLiquidationStep(0);
      router.refresh();
    } catch(err: any) { 
      setMsg({ text: err.message, type: 'error' });
      setLiquidationStep(0);
    } finally { setLoading(false); }
  };

  return (
    <div className="p-8 max-w-[1400px]">
      <h2 className="text-3xl font-bold mb-8 uppercase tracking-tight">Услуги</h2>
      
      {msg.text && (
        <div className={`mb-8 p-4 rounded-xl border text-sm font-bold uppercase ${msg.type==='error'?'bg-red-500/10 border-red-500/20 text-red-400':'bg-green-500/10 border-green-500/20 text-green-400'}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Transfer Form */}
        <div className="bg-zinc-900/50 rounded-3xl p-6 border border-zinc-800 relative z-10">
           <h4 className="font-bold uppercase text-xs text-zinc-400 tracking-wider mb-6">Денежный перевод</h4>
            <form onSubmit={handleTransfer} className="space-y-4 relative">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Тип перевода</label>
                <select
                  value={transferType} onChange={e => setTransferType(e.target.value as 'player' | 'own' | 'service')}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 font-mono text-sm transition-colors"
                >
                  <option value="player">Другому игроку</option>
                  <option value="own">Между своими счетами</option>
                  <option value="service">Оплата услуг / Погашение задолженности</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Откуда (Счет списания)</label>
                <select
                  value={fromAccountId} onChange={e => setFromAccountId(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 font-mono text-sm transition-colors"
                >
                  <option value="">По умолчанию (Основной счет)</option>
                  {activeAccounts.map((a:any) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.balance} алмазов)</option>
                  ))}
                </select>
              </div>

              {transferType === 'own' ? (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Куда (Счет зачисления)</label>
                  <select
                    value={targetAccountId} onChange={e => setTargetAccountId(e.target.value)} required
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 font-mono text-sm transition-colors"
                  >
                    <option value="">Выберите счет...</option>
                    {allAccounts.map((a:any) => (
                      <option key={a.id} value={a.id}>{a.name} ({a.balance} алмазов, {a.account_type === 'active' ? 'Активный' : 'Срочный'})</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="relative">
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Никнейм получателя</label>
                  <input
                    type="text" required value={target} onChange={e => setTarget(e.target.value)}
                    className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 font-mono text-sm transition-colors"
                    placeholder="vavilon_user"
                    autoComplete="off"
                  />
                  {suggestions.length > 0 && (
                    <ul className="absolute top-full left-0 right-0 bg-zinc-900 border border-zinc-800 rounded-xl mt-1 overflow-hidden z-50">
                      {suggestions.map(s => (
                        <li key={s} onClick={() => {setTarget(s); setSuggestions([]);}} className="px-4 py-2 hover:bg-yellow-400 hover:text-black cursor-pointer font-mono text-sm transition-colors">
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                  {target.length > 0 && suggestions.length === 0 && (
                    <div className="absolute top-full left-0 right-0 bg-zinc-900 border border-zinc-800 rounded-xl mt-1 px-4 py-2 text-xs text-zinc-500 font-mono z-50">Поиск пуст</div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Назначение перевода / Комментарий (Опционально)</label>
                <input
                  type="text" value={note} onChange={e => setNote(e.target.value)} maxLength={100}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 font-mono text-sm transition-colors"
                  placeholder="За аренду, подарок, и т.д."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5">Сумма</label>
                <input
                  type="number" required min="1" value={amount} onChange={e => setAmount(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400 font-mono text-sm transition-colors"
                  placeholder="0"
                />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-yellow-400 text-black font-bold uppercase tracking-wider py-3.5 rounded-xl hover:bg-yellow-500 transition-colors disabled:opacity-50 text-sm mt-2">
                ПОДПИСАТЬ И ОТПРАВИТЬ
              </button>
           </form>
        </div>

        {/* Requests */}
        <div className="bg-zinc-900/50 rounded-3xl p-6 border border-zinc-800 flex flex-col space-y-4">
           <h4 className="font-bold uppercase text-xs text-zinc-400 tracking-wider mb-2">Услуги банка</h4>
           <button onClick={() => handleServiceClick('credit')} className="w-full bg-black border border-zinc-800 hover:border-yellow-400 text-white font-bold uppercase tracking-wider py-3.5 rounded-xl transition-colors text-sm text-left px-4 flex justify-between items-center">
             <span>Запросить Кредит</span> <span className="text-xs text-zinc-500 font-mono">Требуется одобрение</span>
           </button>
           <button onClick={() => handleServiceClick('deposit')} className="w-full bg-black border border-zinc-800 hover:border-yellow-400 text-white font-bold uppercase tracking-wider py-3.5 rounded-xl transition-colors text-sm text-left px-4 flex justify-between items-center">
             <span>Срочный Депозит</span> <span className="text-xs text-zinc-500 font-mono">Вклад под %</span>
           </button>
           <button onClick={handleSubscribeClick} className="w-full bg-black border border-zinc-800 hover:border-yellow-400 text-white font-bold uppercase tracking-wider py-3.5 rounded-xl transition-colors text-sm text-left px-4 flex justify-between items-center group">
             <span>Оформить Подписку (PDA)</span> <span className="text-xs group-hover:text-yellow-400 text-zinc-500 font-mono flex items-center gap-1 transition-colors">5 <img src={SECRET_TEXTURES.diamond} className="w-3 h-3 object-contain" alt="diamond"/> / Неделя</span>
           </button>
           
           <button onClick={() => setShowOther(!showOther)} className={`w-full bg-black border hover:border-yellow-400 text-white font-bold uppercase tracking-wider py-3.5 rounded-xl transition-colors text-sm text-left px-4 flex justify-between items-center ${showOther ? 'border-yellow-400' : 'border-zinc-800'}`}>
             <span>Прочее</span> <span className="text-xs text-zinc-500 font-mono">{showOther ? 'Скрыть' : 'Договора, Удаление'}</span>
           </button>

           {showOther && (
             <div className="pl-4 border-l border-zinc-800 ml-2 space-y-4 pt-2">
               <button onClick={() => window.open('/docs', '_blank')} className="w-full bg-black border border-zinc-800 hover:border-yellow-400 text-white font-bold uppercase tracking-wider py-3.5 rounded-xl transition-colors text-sm text-left px-4 flex justify-between items-center">
                 <span>Договора и документация банка</span> <span className="text-xs text-zinc-500 font-mono">PDF</span>
               </button>
               
               <div>
                 {liquidationStep === 1 && (
                   <div className="mb-4 p-4 border border-red-500/50 bg-red-500/10 rounded-xl">
                     <p className="text-red-400 text-sm font-bold mb-2">Подтверждение: Вы уверены, что хотите закрыть все счета? Будет удержан штраф 30%.</p>
                     <div className="flex gap-2">
                       <button onClick={handleLiquidate} className="bg-red-500 text-white px-3 py-1.5 text-xs font-bold uppercase rounded hover:bg-red-600 transition-colors">Да, ликвидировать</button>
                       <button onClick={() => setLiquidationStep(0)} className="bg-zinc-800 text-white px-3 py-1.5 text-xs font-bold uppercase rounded hover:bg-zinc-700 transition-colors">Отмена</button>
                     </div>
                   </div>
                 )}
                 {liquidationStep !== 1 && (
                   <button onClick={() => setLiquidationStep(1)} disabled={loading} className="w-full bg-black border border-zinc-800 hover:border-red-500 border-opacity-50 hover:bg-red-500/10 text-zinc-600 hover:text-red-500 font-bold uppercase tracking-wider py-3.5 rounded-xl transition-colors text-sm text-left px-4 flex justify-between items-center disabled:opacity-50">
                     <span>Удаление аккаунта (Ликвидация)</span> <span className="text-xs font-mono">-30% штраф</span>
                   </button>
                 )}
               </div>
             </div>
           )}
        </div>
      </div>

      {showContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white text-black max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded p-4 sm:p-6 relative font-serif shadow-2xl">
            <button onClick={() => setShowContract(false)} className="absolute top-4 right-4 text-black text-xl hover:text-red-500 font-sans">&times;</button>
            <div className="border border-blue-900 p-4 sm:p-6 relative">
               <div className="text-center mb-4 border-b pb-2">
                 <h2 className="text-2xl sm:text-3xl font-bold text-blue-900 uppercase">СИСТЕМА ВАВИЛОН</h2>
                 <p className="text-sm uppercase tracking-widest mt-2 font-bold text-blue-900">Верховное Управление • Департамент Подписок</p>
               </div>
               
               <h3 className="text-xl font-bold text-center underline uppercase mb-4">
                 ДОГОВОР: ЕЖЕНЕДЕЛЬНОЕ ОБСЛУЖИВАНИЕ
               </h3>
               
               <p className="mb-4 leading-relaxed">
                 Настоящий договор подтверждает добровольное присоединение Игрока к программе еженедельного обслуживания в рамках Системы Вавилон.
               </p>
               
               <div className="mb-4 space-y-2 font-bold uppercase">
                 <p className="border-b border-black inline-block min-w-[300px]">НИКНЕЙМ ИГРОКА: <span className="underline decoration-1 pl-2 font-mono text-blue-900">{user.nick}</span></p><br/>
                 <p className="border-b border-black inline-block min-w-[300px]">ДАТА ЗАКЛЮЧЕНИЯ: <span suppressHydrationWarning className="underline decoration-1 pl-2 font-mono text-blue-900">{new Date().toLocaleDateString()}</span></p>
               </div>
               
               <p className="font-bold mb-4 uppercase">ТАРИФНЫЙ ПЛАН: 5 АЛМАЗОВ / НЕДЕЛЯ</p>
               
               <div className="border border-blue-900 p-4 mb-6">
                 <h4 className="font-bold mb-2 uppercase">УСЛОВИЯ И ОБЯЗАТЕЛЬСТВА:</h4>
                 <ol className="list-decimal pl-4 space-y-1 text-xs leading-relaxed text-justify">
                   <li><strong className="font-bold">Периодичность:</strong> Автоматическое списание 5 (пяти) Алмазов каждые 7 календарных дней.</li>
                   <li><strong className="font-bold">День списания:</strong> Первое списание производится в момент активации подписки. Все последующие — через каждые 7 дней с момента активации.</li>
                   <li><strong className="font-bold">Ответственность:</strong> Игрок обязуется поддерживать положительный баланс. При невозможности списания доступ к привилегиям приостанавливается.</li>
                   <li><strong className="font-bold">Прекращение:</strong> Подписка может быть прекращена в любой момент через Арбитраж. Средства за текущий период возврату не подлежат.</li>
                 </ol>
               </div>

               <div className="flex justify-between items-end mt-4 pt-4 border-t border-black relative">
                 <div className="text-center">
                   <SignaturePad onSigned={setHasSignedContract} />
                   <p className="text-xs font-bold uppercase">ПОДПИСЬ ИГРОКА</p>
                 </div>
                 <div className="text-center pb-2">
                   <div className={`w-16 h-16 border-2 border-blue-900 rounded-full mx-auto mb-1 flex items-center justify-center text-blue-900 ${hasSignedContract ? 'opacity-80' : 'opacity-20'}`}>
                      <div className="w-12 h-12 border border-blue-900 rounded-full flex items-center justify-center flex-col">
                        {hasSignedContract ? (
                          <div className="h-4 w-6 bg-blue-900 icon-stamp flex flex-col justify-end items-center"><div className="h-1 w-full border-t border-white"></div></div>
                        ) : (
                          <p className="text-[10px] uppercase font-bold text-center leading-none">ОЖИДАЕТ<br/>ПЕЧАТИ</p>
                        )}
                      </div>
                   </div>
                   <p className="text-[8px] font-bold uppercase text-blue-900 whitespace-nowrap">М.П. ВЕРХОВНОЕ УПРАВЛЕНИЕ</p>
                 </div>
               </div>

               <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                  <button onClick={() => setShowContract(false)} className="px-6 py-3 border border-black font-bold uppercase hover:bg-zinc-100 transition-colors">Отказаться</button>
                  <button onClick={confirmSubscribe} disabled={loading || !hasSignedContract} className="px-6 py-3 bg-blue-900 text-white font-bold uppercase hover:bg-blue-800 transition-colors disabled:opacity-50">СОГЛАСИТЬСЯ И ПОДПИСАТЬ</button>
               </div>
            </div>
          </div>
        </div>
      )}
      {activeForm !== 'none' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white text-black max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded p-4 sm:p-6 relative font-serif shadow-2xl">
            <button onClick={() => setActiveForm('none')} className="absolute top-4 right-4 text-black text-xl hover:text-red-500 font-sans">&times;</button>
            <div className="border border-blue-900 p-4 sm:p-6 relative">
               <div className="text-center mb-4 border-b pb-2">
                 <h2 className="text-2xl sm:text-3xl font-bold text-blue-900 uppercase">СИСТЕМА ВАВИЛОН</h2>
                 <p className="text-sm uppercase tracking-widest mt-2 font-bold text-blue-900">Верховное Управление • Финансовый Департамент</p>
               </div>
               
               <h3 className="text-xl font-bold text-center underline uppercase mb-4">
                 {activeForm === 'credit' ? 'ЗАЯВЛЕНИЕ: ВЫДАЧА КРЕДИТНЫХ СРЕДСТВ' : 'ЗАЯВЛЕНИЕ: СРОЧНЫЙ ДЕПОЗИТ'}
               </h3>
               
               <p className="mb-4 leading-relaxed text-sm">
                 {activeForm === 'credit' ? 'Настоящим заявлением Игрок запрашивает выдачу кредитных средств. После подписания, заявка будет передана на рассмотрение в Арбитраж системы Вавилон.' : 'Настоящим заявлением Игрок передает личные средства в доверительное управление Системы Вавилон в качестве срочного депозита (вклада).'}
               </p>
               
               <div className="mb-4 space-y-1 font-bold uppercase text-sm">
                 <p className="border-b border-black inline-block min-w-[250px]">НИКНЕЙМ ЗАЯВИТЕЛЯ: <span className="underline decoration-1 pl-2 font-mono text-blue-900">{user.nick}</span></p><br/>
                 <p className="border-b border-black inline-block min-w-[250px]">ДАТА ЗАЯВЛЕНИЯ: <span suppressHydrationWarning className="underline decoration-1 pl-2 font-mono text-blue-900">{new Date().toLocaleDateString()}</span></p>
               </div>
               
               <form onSubmit={confirmService}>
                 <div className="border border-blue-900 p-4 sm:p-6 mb-6 space-y-4">
                   <h4 className="font-bold uppercase">УКАЖИТЕ ПАРАМЕТРЫ ЗАЯВКИ:</h4>
                   
                   <div>
                     <label className="block text-xs font-bold uppercase mb-1">Сумма:</label>
                     <input required type="number" min="1" value={formParams.amount} onChange={e=>setFormParams({...formParams, amount: e.target.value})} className="w-full border-b border-black focus:outline-none focus:border-blue-900 px-2 py-1 bg-transparent font-mono" placeholder="64"/>
                   </div>
                   
                   <div>
                     {activeForm === 'deposit' && (
  <div className="space-y-4 pt-4 border-t border-black/20">
    <div>
      <label className="block text-xs font-bold uppercase mb-1">Срок вклада (Дней):</label>
      <select value={termDays} onChange={e=>setTermDays(parseInt(e.target.value))} className="w-full border-b border-black focus:outline-none focus:border-blue-900 px-2 py-1 bg-transparent font-mono">
        <option value={7}>7 дней</option>
        <option value={30}>30 дней</option>
        <option value={90}>90 дней</option>
      </select>
    </div>
    
    <div>
      <label className="block text-xs font-bold uppercase mb-1">Счет списания:</label>
      <select value={termFromAcc} onChange={e=>setTermFromAcc(e.target.value)} className="w-full border-b border-black focus:outline-none focus:border-blue-900 px-2 py-1 bg-transparent font-mono">
        <option value="">Выберите активный счет...</option>
        {activeAccounts.map((a:any) => (
          <option key={a.id} value={a.id}>{a.name} ({a.balance} алмазов)</option>
        ))}
      </select>
    </div>

    <div className="flex items-center justify-between text-sm">
      <label className="font-bold uppercase">Пополнение (+)</label>
      <input type="checkbox" checked={canReplenish} onChange={e=>setCanReplenish(e.target.checked)} className="w-4 h-4 cursor-pointer accent-blue-900" />
    </div>
    <div className="flex items-center justify-between text-sm mb-4">
      <label className="font-bold uppercase">Досрочное снятие</label>
      <input type="checkbox" checked={canWithdraw} onChange={e=>setCanWithdraw(e.target.checked)} className="w-4 h-4 cursor-pointer accent-blue-900" />
    </div>
    
    <div className="bg-blue-900/10 p-4 border border-blue-900/20 text-blue-900 font-bold uppercase flex justify-between items-center rounded-sm">
      <div>
        <span className="text-[10px] block mb-1">Финальная ставка:</span>
        <span className="text-xl">{currentRate}%</span>
      </div>
      <div className="text-right">
        <span className="text-[10px] block mb-1">Ожидаемый доход:</span>
        <span className="text-xl font-mono">+{expectedProfit} <img src={SECRET_TEXTURES.diamond} className="w-5 h-5 inline-block -mt-1 ml-1" alt="алмазов" /></span>
      </div>
    </div>
  </div>
)}

{activeForm === 'credit' && (
    <div className="space-y-4 pt-4 border-t border-black/20">
      <div>
        <label className="block text-xs font-bold uppercase mb-1">Категория:</label>
        <select value={creditType} onChange={e=>setCreditType(e.target.value)} className="w-full border-b border-black focus:outline-none focus:border-blue-900 px-2 py-1 bg-transparent font-mono mb-4 text-sm">
          <option value="consumer">Потребительский</option>
          <option value="business">Развитие бизнеса</option>
          <option value="building">Строительство/Инфраструктура</option>
        </select>
      </div>

      <label className="block text-xs font-bold uppercase mb-1">Цель:</label>
      <textarea value={formParams.details} onChange={e=>setFormParams({...formParams, details: e.target.value})} className="w-full border border-black focus:outline-none focus:border-blue-900 p-2 bg-transparent font-mono text-sm resize-none mb-4" rows={3} />

      <div>
        <label className="block text-xs font-bold uppercase mb-1">Срок:</label>
        <select value={termDays} onChange={e=>setTermDays(parseInt(e.target.value))} className="w-full border-b border-black focus:outline-none focus:border-blue-900 px-2 py-1 bg-transparent font-mono">
          <option value={7}>7 дней</option>
          <option value={30}>30 дней</option>
          <option value={90}>90 дней</option>
        </select>
      </div>

      <div className="bg-red-900/10 p-4 border border-red-900/20 text-red-900 font-bold uppercase flex justify-between items-center rounded-sm">
        <div>
          <span className="text-[10px] block mb-1">Ставка:</span>
          <span className="text-xl">{creditRate}%</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] block mb-1">К возврату:</span>
          <span className="text-xl font-mono">{expectedPayback} <img src={SECRET_TEXTURES.diamond} className="w-5 h-5 inline-block -mt-1 ml-1" alt="алмазов" /></span>
        </div>
      </div>
    </div>
)}
                   </div>
                 </div>
                 
                 <div className="flex justify-between items-end mt-4 pt-4 border-t border-black relative">
                   <div className="text-center">
                     <SignaturePad onSigned={setHasSignedService} />
                     <p className="text-xs font-bold uppercase">ПОДПИСЬ ИГРОКА</p>
                   </div>
                   <div className="text-center pb-2">
                     <div className={`w-16 h-16 border-2 border-blue-900 rounded-full mx-auto mb-1 flex items-center justify-center text-blue-900 ${hasSignedService ? 'opacity-80' : 'opacity-20'}`}>
                        <div className="w-12 h-12 border border-blue-900 rounded-full flex items-center justify-center flex-col">
                          {hasSignedService ? (
                            <div className="h-4 w-6 bg-blue-900 icon-stamp flex flex-col justify-end items-center"><div className="h-1 w-full border-t border-white"></div></div>
                          ) : (
                            <p className="text-[10px] uppercase font-bold text-center leading-none">ОЖИДАЕТ<br/>ПЕЧАТИ</p>
                          )}
                        </div>
                     </div>
                     <p className="text-[8px] sm:text-xs font-bold uppercase text-blue-900 whitespace-nowrap">ОТДЕЛ ФИНАНСОВ</p>
                   </div>
                 </div>

                 <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                    <button type="button" onClick={() => setActiveForm('none')} className="px-6 py-3 border border-black font-bold uppercase hover:bg-zinc-100 transition-colors">Отменить</button>
                    <button type="submit" disabled={loading || !hasSignedService} className="px-6 py-3 bg-blue-900 text-white font-bold uppercase hover:bg-blue-800 transition-colors disabled:opacity-50">ПОДПИСАТЬ ЗАЯВЛЕНИЕ</button>
                 </div>
               </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
