import { logTransaction, notify } from './utils.js';

const TIERS = {
  bronze:   { cost: 500,   label: '銅級刮刮樂',   icon: '🥉', rewards: [0, 0, 0.5, 0.5, 0.8, 0.8, 1, 1, 1.5, 2, 3] },
  silver:   { cost: 1000,  label: '銀級刮刮樂',   icon: '🥈', rewards: [0, 0, 0.5, 0.8, 1, 1, 1.5, 1.5, 2, 3, 5] },
  gold:     { cost: 5000,  label: '金級刮刮樂',   icon: '🥇', rewards: [0, 0.5, 0.8, 1, 1, 1.5, 2, 2, 3, 5, 10] },
};

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

export async function getScratchStatus(db, userId) {
  const row = await db.prepare('SELECT * FROM scratch_daily WHERE user_id = ?').bind(userId).first();
  const today = todayUTC();
  const freeUsed = (row && row.date === today) ? row.free_used : 0;
  return { freeUsed, tiers: Object.entries(TIERS).map(([k, v]) => ({ type: k, cost: v.cost, label: v.label, icon: v.icon })) };
}

export async function scratch(db, userId, tier, isFree) {
  const info = TIERS[tier];
  if (!info) return { error: '無效票種' };

  const today = todayUTC();
  const row = await db.prepare('SELECT * FROM scratch_daily WHERE user_id = ?').bind(userId).first();
  const freeUsed = (row && row.date === today) ? (row.free_used || 0) : 0;

  if (isFree) {
    if (freeUsed >= 5) return { error: '今日免費次數已用完' };
    await db.prepare(`INSERT INTO scratch_daily (user_id, date, free_used) VALUES (?, ?, 1)
      ON CONFLICT(user_id) DO UPDATE SET date = excluded.date, free_used = 1`).bind(userId, today).run();
  } else {
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(userId).first();
    if (!wallet || wallet.cash < info.cost) return { error: '餘額不足' };
    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(info.cost, userId).run();
    await logTransaction(db, userId, 'scratch_cost', -info.cost, `${info.label}購買`);
  }

  const multiplier = info.rewards[Math.floor(Math.random() * info.rewards.length)];
  const reward = Math.floor(info.cost * multiplier);

  if (reward > 0) {
    await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(reward, reward, userId).run();
    await logTransaction(db, userId, 'scratch_reward', reward, `${info.label}中獎 (${multiplier}x)`);
  }

  await db.prepare('INSERT INTO scratch_cards (user_id, tier, cost, reward, multiplier, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(userId, tier, isFree ? 0 : info.cost, reward, multiplier, Date.now()).run();

  return {
    success: true,
    tier: info.label,
    icon: info.icon,
    cost: isFree ? 0 : info.cost,
    reward,
    multiplier,
    profit: reward - (isFree ? 0 : info.cost),
  };
}

export async function getScratchHistory(db, userId, limit = 20) {
  const rows = await db.prepare('SELECT * FROM scratch_cards WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').bind(userId, limit).all();
  return rows.results;
}
