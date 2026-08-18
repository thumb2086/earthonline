import { notify } from './utils.js';

const LAUNCH_DURATION_MS = 72 * 3600 * 1000;

export async function getLaunchEventStatus(db) {
  const startRow = await db.prepare("SELECT value FROM game_meta WHERE key = 'launch_event_start'").first();
  const doubleRow = await db.prepare("SELECT value FROM game_meta WHERE key = 'launch_double_income'").first();
  const start = parseInt(startRow?.value || '0');
  const doubleActive = doubleRow?.value === '1';
  const now = Date.now();
  const active = start > 0 && (now - start) < LAUNCH_DURATION_MS;
  const endsAt = active ? start + LAUNCH_DURATION_MS : 0;
  return { active, doubleActive, start, endsAt, remainingMs: active ? endsAt - now : 0 };
}

export async function startLaunchEvent(db) {
  const now = Date.now();
  await db.prepare("INSERT OR REPLACE INTO game_meta (key, value) VALUES ('launch_event_start', ?)").bind(String(now)).run();
  await db.prepare("INSERT OR REPLACE INTO game_meta (key, value) VALUES ('launch_double_income', '1')").run();
  return { success: true, start: now, endsAt: now + LAUNCH_DURATION_MS };
}

export async function endLaunchEvent(db) {
  await db.prepare("INSERT OR REPLACE INTO game_meta (key, value) VALUES ('launch_double_income', '0')").run();
  return { success: true };
}

export async function isDoubleIncomeActive(db) {
  const row = await db.prepare("SELECT value FROM game_meta WHERE key = 'launch_double_income'").first();
  return row?.value === '1';
}

export async function giveNewbieGift(db, userId) {
  const startingCash = 5000;
  const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(userId).first();
  if (!wallet) return { error: '錢包不存在' };
  if (wallet.cash > startingCash) return { skip: true };

  await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?')
    .bind(startingCash, startingCash, userId).run();
  return { success: true, amount: startingCash };
}

export async function distributeLeaderboardRewards(db) {
  const RANKS = [
    { min: 1, max: 1, reward: 50000, label: '第 1 名' },
    { min: 2, max: 3, reward: 20000, label: '第 2-3 名' },
    { min: 4, max: 10, reward: 5000, label: '第 4-10 名' },
  ];

  const users = await db.prepare(`
    SELECT u.id, u.username, w.total_earned
    FROM users u
    JOIN wallets w ON u.id = w.user_id
    WHERE w.total_earned > 0
    ORDER BY w.total_earned DESC
    LIMIT 10
  `).all();

  const results = [];
  for (let i = 0; i < users.results.length; i++) {
    const rank = i + 1;
    const rankDef = RANKS.find(r => rank >= r.min && rank <= r.max);
    if (!rankDef) continue;

    await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?')
      .bind(rankDef.reward, rankDef.reward, users.results[i].id).run();
    await notify(db, users.results[i].id, 'launch_reward',
      `🏆 開服排行榜獎勵！你獲得 ${rankDef.label}，獎金 $${rankDef.reward.toLocaleString()}`);
    results.push({ rank, username: users.results[i].username, reward: rankDef.reward });
  }

  return { success: true, distributed: results.length, results };
}

export async function maybeDistributeDailyLeaderboard(db) {
  const eventStatus = await getLaunchEventStatus(db);
  if (!eventStatus.active) return false;

  const now = Date.now();
  const todayUTC = new Date(now).toISOString().slice(0, 10);
  const lastRow = await db.prepare("SELECT value FROM game_meta WHERE key = 'launch_last_lb_date'").first();
  if (lastRow?.value === todayUTC) return false;

  await db.prepare("INSERT OR REPLACE INTO game_meta (key, value) VALUES ('launch_last_lb_date', ?)").bind(todayUTC).run();
  return await distributeLeaderboardRewards(db);
}

export async function handleLaunchEvent(env, request, path, user) {
  const db = env.DB;
  const url = new URL(request.url);
  const method = request.method;

  if (path === '/api/launch/status') {
    return await getLaunchEventStatus(db);
  }

  if (path === '/api/launch/start' && method === 'POST') {
    if (user.role !== 'admin') return { error: '需要管理員權限' };
    return await startLaunchEvent(db);
  }

  if (path === '/api/launch/end' && method === 'POST') {
    if (user.role !== 'admin') return { error: '需要管理員權限' };
    return await endLaunchEvent(db);
  }

  if (path === '/api/launch/leaderboard-rewards' && method === 'POST') {
    if (user.role !== 'admin') return { error: '需要管理員權限' };
    return await distributeLeaderboardRewards(db);
  }

  if (path === '/api/launch/newbie-gift' && method === 'POST') {
    return await giveNewbieGift(db, user.id);
  }

  return null;
}
