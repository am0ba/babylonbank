'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { executeTransfer, executeLiquidate } from '@/lib/actions';
import { SECRET_TEXTURES } from '@/lib/textures';
import { ShieldAlert, ArrowRightLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

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
          <h2 className="text-3xl font-bold">Добро пожаловать, <span className="text-yellow-400">{user?.nick}</span></h2>
          <p className="text-zinc-500 text-sm italic">ID: {user?.id}</p>
        </div>
        <div className="mt-4 md:mt-0 text-left md:text-right">
          <p className="text-xs text-zinc-500 uppercase font-bold">Кредитный лимит</p>
          <p className={`text-lg font-mono font-bold tracking-tight inline-flex items-center gap-1 ${user?.loot_balance < -512 ? 'text-red-500' : 'text-zinc-300'}`}>
            -512 <img src={SECRET_TEXTURES.diamond} className="w-4 h-4 object-contain" alt="diamond" />
          </p>
        </div>
      </div>

      {msg.text && (
        <div className={`col-span-12 p-4 rounded-xl border text-sm font-bold uppercase ${msg.type==='error'?'bg-red-500/10 border-red-500/20 text-red-400':'bg-green-500/10 border-green-500/20 text-green-400'}`}>
          {msg.text}
        </div>
      )}

      {/* Main Balance Card (Bento Style) */}
      <div className="col-span-12 lg:col-span-8 bg-zinc-900 rounded-3xl p-8 border border-zinc-800 flex flex-col justify-between min-h-[300px]">
        <div>
          <p className="text-sm text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <img src={SECRET_TEXTURES.diamond} className="w-4 h-4 object-contain" alt="diamond" /> 
            Основной Баланс
          </p>
          <h3 className="text-6xl md:text-7xl font-bold text-yellow-400 mt-3 tabular-nums tracking-tighter flex items-center gap-2">
            {user?.loot_balance} <img src={SECRET_TEXTURES.diamond} className="w-12 h-12 md:w-16 md:h-16 object-contain opacity-50" alt="diamond" />
          </h3>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between border-t border-zinc-800 pt-6 mt-8 gap-4 sm:gap-0">
          <div className="text-zinc-500 text-sm font-mono uppercase font-bold">
            Доступны все виды переводов
          </div>
          <button 
             onClick={() => router.push('/services')}
             className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-yellow-400 transition-colors uppercase text-sm tracking-wider">
               Услуги
          </button>
        </div>
      </div>



      {/* Expense Chart */}
      <div className="col-span-12 lg:col-span-4 bg-zinc-900/50 rounded-3xl p-6 border border-zinc-800 min-h-[300px] flex flex-col">
         <h4 className="font-bold uppercase text-xs text-zinc-400 tracking-wider mb-6">Расходы (Алмазы)</h4>
         <div className="flex-1 w-full min-h-[200px]">
           {chartData.length > 0 ? (
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                 <XAxis dataKey="name" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                 <YAxis stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} width={40} />
                 <Tooltip 
                   cursor={{fill: '#27272a'}}
                   contentStyle={{backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px', fontSize: '12px'}}
                   itemStyle={{color: '#facc15', fontWeight: 'bold'}}
                   labelStyle={{color: '#a1a1aa', marginBottom: '4px'}}
                 />
                 <Bar dataKey="value" fill="#facc15" radius={[4, 4, 0, 0]} barSize={30} />
               </BarChart>
             </ResponsiveContainer>
           ) : (
             <div className="w-full h-full flex items-center justify-center text-zinc-500 font-mono text-sm">
               НЕТ РАСХОДОВ
             </div>
           )}
         </div>
      </div>

      {/* Recent Transfers */}
      <div className="col-span-12 bg-zinc-900/50 rounded-3xl p-6 border border-zinc-800">
        <div className="flex justify-between items-center mb-6">
           <h4 className="font-bold uppercase text-xs text-zinc-400 tracking-wider">Недавние переводы</h4>
        </div>
        <div className="space-y-4">
          {transactions.length === 0 ? <p className="text-sm text-zinc-500 font-mono">НЕТ ТРАНЗАКЦИЙ</p> : null}
          {transactions.slice(0, 6).map((tx: any, i: number) => {
            const isOut = tx.from_user_id === user.id;
            return (
            <div key={i} onClick={() => setSelectedTx(tx)} className="flex justify-between items-center pb-3 border-b border-zinc-800/50 last:border-0 last:pb-0 cursor-pointer hover:bg-zinc-800/50 p-2 rounded transition-colors -mx-2">
              <div>
                <span className={`text-sm flex items-center gap-1.5 uppercase text-[11px] font-bold tracking-wider ${isOut ? 'text-red-500/80' : 'text-green-500/80'}`}>
                  {tx.tx_type === 'transfer' && <ArrowRightLeft className={`w-3.5 h-3.5 ${isOut ? 'text-zinc-500' : 'text-green-500'}`}/>}
                  {tx.tx_type === 'transfer' 
                    ? (isOut ? 'Исходящий' : 'Входящий') 
                    : (tx.tx_type === 'system_add' ? 'Пополнение баланса' : (tx.tx_type === 'service_payment' ? 'Услуги' : tx.tx_type))
                  }
                </span>
                <div suppressHydrationWarning className="text-[10px] text-zinc-500 font-mono mt-1">{new Date(tx.created_at).toLocaleString('ru-RU')}</div>
              </div>
              <span className={`text-base font-bold font-mono flex items-center gap-1.5 ${isOut ? 'text-red-500' : 'text-green-500'}`}>
                {isOut ? '-' : '+'}{tx.amount} <img src={SECRET_TEXTURES.diamond} className="w-3.5 h-3.5 object-contain" alt="diamond" />
              </span>
            </div>
            );
          })}
        </div>
      </div>
      
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-sm w-full relative z-50">
            <button onClick={() => setSelectedTx(null)} className="absolute top-4 right-4 text-zinc-500 hover:text-white text-xl">&times;</button>
            <h3 className="text-xl font-bold uppercase mb-6 text-yellow-400">Детали транзакции</h3>
            
            <div className="space-y-4 font-mono text-sm break-words">
              <div>
                <p className="text-[10px] uppercase text-zinc-500 mb-1">ID Транзакции</p>
                <p className="text-white text-xs">{selectedTx.id}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-zinc-500 mb-1">Дата</p>
                <p suppressHydrationWarning className="text-white">{new Date(selectedTx.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-zinc-500 mb-1">Тип</p>
                <p className="text-white">{selectedTx.tx_type === 'transfer' ? (selectedTx.from_user_id === user.id ? 'Исходящий перевод' : 'Входящий перевод') : selectedTx.tx_type}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-zinc-500 mb-1">Сумма</p>
                <p className="text-xl font-bold flex items-center gap-1 text-white">
                  {selectedTx.amount} <img src={SECRET_TEXTURES.diamond} className="w-4 h-4 object-contain" alt="diamond" />
                </p>
              </div>
              {selectedTx.fee > 0 && (
                <div>
                  <p className="text-[10px] uppercase text-zinc-500 mb-1">Комиссия системы</p>
                  <p className="text-red-400 flex items-center gap-1">{selectedTx.fee} <img src={SECRET_TEXTURES.diamond} className="w-4 h-4 object-contain" alt="diamond"/></p>
                </div>
              )}
              {selectedTx.note && (
                <div>
                  <p className="text-[10px] uppercase text-zinc-500 mb-1">Комментарий / Примечание</p>
                  <p className="text-zinc-300 italic">{selectedTx.note}</p>
                </div>
              )}
            </div>
            
            <button onClick={() => setSelectedTx(null)} className="w-full mt-6 bg-zinc-800 text-white hover:bg-zinc-700 font-bold uppercase px-6 py-3 rounded-xl text-sm transition-colors">
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
