const REWARDS = [
  { day: 1, type: 'cash', amount: 500, label: '$500 現金' },
  { day: 2, type: 'cash', amount: 1000, label: '$1,000 現金' },
  { day: 3, type: 'cash', amount: 1500, label: '$1,500 現金' },
  { day: 4, type: 'cash', amount: 2000, label: '$2,000 現金' },
  { day: 5, type: 'cash', amount: 3000, label: '$3,000 現金' },
  { day: 6, type: 'cash', amount: 5000, label: '$5,000 現金' },
  { day: 7, type: 'cash', amount: 10000, label: '$10,000 現金 + 隨機寶箱' },
];

const STREAK_BONUS = {
  7: 5000,
  14: 15000,
  30: 50000,
};

function getDayStart(ts) {
  const d = new Date(ts);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function isNextDay(prevClaimAt, now) {
  const prevDay = getDayStart(prevClaimAt);
  const nowDay = getDayStart(now);
  return nowDay - prevDay === 86400000;
}

function isSameDay(prevClaimAt, now) {
  return getDayStart(prevClaimAt) === getDayStart(now);
}

export async function getDailyLoginStatus(db, userId) {
  const row = await db.prepare('SELECT * FROM daily_logins WHERE user_id = ?').bind(userId).first();
  if (!row) {
    return { streak: 0, totalClaims: 0, todayClaimed: false, nextReward: REWARDS[0] };
  }
  const now = Date.now();
  const todayClaimed = isSameDay(row.last_claim_at, now);
  let streak = row.current_streak;
  if (!todayClaimed && !isNextDay(row.last_claim_at, now) && row.last_claim_at > 0) {
    streak = 0;
  }
  const nextDay = Math.min((streak % 7) + 1, 7);
  const nextReward = REWARDS[nextDay - 1];
  return { streak, totalClaims: row.total_claims, todayClaimed, nextReward };
}

export async function claimDailyLogin(db, userId, notify) {
  const now = Date.now();
  const row = await db.prepare('SELECT * FROM daily_logins WHERE user_id = ?').bind(userId).first();

  if (row && isSameDay(row.last_claim_at, now)) {
    return { error: '今天已領取過了' };
  }

  let streak = 0;
  let totalClaims = 0;
  if (row) {
    if (row.last_claim_at === 0 || isNextDay(row.last_claim_at, now)) {
      streak = row.current_streak + 1;
    } else {
      streak = 1;
    }
    totalClaims = row.total_claims + 1;
  } else {
    streak = 1;
    totalClaims = 1;
  }

  const dayIndex = ((streak - 1) % 7);
  const reward = REWARDS[dayIndex];

  await db.prepare(`
    INSERT INTO daily_logins (user_id, last_claim_at, current_streak, total_claims)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      last_claim_at = excluded.last_claim_at,
      current_streak = excluded.current_streak,
      total_claims = excluded.total_claims
  `).bind(userId, now, streak, totalClaims).run();

  if (reward.type === 'cash') {
    await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?')
      .bind(reward.amount, reward.amount, userId).run();
  }

  const messages = [`🎁 每日登入第 ${dayIndex + 1} 天：${reward.label}`];

  const streakBonus = STREAK_BONUS[streak];
  if (streakBonus) {
    await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?')
      .bind(streakBonus, streakBonus, userId).run();
    messages.push(`🔥 連續 ${streak} 天額外獎勵 $${streakBonus.toLocaleString()}`);
  }

  if (notify) {
    for (const msg of messages) {
      await notify(userId, 'daily_login', msg);
    }
  }

  return {
    success: true,
    day: dayIndex + 1,
    streak,
    totalClaims,
    reward: reward.label,
    bonus: streakBonus || 0,
    messages,
  };
}

export { REWARDS, STREAK_BONUS };
