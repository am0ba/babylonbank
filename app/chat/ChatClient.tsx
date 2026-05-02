'use client';
import { useState, useEffect, useRef } from 'react';
import { getChats, sendMessage, searchUsers, getTickets, sendTicketMessage, closeTicket, getHotPhrases, addHotPhrase, removeHotPhrase } from '@/lib/actions';

export default function ChatClient({ user }: { user: any }) {
  const [chats, setChats] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('Система Вавилон');
  const [msg, setMsg] = useState('');
  const [newChatTarget, setNewChatTarget] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [hotPhrases, setHotPhrases] = useState<any[]>([]);
  const [newPhrase, setNewPhrase] = useState('');
  const [sending, setSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, tickets, activeTab]);

  const loadData = async () => {
    const [fetchedChats, fetchedTickets, fetchedPhrases] = await Promise.all([
      getChats(),
      getTickets(),
      getHotPhrases()
    ]);
    setChats(fetchedChats);
    setTickets(fetchedTickets);
    setHotPhrases(fetchedPhrases);
  };

  const isModerator = user.role === 'admin' || user.role === 'moderator';

  // Support messages formatting
  let activeMessages: any[] = [];
  let isTicket = false;
  let activeTicketId: string | null = null;
  let isTicketClosed = false;

  if (activeTab === 'Поддержка' && !isModerator) {
    isTicket = true;
    const openTicket = tickets.find(t => t.status === 'open');
    if (openTicket) {
      activeTicketId = openTicket.id;
      activeMessages = openTicket.ticket_messages.map((m: any) => ({
        id: m.id, content: m.content, created_at: m.created_at, isMine: m.sender_id === user.id,
        senderNick: m.sender_id === user.id ? 'Вы' : 'Служба Поддержки'
      }));
      activeMessages.sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else {
      activeMessages = [];
    }
  } else if (activeTab.startsWith('Тикет #')) {
    isTicket = true;
    const tId = activeTab.split('_')[1];
    const ticket = tickets.find(t => t.id === tId);
    if (ticket) {
      activeTicketId = ticket.id;
      isTicketClosed = ticket.status === 'closed';
      activeMessages = ticket.ticket_messages.map((m: any) => ({
        id: m.id, content: m.content, created_at: m.created_at, isMine: m.sender_id === user.id,
        senderNick: m.sender_id === user.id ? 'Вы' : m.sender.nick
      }));
    }
  } else {
    activeMessages = chats.find(c => c.nick === activeTab)?.messages || [];
  }

  const handleSend = async () => {
    if (!msg.trim() || activeTab === 'Система Вавилон' || sending) return;
    setSending(true);
    const textToSend = msg;
    setMsg('');
    try {
      if (isTicket) {
        await sendTicketMessage(activeTicketId, textToSend);
      } else {
        await sendMessage(activeTab, textToSend);
      }
      await loadData();
    } catch (e: any) { 
      console.error(e); 
      setMsg(textToSend);
    } finally {
      setSending(false);
    }
  };

  const handleCloseTicket = async () => {
    if (activeTicketId) {
      try {
        await closeTicket(activeTicketId);
        setActiveTab('Система Вавилон');
        loadData();
      } catch (err: any) {
        console.error(err);
      }
    }
  };

  const handleAddPhrase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhrase.trim()) return;
    await addHotPhrase(newPhrase);
    setNewPhrase('');
    loadData();
  };

  const handleSearch = async (val: string) => {
    setNewChatTarget(val);
    if (val.length >= 1) {
      const results = await searchUsers(val);
      setSuggestions(results);
    } else {
      setSuggestions([]);
    }
  };

  const startNewChat = (nick: string) => {
    if (!chats.find(c => c.nick === nick)) {
      setChats([...chats, { nick, messages: [] }]);
    }
    setActiveTab(nick);
    setNewChatTarget('');
    setSuggestions([]);
  };

  return (
    <div className="p-8 max-w-[1400px] h-[calc(100vh-80px)] flex flex-col">
      <h2 className="text-3xl font-bold mb-6 uppercase tracking-tight">Связь & Чаты</h2>
      
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-zinc-900 border border-zinc-800 rounded-3xl p-4 flex flex-col gap-4">
           {/* Add new chat */}
           <div className="relative">
              <input
                type="text" value={newChatTarget} onChange={e => handleSearch(e.target.value)}
                placeholder="Новый чат..."
                className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-white focus:border-yellow-400 font-mono text-sm"
              />
              {suggestions.length > 0 && (
                <ul className="absolute top-full left-0 right-0 bg-zinc-900 border border-zinc-800 rounded-xl mt-1 overflow-hidden z-50">
                  {suggestions.map(s => (
                    <li key={s} onClick={() => startNewChat(s)} className="px-4 py-2 hover:bg-yellow-400 hover:text-black cursor-pointer font-mono text-xs">
                      {s}
                    </li>
                  ))}
                </ul>
              )}
           </div>

           <div className="flex-1 overflow-y-auto space-y-2">
             <div 
               onClick={() => setActiveTab('Система Вавилон')} 
               className={`p-3 rounded-xl cursor-pointer text-sm font-bold transition-colors ${activeTab === 'Система Вавилон' ? 'bg-yellow-400 text-black' : 'bg-black text-zinc-400 hover:bg-zinc-800'}`}
             >
               Система Вавилон
             </div>
             
             {/* Support for normal users */}
             {!isModerator && (
               <div 
                 onClick={() => setActiveTab('Поддержка')} 
                 className={`p-3 rounded-xl cursor-pointer text-sm font-bold transition-colors ${activeTab === 'Поддержка' ? 'bg-yellow-400 text-black' : 'bg-black text-zinc-400 hover:bg-zinc-800'}`}
               >
                 Поддержка
               </div>
             )}

             {/* Tickets for moderators */}
             {isModerator && tickets.length > 0 && (
               <div className="mt-4 mb-2 text-xs uppercase text-zinc-500 font-bold px-2">Открытые тикеты</div>
             )}
             {isModerator && tickets.map(t => {
               const tabId = `Тикет #${t.ticket_number}_${t.id}`;
               return (
                 <div 
                   key={t.id} 
                   onClick={() => setActiveTab(tabId)}
                   className={`p-3 rounded-xl cursor-pointer text-sm font-bold transition-colors truncate ${activeTab === tabId ? 'bg-yellow-400 text-black' : 'bg-black text-zinc-400 hover:bg-zinc-800'}`}
                 >
                   #{t.ticket_number} - {t.users?.nick || 'Аноним'}
                 </div>
               );
             })}

             <div className="mt-4 mb-2 text-xs uppercase text-zinc-500 font-bold px-2">Личные чаты</div>
             {chats.map(c => (
               <div 
                 key={c.nick} 
                 onClick={() => setActiveTab(c.nick)}
                 className={`p-3 rounded-xl cursor-pointer text-sm font-bold transition-colors truncate ${activeTab === c.nick ? 'bg-yellow-400 text-black' : 'bg-black text-zinc-400 hover:bg-zinc-800'}`}
               >
                 {c.nick}
               </div>
             ))}
           </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden">
          <div className="p-4 border-b border-zinc-800 bg-black/20 flex justify-between items-center">
            <h3 className="font-bold text-lg">{activeTab.split('_')[0]}</h3>
            {isTicket && isModerator && !isTicketClosed && (
              <button onClick={handleCloseTicket} className="bg-red-500/20 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors">
                Закрыть тикет
              </button>
            )}
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto space-y-4 flex flex-col">
             {activeTab === 'Система Вавилон' && (
               <div className="bg-black/50 p-4 rounded-xl border border-zinc-800 self-start max-w-[80%] inline-block">
                 <p className="text-xs text-yellow-400 font-bold mb-1 uppercase">Система Вавилон</p>
                 <p className="text-sm text-zinc-300">Добро пожаловать. Задайте Ваш вопрос в заявках, этот чат работает как системные уведомления банка.</p>
               </div>
             )}
             
             {isTicket && activeMessages.length === 0 && !isModerator && (
               <div className="bg-black/50 p-4 rounded-xl border border-zinc-800 self-start max-w-[80%] inline-block">
                 <p className="text-xs text-yellow-400 font-bold mb-1 uppercase">Служба Поддержки</p>
                 <p className="text-sm text-zinc-300">Напишите ваш вопрос, модераторы увидят его и создадут тикет-обращение.</p>
               </div>
             )}

             {activeMessages.map((m: any, i: number) => (
               <div key={m.id || i} className={`p-4 rounded-xl max-w-[80%] flex flex-col ${m.isMine ? 'bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 self-end items-end' : 'bg-black border border-zinc-800 text-white self-start items-start'}`}>
                 {(isTicket || (!m.isMine && !isTicket)) && (
                   <p className={`text-[10px] uppercase font-bold mb-1 ${m.senderNick === 'Служба Поддержки' ? 'text-yellow-400' : 'opacity-50'}`}>
                     {m.senderNick}
                   </p>
                 )}
                 <p className="text-sm">{m.content}</p>
                 <p suppressHydrationWarning className={`text-[10px] mt-1 font-mono ${m.isMine ? 'text-yellow-400/50' : 'text-zinc-500'}`}>{new Date(m.created_at).toLocaleTimeString()}</p>
               </div>
             ))}
             <div ref={chatBottomRef} />
          </div>

          {(isTicket && isModerator) && (
            <div className="px-4 py-2 bg-black/40 border-t border-zinc-800 flex gap-2 overflow-x-auto items-center">
              <span className="text-[10px] uppercase text-zinc-500 font-bold whitespace-nowrap">Горячие фразы:</span>
              {hotPhrases.map(hp => (
                <button 
                  key={hp.id} 
                  onClick={() => setMsg(hp.phrase)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1 text-[10px] rounded-lg truncate max-w-[150px] transition-colors flex-shrink-0"
                  title={hp.phrase}
                >
                  {hp.phrase}
                </button>
              ))}
              <form onSubmit={handleAddPhrase} className="flex gap-2 min-w-[200px] ml-auto">
                <input type="text" value={newPhrase} onChange={e=>setNewPhrase(e.target.value)} placeholder="Добавить фразу..." className="bg-black border border-zinc-800 rounded px-2 py-1 text-[10px] flex-1 text-white"/>
                <button title="Добавить" type="submit" className="bg-yellow-400 text-black px-2 rounded font-bold hover:bg-yellow-500 text-xs">+</button>
              </form>
            </div>
          )}

          <div className="p-4 border-t border-zinc-800 bg-black/20 flex gap-4">
            <input 
              type="text" 
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={activeTab === 'Система Вавилон' ? 'Системному боту нельзя писать' : isTicketClosed ? 'Тикет закрыт' : 'Введите сообщение (Enter для отправки)...'}
              disabled={activeTab === 'Система Вавилон' || isTicketClosed || sending}
              className="flex-1 bg-black border border-zinc-800 text-white rounded-xl px-4 text-sm focus:outline-none focus:border-yellow-400 transition-colors font-mono disabled:opacity-50"
            />
            <button 
              onClick={handleSend}
              disabled={activeTab === 'Система Вавилон' || isTicketClosed || sending} 
              className="bg-yellow-400 text-black px-6 font-bold uppercase rounded-xl hover:bg-yellow-500 transition-colors text-sm tracking-wider disabled:opacity-50"
            >
              Отправить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
