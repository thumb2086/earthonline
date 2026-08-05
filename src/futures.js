import { logTransaction, notify } from './utils.js';
import { computeMarketIndex } from './stock.js';

const TERMS = { 60: '1小時', 360: '6小時', 1440: '24小時' };
const PREMIUM_RATE = 0.05; // 權利金 = 契約值 5%
const MULTIPLIER = 1; // $1/點

// 指數期貨: 權益期權式 — 付權利金進場, 到期結算 payout = max(0, pnl), 最大虧損 = 權利金
export async function handleFutures(env, request, path, user) {
  const db = env.DB;

  if (path === '/api/futures/open') {
    const { direction, termMinutes, contracts } = await request.json();
    if (!['long', 'short'].includes(direction)) return { error: '方向需為 long / short' };
    const term = parseInt(termMinutes);
    if (!TERMS[term]) return { error: '期限需為 1小時 / 6小時 / 24小時' };
    const n = parseInt(contracts);
    if (!Number.isInteger(n) || n <= 0 || n > 100) return { error: '張數需 1~100' };

    const index = await computeMarketIndex(db);
    const entry = index.value;
    const contractValue = Math.round(entry * MULTIPLIER * n);
    const premium = Math.max(1, Math.floor(contractValue * PREMIUM_RATE));
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < premium) return { error: `權利金不足（需 $${premium.toLocaleString()}）` };

    const now = Date.now();
    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(premium, user.id).run();
    await db.prepare('INSERT INTO futures (user_id, direction, term_minutes, entry_index, contracts, multiplier, premium, status, opened_at, settle_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(user.id, direction, term, entry, n, MULTIPLIER, premium, 'open', now, now + term * 60000).run();
    await logTransaction(db, user.id, 'futures_open', -premium, `${direction === 'long' ? '做多' : '做空'} 指數期貨 ${n} 張 × ${term}分鐘 @ 指數 ${entry}（權利金 $${premium}）`);
    return { success: true, entry, premium, term, contracts: n, direction, settleAt: now + term * 60000, message: `已進場！指數 ${entry}，權利金 $${premium.toLocaleString()}，${TERMS[term]}後自動結算` };
  }

  if (path === '/api/futures/list') {
    const index = await computeMarketIndex(db);
    const rows = await db.prepare('SELECT * FROM futures WHERE user_id = ? ORDER BY id DESC LIMIT 100').bind(user.id).all();
    return { currentIndex: index.value, items: rows.results };
  }

  return null;
}

// 每分鐘: 到期結算 (payout = max(0, pnl); 最大虧損 = 權利金)
export async function settleFutures(db) {
  const now = Date.now();
  const due = await db.prepare("SELECT * FROM futures WHERE status = 'open' AND settle_at <= ?").bind(now).all();
  if (due.results.length === 0) return;
  const index = await computeMarketIndex(db);
  for (const f of due.results) {
    try {
      const settleIndex = index.value;
      const diff = settleIndex - f.entry_index;
      const pnl = Math.round(diff * f.multiplier * f.contracts * (f.direction === 'long' ? 1 : -1));
      const payout = Math.max(0, pnl);
      if (payout > 0) {
        await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(payout, payout, f.user_id).run();
      }
      await db.prepare("UPDATE futures SET status = 'settled', settle_index = ?, pnl = ? WHERE id = ?").bind(settleIndex, pnl, f.id).run();
      const dirLabel = f.direction === 'long' ? '做多' : '做空';
      if (pnl > 0) {
        await logTransaction(db, f.user_id, 'futures_pnl', payout, `${dirLabel}期貨結算獲利 $${payout}（指數 ${f.entry_index} → ${settleIndex}）`);
        await notify(db, f.user_id, 'futures_settle', `💰 你的${dirLabel}期貨結算獲利 $${payout.toLocaleString()}！`);
      } else {
        await logTransaction(db, f.user_id, 'futures_loss', 0, `${dirLabel}期貨結算虧損（權利金 $${f.premium} 已損失，指數 ${f.entry_index} → ${settleIndex}）`);
        await notify(db, f.user_id, 'futures_settle', `📉 你的${dirLabel}期貨結算未獲利（指數 ${f.entry_index} → ${settleIndex}），權利金 $${f.premium.toLocaleString()} 已損失`);
      }
    } catch (e) {
      console.error('settleFutures error:', e.message);
    }
  }
}