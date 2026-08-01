import { logTransaction, logHourly } from './utils.js';
import { getUserSubscriptions } from './subscription.js';

const INVEST_TYPES = {
  deposit: { label: '定存', rateMin: 0.00002, rateMax: 0.00002, unlockEarned: 0, maxPerUser: 5000000, risk: 0 },
  bond: { label: '債券', rateMin: 0.00005, rateMax: 0.00005, unlockEarned: 1000, maxPerUser: 10000000, risk: 0 },
  index_fund: { label: '指數基金', rateMin: 0.00005, rateMax: 0.00015, unlockEarned: 5000, maxPerUser: 20000000, risk: 0 },
  real_estate: { label: '房地產', rateMin: 0.0002, rateMax: 0.0002, unlockEarned: 50000, maxPerUser: 50000000, risk: 0 },
  startup: { label: '新創投資', rateMin: 0.0003, rateMax: 0.0007, unlockEarned: 200000, maxPerUser: 100000000, risk: 0.0005 },
};

function getDiminishingRate(baseRate, totalInvested, maxPerUser) {
  const ratio = totalInvested / maxPerUser;
  if (ratio < 0.3) return baseRate;
  if (ratio < 0.6) return baseRate * 0.7;
  if (ratio < 0.8) return baseRate * 0.4;
  return baseRate * 0.2;
}

export async function handleInvestment(env, request, path, user) {
  const db = env.DB;
  if (path === '/api/investment/types') {
    const wallet = await db.prepare('SELECT total_earned FROM wallets WHERE user_id = ?').bind(user.id).first();
    const earned = wallet?.total_earned || 0;
    return Object.entries(INVEST_TYPES).map(([key, t]) => ({
      type: key, label: t.label, rateMin: t.rateMin, rateMax: t.rateMax,
      unlocked: earned >= t.unlockEarned, unlockEarned: t.unlockEarned,
    }));
  }

  if (path === '/api/investment/list') {
    const investments = await db.prepare('SELECT * FROM investments WHERE user_id = ?').bind(user.id).all();
    return Promise.all(investments.results.map(async (inv) => {
      const info = INVEST_TYPES[inv.type];
      const rate = info ? info.rateMin + (info.rateMax - info.rateMin) / 2 : 0;
      return {
        ...inv,
        label: info?.label || inv.type,
        dailyEarn: Math.floor((inv.amount + (inv.pending_interest || 0)) * rate * 1440),
        totalPaid: inv.total_paid || 0,
      };
    }));
  }

  if (path === '/api/investment/invest') {
    const { type, amount } = await request.json();
    const info = INVEST_TYPES[type];
    if (!info) return { error: '無效投資類型' };
    const wallet = await db.prepare('SELECT cash, total_earned FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < amount) return { error: '餘額不足' };
    if (wallet.total_earned < info.unlockEarned) return { error: '尚未解鎖' };

    const existing = await db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM investments WHERE user_id = ? AND type = ?').bind(user.id, type).first();
    if ((existing?.total || 0) + amount > info.maxPerUser) return { error: `投資上限 $${info.maxPerUser.toLocaleString()}` };

    if (type === 'deposit') {
      await db.prepare('UPDATE wallets SET cash = cash - ?, bank = bank + ? WHERE user_id = ?').bind(amount, amount, user.id).run();
    } else {
      await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(amount, user.id).run();
    }
    await db.prepare('INSERT INTO investments (user_id, type, amount, started_at) VALUES (?, ?, ?, ?)').bind(user.id, type, amount, Date.now()).run();
    await logTransaction(db, user.id, 'investment', -amount, `投資${info.label} $${amount.toLocaleString()}`);
    return { success: true };
  }

  if (path === '/api/investment/withdraw') {
    const { investmentId } = await request.json();
    const inv = await db.prepare('SELECT id, type, amount FROM investments WHERE id = ? AND user_id = ?').bind(investmentId, user.id).first();
    if (!inv) return { error: '投資不存在' };
    const info = INVEST_TYPES[inv.type];
    const fee = inv.type === 'deposit' ? 0 : Math.floor(inv.amount * 0.01);
    const refund = inv.amount - fee;

    if (inv.type === 'deposit') {
      const wallet = await db.prepare('SELECT bank FROM wallets WHERE user_id = ?').bind(user.id).first();
      if (!wallet || wallet.bank < inv.amount) return { error: '定存不足' };
      await db.prepare('UPDATE wallets SET bank = bank - ?, cash = cash + ? WHERE user_id = ?').bind(inv.amount, inv.amount, user.id).run();
    } else {
      await db.prepare('UPDATE wallets SET cash = cash + ? WHERE user_id = ?').bind(refund, user.id).run();
    }
    await db.prepare('DELETE FROM investments WHERE id = ?').bind(inv.id).run();
    await logTransaction(db, user.id, 'investment', refund, `贖回${info?.label || inv.type} $${refund.toLocaleString()}`);
    return { success: true, refund };
  }
  return null;
}

export async function processInvestmentTick(db) {
  const investments = await db.prepare('SELECT id, user_id, type, amount, COALESCE(pending_interest, 0) as pending_interest FROM investments').all();
  const subCache = {};
  for (const inv of investments.results) {
    const info = INVEST_TYPES[inv.type];
    if (!info) continue;
    if (!subCache[inv.user_id]) subCache[inv.user_id] = await getUserSubscriptions(db, inv.user_id);
    const financeBonus = subCache[inv.user_id]?.finance ? 1.15 : 1;
    const totalInvested = inv.amount + (inv.pending_interest || 0);
    const baseRate = info.rateMin + Math.random() * (info.rateMax - info.rateMin);
    const rate = getDiminishingRate(baseRate, totalInvested, info.maxPerUser) * financeBonus;
    const earned = inv.amount * rate;
    const totalPending = (inv.pending_interest || 0) + earned;
    const payout = Math.floor(totalPending);
    if (payout > 0) {
      await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(payout, payout, inv.user_id).run();
      await db.prepare('UPDATE investments SET pending_interest = ?, total_paid = COALESCE(total_paid, 0) + ? WHERE id = ?').bind(totalPending - payout, payout, inv.id).run();
      await logHourly(db, inv.user_id, 'investment_interest', payout, `${info.label}利息`);
    } else {
      await db.prepare('UPDATE investments SET pending_interest = ? WHERE id = ?').bind(totalPending, inv.id).run();
    }
    await applyStartupRisk(db, inv);
  }
}

// 每分鐘小機率新創虧損 (risk 機率, 損失 5~20% 本金)
async function applyStartupRisk(db, inv) {
  const info = INVEST_TYPES[inv.type];
  if (!info?.risk || Math.random() >= info.risk) return;
  const lossPct = 0.05 + Math.random() * 0.15;
  const loss = Math.max(1, Math.floor(inv.amount * lossPct));
  await db.prepare('UPDATE wallets SET cash = MAX(cash - ?, 0) WHERE user_id = ?').bind(loss, inv.user_id).run();
  await db.prepare('UPDATE investments SET amount = amount - ? WHERE id = ?').bind(loss, inv.id).run();
  await logHourly(db, inv.user_id, 'investment_loss', -loss, `${info.label}虧損`);
}
