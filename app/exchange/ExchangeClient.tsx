'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SECRET_TEXTURES } from '@/lib/textures';
import { TrendingUp, TrendingDown, Clock, Search, RefreshCw, ShoppingCart, Activity } from 'lucide-react';
import { getCurrentMarketPrices, BASE_PRICES } from '@/lib/marketUtils';
import { requestItemWithdraw, swapItems, buyMarketItem, sellMarketItem } from '@/lib/actions';

export default function ExchangeClient({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState('items'); // stocks, items
  const [prices, setPrices] = useState(getCurrentMarketPrices());
  const [loadingCode, setLoadingCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // Swap State
  const [swapFrom, setSwapFrom] = useState('diamond');
  const [swapTo, setSwapTo] = useState('garant');
  const [swapAmount, setSwapAmount] = useState(1);
  const [withdrawModal, setWithdrawModal] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState(1);
  const router = useRouter();

  // Refresh prices every second
  useEffect(() => {
    const int = setInterval(() => {
      setPrices(getCurrentMarketPrices());
    }, 1000);
    return () => clearInterval(int);
  }, []);

  const handleSwap = async () => {
    setLoadingCode('swap');
    setErrorMsg('');
    try {
      let res;
      // Diamond to Item = Buy Market Item
      if (swapFrom === 'diamond' && ['netherite', 'echo_shard', 'garant'].includes(swapTo)) {
        res = await buyMarketItem(swapTo as any, swapAmount);
      }
      // Item to Diamond = Sell Market Item
      else if (swapTo === 'diamond' && ['netherite', 'echo_shard', 'garant'].includes(swapFrom)) {
        res = await sellMarketItem(swapFrom as any, swapAmount);
      } 
      // Item to Item Direct Swap (Garant <-> Shards)
      else {
        res = await swapItems(swapFrom, swapTo, swapAmount);
      }

      if (res.error) {
        setErrorMsg(res.error);
      } else {
        router.refresh();
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Ошибка');
    } finally {
      setLoadingCode('');
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawModal || withdrawAmount <= 0) return;
    setLoadingCode('withdraw');
    setErrorMsg('');
    try {
      if (withdrawModal === 'diamond') {
        setErrorMsg('Используйте вкладку "Счета" для вывода алмазов');
        return;
      }
      const res = await requestItemWithdraw(withdrawModal as any, withdrawAmount);
      alert('Запрос на вывод создан. Сообщите секретный код модератору в игре: ' + res.code);
      setWithdrawModal(null);
      router.refresh();
    } catch(e: any) {
      setErrorMsg(e.message);
    } finally {
      setLoadingCode('');
    }
  };

  const primaryAccount = user.accountsList?.find((a: any) => a.is_primary && a.account_type === 'active');
  const marketItems = [
    { id: 'diamond', name: 'Алмазы', ticker: 'DIA', price: 1, base: 1, has: primaryAccount?.balance || 0, img: SECRET_TEXTURES.diamond },
    { id: 'netherite', name: 'Незеритовый слиток', ticker: 'NTHR', price: prices.netherite, base: BASE_PRICES.netherite, has: user.netherite || 0, img: SECRET_TEXTURES.netherite },
    { id: 'echo_shard', name: 'Осколок гаранта', ticker: 'SHRD', price: prices.echo_shard, base: BASE_PRICES.echo_shard, has: user.echo_shard || 0, img: SECRET_TEXTURES.echo_shard },
    { id: 'garant', name: 'Целый гарант', ticker: 'GRNT', price: prices.garant, base: BASE_PRICES.garant, has: user.garant || 0, img: SECRET_TEXTURES.garant },
  ];

  // Calculate swap receive amount roughly for UI
  let receiveText = '---';
  let receiveAmount = 0;
  if (swapFrom === 'diamond' && swapTo !== 'diamond') {
    const it = marketItems.find(m => m.id === swapTo);
    if (it && it.price) {
      // You specify how many items you want to BUY using swapAmount. 
      // Wait, in standard SWAP UI, swapAmount is the "FROM" Amount.
      // So if from=Diamond, amount=480, you receive 480 / price items.
      receiveAmount = Math.floor(swapAmount / it.price);
      receiveText = `≈ ${receiveAmount} шт.`;
    }
  } else if (swapTo === 'diamond' && swapFrom !== 'diamond') {
    const it = marketItems.find(m => m.id === swapFrom);
    if (it && it.price) {
      // You specify how many items to SELL.
      const raw = swapAmount * it.price;
      const fee = Math.floor(raw * 0.02);
      receiveAmount = raw - fee;
      receiveText = `≈ ${receiveAmount} шт. (-2% ком.)`;
    }
  } else if (swapFrom === 'garant' && swapTo === 'echo_shard') {
    receiveAmount = swapAmount * 48;
    receiveText = `= ${receiveAmount} шт.`;
  } else if (swapFrom === 'echo_shard' && swapTo === 'garant') {
    receiveAmount = Math.floor(swapAmount / 48);
    receiveText = `= ${receiveAmount} шт.`;
  } else if (swapFrom !== 'diamond' && swapTo !== 'diamond' && swapFrom !== swapTo) {
    const fromIt = marketItems.find(m => m.id === swapFrom);
    const toIt = marketItems.find(m => m.id === swapTo);
    if (fromIt && toIt && fromIt.price && toIt.price) {
      const rawDiamond = swapAmount * fromIt.price;
      const fee = Math.floor(rawDiamond * 0.02);
      const net = rawDiamond - fee;
      receiveAmount = Math.floor(net / toIt.price);
      receiveText = `≈ ${receiveAmount} шт. (сдача ${net - receiveAmount * toIt.price} алм)`;
    }
  } else if (swapFrom === swapTo) {
    receiveAmount = swapAmount;
    receiveText = `= ${receiveAmount} шт.`;
  }

  // Swap logic adjustment: If from is Diamond, the generic backend function takes `fromAmount` as target quantity.
  // Wait, no! buyMarketItem takes quantity of item. 
  // Let's modify handleSwap behavior:
  const doTrade = async () => {
    setLoadingCode('swap');
    setErrorMsg('');
    try {
      let res;
      if (swapFrom === 'diamond' && ['netherite', 'echo_shard', 'garant'].includes(swapTo)) {
        // Buy Item. receiveAmount is how many WE GET. So we pass receiveAmount.
        if (receiveAmount <= 0) { res = { error: 'Сумма алмазов слишком мала для покупки 1 шт.'}; }
        else { res = await buyMarketItem(swapTo as any, receiveAmount); }
      }
      else if (swapTo === 'diamond' && ['netherite', 'echo_shard', 'garant'].includes(swapFrom)) {
        // Sell Item. swapAmount is how many ITEMS we sell.
        res = await sellMarketItem(swapFrom as any, swapAmount);
      } 
      else {
        res = await swapItems(swapFrom, swapTo, swapAmount);
      }

      if (res && res.error) {
        setErrorMsg(res.error);
      } else {
        router.refresh();
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Ошибка');
    } finally {
      setLoadingCode('');
    }
  };

  return (
    <div className="p-8 max-w-[1400px]">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold uppercase tracking-tight text-white flex items-center gap-2">
            <Activity className="w-8 h-8 text-yellow-500" />
            Биржа Вавилона (TR-EX)
          </h2>
          <p className="text-zinc-500 text-sm mt-1">Официальные торги ценными бумагами корпораций Вавилона и редкими ресурсами.</p>
        </div>
        <div className="flex bg-black p-1 rounded-xl border border-zinc-800">
          <button onClick={() => setActiveTab('stocks')} className={`px-6 py-2 rounded-lg text-sm font-bold uppercase transition-colors ${activeTab === 'stocks' ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:text-white'}`}>
            Акции и Доли
          </button>
          <button onClick={() => setActiveTab('items')} className={`px-6 py-2 rounded-lg text-sm font-bold uppercase transition-colors ${activeTab === 'items' ? 'bg-yellow-500 text-black' : 'text-zinc-400 hover:text-white'}`}>
            Сырье и Артефакты
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-sm font-bold">
          {errorMsg}
        </div>
      )}

      {activeTab === 'stocks' ? (
        <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800 mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold uppercase text-white mb-2">Открытие торгов акциями</h3>
            <p className="text-sm text-zinc-400">На данный момент проводится аудит смарт-контрактов и подготовка пулов ликвидности.</p>
          </div>
          <div className="hidden md:flex text-right flex-col items-end">
            <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">Статус ядра (TR-EX)</p>
            <p className="text-yellow-500 font-mono text-sm tracking-widest animate-pulse border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 rounded">CALIBRATING</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xl font-bold uppercase text-white mb-4">Сырьевые рынки</h3>
            {marketItems.map((item, i) => {
              const isUp = item.price >= item.base;
              const changePercent = (((item.price - item.base) / item.base) * 100).toFixed(1);

              return (
                <div key={i} className="flex flex-col md:flex-row items-center justify-between bg-zinc-900/80 p-5 rounded-2xl border border-zinc-800 hover:border-yellow-500/30 transition-colors gap-4">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="bg-black border border-zinc-800 w-16 h-16 flex items-center justify-center rounded-xl shrink-0">
                      <img src={item.img} className="w-10 h-10 object-contain" style={{ imageRendering: 'pixelated' }} alt={item.name} />
                    </div>
                    <div>
                      <p className="text-white font-bold tracking-tight text-lg">{item.name} <span className="text-xs text-zinc-500 font-mono tracking-widest ml-2">{item.ticker}</span></p>
                      <p className="text-sm text-zinc-400 mt-1 flex gap-4">
                        <span>В портфеле: <span className="text-white font-bold">{item.has} шт.</span></span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:items-end w-full md:w-auto">
                    <div className="flex gap-2 items-center font-mono font-bold text-2xl text-white">
                      {item.price} <img src={SECRET_TEXTURES.diamond} className="w-5 h-5" style={{ imageRendering: 'pixelated' }} alt="dia" />
                    </div>
                    {item.id !== 'diamond' && (
                      <div className={`text-xs font-mono font-bold flex items-center gap-1 mt-1 ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                        {isUp ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3" />}
                        {isUp ? '+' : ''}{changePercent}% от базы
                      </div>
                    )}
                  </div>

                  {item.id !== 'diamond' && (
                    <div className="flex gap-2 w-full md:w-auto">
                      <button 
                        onClick={() => setWithdrawModal(item.id)}
                        disabled={loadingCode !== '' || item.has <= 0}
                        className="flex-1 md:flex-none px-4 py-2 bg-zinc-800 text-white hover:bg-white hover:text-black font-bold uppercase rounded-xl transition-colors border border-zinc-700 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Вывести
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
              <h4 className="font-bold uppercase tracking-tight mb-6 flex items-center gap-2 text-white">
                <RefreshCw className="w-5 h-5 opacity-80 text-yellow-500" />
                Терминал Обмена
              </h4>

              <div className="space-y-4">
                <div className="bg-black p-4 rounded-xl border border-zinc-800">
                  <p className="text-xs text-zinc-500 font-bold uppercase mb-2">Вы отдаете</p>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      min="1"
                      value={swapAmount}
                      onChange={(e) => setSwapAmount(Number(e.target.value) || 0)}
                      className="w-full bg-transparent text-2xl font-bold text-white outline-none font-mono" 
                    />
                    <select 
                      value={swapFrom} 
                      onChange={(e) => setSwapFrom(e.target.value)}
                      className="bg-zinc-800 text-white font-bold p-2 rounded-lg outline-none"
                    >
                      {marketItems.map(m => <option key={`f-${m.id}`} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">Баланс: {marketItems.find(m => m.id === swapFrom)?.has || 0}</p>
                </div>

                <div className="flex justify-center -my-2 relative z-10 text-zinc-600">
                  <div className="bg-zinc-900 p-1 border border-zinc-800 rounded-full cursor-pointer hover:text-white transition-colors" onClick={() => {
                    setSwapFrom(swapTo);
                    setSwapTo(swapFrom);
                  }}>
                    <RefreshCw className="w-5 h-5"/>
                  </div>
                </div>

                <div className="bg-black p-4 rounded-xl border border-zinc-800">
                  <p className="text-xs text-zinc-500 font-bold uppercase mb-2">Вы получаете (оценочно)</p>
                  <div className="flex items-center gap-2 justify-between">
                    <p className="text-2xl font-bold text-white font-mono">{receiveText}</p>
                    <select 
                      value={swapTo} 
                      onChange={(e) => setSwapTo(e.target.value)}
                      className="bg-zinc-800 text-white font-bold p-2 rounded-lg outline-none"
                    >
                      {marketItems.map(m => <option key={`t-${m.id}`} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <button 
                onClick={doTrade}
                disabled={loadingCode !== '' || swapAmount <= 0 || swapFrom === swapTo || receiveAmount <= 0}
                className="w-full mt-6 py-4 bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500 hover:text-black font-bold uppercase tracking-widest rounded-xl transition-colors border border-yellow-500/50 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingCode === 'swap' ? <RefreshCw className="w-5 h-5 animate-spin"/> : 'Обменять'}
              </button>
            </div>

            <div className="bg-black/50 border border-zinc-800 rounded-3xl p-6">
              <h4 className="font-bold uppercase text-zinc-400 text-sm tracking-widest mb-4">Информация</h4>
              <ul className="space-y-3 text-xs text-zinc-400">
                <li className="flex gap-2">
                  <span className="text-yellow-500">▹</span>
                  Продажа сырья за алмазы: комиссия 2%
                </li>
                <li className="flex gap-2">
                  <span className="text-yellow-500">▹</span>
                  Покупка сырья: 0%
                </li>
                <li className="flex gap-2">
                  <span className="text-yellow-500">▹</span>
                  Крафт Гарантов ↔ Осколков (48:1): 0%
                </li>
                <li className="flex gap-2">
                  <span className="text-yellow-500">▹</span>
                  Прямой обмен предметов между собой: комиссия 2%
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {withdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-sm w-full">
            <h3 className="text-xl font-bold uppercase text-white mb-4">Предметный вывод</h3>
            <p className="text-sm text-zinc-400 mb-6 font-mono border border-yellow-500/30 bg-yellow-500/10 p-3 rounded-xl border-l-4 border-l-yellow-500">
              Вы конвертируете цифровой предмет обратно в игровой ресурс на сервере {withdrawModal.replace('_', ' ')}.
            </p>
            <div className="mb-6">
              <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1.5 flex justify-between">
                <span>Количество вывода</span>
                <span className="text-yellow-500 cursor-pointer hover:underline" onClick={() => setWithdrawAmount(marketItems.find(m => m.id === withdrawModal)?.has || 0)}>МАКС</span>
              </label>
              <input 
                type="number" 
                value={withdrawAmount} 
                onChange={(e) => setWithdrawAmount(parseInt(e.target.value) || 0)}
                className="w-full bg-black border border-zinc-800 px-4 py-3 rounded-xl text-white font-mono font-bold outline-none focus:border-yellow-500"
              />
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setWithdrawModal(null)} 
                className="flex-1 bg-zinc-800 text-white font-bold py-3 uppercase tracking-wider rounded-xl hover:bg-zinc-700 transition"
              >
                Отмена
              </button>
              <button 
                onClick={handleWithdraw} 
                disabled={loadingCode === 'withdraw'}
                className="flex-1 bg-white text-black font-bold py-3 uppercase tracking-wider rounded-xl hover:bg-zinc-200 transition disabled:opacity-50"
              >
                {loadingCode === 'withdraw' ? 'Обмен...' : 'Вывести'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
