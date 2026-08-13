// 央行利率機制 (仿聯準會): 依市場熱度升/降息
// 熱度 = 近30分鐘成交量 vs 前5.5小時平均; 熱 → 升息 (吸金降溫), 冷 → 降息 (刺激投資)
// 基準 0.00001/分 = 1.44%/天 (活存低於定存 7天 0.00009/分)
import { broadcast } from './utils.js';

const BASE_SAVINGS = 0.00001;   // 1.44%/天 基準
const MIN_SAVINGS = 0.000005;   // 0.72%/天 地板
const MAX_SAVINGS = 0.00003;    // 4.32%/天 天花板
const STEP = 0.000005;          // 每次 ±0.0005%/分
const ADJUST_MINUTES = 30;     // 每 30 分鐘決策一次

export async function getRates(db) {
  const row = await db.prepare('SELECT * FROM market_rates WHERE id = 1').first();
  return row || { savings_rate: BASE_SAVINGS, deposit_mult: 1.0, adjusted_at: 0 };
}

export async function adjustInterestRates(db) {
  const rates = await getRates(db);
  const now = Date.now();
  if (rates.adjusted_at && now - rates.adjusted_at < ADJUST_MINUTES * 60000) return null;

  const recent30 = await db.prepare('SELECT COALESCE(SUM(quantity), 0) as q FROM stock_trades WHERE traded_at >= ?').bind(now - 30 * 60000).first();
  const window6h = await db.prepare('SELECT COALESCE(SUM(quantity), 0) as q FROM stock_trades WHERE traded_at >= ? AND traded_at < ?').bind(now - 6 * 3600000, now - 30 * 60000).first();
  const recentPerMin = (recent30?.q || 0) / 30;
  const basePerMin = (window6h?.q || 0) / 330;
  const heat = basePerMin > 0 ? recentPerMin / basePerMin : 1;

  let newRate = rates.savings_rate;
  let action = null;
  if (heat >= 1.5) {
    newRate = Math.min(MAX_SAVINGS, newRate + STEP);
    action = 'up';
  } else if (heat <= 0.5) {
    newRate = Math.max(MIN_SAVINGS, newRate - STEP);
    action = 'down';
  }

  if (action && newRate !== rates.savings_rate) {
    const mult = newRate / BASE_SAVINGS;
    await db.prepare('UPDATE market_rates SET savings_rate = ?, deposit_mult = ?, adjusted_at = ? WHERE id = 1').bind(newRate, mult, now).run();
    const hot = heat >= 1.5;
    await broadcast(db, `🏦 央行決議${hot ? '升息' : '降息'}：市場${hot ? '過熱' : '冷卻'}，活存利率調整為 ${(newRate * 1440 * 100).toFixed(2)}%/天（${(newRate * 100).toFixed(4)}%/分），定存利率同步${hot ? '調升' : '調降'}`);
  }
  return { heat, savings_rate: newRate, action };
}