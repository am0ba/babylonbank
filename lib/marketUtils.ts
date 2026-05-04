// lib/marketUtils.ts
export const MARKET_START_DATE = new Date('2026-05-01T00:00:00Z').getTime();

export const BASE_PRICES = {
  netherite: 48,
  echo_shard: 9,
  garant: 432 // 48 * 9
};

export function getDynamicPrice(basePrice: number, timeMs: number): number {
  const yearsPassed = (timeMs - MARKET_START_DATE) / (1000 * 60 * 60 * 24 * 365.25);
  
  // Plavnaya dinamika: +10% v mesyac, ili x2 v god, no men'shiy skachok srazu
  const trend = Math.pow(2, yearsPassed);
  
  // Fluctuation: Sine waves creating a realistic market bounce
  const fluc = 1 
    + 0.05 * Math.sin(2 * Math.PI * yearsPassed * 12)   // Monthly cycle
    + 0.03 * Math.cos(2 * Math.PI * yearsPassed * 36)   // 10-day cycle
    + 0.02 * Math.sin(2 * Math.PI * yearsPassed * 100); // 3-4 day fast cycle

  const finalPrice = Math.max(1, basePrice * trend * Math.abs(fluc));
  return Math.floor(finalPrice); // Prices are whole diamonds
}

export function getCurrentMarketPrices() {
  const now = Date.now();
  return {
    netherite: getDynamicPrice(BASE_PRICES.netherite, now),
    echo_shard: getDynamicPrice(BASE_PRICES.echo_shard, now),
    garant: getDynamicPrice(BASE_PRICES.garant, now)
  };
}

// Predict price for chart
export function getPriceHistoryAndPrediction(basePrice: number) {
  const data = [];
  const now = Date.now();
  const dayMs = 1000 * 60 * 60 * 24;
  
  // 30 days ago to 10 days future
  for (let i = -30; i <= 10; i+=2) {
    const t = now + (i * dayMs);
    data.push({
      time: t,
      dateStr: new Date(t).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' }),
      price: getDynamicPrice(basePrice, t),
      isFuture: i > 0
    });
  }
  return data;
}
