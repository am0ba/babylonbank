const startDate = new Date('2024-05-01T00:00:00Z').getTime();

function getDynamicPrice(basePrice, timeMs) {
  const yearsPassed = (timeMs - startDate) / (1000 * 60 * 60 * 24 * 365.25);
  // Trend: basePrice * 2^(yearsPassed)
  const trend = Math.pow(2, yearsPassed);
  
  // Fluctuation: some sine waves
  // Let's make it fluctuate on a scale of weeks / days
  // 1 year = 365.25 days.
  // freq1: 10 cycles per year (~36.5 days)
  // freq2: 25 cycles per year (~14.6 days)
  const fluc = 1 
    + 0.15 * Math.sin(2 * Math.PI * yearsPassed * 12) 
    + 0.08 * Math.cos(2 * Math.PI * yearsPassed * 36)
    + 0.05 * Math.sin(2 * Math.PI * yearsPassed * 100);

  let finalPrice = basePrice * trend * Math.abs(fluc);
  return finalPrice;
}

const now = new Date('2024-05-01T00:00:00Z').getTime();
console.log('Now', getDynamicPrice(48, now));

const now2 = new Date('2024-05-08T00:00:00Z').getTime();
console.log('1 week', getDynamicPrice(48, now2));

const now3 = new Date('2025-05-01T00:00:00Z').getTime();
console.log('1 year', getDynamicPrice(48, now3));

const now4 = new Date('2026-05-01T00:00:00Z').getTime();
console.log('2 years', getDynamicPrice(48, now4));
