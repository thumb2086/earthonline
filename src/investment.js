const INVEST_TYPES = {
  deposit: { label: '定存', rateMin: 0.001, rateMax: 0.001, unlockEarned: 0 },
  bond: { label: '債券', rateMin: 0.003, rateMax: 0.003, unlockEarned: 1000 },
  index_fund: { label: '指數基金', rateMin: 0.005, rateMax: 0.01, unlockEarned: 5000 },
  real_estate: { label: '房地產', rateMin: 0.008, rateMax: 0.008, unlockEarned: 50000 },
  startup: { label: '新創投資', rateMin: 0.02, rateMax: 0.05, unlockEarned: 200000 },
};

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
    return (await db.prepare('SELECT * FROM investments WHERE user_id = ?').bind(user.id).all()).results;
  }

  if (path === '/api/investment/invest') {
    const { type, amount } = await request.json();
    const info = INVEST_TYPES[type];
    if (!info) return { error: '無效投資類型' };
    const wallet = await db.prepare('SELECT cash, total_earned FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < amount) return { error: '餘額不足' };
    if (wallet.total_earned < info.unlockEarned) return { error: '尚未解鎖' };

    if (type === 'deposit') {
      await db.prepare('UPDATE wallets SET cash = cash - ?, bank = bank + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(amount, amount, amount, user.id).run();
    } else {
      await db.prepare('UPDATE wallets SET cash = cash - ?, total_earned = total_earned + ? WHERE user_id = ?').bind(amount, amount, user.id).run();
    }
    await db.prepare('INSERT INTO investments (user_id, type, amount, started_at) VALUES (?, ?, ?, ?)').bind(user.id, type, amount, Date.now()).run();
    return { success: true };
  }

  if (path === '/api/investment/withdraw') {
    const { investmentId } = await request.json();
    const inv = await db.prepare('SELECT id, type, amount FROM investments WHERE id = ? AND user_id = ?').bind(investmentId, user.id).first();
    if (!inv) return { error: '投資不存在' };

    if (inv.type === 'deposit') {
      const wallet = await db.prepare('SELECT bank FROM wallets WHERE user_id = ?').bind(user.id).first();
      if (!wallet || wallet.bank < inv.amount) return { error: '定存不足' };
      await db.prepare('UPDATE wallets SET bank = bank - ?, cash = cash + ? WHERE user_id = ?').bind(inv.amount, inv.amount, user.id).run();
    } else {
      const penalty = Math.floor(inv.amount * 0.1);
      const refund = inv.amount - penalty;
      await db.prepare('UPDATE wallets SET cash = cash + ? WHERE user_id = ?').bind(refund, user.id).run();
    }
    await db.prepare('DELETE FROM investments WHERE id = ?').bind(inv.id).run();
    return { success: true, refund: inv.type === 'deposit' ? inv.amount : Math.floor(inv.amount * 0.9) };
  }
  return null;
}

export async function processInvestmentTick(db) {
  const investments = await db.prepare('SELECT id, user_id, type, amount FROM investments').all();
  for (const inv of investments.results) {
    const info = INVEST_TYPES[inv.type];
    if (!info) continue;
    const rate = info.rateMin + Math.random() * (info.rateMax - info.rateMin);
    const payout = Math.floor(inv.amount * rate);
    if (payout > 0) {
      await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(payout, payout, inv.user_id).run();
    }
  }
}
