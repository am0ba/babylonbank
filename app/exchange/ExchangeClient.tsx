'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SECRET_TEXTURES } from '@/lib/textures';
import { TrendingUp, TrendingDown, Clock, Search, RefreshCw, ShoppingCart, Activity } from 'lucide-react';
import Tooltip from '@/components/Tooltip';
import { getCurrentMarketPrices, BASE_PRICES } from '@/lib/marketUtils';
import { requestItemWithdraw, swapItems, buyMarketItem, sellMarketItem } from '@/lib/actions';

export default function ExchangeClient({ user, stats }: { user: any, stats?: any }) {
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
  const isSubmittingRef = useRef(false);

  // Refresh prices every second
  useEffect(() => {
    const int = setInterval(() => {
      setPrices(getCurrentMarketPrices());
    }, 1000);
    return () => clearInterval(int);
  }, []);

  const handleSwap = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
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
      isSubmittingRef.current = false;
    }
  };

  const handleWithdraw = async () => {
    if (isSubmittingRef.current) return;
    if (!withdrawModal || withdrawAmount <= 0) return;
    isSubmittingRef.current = true;
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
      isSubmittingRef.current = false;
    }
  };

  const primaryAccount = user.accountsList?.find((a: any) => a.is_primary && a.account_type === 'active');
  const marketItems = [
    { id: 'diamond', name: 'Алмазы', ticker: 'DIA', price: 1, base: 1, has: primaryAccount?.balance || 0, img: SECRET_TEXTURES.diamond },
    { id: 'netherite', name: 'Незеритовый слиток', ticker: 'NTHR', price: prices.netherite, base: BASE_PRICES.netherite, has: user.netherite || 0, img: SECRET_TEXTURES.netherite },
    { id: 'echo_shard', name: 'Осколок гаранта', ticker: 'SHRD', price: prices.echo_shard, base: BASE_PRICES.echo_shard, has: user.echo_shard || 0, img: SECRET_TEXTURES.echo_shard },
    { id: 'garant', name: 'Целый гарант', ticker: 'GRNT', price: prices.garant, base: BASE_PRICES.garant, has: user.garant || 0, img: SECRET_TEXTURES.garant },
  ];

  const feePercent = user.subscription_active ? 0.02 : 0.10;

  // Calculate swap receive amount roughly for UI
  let receiveText = '---';
  let receiveAmount = 0;
  if (swapFrom === 'diamond' && swapTo !== 'diamond') {
    const it = marketItems.find(m => m.id === swapTo);
    if (it && it.price) {
      receiveAmount = Math.floor(swapAmount / it.price);
      receiveText = `≈ ${receiveAmount} шт.`;
    }
  } else if (swapTo === 'diamond' && swapFrom !== 'diamond') {
    const it = marketItems.find(m => m.id === swapFrom);
    if (it && it.price) {
      const raw = swapAmount * it.price;
      const fee = Math.floor(raw * feePercent);
      receiveAmount = raw - fee;
      receiveText = `≈ ${receiveAmount} шт. (-${feePercent * 100}% ком.)`;
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
      const fee = Math.floor(rawDiamond * feePercent);
      const net = rawDiamond - fee;
      receiveAmount = Math.floor(net / toIt.price);
      receiveText = `≈ ${receiveAmount} шт. (сдача ${net - receiveAmount * toIt.price} алм)`;
    }
  } else if (swapFrom === swapTo) {
    receiveAmount = swapAmount;
    receiveText = `= ${receiveAmount} шт.`;
  }

  let treasuryLacksItems = false;
  if (swapTo === 'diamond') {
    const tCount = stats ? (stats.treasuryBalance || 0) : 0;
    if (tCount <= 0 || receiveAmount > tCount) {
      treasuryLacksItems = true;
    }
  } else if (!(swapFrom === 'garant' && swapTo === 'echo_shard') && !(swapFrom === 'echo_shard' && swapTo === 'garant') && swapFrom !== swapTo) {
    const treasuryKey = 'treasury' + swapTo.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
    const tCount = stats ? (stats[treasuryKey as keyof typeof stats] || 0) : 0;
    if (tCount <= 0 || receiveAmount > tCount) {
      treasuryLacksItems = true;
    }
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
          <h2 className="text-3xl font-bold uppercase tracking-tight text-foreground flex items-center gap-2">
            <Activity className="w-8 h-8 text-yellow-500" />
            Биржа Вавилона (TR-EX)
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Официальные торги ценными бумагами корпораций Вавилона и редкими ресурсами.</p>
        </div>
        <div className="flex bg-background p-1 rounded-xl border border-border">
          <button onClick={() => setActiveTab('stocks')} className={`px-6 py-2 rounded-lg text-sm font-bold uppercase transition-colors ${activeTab === 'stocks' ? 'bg-yellow-500 text-black dark:text-white' : 'text-muted-foreground hover:text-foreground'}`}>
            Акции и Доли
          </button>
          <button onClick={() => setActiveTab('items')} className={`px-6 py-2 rounded-lg text-sm font-bold uppercase transition-colors ${activeTab === 'items' ? 'bg-yellow-500 text-black dark:text-white' : 'text-muted-foreground hover:text-foreground'}`}>
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
        <div className="bg-card text-card-foreground shadow-sm rounded-2xl p-8 border border-border mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold uppercase text-foreground mb-2">Открытие торгов акциями</h3>
            <p className="text-sm text-muted-foreground">На данный момент проводится аудит смарт-контрактов и подготовка пулов ликвидности.</p>
          </div>
          <div className="hidden md:flex text-right flex-col items-end">
            <p className="text-xs text-muted-foreground uppercase  font-bold mb-1">Статус ядра (TR-EX)</p>
            <p className="text-yellow-500 font-sans text-sm  animate-pulse border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 rounded">CALIBRATING</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xl font-bold uppercase text-foreground mb-4">
              Сырьевые рынки
              <Tooltip text="Цены на ресурсы динамически изменяются на основе спроса и текущего баланса системы." />
            </h3>
            {marketItems.map((item, i) => {
              const isUp = item.price >= item.base;
              const changePercent = (((item.price - item.base) / item.base) * 100).toFixed(1);

              return (
                <div key={i} className="flex flex-col md:flex-row items-center justify-between bg-card text-card-foreground shadow-sm/80 p-5 rounded-2xl border border-border hover:border-yellow-500/30 transition-colors gap-4">
                  <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="bg-background border border-border w-16 h-16 flex items-center justify-center rounded-xl shrink-0">
                      <img src={item.img} className="w-10 h-10 object-contain" style={{ imageRendering: 'pixelated' }} alt={item.name} />
                    </div>
                    <div>
                      <p className="text-foreground font-bold tracking-tight text-lg">{item.name} <span className="text-xs text-muted-foreground font-sans  ml-2">{item.ticker}</span></p>
                      <p className="text-sm text-muted-foreground mt-1 flex gap-4">
                        <span>В портфеле: <span className="text-foreground font-bold">{item.has} шт.</span></span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col md:items-end w-full md:w-auto">
                    <div className="flex gap-2 items-center font-sans font-bold text-2xl text-foreground">
                      {item.price} <img src={SECRET_TEXTURES.diamond} className="w-5 h-5" style={{ imageRendering: 'pixelated' }} alt="dia" />
                    </div>
                    {item.id !== 'diamond' && (
                      <div className={`text-[10px] uppercase font-bold flex items-center gap-1 mt-1 ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                        {isUp ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3" />}
                        {isUp ? '+' : ''}{changePercent}%
                      </div>
                    )}
                  </div>

                  {item.id !== 'diamond' && (
                    <div className="flex gap-2 w-full md:w-auto">
                      <button 
                        onClick={() => setWithdrawModal(item.id)}
                        disabled={loadingCode !== '' || item.has <= 0}
                        className="flex-1 md:flex-none px-4 py-2 bg-yellow-400 text-black hover:bg-yellow-500 font-bold uppercase rounded-xl transition-colors border border-yellow-500/50 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="bg-card text-card-foreground shadow-sm border border-border rounded-2xl p-6">
              <h4 className="font-bold uppercase tracking-tight mb-6 flex items-center gap-2 text-foreground">
                <RefreshCw className="w-5 h-5 opacity-80 text-yellow-500" />
                Терминал Обмена
                <Tooltip text="Мгновенный обмен ресурсов и алмазов. Взимается комиссия в зависимости от вашей подписки (от 2% до 10%)." />
              </h4>

              <div className="space-y-4">
                <div className="bg-background p-4 rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground font-bold uppercase mb-2">Вы отдаете</p>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number" 
                      min="1"
                      value={swapAmount}
                      onChange={(e) => setSwapAmount(Number(e.target.value) || 0)}
                      className="w-full bg-transparent text-2xl font-bold text-foreground outline-none font-sans" 
                    />
                    <select 
                      value={swapFrom} 
                      onChange={(e) => setSwapFrom(e.target.value)}
                      className="bg-muted text-foreground font-bold p-2 rounded-lg outline-none"
                    >
                      {marketItems.map(m => <option key={`f-${m.id}`} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Баланс: {marketItems.find(m => m.id === swapFrom)?.has || 0}</p>
                </div>

                <div className="flex justify-center -my-2 relative z-10 text-muted-foreground">
                  <div className="bg-card text-card-foreground shadow-sm p-1 border border-border rounded-full cursor-pointer hover:text-foreground transition-colors" onClick={() => {
                    setSwapFrom(swapTo);
                    setSwapTo(swapFrom);
                  }}>
                    <RefreshCw className="w-5 h-5"/>
                  </div>
                </div>

                <div className="bg-background p-4 rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground font-bold uppercase mb-2">Вы получаете (оценочно)</p>
                  <div className="flex items-center gap-2 justify-between">
                    <p className="text-2xl font-bold text-foreground font-sans">{receiveText}</p>
                    <select 
                      value={swapTo} 
                      onChange={(e) => setSwapTo(e.target.value)}
                      className="bg-muted text-foreground font-bold p-2 rounded-lg outline-none"
                    >
                      {marketItems.map(m => <option key={`t-${m.id}`} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <button 
                onClick={doTrade}
                disabled={loadingCode !== '' || swapAmount <= 0 || swapFrom === swapTo || receiveAmount <= 0 || treasuryLacksItems}
                className="w-full mt-6 py-4 bg-yellow-400 text-black hover:bg-yellow-500 font-bold uppercase rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingCode === 'swap' ? <RefreshCw className="w-5 h-5 animate-spin"/> : treasuryLacksItems ? 'Покупка временно не доступна' : 'Обменять'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {withdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card text-card-foreground shadow-sm border border-border rounded-2xl p-8 max-w-sm w-full">
            <h3 className="text-xl font-bold uppercase text-foreground mb-4">Предметный вывод</h3>
            <p className="text-sm text-muted-foreground mb-6 font-sans border border-yellow-500/30 bg-yellow-500/10 p-3 rounded-xl border-l-4 border-l-yellow-500">
              Вы конвертируете цифровой предмет обратно в игровой ресурс на сервере {withdrawModal.replace('_', ' ')}.
            </p>
            <div className="mb-6">
              <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1.5 flex justify-between">
                <span>Количество вывода</span>
                <span className="text-yellow-500 cursor-pointer hover:underline" onClick={() => setWithdrawAmount(marketItems.find(m => m.id === withdrawModal)?.has || 0)}>МАКС</span>
              </label>
              <input 
                type="number" 
                value={withdrawAmount} 
                onChange={(e) => setWithdrawAmount(parseInt(e.target.value) || 0)}
                className="w-full bg-background border border-border px-4 py-3 rounded-xl text-foreground font-sans font-bold outline-none focus:border-yellow-500"
              />
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setWithdrawModal(null)} 
                className="flex-1 bg-muted text-foreground font-bold py-3 font-medium rounded-xl hover:bg-muted/80 transition"
              >
                Отмена
              </button>
              <button 
                onClick={handleWithdraw} 
                disabled={loadingCode === 'withdraw'}
                className="flex-1 bg-yellow-400 text-black font-bold py-3 uppercase rounded-xl hover:bg-yellow-500 transition disabled:opacity-50"
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
