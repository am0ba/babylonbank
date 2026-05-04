'use server';
import { cookies } from 'next/headers';
import { supabase } from './supabase';
import crypto from 'crypto';
import { getDynamicPrice, BASE_PRICES } from './marketUtils';

export async function getSessionUser() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('babylon_session')?.value;
  if (!sessionId) return null;
  
  try {
    const { data: user, error } = await supabase.from('users').select('*').eq('id', sessionId).single();
    if (error || !user) return null;

    // Check subscription status
    let isSubscribed = user.subscription_active;
    if (isSubscribed && user.subscription_expires_at && new Date(user.subscription_expires_at) < new Date()) {
       // Autocharge subscription if active account has balance
       const { data: mainAccount } = await supabase.from('accounts').select('*').eq('user_id', user.id).eq('account_type', 'active').eq('is_primary', true).single();
       if (mainAccount && mainAccount.balance >= 100) {
          // Charge 100 diamonds for subscription renewal
          await supabase.from('accounts').update({ balance: mainAccount.balance - 100 }).eq('id', mainAccount.id);
          const nextDate = new Date();
          nextDate.setMonth(nextDate.getMonth() + 1);
          await supabase.from('users').update({ subscription_expires_at: nextDate.toISOString() }).eq('id', user.id);
          await supabase.from('transactions').insert([{ from_user_id: user.id, amount: 100, tx_type: 'subscription', note: 'Автоматическое продление (1 мес)' }]);
       } else {
          // Cancel subscription
          await supabase.from('users').update({ subscription_active: false }).eq('id', user.id);
          isSubscribed = false;
       }
    }
    user.subscription_active = isSubscribed;
    
    // Total balance sum from active accounts
    const { data: accounts } = await supabase.from('accounts').select('balance, account_type').eq('user_id', user.id);
    user.loot_balance = accounts?.filter(a => a.account_type === 'active').reduce((acc, curr) => acc + curr.balance, 0) || 0;
    user.term_balance = accounts?.filter(a => a.account_type === 'term').reduce((acc, curr) => acc + curr.balance, 0) || 0;
    
    const { data: transactions } = await supabase.from('transactions').select('*').or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`).order('created_at', { ascending: false });
    user.transactions = transactions || [];

    const { data: allAccounts } = await supabase.from('accounts').select('*').eq('user_id', user.id).order('created_at', { ascending: true });
    user.accountsList = allAccounts || [];

    const { data: myRequests } = await supabase.from('requests').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    user.requestsList = myRequests || [];

    user.netherite = user.netherite || 0;
    user.echo_shard = user.echo_shard || 0;
    user.garant = user.garant || 0;

    return user;
  } catch(e) {
    return null;
  }
}

export async function loginUser(nick: string, pass: string) {
  const { data: user, error } = await supabase.from('users').select('*').ilike('nick', nick).single();
  if (error || !user) return { error: 'Пользователь не найден' };
  if (user.password !== pass) return { error: 'Неверный пароль' };

  const cookieStore = await cookies();
  cookieStore.set('babylon_session', user.id, { maxAge: 60 * 60 * 24 * 7, path: '/', sameSite: 'none', secure: true });
  return { success: true };
}

export async function registerUser(nick: string, pass: string) {
  const { data: existing } = await supabase.from('users').select('id').ilike('nick', nick).maybeSingle();
  if (existing) return { error: 'Никнейм уже занят' };
  
  const role = nick.toLowerCase() === 'abe_aba' ? 'admin' : 'user';

  const { data: newUser, error } = await supabase.from('users').insert([{
    nick: nick.toLowerCase(), password: pass, role: role
  }]).select('id').single();
  
  if (error || !newUser) return { error: error?.message || 'Ошибка регистрации' };

  return { success: true, userId: newUser.id };
}

export async function createInitialAccount(userId: string, accountName: string) {
  const { error } = await supabase.from('accounts').insert([{
    user_id: userId, name: accountName, is_primary: true, account_type: 'active'
  }]);
  if (error) throw new Error(error.message);
  
  const cookieStore = await cookies();
  cookieStore.set('babylon_session', userId, { maxAge: 60 * 60 * 24 * 7, path: '/', sameSite: 'none', secure: true });
  return { success: true };
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.set('babylon_session', '', { maxAge: 0, path: '/', sameSite: 'none', secure: true });
}

export async function executeTransfer(params: {
  amount: string;
  transferType: 'player' | 'own' | 'service';
  fromAccountId?: string;
  targetNick?: string;
  targetAccountId?: string;
  note?: string;
}) {
  const user = await getSessionUser();
  if (!user) throw new Error('Не авторизован');
  
  const numAmount = parseInt(params.amount);
  if (isNaN(numAmount) || numAmount <= 0) throw new Error('Неверная сумма');
  if (params.transferType !== 'own' && user.loot_balance < -512) throw new Error('Доступ заблокирован (общий баланс ниже -512 алмазов)');

  // Determine source account
  let sourceAcc;
  if (params.fromAccountId) {
    sourceAcc = user.accountsList.find((a: any) => a.id === params.fromAccountId);
  } else {
    sourceAcc = user.accountsList.find((a: any) => a.is_primary && a.account_type === 'active');
  }
  
  if (!sourceAcc) throw new Error('Нет активного счета для списания');
  if (sourceAcc.account_type === 'term' && !sourceAcc.can_withdraw) throw new Error('Для данного срочного вклада отключена опция досрочного снятия');
  if (sourceAcc.balance < numAmount) throw new Error(`Недостаточно средств на счете "${sourceAcc.name}"`);

  let targetUserId;
  let targetAccId;
  let fee = 0;

  if (params.transferType === 'own') {
    if (!params.targetAccountId) throw new Error('Укажите счет зачисления');
    if (params.targetAccountId === sourceAcc.id) throw new Error('Счета должны быть разными');
    const targetAcc = user.accountsList.find((a: any) => a.id === params.targetAccountId);
    if (!targetAcc) throw new Error('Счет зачисления не найден');
    if (targetAcc.account_type === 'term' && !targetAcc.can_replenish) {
      throw new Error('Этот срочный вклад нельзя пополнять (опция "Пополнение" отключена)');
    }
    
    targetUserId = user.id;
    targetAccId = targetAcc.id;
    fee = 0; // Внутренний перевод без комиссии
  } else {
    if (!params.targetNick) throw new Error('Укажите получателя');
    const { data: receiver } = await supabase.from('users').select('id').ilike('nick', params.targetNick).single();
    if (!receiver) throw new Error('Получатель не найден');
    if (receiver.id === user.id) throw new Error('Для перевода себе используйте "Между своими счетами"');

    // Находим счет получателя. Либо primary, либо просто первый попавшийся active
    let { data: receiverAcc } = await supabase.from('accounts').select('*').eq('user_id', receiver.id).eq('is_primary', true).maybeSingle();
    if (!receiverAcc) {
      const { data: fallbackAcc } = await supabase.from('accounts').select('*').eq('user_id', receiver.id).eq('account_type', 'active').limit(1).maybeSingle();
      if (fallbackAcc) receiverAcc = fallbackAcc;
    }
    
    // Если вообще нет счетов, создаем один
    if (!receiverAcc) {
      const { data: newAcc, error } = await supabase.from('accounts').insert([{
        user_id: receiver.id, name: 'Счет по умолчанию', is_primary: true, account_type: 'active'
      }]).select('*').single();
      if (error || !newAcc) throw new Error('Не удалось найти счет получателя');
      receiverAcc = newAcc;
    }

    targetUserId = receiver.id;
    targetAccId = receiverAcc.id;

    const feeRatio = user.subscription_active ? 0.02 : 0.05;
    fee = Math.floor(numAmount * feeRatio);
  }

  const received = numAmount - fee;

  // Decrease sender
  await supabase.from('accounts').update({ balance: sourceAcc.balance - numAmount }).eq('id', sourceAcc.id);
  
  // Increase receiver
  const { data: tAccCheck } = await supabase.from('accounts').select('balance').eq('id', targetAccId).single();
  if (tAccCheck) {
     await supabase.from('accounts').update({ balance: tAccCheck.balance + received }).eq('id', targetAccId);
  }

  // Note tx
  const tx_type = params.transferType === 'service' ? 'service_payment' : 'transfer';
  const defaultNote = params.transferType === 'own' ? 'Внутренний перевод' : (params.transferType === 'service' ? 'Оплата услуг/долга' : 'Перевод игроку');
  
  const { error: txError } = await supabase.from('transactions').insert([{
    from_user_id: user.id, to_user_id: targetUserId, amount: numAmount, fee: fee, tx_type: tx_type,
    note: params.note && params.note.trim() ? params.note.trim() : defaultNote
  }]);
  if (txError) throw new Error(txError.message);
  
  return { success: true, message: `Переведено. Комиссия составила ${fee} Алмазов.` };
}

async function getTreasuryAccount() {
  let { data: treasuryUser } = await supabase.from('users').select('*').eq('nick', 'Вавилон_Казна').maybeSingle();
  if (!treasuryUser) {
    const { data: newUser, error: createErr } = await supabase.from('users').insert([{ nick: 'Вавилон_Казна', password: '123', role: 'admin' }]).select('id').single();
    if (createErr || !newUser) return { user: null, account: null };
    treasuryUser = newUser;
    await supabase.from('accounts').insert([{ user_id: treasuryUser.id, name: 'Счет Казны', is_primary: true, account_type: 'active' }]);
  }
  const { data: treasuryAcc } = await supabase.from('accounts').select('*').eq('user_id', treasuryUser.id).eq('is_primary', true).maybeSingle();
  return { user: treasuryUser, account: treasuryAcc };
}

export async function executeLiquidate() {
  const user = await getSessionUser();
  if (!user) throw new Error('Не авторизован');
  
  if (user.loot_balance < 0) throw new Error('Нельзя ликвидировать аккаунт с отрицательным балансом!');
  
  const fee = Math.floor(user.loot_balance * 0.3);
  const withdrawal = user.loot_balance - fee;
  
  const treasury = await getTreasuryAccount();
  if (fee > 0 && treasury.account) {
    await supabase.from('accounts').update({ balance: treasury.account.balance + fee }).eq('id', treasury.account.id);
  }
  
  // Zero out all accounts
  for (const acc of user.accountsList) {
    if (acc.balance > 0) {
      await supabase.from('accounts').update({ balance: 0 }).eq('id', acc.id);
    }
  }

  // Delete user account
  await supabase.from('users').delete().eq('id', user.id);
  const cookieStore = await cookies();
  cookieStore.set('babylon_session', '', { maxAge: 0, path: '/', sameSite: 'none', secure: true });

  await supabase.from('transactions').insert([{
    from_user_id: user.id, amount: user.loot_balance, fee: fee, tx_type: 'liquidation', note: `Выведено ${withdrawal} БЛАНК №У-09, Пользователь удален`
  }]);
  
  return { success: true, message: `Ликвидировано. Выведено ${withdrawal} (Сбор ${fee}).` };
}

export async function sendMessage(receiverNick: string, content: string) {
  const user = await getSessionUser();
  if (!user) throw new Error('Не авторизован');
  
  const { data: targetUser } = await supabase.from('users').select('id').ilike('nick', receiverNick).single();
  if (!targetUser) throw new Error('Пользователь не найден');
  
  await supabase.from('messages').insert([{
    sender_id: user.id, receiver_id: targetUser.id, content
  }]);
  return { success: true };
}

export async function getTickets() {
  const user = await getSessionUser();
  if (!user) return [];

  // If user, get their tickets. If moderator/admin, get all open tickets and tickets they participated in.
  if (user.role === 'user') {
    const { data } = await supabase.from('tickets').select('*, ticket_messages(*, sender:sender_id(nick))').eq('user_id', user.id).order('created_at', { ascending: false });
    return data || [];
  } else {
    // Admins/Mods see all open tickets, and maybe their own closed ones
    const { data } = await supabase.from('tickets').select('*, users!user_id(nick), ticket_messages(*, sender:sender_id(nick))').eq('status', 'open').order('created_at', { ascending: false });
    return data || [];
  }
}

export async function sendTicketMessage(ticketId: string | null, content: string) {
  const user = await getSessionUser();
  if (!user) throw new Error('Не авторизован');

  let activeTicketId = ticketId;

  if (!activeTicketId) {
    if (user.role === 'user') {
      const { data: openT } = await supabase.from('tickets').select('id').eq('user_id', user.id).eq('status', 'open').maybeSingle();
      if (openT) activeTicketId = openT.id;
    }
    
    if (!activeTicketId) {
      // Create new ticket
      const { data: newT } = await supabase.from('tickets').insert([{ user_id: user.id }]).select('id').single();
      if (newT) activeTicketId = newT.id;
    }
  }

  if (activeTicketId) {
    await supabase.from('ticket_messages').insert([{
      ticket_id: activeTicketId, sender_id: user.id, content
    }]);
  }
  return { success: true };
}

export async function closeTicket(ticketId: string) {
  const user = await getSessionUser();
  if (!user || user.role === 'user') throw new Error('Нет прав');
  
  const { error } = await supabase.from('tickets').update({ status: 'closed' }).eq('id', ticketId);
  if (error) throw new Error(error.message);
  return { success: true };
}

export async function getHotPhrases() {
  const { data } = await supabase.from('hot_phrases').select('*').order('id', { ascending: true });
  return data || [];
}

export async function addHotPhrase(phrase: string) {
  const user = await getSessionUser();
  if (!user || user.role === 'user') throw new Error('Нет прав');
  
  await supabase.from('hot_phrases').insert([{ phrase }]);
  return { success: true };
}

export async function removeHotPhrase(id: number) {
  const user = await getSessionUser();
  if (!user || user.role === 'user') throw new Error('Нет прав');
  
  await supabase.from('hot_phrases').delete().eq('id', id);
  return { success: true };
}

export async function getChats() {
  const user = await getSessionUser();
  if (!user) return [];
  
  // Get unique users we have chatted with
  const { data: messages } = await supabase.from('messages').select('sender_id, receiver_id, content, created_at, sender:sender_id(nick), receiver:receiver_id(nick)')
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: true });
    
  if (!messages) return [];
  
  const chatsMap = new Map();
  messages.forEach((m: any) => {
    const isSender = m.sender_id === user.id;
    const otherId = isSender ? m.receiver_id : m.sender_id;
    const otherNick = isSender ? m.receiver.nick : m.sender.nick;
    if (!chatsMap.has(otherNick)) {
      chatsMap.set(otherNick, []);
    }
    chatsMap.get(otherNick).push({ ...m, isMine: isSender });
  });
  
  const chats = Array.from(chatsMap.entries()).map(([nick, msgs]) => ({ nick, messages: msgs }));
  return chats;
}

export async function getPendingRequests() {
  const user = await getSessionUser();
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) return [];
  const { data } = await supabase.from('requests').select('*, users(nick)').eq('status', 'pending');
  return data || [];
}

export async function processRequest(requestId: string, approve: boolean) {
  const user = await getSessionUser();
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) throw new Error('Нет прав');
  
  const { data: req } = await supabase.from('requests').select('*').eq('id', requestId).single();
  if (!req || req.status !== 'pending') throw new Error('Заявка не найдена или уже обработана');
  
  if (approve) {
    const { data: targetUser } = await supabase.from('users').select('id, nick').eq('id', req.user_id).single();
    if (targetUser) {
      if (req.req_type === 'credit') {
        const treasury = await getTreasuryAccount();
        if (!treasury.account) throw new Error('ERR_TREASURY_MISSING: Казна не найдена');

        let primaryAccount;
        const { data: accounts } = await supabase.from('accounts').select('id, balance').eq('user_id', targetUser.id).eq('is_primary', true).limit(1);
        
        if (accounts && accounts.length > 0) {
          primaryAccount = accounts[0];
        } else {
          const { data: newAcc, error } = await supabase.from('accounts').insert([{
            user_id: targetUser.id, name: 'Основной счет', is_primary: true, account_type: 'active'
          }]).select('*').single();
          if (error || !newAcc) throw new Error('ERR_CREATE_PRIMARY_FAIL: Не удалось создать основной счет');
          primaryAccount = newAcc;
        }

        let payback = req.amount;
        let termDays = 30;
        let creditType = 'consumer';
        let rate = 0;
        try {
          const parsed = JSON.parse(req.details);
          if (parsed.payback) payback = parsed.payback;
          if (parsed.termDays) termDays = parsed.termDays;
          if (parsed.creditType) creditType = parsed.creditType;
          if (parsed.rate) rate = parsed.rate;
        } catch(e) {}
        
        let typeName = 'Потребительский';
        if (creditType === 'business') typeName = 'Бизнес';
        if (creditType === 'building') typeName = 'Стройка';

        await supabase.from('accounts').update({ balance: primaryAccount.balance + req.amount }).eq('id', primaryAccount.id);
        
        if (treasury.account) {
          await supabase.from('accounts').update({ balance: treasury.account.balance - req.amount }).eq('id', treasury.account.id);
        }

        await supabase.from('transactions').insert([{ 
          from_user_id: treasury.user?.id,
          to_user_id: targetUser.id, 
          amount: req.amount, 
          tx_type: 'system_add', 
          note: `Кредит одобрен (${typeName})` 
        }]);
        
        const { error: termErr } = await supabase.from('accounts').insert([{
          user_id: targetUser.id,
          name: `Кредит: ${typeName} (${termDays}д)`,
          account_type: 'term',
          balance: -payback,
          term_days: termDays,
          can_replenish: true,
          can_withdraw: false,
          interest_rate: 0
        }]);

        if (termErr) throw new Error(`ERR_CREATE_TERM_FAIL: Не удалось создать кредитный счет. Ошибка: ${termErr.message}`);

      } else if (req.req_type === 'deposit') {
         // Sub money from active, create a term account
         const { data: accounts } = await supabase.from('accounts').select('id, balance').eq('user_id', targetUser.id).eq('is_primary', true).limit(1);
         if (!accounts || accounts.length === 0) throw new Error('ERR_NO_PRIMARY_ACCOUNT: У пользователя нет основного счета');
         if (accounts[0].balance < req.amount) throw new Error('ERR_INSUFFICIENT_FUNDS: Недостаточно средств на основном счете пользователя');
         
         await supabase.from('accounts').update({ balance: accounts[0].balance - req.amount }).eq('id', accounts[0].id);
         const { error: termErr } = await supabase.from('accounts').insert([{
           user_id: targetUser.id, name: `Срочный депозит: ${req.details}`, account_type: 'term', balance: req.amount
         }]);
         if (termErr) throw new Error(`ERR_CREATE_TERM_FAIL: Не удалось создать срочный счет. Ошибка: ${termErr.message}`);

         await supabase.from('transactions').insert([{ from_user_id: targetUser.id, amount: req.amount, tx_type: 'transfer', note: 'Создан Срочный Депозит' }]);
      }
    }
  } else {
    if (req.req_type === 'withdraw') {
      try {
        const parsed = JSON.parse(req.details);
        if (parsed.accountId) {
           const { data: acc } = await supabase.from('accounts').select('id, balance').eq('id', parsed.accountId).single();
           if (acc) {
             await supabase.from('accounts').update({ balance: acc.balance + req.amount }).eq('id', acc.id);
             await supabase.from('transactions').insert([{
               to_user_id: req.user_id,
               amount: req.amount,
               tx_type: 'transfer',
               note: 'Возврат средств (Отклоненный вывод)'
             }]);
           }
        }
      } catch(e) {}
    }
  }
  
  await supabase.from('requests').update({ status: approve ? 'approved' : 'rejected' }).eq('id', requestId);
  return { success: true };
}

export async function submitRequest(type: string, amount: number, details: string) {
  const user = await getSessionUser();
  if (!user) throw new Error('Не авторизован');
  
  const { error } = await supabase.from('requests').insert([{
    user_id: user.id, req_type: type, amount, details
  }]);
  if (error) throw new Error('ОШИБКА: ' + error.message);
  return { success: true };
}

export async function requestWithdraw(accountId: string, amount: number) {
  const user = await getSessionUser();
  if (!user) throw new Error('Не авторизован');
  if (amount <= 0) throw new Error('Сумма должна быть больше нуля');

  const { data: account } = await supabase.from('accounts')
    .select('*')
    .eq('id', accountId)
    .eq('user_id', user.id)
    .single();

  if (!account || account.account_type !== 'active') {
    throw new Error('Ошибочный счет. Вывод доступен только с активных счетов.');
  }
  if (account.balance < amount) {
    throw new Error('Недостаточно средств на счете');
  }

  // Deduct money immediately
  const { error: updErr } = await supabase.from('accounts').update({ balance: account.balance - amount }).eq('id', account.id);
  if (updErr) throw new Error('Ошибка при списании средств: ' + updErr.message);

  // Note withdrawal as a transaction
  await supabase.from('transactions').insert([{
    from_user_id: user.id,
    amount: amount,
    tx_type: 'transfer',
    note: 'Вывод алмазов (резерв)'
  }]);

  // Generate a random 4 digit code
  const code = Math.floor(1000 + Math.random() * 9000).toString();

  const detailsObj = {
    accountId,
    code,
    note: 'В ожидании выдачи модератором'
  };

  const { error } = await supabase.from('requests').insert([{
    user_id: user.id,
    req_type: 'withdraw',
    amount: amount,
    details: JSON.stringify(detailsObj)
  }]);

  if (error) throw new Error('ОШИБКА создания заявки: ' + error.message);
  
  return { success: true, code };
}

export async function requestItemWithdraw(itemType: 'netherite' | 'echo_shard' | 'garant', amount: number) {
  const user = await getSessionUser();
  if (!user) throw new Error('Не авторизован');
  if (amount <= 0) throw new Error('Количество должно быть больше нуля');

  const currentCount = Number(user[itemType]) || 0;
  if (currentCount < amount) throw new Error('Недостаточно предметов для вывода');

  const secretCode = crypto.randomBytes(2).toString('hex').toUpperCase();

  const { error: updErr } = await supabase.from('users').update({ [itemType]: currentCount - amount }).eq('id', user.id);
  if (updErr) throw new Error('Ошибка при списании: ' + updErr.message);

  const { error: reqErr } = await supabase.from('requests').insert([{
    user_id: user.id,
    req_type: 'withdraw_item',
    amount: amount,
    status: 'pending',
    details: JSON.stringify({ itemType, code: secretCode })
  }]);

  if (reqErr) {
    await supabase.from('users').update({ [itemType]: currentCount }).eq('id', user.id);
    throw new Error('Ошибка создания заявки: ' + reqErr.message);
  }

  return { success: true, code: secretCode };
}

export async function confirmWithdraw(requestId: string, code: string) {
  const user = await getSessionUser();
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) throw new Error('Нет прав');

  const { data: req } = await supabase.from('requests').select('*').eq('id', requestId).single();
  if (!req || req.status !== 'pending' || (req.req_type !== 'withdraw' && req.req_type !== 'withdraw_item')) {
    throw new Error('Заявка не найдена или уже обработана');
  }

  try {
    const parsed = JSON.parse(req.details);
    if (parsed.code !== code) {
      throw new Error('Неверный код подтверждения');
    }
  } catch(e: any) {
    throw new Error(e.message || 'Ошибка парсинга деталей');
  }

  // Code is correct, mark as approved
  const { error } = await supabase.from('requests').update({ status: 'approved' }).eq('id', requestId);
  if (error) throw new Error(error.message);

  return { success: true, message: 'Снятие успешно подтверждено' };
}

export async function searchUsers(query: string) {
  if (!query || query.length < 1) return [];
  const { data } = await supabase.from('users').select('nick').ilike('nick', `${query}%`).limit(5);
  return data?.map(d => d.nick) || [];
}

export async function subscribe() {
  const user = await getSessionUser();
  if (!user) throw new Error('Не авторизован');
  
  const sourceAcc = user.accountsList.find((a: any) => a.is_primary && a.account_type === 'active');
  if (!sourceAcc || sourceAcc.balance < 5) throw new Error('Недостаточно средств (5 алмазов) на основном счете для подписки');
  
  await supabase.from('accounts').update({ balance: sourceAcc.balance - 5 }).eq('id', sourceAcc.id);
  const treasury = await getTreasuryAccount();
  if (treasury.account) {
    await supabase.from('accounts').update({ balance: treasury.account.balance + 5 }).eq('id', treasury.account.id);
  }
  
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + 7);
  
  await supabase.from('users').update({ 
    subscription_active: true, 
    subscription_expires_at: nextDate.toISOString() 
  }).eq('id', user.id);
  
  await supabase.from('transactions').insert([{
    from_user_id: user.id, amount: 5, tx_type: 'subscription', note: 'Еженедельная подписка PDA'
  }]);
  
  return { success: true, message: 'Договор подписан, подписка PDA активирована!' };
}

export async function adminChangeBalance(targetNick: string, amount: number, isAdd: boolean) {
  const user = await getSessionUser();
  if (!user || (user.role !== 'admin' && user.role !== 'moderator')) throw new Error('Нет прав');
  
  const { data: targetUser } = await supabase.from('users').select('id').ilike('nick', targetNick).single();
  if (!targetUser) throw new Error('Пользователь не найден');
  
  let targetAcc;
  const { data: accounts } = await supabase.from('accounts').select('*').eq('user_id', targetUser.id).eq('is_primary', true).limit(1);
  if (accounts && accounts.length > 0) targetAcc = accounts[0];
  
  if (!targetAcc) {
    const { data: newAcc, error } = await supabase.from('accounts').insert([{
      user_id: targetUser.id, name: 'Основной счет', is_primary: true, account_type: 'active'
    }]).select('*').single();
    if (error || !newAcc) throw new Error('Не удалось получить или создать счет пользователя');
    targetAcc = newAcc;
  }
  
  const newBalance = isAdd ? targetAcc.balance + amount : targetAcc.balance - amount;
  
  await supabase.from('accounts').update({ balance: newBalance }).eq('id', targetAcc.id);
  
  const treasury = await getTreasuryAccount();
  if (treasury.account) {
    if (isAdd) {
      await supabase.from('accounts').update({ balance: treasury.account.balance - amount }).eq('id', treasury.account.id);
    } else {
      await supabase.from('accounts').update({ balance: treasury.account.balance + amount }).eq('id', treasury.account.id);
    }
  }

  await supabase.from('transactions').insert([{
    from_user_id: isAdd ? treasury.user?.id : targetUser.id,
    to_user_id: isAdd ? targetUser.id : treasury.user?.id, 
    amount: amount, 
    tx_type: isAdd ? 'system_add' : 'system_remove', 
    note: `Выполнено модератором: ${user.nick}`
  }]);
  
  return { success: true, message: 'Баланс обновлен' };
}

export async function adminSetRole(targetNick: string, newRole: string) {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') throw new Error('Нет прав');
  
  const { data: targetUser } = await supabase.from('users').select('id').ilike('nick', targetNick).single();
  if (!targetUser) throw new Error('Пользователь не найден');
  
  const { error } = await supabase.from('users').update({ role: newRole }).eq('id', targetUser.id);
  if (error) throw new Error(error.message);
  return { success: true, message: `Роль ${newRole} выдана пользователю ${targetNick}` };
}

export async function createNewAccount(
  name: string, 
  type: string,
  initialAmount?: number,
  fromAccountId?: string,
  termParams?: { days: number, canReplenish: boolean, canWithdraw: boolean, rate: number }
) {
  const user = await getSessionUser();
  if (!user) throw new Error('Не авторизован');
  
  if (user.accountsList.length >= 4) throw new Error('Достигнут лимит счетов (максимум 4)');
  if (!name.trim()) throw new Error('Укажите название счета');

  if (type === 'term') {
    if (!initialAmount || initialAmount <= 0) throw new Error('Укажите сумму для срочного счета');
    if (!fromAccountId) throw new Error('Укажите счет списания');
    if (!termParams) throw new Error('Укажите параметры срочного счета');
    
    const sourceAcc = user.accountsList.find((a: any) => a.id === fromAccountId);
    if (!sourceAcc) throw new Error('Счет списания не найден');
    if (sourceAcc.balance < initialAmount) throw new Error(`Недостаточно средств на счете "${sourceAcc.name}"`);

    // Списываем средства
    const { error: deductErr } = await supabase.from('accounts').update({ balance: sourceAcc.balance - initialAmount }).eq('id', sourceAcc.id);
    if (deductErr) throw new Error(deductErr.message);

    const displayName = `${name.substring(0, 20)} (${termParams.days}д, ${termParams.rate}%, ${termParams.canReplenish ? '+поп' : '-поп'})`;

    const { error: insertErr } = await supabase.from('accounts').insert([{
      user_id: user.id, 
      name: displayName, 
      account_type: type, 
      is_primary: false, 
      balance: initialAmount,
      term_days: termParams.days,
      can_replenish: termParams.canReplenish,
      can_withdraw: termParams.canWithdraw,
      interest_rate: termParams.rate
    }]);
    if (insertErr) throw new Error(insertErr.message);

    // Записываем транзакцию
    await supabase.from('transactions').insert([{
      from_user_id: user.id, to_user_id: user.id, amount: initialAmount, fee: 0, tx_type: 'transfer',
      note: 'Открытие срочного вклада'
    }]);

    return { success: true, message: 'Срочный счет открыт' };
  } else {
    const { error } = await supabase.from('accounts').insert([{
      user_id: user.id, name: name.substring(0, 30), account_type: type, is_primary: false
    }]);
    
    if (error) throw new Error(error.message);
    
    return { success: true, message: 'Счет создан' };
  }
}

export async function deleteAccount(accountId: string, targetAccountId?: string) {
  const user = await getSessionUser();
  if (!user) throw new Error('Не авторизован');
  
  const acc = user.accountsList.find((a: any) => a.id === accountId);
  if (!acc) throw new Error('Счет не найден');
  if (acc.is_primary) throw new Error('Нельзя удалить основной счет');

  if (acc.balance < 0) {
    throw new Error('Нельзя закрыть счет с отрицательным балансом (имеется задолженность)');
  }

  if (acc.balance > 0) {
    if (acc.account_type === 'term' && !acc.can_withdraw) {
      throw new Error('Нельзя закрыть срочный вклад с остатком, если отключено досрочное снятие');
    }

    if (!targetAccountId) throw new Error('Укажите счет для перевода остатка средств');
    if (targetAccountId === accountId) throw new Error('Нельзя перевести на удаляемый счет');
    
    const targetAcc = user.accountsList.find((a: any) => a.id === targetAccountId);
    if (!targetAcc) throw new Error('Счет для перевода не найден');
    if (targetAcc.account_type === 'term' && !targetAcc.can_replenish) {
      throw new Error('Указанный срочный вклад нельзя пополнять');
    }

    // Переводим средства
    await supabase.from('accounts').update({ balance: targetAcc.balance + acc.balance }).eq('id', targetAcc.id);
    
    await supabase.from('transactions').insert([{
      from_user_id: user.id, to_user_id: user.id, amount: acc.balance, fee: 0, tx_type: 'transfer',
      note: 'Перевод остатка при закрытии счета'
    }]);
  }

  const { error } = await supabase.from('accounts').delete().eq('id', accountId);
  if (error) throw new Error(error.message);
  
  return { success: true, message: 'Счет успешно закрыт' };
}

export async function adminAccrueInterest() {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') throw new Error('Нет прав');

  const { data: termAccounts } = await supabase.from('accounts').select('*').eq('account_type', 'term');
  if (!termAccounts || termAccounts.length === 0) return { success: true, message: 'Нет срочных счетов для начисления' };

  const { user: treasuryUser } = await getTreasuryAccount();

  let count = 0;
  for (const acc of termAccounts) {
    if (acc.balance > 0 && acc.interest_rate > 0) {
      const profit = Math.floor(acc.balance * (acc.interest_rate / 100));
      if (profit > 0) {
        await supabase.from('accounts').update({ balance: acc.balance + profit }).eq('id', acc.id);
        
        await supabase.from('transactions').insert([{
           from_user_id: treasuryUser.id,
           to_user_id: acc.user_id,
           amount: profit,
           fee: 0,
           tx_type: 'transfer',
           note: `Начисление процентов по вкладу (${acc.interest_rate}%)`
        }]);
        count++;
      }
    }
  }

  return { success: true, message: `Начислены проценты для ${count} счетов` };
}

export async function getPublicStats() {
  const treasury = await getTreasuryAccount();
  const balance = treasury.account ? treasury.account.balance : 0;
  const netherite = treasury.user?.netherite || 0;
  const echo_shard = treasury.user?.echo_shard || 0;
  const garant = treasury.user?.garant || 0;
  
  // Total in active accounts across system
  const { data: allActive } = await supabase.from('accounts').select('balance').eq('account_type', 'active');
  let activeSum = 0;
  if (allActive) activeSum = allActive.reduce((acc, a) => acc + (a.balance > 0 ? a.balance : 0), 0);

  // Total in term accounts (credits/deposits)
  const { data: allTerm } = await supabase.from('accounts').select('balance, term_days').eq('account_type', 'term');
  let creditSum = 0;
  let depositSum = 0;
  let freeDepositSum = 0;
  
  if (allTerm) {
    allTerm.forEach(a => {
      if (a.balance < 0) creditSum += Math.abs(a.balance);
      else {
        depositSum += a.balance;
        // The bank can freely use a portion of locked deposits
        // Example: 30 days lock gives 70% free. 
        // Formula: ratio = min( (term_days / 30) * 0.7, 1 )
        const days = a.term_days || 0;
        const ratio = Math.min((days / 30) * 0.7, 1);
        freeDepositSum += Math.floor(a.balance * ratio);
      }
    });
  }

  // Count active players
  const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });

  return {
    treasuryBalance: balance,
    treasuryNetherite: netherite,
    treasuryEchoShard: echo_shard,
    treasuryGarant: garant,
    activeCirculation: activeSum + freeDepositSum,
    issuedCredits: creditSum,
    securedDeposits: depositSum,
    totalPlayers: usersCount || 0
  };
}

export async function executeNovaPay(merchantNick: string, amount: number, itemDesc: string) {
  try {
    const user = await getSessionUser();
    if (!user) return { error: 'Не авторизован' };
    
    if (amount <= 0) return { error: 'Сумма должна быть больше нуля' };
    if (merchantNick.toLowerCase() === user.nick.toLowerCase()) return { error: 'Нельзя оплатить самому себе' };

    const numAmount = Math.floor(amount);
    
    // Calculate commission
    const rate = user.subscription_active ? 0.05 : 0.15;
    let fee = Math.floor(numAmount * rate);
    if (!user.subscription_active && fee < 1) fee = 1; // min 1 diamond if not sub
    
    const totalCharge = numAmount + fee;

    const sourceAcc = user.accountsList.find((a: any) => a.is_primary && a.account_type === 'active');
    if (!sourceAcc) return { error: 'Нет активного основного счета для списания' };
    
    // Ensure both are treated as numbers
    const balance = Number(sourceAcc.balance);
    if (isNaN(balance) || balance < totalCharge) return { error: `Недостаточно средств. Требуется: ${totalCharge} Алмазов, доступно: ${balance || 0}` };

    // Target User
    const { data: receiver, error: receiverErr } = await supabase.from('users').select('id').ilike('nick', merchantNick).single();
    if (receiverErr || !receiver) return { error: `Получатель ${merchantNick} не найден в системе (или ошибка БД)` };

    let { data: receiverAcc } = await supabase.from('accounts').select('*').eq('user_id', receiver.id).eq('is_primary', true).maybeSingle();
    if (!receiverAcc) {
      const { data: fallbackAcc } = await supabase.from('accounts').select('*').eq('user_id', receiver.id).eq('account_type', 'active').limit(1).maybeSingle();
      if (fallbackAcc) receiverAcc = fallbackAcc;
    }
    
    if (!receiverAcc) {
      const { data: newAcc, error } = await supabase.from('accounts').insert([{
        user_id: receiver.id, name: 'Счет по умолчанию', is_primary: true, account_type: 'active'
      }]).select('*').single();
      if (error || !newAcc) return { error: 'Не удалось инициализировать счет получателя' };
      receiverAcc = newAcc;
    }

    // Deduct
    const { error: deductErr } = await supabase.from('accounts').update({ balance: balance - totalCharge }).eq('id', sourceAcc.id);
    if (deductErr) return { error: `Ошибка при списании: ${deductErr.message}` };
    
    // Add
    const { error: addErr } = await supabase.from('accounts').update({ balance: Number(receiverAcc.balance) + numAmount }).eq('id', receiverAcc.id);
    if (addErr) {
      // rollback deduct (best effort without real transactions)
      await supabase.from('accounts').update({ balance: balance }).eq('id', sourceAcc.id);
      return { error: `Ошибка при зачислении: ${addErr.message}` };
    }
    
    // Treasury (Fee)
    if (fee > 0) {
      try {
        const treasury = await getTreasuryAccount();
        if (treasury && treasury.account) {
          await supabase.from('accounts').update({ balance: Number(treasury.account.balance) + fee }).eq('id', treasury.account.id);
        }
      } catch (e) {
        console.error('Не удалось зачислить налог в казну', e);
      }
    }

    const receiptId = `NP-${Math.floor(Date.now() / 1000).toString(16).toUpperCase()}`;

    // Transactions
    const { error: txErr } = await supabase.from('transactions').insert([{
      from_user_id: user.id, to_user_id: receiver.id, amount: numAmount, fee, tx_type: 'transfer',
      note: `NOVA PAY [#${receiptId}]: Оплата пред. "${itemDesc}" продавцу ${merchantNick}`
    }]);
    
    if (txErr) return { error: `Средства переведены, но транзакция не сохранена: ${txErr.message}` };

    return { success: true };
  } catch (err: any) {
    console.error('NovaPay Execute Error:', err);
    return { error: `Внутренняя ошибка обработчика платежа: ${err.message || String(err)}` };
  }
}

