'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SECRET_TEXTURES } from '@/lib/textures';
import { TrendingUp, TrendingDown, Clock, Search } from 'lucide-react';

export default function ExchangeClient({ user }: { user: any }) {
  const [activeTab, setActiveTab] = useState('stocks'); // stocks, items

  return (
    <div className="p-8 max-w-[1400px]">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
          <h2 className="text-3xl font-bold uppercase tracking-tight text-white flex items-center gap-2">
            <TrendingUp className="w-8 h-8 text-yellow-500" />
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

      <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800 mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold uppercase text-white mb-2">Открытие торгов</h3>
          <p className="text-sm text-zinc-400">Система торгов в активной разработке. На данный момент проводится аудит смарт-контрактов и подготовка пулов ликвидности.</p>
        </div>
        <div className="hidden md:flex text-right flex-col items-end">
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold mb-1">Статус ядра (TR-EX)</p>
          <p className="text-yellow-500 font-mono text-sm tracking-widest animate-pulse border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 rounded">CALIBRATING_LIQUIDITY</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 md:col-span-2 bg-black border border-zinc-800 rounded-3xl p-6">
           <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
             <h4 className="font-bold uppercase text-zinc-300">Очередь листинга:</h4>
             <div className="flex gap-2 relative w-48">
               <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
               <input type="text" placeholder="Поиск тикера..." className="w-full bg-zinc-900 border border-zinc-800 rounded text-xs px-3 py-2 pl-9 text-white outline-none" />
             </div>
           </div>

           <div className="space-y-3">
             {[
               { ticker: "BBLN", name: "Babylon Core Bank", price: "128", change: "+12.5%", isUp: true, desc: "Официальные акции Вавилонского центрального банка." },
               { ticker: "FRGE", name: "Titanium Forge", price: "45", change: "+4.1%", isUp: true, desc: "Доли в строительстве новой кузни." },
               { ticker: "MINE", name: "Deep Mines Corp", price: "22", change: "-2.3%", isUp: false, desc: "Акции шахтерского синдиката." },
             ].map((stock, i) => (
               <div key={i} className="flex flex-col md:flex-row items-start md:items-center justify-between bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 hover:border-yellow-500/30 transition-colors">
                 <div className="flex items-center gap-4 mb-3 md:mb-0">
                   <div className="bg-zinc-800 w-12 h-12 flex items-center justify-center rounded-xl font-black text-xl text-yellow-500 tracking-tighter">
                     {stock.ticker.slice(0,1)}
                   </div>
                   <div>
                     <p className="text-white font-bold tracking-tight">{stock.name} <span className="text-xs text-zinc-500 font-mono tracking-widest ml-2">{stock.ticker}</span></p>
                     <p className="text-xs text-zinc-400 mt-1">{stock.desc}</p>
                   </div>
                 </div>
                 <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto">
                   <div className="flex gap-1 items-center font-mono font-bold text-lg text-white">
                     {stock.price} <img src={SECRET_TEXTURES.diamond} className="w-3.5 h-3.5" alt="dia" />
                   </div>
                   <div className={`text-xs font-mono font-bold flex items-center gap-1 ${stock.isUp ? 'text-green-500' : 'text-red-500'}`}>
                     {stock.isUp ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3" />}
                     {stock.change}
                   </div>
                 </div>
               </div>
             ))}
           </div>
        </div>

        <div className="space-y-6">
          <div className="bg-yellow-500 text-black border border-yellow-600 rounded-3xl p-6">
            <h4 className="font-bold uppercase tracking-tight mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 opacity-80" />
              Торговая сессия
            </h4>
            <p className="text-sm font-medium opacity-80 mb-6">Только игроки с верифицированным капиталом выше 256 алмазов смогут принимать участие в торгах в первые дни открытия.</p>
            <div className="h-1 bg-black/20 rounded-full w-full mb-3">
               <div className="h-full bg-black rounded-full" style={{width: '65%'}}></div>
            </div>
            <p className="text-xs font-bold uppercase tracking-widest flex justify-between">
              <span>Готовность модуля</span>
              <span>65%</span>
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
            <h4 className="font-bold uppercase text-zinc-400 text-sm tracking-widest mb-4">Информация</h4>
            <ul className="space-y-3 text-xs text-zinc-400">
              <li className="flex gap-2">
                <span className="text-yellow-500">▹</span>
                Комиссия биржи составит в среднем 5% со сделки.
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-500">▹</span>
                Стакан ликвидности открыт для всех.
              </li>
              <li className="flex gap-2">
                <span className="text-yellow-500">▹</span>
                Внебиржевая торговля корпоративными долями строжайше запрещена.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
