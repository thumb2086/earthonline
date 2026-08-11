import { getCompanyProfit } from './company.js';

const SNAPSHOT_KEEP = 72; // 保留 72 小時快照
const GROWTH_HOURS = 24; // 成長率比較窗口

function dividendPerMinute(company) {
  const base = company.base_income || 100;
  const growth = 0.0005;
  const elapsed = Math.max((Date.now() - company.created_at) / 60000, 0);
  const currentIncome = Math.floor(base * Math.pow(1 + growth, elapsed));
  // 股利每 10 分鐘發一次 → 換算每分每股
  return company.total_shares > 0 ? currentIncome / company.total_shares / 10 : 0;
}

// 每小時財報快照: 所有交易中公司
export async function snapshotCompanyReports(db) {
  const companies = await db.prepare('SELECT * FROM companies').all();
  const now = Date.now();
  for (const c of companies.results) {
    try {
      const ipo = await db.prepare("SELECT phase FROM ipo_state WHERE company_id = ?").bind(c.id).first();
      if (!ipo || ipo.phase !== 'trading') continue;
      const subs = c.owner_id > 0 ? await getOwnerSubs(db, c.owner_id) : {};
      const data = await getCompanyProfit(db, c, subs);
      await db.prepare('INSERT INTO company_reports (company_id, period_start, income_rate, cost_rate, profit_rate, dividend_rate, price, total_shares, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(c.id, Math.floor(now / 3600000) * 3600000, data.income, data.costs, data.profit, dividendPerMinute(c), c.share_price || 100, c.total_shares, now).run();
      // 只保留最近 N 筆 (避免無限累積)
      const old = await db.prepare('SELECT id FROM company_reports WHERE company_id = ? ORDER BY created_at DESC LIMIT 1 OFFSET ?').bind(c.id, SNAPSHOT_KEEP).first();
      if (old) await db.prepare('DELETE FROM company_reports WHERE company_id = ? AND id <= ?').bind(c.id, old.id).run();
    } catch (e) {
      console.error('snapshotCompanyReports error:', e.message);
    }
  }
}

async function getOwnerSubs(db, userId) {
  try {
    const { getUserSubscriptions } = await import('./subscription.js');
    return (await getUserSubscriptions(db, userId)) || {};
  } catch (e) {
    return {};
  }
}

// 即時財報 + 基本面分析
export async function getCompanyReport(db, companyId) {
  const company = await db.prepare('SELECT * FROM companies WHERE id = ?').bind(companyId).first();
  if (!company) return { error: '公司不存在' };
  const ipo = await db.prepare("SELECT phase FROM ipo_state WHERE company_id = ?").bind(companyId).first();
  if (!ipo || ipo.phase !== 'trading') return { error: '僅上市交易中的公司有財報' };

  const price = company.share_price || 100;
  const subs = company.owner_id > 0 ? await getOwnerSubs(db, company.owner_id) : {};
  const data = await getCompanyProfit(db, company, subs);
  const incomeRate = data.income;
  const costRate = data.costs;
  const profitRate = data.profit;

  const inv = await db.prepare('SELECT stock_quantity FROM stock_inventory WHERE company_id = ?').bind(companyId).first();
  const inventory = inv?.stock_quantity || 0;
  const circulating = Math.max(company.total_shares - inventory, 0);

  // 各項指標
  const epsDay = company.total_shares > 0 ? profitRate * 1440 / company.total_shares : 0; // 每股日盈餘
  const pe = epsDay > 0 ? price / epsDay : null;
  const margin = incomeRate > 0 ? profitRate / incomeRate : (profitRate < 0 ? -1 : 0);
  const divRate = dividendPerMinute(company);
  const yieldDaily = price > 0 ? divRate * 1440 / price : 0;
  // 成長率: 最新 vs 24h 前快照
  const now = Date.now();
  const snapshots = await db.prepare('SELECT period_start, profit_rate, created_at FROM company_reports WHERE company_id = ? ORDER BY created_at DESC LIMIT 30').bind(companyId).all();
  const latest = snapshots.results[0];
  const target = now - GROWTH_HOURS * 3600000;
  const past = snapshots.results.find(s => s.created_at <= target) || snapshots.results[snapshots.results.length - 1];
  let growthPct = null;
  if (latest && past && past.profit_rate !== 0) {
    growthPct = (latest.profit_rate - past.profit_rate) / Math.abs(past.profit_rate);
  }

  // 60分鐘均價 (最後120根5秒K線)
  const klines = await db.prepare('SELECT close FROM stock_klines WHERE company_id = ? ORDER BY minute DESC LIMIT 120').bind(companyId).all();
  const closes = klines.results.map(k => k.close);
  const ma60 = closes.length > 0 ? closes.reduce((s, v) => s + v, 0) / closes.length : price;
  const trend = price > ma60 + 0.5 ? 'up' : price < ma60 - 0.5 ? 'down' : 'flat';

  // 近24h成交量
  const vol24 = await db.prepare('SELECT COALESCE(SUM(quantity), 0) as v FROM stock_trades WHERE company_id = ? AND traded_at >= ?').bind(companyId, now - 24 * 3600000).first();

  // 評價計分
  let score = 0;
  let peTag = '—';
  if (pe !== null) {
    if (pe < 5) { score += 3; peTag = '極便宜'; }
    else if (pe < 15) { score += 2; peTag = '便宜'; }
    else if (pe < 30) { score += 1; peTag = '合理'; }
    else { score -= 1; peTag = '偏貴'; }
  } else {
    peTag = '虧損'; score -= 2;
  }
  if (profitRate > 0) score += 2; else score -= 2;
  if (growthPct !== null) { if (growthPct > 0.1) score += 2; else if (growthPct < -0.1) score -= 2; }
  if (yieldDaily > 0.002) score += 1;
  if (trend === 'up') score += 1; else if (trend === 'down') score -= 1;
  score = Math.max(-10, Math.min(10, score));

  let rating, ratingLabel;
  if (score >= 7) { rating = 'S'; ratingLabel = '強力買進'; }
  else if (score >= 5) { rating = 'A'; ratingLabel = '買進'; }
  else if (score >= 2) { rating = 'B'; ratingLabel = '中立偏多'; }
  else if (score >= 0) { rating = 'C'; ratingLabel = '中立'; }
  else if (score >= -3) { rating = 'D'; ratingLabel = '賣出'; }
  else { rating = 'E'; ratingLabel = '強力賣出'; }

  // 文字分析
  const lines = [];
  if (profitRate > 0) lines.push(`每分鐘淨利潤 $${profitRate.toLocaleString()}（獲利率 ${(margin * 100).toFixed(1)}%），處於獲利狀態。`);
  else lines.push(`目前每分鐘虧損 $${Math.abs(profitRate).toLocaleString()}，營運呈赤字。`);
  lines.push(`本益比（日）${pe !== null ? pe.toFixed(1) : '無（虧損）'}，評價${peTag}。`);
  if (growthPct !== null) lines.push(profitRate > 0 && past?.profit_rate <= 0 ? '' : `近 24 小時淨利潤${growthPct >= 0 ? '成長' : '下滑'} ${Math.abs(growthPct * 100).toFixed(1)}%。`);
  if (yieldDaily > 0) lines.push(`每股日股利 $${(divRate * 1440).toFixed(2)}，殖利率 ${(yieldDaily * 100).toFixed(2)}%。`);
  lines.push(`現價 $${price} ${trend === 'up' ? '高於' : trend === 'down' ? '低於' : '持平'} 60 分鐘均價 $${Math.round(ma60)}，${trend === 'up' ? '短線偏多' : trend === 'down' ? '短線偏空' : '短線盤整'}。`);
  const text = lines.filter(Boolean).join(' ');

  return {
    companyId,
    code: company.code,
    name: company.name,
    price,
    incomeRate,
    costRate,
    profitRate,
    margin,
    epsDay,
    pe,
    peTag,
    dividendRatePerMin: divRate,
    yieldPctDaily: yieldDaily,
    growthPct,
    ma60,
    trend,
    marketCap: price * company.total_shares,
    floatCap: price * circulating,
    inventoryValue: price * inventory,
    totalShares: company.total_shares,
    circulating,
    volume24h: vol24?.v || 0,
    score,
    rating,
    ratingLabel,
    analysis: text,
    history: snapshots.results.slice(0, 24).map(s => ({
      periodStart: s.period_start,
      incomeRate: s.income_rate,
      costRate: s.cost_rate,
      profitRate: s.profit_rate,
      dividendRate: s.dividend_rate,
      price: s.price,
    })),
  };
}