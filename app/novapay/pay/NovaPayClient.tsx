'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { executeNovaPay } from '@/lib/actions';
import { SECRET_TEXTURES } from '@/lib/textures';
import { CheckCircle, ShieldCheck } from 'lucide-react';

export default function NovaPayClient({ user, searchParams }: { user: any, searchParams: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const merchant = searchParams?.merchant || 'Неизвестный магазин';
  const item = searchParams?.item || 'Цифровой товар';
  const rawAmount = parseInt(searchParams?.amount || '0');
  const amount = isNaN(rawAmount) ? 0 : rawAmount;
  const callback = searchParams?.callback;

  // Calculate fees
  const userRate = user?.subscription_active ? 0.05 : 0.15;
  let fee = Math.floor(amount * userRate);
  if (!user?.subscription_active && fee < 1) fee = 1;
  const total = amount + fee;

  const handlePay = async () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.href));
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await executeNovaPay(merchant, amount, item);
      if (res && res.error) {
        setErrorMsg(res.error);
      } else if (res && res.success) {
        setSuccess(true);
        if (callback) {
          setTimeout(() => {
            window.location.href = callback;
          }, 3000);
        }
      } else {
        setErrorMsg('Неизвестный ответ от сервера');
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Произошла непредвиденная ошибка');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-slate-800 p-6">
        <div className="bg-card text-card-foreground p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
          <CheckCircle className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-2">Оплата Успешна</h2>
          <p className="text-muted-foreground font-medium mb-6">Средства переведены {merchant}</p>
          <div className="bg-background p-4 rounded-xl space-y-3 mb-8 text-left">
            <div className="flex justify-between items-center text-sm border-b border-border pb-2">
               <span className="text-muted-foreground">Чек (Receipt)</span>
               <span className="font-sans text-muted-foreground">#NP-{Math.floor(Date.now() / 1000).toString(16).toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-center">
               <span className="text-muted-foreground text-sm">Сумма списания</span>
               <span className="font-bold flex items-center font-sans text-blue-600">{total} <img src={SECRET_TEXTURES.diamond} className="w-4 h-4 ml-1 mix-blend-multiply opacity-80" alt="diamond"/></span>
            </div>
          </div>
          {callback && (
            <p className="text-sm text-muted-foreground animate-pulse">Перенаправление в магазин...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-sans bg-[#F8FAFC]">
      <div className="w-full max-w-[420px] p-6">
        <header className="flex justify-center mb-10 items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-foreground font-black text-sm italic">N</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tighter text-blue-900 border-l pl-3 border-border italic pr-2">NOVA PAY</h1>
        </header>

        <main className="bg-card text-card-foreground rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border p-8">
          <div className="text-center mb-8">
            <p className="text-sm text-muted-foreground font-medium mb-1 line-clamp-1 truncate">{merchant}</p>
            <h2 className="text-4xl font-bold text-slate-800 tracking-tight flex items-center justify-center gap-2 font-sans">
              {amount} <img src={SECRET_TEXTURES.diamond} className="w-6 h-6 ml-1 object-contain mix-blend-multiply" alt="diamond"/>
            </h2>
            <p className="text-xs text-muted-foreground mt-3 bg-background py-1.5 px-3 rounded-full inline-block truncate max-w-full">
              Заказ: {item}
            </p>
          </div>

          {!user ? (
            <div className="border-t border-border pt-6">
              <p className="text-sm text-muted-foreground text-center mb-4">Для оплаты войдите в Вавилон ID</p>
              <button 
                onClick={handlePay}
                className="w-full bg-slate-900 text-foreground font-bold py-3.5 rounded-2xl shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98]"
              >
                Войти и Оплатить
              </button>
            </div>
          ) : (
            <div className="border-t border-border pt-6">
              <div className="bg-[#F8FAFC] rounded-2xl p-4 mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs text-muted-foreground uppercase  font-bold">Счет списания</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-bold">Активен</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{user.nick}</p>
                    <p className="text-xs text-muted-foreground font-sans">ID: {user.id.slice(0,8)}...</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Баланс</p>
                    <p className="font-sans font-bold text-muted-foreground flex items-center justify-end">{user.loot_balance} <img src={SECRET_TEXTURES.diamond} className="w-3 h-3 ml-1 mix-blend-multiply opacity-70" alt="diamond"/></p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Сумма</span>
                  <span className="font-medium font-sans flex items-center">{amount} <img src={SECRET_TEXTURES.diamond} className="w-3 h-3 ml-1 mix-blend-multiply opacity-50" alt="diamond"/></span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground items-center flex gap-1">
                    Комиссия 
                    {user?.subscription_active ? (
                      <span className="bg-yellow-100 text-yellow-700 text-[10px] px-1.5 py-0.5 rounded font-bold ml-1">SUB -5%</span>
                    ) : (
                      <span className="bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0.5 rounded font-bold ml-1">15%</span>
                    )}
                  </span>
                  <span className="font-medium font-sans flex items-center">{fee} <img src={SECRET_TEXTURES.diamond} className="w-3 h-3 ml-1 mix-blend-multiply opacity-50" alt="diamond"/></span>
                </div>
                <div className="flex justify-between text-base font-bold pt-3 border-t border-border text-slate-800">
                  <span>Итого к оплате</span>
                  <span className="font-sans flex items-center text-blue-600">{total} <img src={SECRET_TEXTURES.diamond} className="w-4 h-4 ml-1 mix-blend-multiply opacity-80" alt="diamond"/></span>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">
                  {errorMsg}
                </div>
              )}

              <button 
                onClick={handlePay} disabled={loading}
                className="w-full bg-blue-600 text-foreground font-bold py-4 rounded-xl shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:bg-blue-700 hover:shadow-none transition-all disabled:opacity-50 active:scale-[0.98] mb-4"
              >
                {loading ? 'Обработка...' : 'Подтвердить оплату'}
              </button>

              <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground font-medium pb-2 pt-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> 
                NOVA Secure Checkout
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
