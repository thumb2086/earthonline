import { logHourly } from './utils.js';
import { isDoubleIncomeActive } from './launch_event.js';

const BASE_INCOME = 20;

const UPGRADE_COSTS = {
  computer: [0, 100, 500, 2000, 10000, 50000, 250000, 1000000],
  server: [0, 200, 1000, 5000, 20000, 100000, 500000, 2000000],
  ai_assistant: [0, 500, 2500, 10000, 50000, 200000, 1000000, 5000000],
};

const UPGRADE_INCOME = {
  computer: [0, 5, 12, 30, 75, 180, 450, 1200],
  server: [0, 10, 25, 60, 150, 380, 950, 2400],
  ai_assistant: [0, 20, 50, 120, 300, 750, 1900, 4800],
};

export async function getIncomePerMin(db, userId, subs) {
  const levels = await db.prepare('SELECT computer, server, ai_assistant FROM income_levels WHERE user_id = ?').bind(userId).first();
  if (!levels) return BASE_INCOME;
  let total = BASE_INCOME;
  total += UPGRADE_INCOME.computer[levels.computer] || 0;
  total += UPGRADE_INCOME.server[levels.server] || 0;
  total += UPGRADE_INCOME.ai_assistant[levels.ai_assistant] || 0;
  if (subs?.home) total = Math.floor(total * 1.1);
  if (await isDoubleIncomeActive(db)) total = Math.floor(total * 2);
  return total;
}

export function getLivingCostRate(incomePerMin) {
  if (incomePerMin >= 10000) return 0.25;
  if (incomePerMin >= 1000) return 0.20;
  if (incomePerMin >= 100) return 0.15;
  return 0.10;
}

export async function handleIncome(env, request, path, user) {
  const db = env.DB;
  if (path === '/api/income/info') {
    const income = await getIncomePerMin(db, user.id);
    const levels = await db.prepare('SELECT computer, server, ai_assistant FROM income_levels WHERE user_id = ?').bind(user.id).first();
    const upgrades = {};
    for (const item of ['computer', 'server', 'ai_assistant']) {
      const currentLevel = levels?.[item] || 1;
      const nextLevel = currentLevel + 1;
      if (nextLevel < UPGRADE_COSTS[item].length) {
        const currentIncome = UPGRADE_INCOME[item][currentLevel] || 0;
        const nextIncome = UPGRADE_INCOME[item][nextLevel] || 0;
        upgrades[item] = { cost: UPGRADE_COSTS[item][nextLevel], nextLevel, gain: nextIncome - currentIncome };
      } else {
        upgrades[item] = null;
      }
    }
    return { income, levels, upgrades };
  }
  if (path === '/api/income/upgrade') {
    const body = await request.json();
    if (!['computer', 'server', 'ai_assistant'].includes(body.item)) return { error: '無效項目' };

    const levels = await db.prepare(`SELECT ${body.item} FROM income_levels WHERE user_id = ?`).bind(user.id).first();
    if (!levels) return { error: 'Not found' };
    const currentLevel = levels[body.item];
    const nextLevel = currentLevel + 1;
    if (nextLevel >= UPGRADE_COSTS[body.item].length) return { error: '已達最高等級' };
    const cost = UPGRADE_COSTS[body.item][nextLevel];

    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < cost) return { error: '餘額不足' };

    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(cost, user.id).run();
    await db.prepare(`UPDATE income_levels SET ${body.item} = ? WHERE user_id = ?`).bind(nextLevel, user.id).run();

    const income = await getIncomePerMin(db, user.id);
    return { success: true, item: body.item, level: nextLevel, income };
  }
  return null;
}

export async function processIncomeTick(db, logger) {
  let boost = 1;
  try {
    const boostRow = await db.prepare("SELECT value FROM community_state WHERE key = 'voice_boost'").first();
    if (boostRow?.value === '1') boost = 1.2;
  } catch (e) {}
  const users = await db.prepare('SELECT id FROM users').all();
  if (users.results.length === 0) return;

  // 1 次 batch 預載全部玩家資料, 迴圈內零查詢
  const [levelsRes, subsRes, walletsRes] = await db.batch([
    db.prepare('SELECT user_id, computer, server, ai_assistant FROM income_levels'),
    db.prepare('SELECT user_id, key, enabled FROM subscriptions'),
    db.prepare('SELECT user_id, cash FROM wallets'),
  ]);
  const levels = {};
  for (const r of levelsRes.results) levels[r.user_id] = r;
  const subsMap = {};
  for (const r of subsRes.results) { (subsMap[r.user_id] ||= {})[r.key] = !!r.enabled; }
  const walletCash = {};
  for (const r of walletsRes.results) walletCash[r.user_id] = r.cash;

  const stmts = [];
  const logs = [];
  for (const user of users.results) {
    try {
      const sub = subsMap[user.id] || {};
      const lv = levels[user.id];
      let income = BASE_INCOME;
      if (lv) {
        income += (UPGRADE_INCOME.computer[lv.computer] || 0) + (UPGRADE_INCOME.server[lv.server] || 0) + (UPGRADE_INCOME.ai_assistant[lv.ai_assistant] || 0);
        if (sub.home) income = Math.floor(income * 1.1);
      }
      income = Math.floor(income * boost);
      let cash = walletCash[user.id];
      if (cash === undefined) continue;
      if (income > 0) {
        stmts.push(db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(income, income, user.id));
        logs.push([user.id, 'income', income, '基礎收入']);
        cash += income;
      }

      // 生活費階梯（保險：現金最低保留 $200）— 用加完收入後的現金計算
      const rate = getLivingCostRate(income);
      const livingCost = Math.floor(income * rate);
      if (livingCost > 0 && cash > 0) {
        const protectFloor = sub.insurance ? 200 : 0;
        const deductable = Math.max(0, cash - protectFloor);
        const actual = Math.min(livingCost, deductable);
        if (actual > 0) {
          stmts.push(db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(actual, user.id));
          logs.push([user.id, 'living_cost', -actual, '生活費']);
        }
      }
    } catch (e) {}
  }
  if (stmts.length > 0) await db.batch(stmts);
  if (logger) {
    for (const [u, t, a, d] of logs) logger.log(u, t, a, d);
  } else {
    for (const [u, t, a, d] of logs) await logHourly(db, u, t, a, d);
  }
}
