'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { executeTransfer, executeLiquidate } from '@/lib/actions';
import { SECRET_TEXTURES } from '@/lib/textures';
import { ShieldAlert, ArrowRightLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import CustomTooltip from '@/components/Tooltip';

export default function DashboardClient({ user }: { user: any }) {
  const router = useRouter();
  const [transferTarget, setTransferTarget] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [liquidationStep, setLiquidationStep] = useState(0);

  const transactions = [...(user?.transactions || [])].reverse();
  const transfers = [...(user?.money_transfers || [])].reverse();

  // Prepare chart data (expenses by date)
  const outgoingTxs = [...(user?.transactions || [])].filter((tx: any) => tx.from_user_id === user.id);
  const expensesMap = outgoingTxs.reduce((acc: any, tx: any) => {
    const d = new Date(tx.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
    acc[d] = (acc[d] || 0) + tx.amount + tx.fee;
    return acc;
  }, {});

  const chartData = Object.entries(expensesMap).map(([name, value]) => ({ name, value }));

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });
    try {
      const res = await executeTransfer({
        amount: transferAmount,
        targetNick: transferTarget,
        transferType: 'player'
      });
      setMsg({ text: res.message, type: 'success' });
      setTransferTarget('');
      setTransferAmount('');
      router.refresh();
    } catch(err: any) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 grid grid-cols-12 auto-rows-min gap-6 max-w-[1400px]">
      
      {/* Header */}
      <div className="col-span-12 flex flex-col md:flex-row md:items-end justify-between mb-2">
        <div>
          <h2 className="text-3xl font-bold">Добро пожаловать, <span className="text-foreground">{user?.nick}</span></h2>
          <p className="text-muted-foreground text-sm italic">ID: {user?.id}</p>
        </div>
      </div>

      {msg.text && (
        <div className={`col-span-12 p-4 rounded-xl border text-sm font-bold uppercase ${msg.type==='error'?'bg-red-500/10 border-red-500/20 text-red-400':'bg-green-500/10 border-green-500/20 text-green-400'}`}>
          {msg.text}
        </div>
      )}

      {/* Main Balance Card (Bento Style) */}
      <div className="col-span-12 lg:col-span-8 bg-card text-card-foreground shadow-sm rounded-2xl p-8 border border-border flex flex-col justify-between min-h-[300px]">
        <div>
          <p className="text-sm text-muted-foreground uppercase  flex items-center gap-2">
            <img src={SECRET_TEXTURES.diamond} className="w-4 h-4 object-contain" alt="diamond" /> 
            Основной Баланс
            <CustomTooltip text="Ваш общий баланс на активном Лут-Счете в алмазах. Средства с этого баланса списываются первыми." />
          </p>
          <h3 className="text-6xl md:text-7xl font-bold text-foreground mt-3 tabular-nums tracking-tighter flex items-center gap-2">
            {user?.loot_balance} <img src={SECRET_TEXTURES.diamond} className="w-12 h-12 md:w-16 md:h-16 object-contain opacity-50" alt="diamond" />
          </h3>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between border-t border-border pt-6 mt-8 gap-4 sm:gap-0">
          <div className="text-muted-foreground text-sm font-sans uppercase font-bold">
            Доступны все виды переводов
          </div>
          <button 
             onClick={() => router.push('/services')}
             className="bg-card text-card-foreground text-black dark:text-white px-8 py-3 rounded-full font-bold hover:bg-yellow-400 transition-colors uppercase text-sm tracking-wider">
               Услуги
          </button>
        </div>
      </div>



      {/* Expense Chart */}
      <div className="col-span-12 lg:col-span-4 bg-card text-card-foreground shadow-sm rounded-2xl p-6 border border-border min-h-[300px] flex flex-col">
         <h4 className="font-bold uppercase text-xs text-muted-foreground tracking-wider mb-6">Расходы (Алмазы)</h4>
         <div className="flex-1 w-full min-h-[200px]">
           {chartData.length > 0 ? (
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                 <XAxis dataKey="name" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                 <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} width={40} />
                 <RechartsTooltip 
                   cursor={{fill: '#27272a'}}
                   contentStyle={{backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '12px'}}
                   itemStyle={{color: '#facc15', fontWeight: 'bold'}}
                   labelStyle={{color: '#a1a1aa', marginBottom: '4px'}}
                 />
                 <Bar dataKey="value" fill="#facc15" radius={[4, 4, 0, 0]} barSize={30} />
               </BarChart>
             </ResponsiveContainer>
           ) : (
             <div className="w-full h-full flex items-center justify-center text-muted-foreground font-sans text-sm">
               НЕТ РАСХОДОВ
             </div>
           )}
         </div>
      </div>

      {/* Recent Transfers */}
      <div className="col-span-12 bg-card text-card-foreground shadow-sm rounded-2xl p-6 border border-border">
        <div className="flex justify-between items-center mb-6">
           <h4 className="font-bold uppercase text-xs text-muted-foreground tracking-wider">Недавние переводы</h4>
        </div>
        <div className="space-y-4">
          {transactions.length === 0 ? <p className="text-sm text-muted-foreground font-sans">НЕТ ТРАНЗАКЦИЙ</p> : null}
          {transactions.slice(0, 6).map((tx: any, i: number) => {
            const isOut = tx.from_user_id === user.id;
            const isNovaPay = tx.note?.includes('NOVA PAY');
            return (
            <div key={i} onClick={() => setSelectedTx(tx)} className="flex justify-between items-center pb-3 border-b border-border/50 last:border-0 last:pb-0 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors -mx-2">
              <div>
                <span className={`text-sm flex items-center gap-1.5 uppercase text-[11px] font-bold tracking-wider ${isNovaPay ? 'text-blue-500' : (isOut ? 'text-red-500/80' : 'text-green-500/80')}`}>
                  {isNovaPay ? (
                     <span className="bg-blue-600 text-foreground w-4 h-4 rounded flex items-center justify-center italic tracking-tighter text-[9px]">N</span>
                  ) : (
                    tx.tx_type === 'transfer' && <ArrowRightLeft className={`w-3.5 h-3.5 ${isOut ? 'text-muted-foreground' : 'text-green-500'}`}/>
                  )}
                  {isNovaPay ? (isOut ? 'NOVA PAY Списание' : 'NOVA PAY Зачисление') : 
                    (tx.tx_type === 'transfer' 
                    ? (isOut ? `Исходящий ${tx.to_user?.nick ? `(${tx.to_user.nick})` : ''}` : `Входящий ${tx.from_user?.nick ? `(${tx.from_user.nick})` : ''}`) 
                    : (tx.tx_type === 'system_add' ? 'Пополнение баланса' : 
                      (tx.tx_type === 'system_remove' ? 'Списание средств' : 
                      (tx.tx_type === 'service_payment' ? 'Оплата услуг' : 
                      (tx.tx_type === 'market_buy' ? 'Покупка на бирже' : 
                      (tx.tx_type === 'market_sell' ? 'Продажа на бирже' : 
                      (tx.tx_type === 'subscription' ? 'Подписка' : tx.tx_type)))))))
                  }
                </span>
                <div suppressHydrationWarning className="text-[10px] text-muted-foreground font-sans mt-1">{new Date(tx.created_at).toLocaleString('ru-RU')}</div>
              </div>
              <span className={`text-base font-bold font-sans flex items-center gap-1.5 ${isOut ? 'text-red-500' : 'text-green-500'}`}>
                {isOut ? '-' : '+'}{tx.amount} <img src={SECRET_TEXTURES.diamond} className="w-3.5 h-3.5 object-contain" alt="diamond" />
              </span>
            </div>
            );
          })}
        </div>
      </div>
      
      {selectedTx && (() => {
        const isNova = selectedTx.note?.includes('NOVA PAY');
        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className={`border p-8 rounded-2xl max-w-sm w-full relative z-50 ${isNova ? 'bg-background border-border' : 'bg-card text-card-foreground shadow-sm border-border'}`}>
            <button onClick={() => setSelectedTx(null)} className={`absolute top-4 right-4 hover:text-foreground text-xl ${isNova ? 'text-muted-foreground hover:text-slate-800' : 'text-muted-foreground'}`}>&times;</button>
            
            {isNova ? (
              <div className="mb-6 flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-foreground font-black text-[10px] italic">N</span>
                </div>
                <h3 className="text-xl font-bold tracking-tighter text-blue-900 italic">NOVA PAY</h3>
              </div>
            ) : (
              <h3 className="text-xl font-bold mb-4 text-foreground">Детали транзакции</h3>
            )}
            
            <div className={`space-y-4 font-sans text-sm break-words ${isNova ? 'text-slate-800' : 'text-foreground'}`}>
              <div>
                <p className={`text-[10px] uppercase mb-1 ${isNova ? 'text-muted-foreground' : 'text-muted-foreground'}`}>ID Транзакции</p>
                <p className={`text-xs ${isNova ? 'text-slate-600' : 'text-foreground'}`}>{selectedTx.id}</p>
              </div>
              <div>
                <p className={`text-[10px] uppercase mb-1 ${isNova ? 'text-muted-foreground' : 'text-muted-foreground'}`}>Дата</p>
                <p suppressHydrationWarning>{new Date(selectedTx.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className={`text-[10px] uppercase mb-1 ${isNova ? 'text-muted-foreground' : 'text-muted-foreground'}`}>Тип</p>
                <p>{selectedTx.tx_type === 'transfer' ? (selectedTx.from_user_id === user.id ? 'Исходящий перевод' : 'Входящий перевод') : 
                   (selectedTx.tx_type === 'system_add' ? 'Пополнение баланса' : 
                   (selectedTx.tx_type === 'system_remove' ? 'Списание средств' : 
                   (selectedTx.tx_type === 'service_payment' ? 'Оплата услуг' : 
                   (selectedTx.tx_type === 'market_buy' ? 'Покупка на бирже' : 
                   (selectedTx.tx_type === 'market_sell' ? 'Продажа на бирже' : 
                   (selectedTx.tx_type === 'subscription' ? 'Подписка' : selectedTx.tx_type))))))}</p>
              </div>
              {selectedTx.from_user_id && selectedTx.from_user_id !== user.id && selectedTx.from_user?.nick && (
                <div>
                  <p className={`text-[10px] uppercase mb-1 ${isNova ? 'text-muted-foreground' : 'text-muted-foreground'}`}>От кого</p>
                  <p className={`text-xs ${isNova ? 'text-slate-600' : 'text-muted-foreground'}`}>{selectedTx.from_user.nick}</p>
                </div>
              )}
              {selectedTx.to_user_id && selectedTx.to_user_id !== user.id && selectedTx.to_user?.nick && (
                <div>
                  <p className={`text-[10px] uppercase mb-1 ${isNova ? 'text-muted-foreground' : 'text-muted-foreground'}`}>Кому</p>
                  <p className={`text-xs ${isNova ? 'text-slate-600' : 'text-muted-foreground'}`}>{selectedTx.to_user.nick}</p>
                </div>
              )}
              <div>
                <p className={`text-[10px] uppercase mb-1 ${isNova ? 'text-muted-foreground' : 'text-muted-foreground'}`}>Сумма</p>
                <p className={`text-xl font-bold flex items-center gap-1 ${isNova ? 'text-blue-600' : 'text-foreground'}`}>
                  {selectedTx.amount} <img src={SECRET_TEXTURES.diamond} className={`w-4 h-4 object-contain ${isNova ? 'mix-blend-multiply opacity-80' : ''}`} alt="diamond" />
                </p>
              </div>
              {selectedTx.fee > 0 && (
                <div>
                  <p className={`text-[10px] uppercase mb-1 ${isNova ? 'text-muted-foreground' : 'text-muted-foreground'}`}>Комиссия системы</p>
                  <p className={`flex items-center gap-1 ${isNova ? 'text-muted-foreground' : 'text-red-400'}`}>{selectedTx.fee} <img src={SECRET_TEXTURES.diamond} className={`w-4 h-4 object-contain ${isNova ? 'mix-blend-multiply opacity-50' : ''}`} alt="diamond"/></p>
                </div>
              )}
              {selectedTx.note && (
                <div>
                  <p className={`text-[10px] uppercase mb-1 ${isNova ? 'text-muted-foreground' : 'text-muted-foreground'}`}>Комментарий / Примечание</p>
                  <p className={`italic ${isNova ? 'text-muted-foreground' : 'text-muted-foreground'}`}>{selectedTx.note}</p>
                </div>
              )}
            </div>
            
            <button onClick={() => setSelectedTx(null)} className={`w-full mt-6 font-bold uppercase px-6 py-3 rounded-xl text-sm transition-colors ${isNova ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-muted text-foreground hover:bg-zinc-700'}`}>
              Закрыть
            </button>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