export async function buyMarketItem(itemType: 'netherite' | 'echo_shard' | 'garant', quantity: number) {
  try {
    const user = await getSessionUser();
    if (!user) return { error: 'Не авторизован' };
    if (quantity <= 0) return { error: 'Неверное количество' };

    const basePrice = BASE_PRICES[itemType];
    if (!basePrice) return { error: 'Неизвестный товар' };

    const currentPrice = getDynamicPrice(basePrice, Date.now());
    const totalCost = currentPrice * quantity;

    const sourceAcc = user.accountsList.find((a: any) => a.is_primary && a.account_type === 'active');
    if (!sourceAcc) return { error: 'Нет активного основного счета' };
    if (sourceAcc.balance < totalCost) return { error: `Недостаточно средств. Нужно ${totalCost} алмазов` };

    const { error: deductErr } = await supabase.from('accounts').update({ balance: Number(sourceAcc.balance) - totalCost }).eq('id', sourceAcc.id);
    if (deductErr) return { error: deductErr.message };

    const currentItemCount = Number(user[itemType]) || 0;
    const { error: addErr } = await supabase.from('users').update({ [itemType]: currentItemCount + quantity }).eq('id', user.id);
    if (addErr) {
      await supabase.from('accounts').update({ balance: Number(sourceAcc.balance) }).eq('id', sourceAcc.id);
      return { error: addErr.message };
    }

    await supabase.from('transactions').insert([{
      from_user_id: user.id, to_user_id: user.id, amount: totalCost, fee: 0, tx_type: 'market_buy',
      note: `Покупка на бирже TR-EX: ${quantity} ед. ${itemType} по курсу ${currentPrice}`
    }]);

    const treasury = await getTreasuryAccount();
    if (treasury && treasury.account) {
      await supabase.from('accounts').update({ balance: Number(treasury.account.balance) + totalCost }).eq('id', treasury.account.id);
    }

    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function swapItems(fromAsset: string, toAsset: string, fromAmount: number) {
  try {
    const user = await getSessionUser();
    if (!user) return { error: 'Не авторизован' };
    if (fromAmount <= 0) return { error: 'Неверное количество' };

    // 1. Direct crafting: Garant <-> Echo Shards (0% fee, exact 1:48 ratio)
    if (fromAsset === 'garant' && toAsset === 'echo_shard') {
      const current = Number(user.garant) || 0;
      if (current < fromAmount) return { error: 'Недостаточно Целых Гарантов' };
      const gainedShards = fromAmount * 48;
      await supabase.from('users').update({ 
        garant: current - fromAmount,
        echo_shard: (Number(user.echo_shard) || 0) + gainedShards
      }).eq('id', user.id);
      await supabase.from('transactions').insert([{
        from_user_id: user.id, to_user_id: user.id, amount: 0, fee: 0, tx_type: 'market_swap',
        note: `Крафт: Разбито ${fromAmount} Гарантов на ${gainedShards} Осколков`
      }]);
      return { success: true };
    }
    
    if (fromAsset === 'echo_shard' && toAsset === 'garant') {
      const current = Number(user.echo_shard) || 0;
      const neededShards = fromAmount * 48;
      if (current < neededShards) return { error: `Недостаточно Осколков. Нужно ${neededShards}` };
      await supabase.from('users').update({ 
        echo_shard: current - neededShards,
        garant: (Number(user.garant) || 0) + fromAmount
      }).eq('id', user.id);
      await supabase.from('transactions').insert([{
        from_user_id: user.id, to_user_id: user.id, amount: 0, fee: 0, tx_type: 'market_swap',
        note: `Крафт: Собрано ${fromAmount} Гарантов из ${neededShards} Осколков`
      }]);
      return { success: true };
    }

    // Generic Item to Item Swap via Diamond equivalent
    const now = Date.now();
    const fromBase = (BASE_PRICES as any)[fromAsset];
    const toBase = (BASE_PRICES as any)[toAsset];

    if (fromBase && toBase) {
      const currentFromItems = Number(user[fromAsset]) || 0;
      if (currentFromItems < fromAmount) return { error: `Недостаточно товара ${fromAsset}` };

      const fromPrice = getDynamicPrice(fromBase, now);
      const toPrice = getDynamicPrice(toBase, now);

      // Sell side
      const sellValue = fromAmount * fromPrice;
      const isPremium = user.subscription_active;
      const feePercent = isPremium ? 0.02 : 0.10;
      const fee = Math.floor(sellValue * feePercent);
      const netDiamonds = sellValue - fee;

      // Buy side
      const receiveQty = Math.floor(netDiamonds / toPrice);
      if (receiveQty <= 0) return { error: 'Слишком маленькая сумма для обмена на 1 единицу' };

      const costDiamonds = receiveQty * toPrice;
      const refundDiamonds = netDiamonds - costDiamonds;

      const currentToItems = Number(user[toAsset]) || 0;

      // Update source
      await supabase.from('users').update({
        [fromAsset]: currentFromItems - fromAmount,
        [toAsset]: currentToItems + receiveQty
      }).eq('id', user.id);

      // Refund diamonds if any
      let noteExtra = '';
      if (refundDiamonds > 0) {
        const sourceAcc = user.accountsList.find((a: any) => a.is_primary && a.account_type === 'active');
        if (sourceAcc) {
           await supabase.from('accounts').update({ balance: Number(sourceAcc.balance) + refundDiamonds }).eq('id', sourceAcc.id);
           noteExtra = ` (сдача ${refundDiamonds} алмазов)`;
        }
      }

      await supabase.from('transactions').insert([{
        from_user_id: user.id, to_user_id: user.id, amount: costDiamonds, fee: fee, tx_type: 'market_swap',
        note: `Прямой обмен: ${fromAmount} ${fromAsset} на ${receiveQty} ${toAsset}${noteExtra}`
      }]);

      if (fee > 0) {
        const treasury = await getTreasuryAccount();
        if (treasury && treasury.account) {
          await supabase.from('accounts').update({ balance: Number(treasury.account.balance) + fee }).eq('id', treasury.account.id);
        }
      }

      return { success: true };
    }

    // 2. Market trading with Diamonds (Diamond <-> Item)
    if (fromAsset === 'diamond') {
      if (['netherite', 'echo_shard', 'garant'].includes(toAsset)) {
        // Buy Item. "fromAmount" is how many DIAMONDS we pay? No, let's treat fromAmount as how many items we BUY to be simple, 
        // wait, the signature is fromAmount. If fromAsset is Diamond, fromAmount is DIAMONDS.
        // It's easier if we just use buyMarketItem / sellMarketItem from UI.
        return { error: 'Используйте прямую покупку/продажу для алмазов' };
      }
    }

    return { error: 'Этот тип обмена недоступен' };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function sellMarketItem(itemType: 'netherite' | 'echo_shard' | 'garant', quantity: number) {
  try {
    const user = await getSessionUser();
    if (!user) return { error: 'Не авторизован' };
    if (quantity <= 0) return { error: 'Неверное количество' };

    const currentItemCount = Number(user[itemType]) || 0;
    if (currentItemCount < quantity) return { error: `Недостаточно товара. Имеется: ${currentItemCount}` };

    const basePrice = BASE_PRICES[itemType];
    if (!basePrice) return { error: 'Неизвестный товар' };

    const currentPrice = getDynamicPrice(basePrice, Date.now());
    
    // Give them diamonds back
    const rawTotal = currentPrice * quantity;
    const isPremium = user.subscription_active;
    const feePercent = isPremium ? 0.02 : 0.10;
    const fee = Math.floor(rawTotal * feePercent);
    const totalEarnings = rawTotal - fee;

    const sourceAcc = user.accountsList.find((a: any) => a.is_primary && a.account_type === 'active');
    if (!sourceAcc) return { error: 'Нет активного основного счета' };

    const { error: deductErr } = await supabase.from('users').update({ [itemType]: currentItemCount - quantity }).eq('id', user.id);
    if (deductErr) return { error: deductErr.message };

    const { error: addErr } = await supabase.from('accounts').update({ balance: Number(sourceAcc.balance) + totalEarnings }).eq('id', sourceAcc.id);
    if (addErr) {
      await supabase.from('users').update({ [itemType]: currentItemCount }).eq('id', user.id);
      return { error: addErr.message };
    }

    await supabase.from('transactions').insert([{
      from_user_id: user.id, to_user_id: user.id, amount: totalEarnings, fee: fee, tx_type: 'market_sell',
      note: `Продажа на бирже TR-EX: ${quantity} ед. ${itemType} по курсу ${currentPrice}`
    }]);

    if (fee > 0) {
      const treasury = await getTreasuryAccount();
      if (treasury && treasury.account) {
        await supabase.from('accounts').update({ balance: Number(treasury.account.balance) + fee }).eq('id', treasury.account.id);
      }
    }

    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}