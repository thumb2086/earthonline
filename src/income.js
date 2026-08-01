import { logHourly } from './utils.js';
import { getUserSubscriptions } from './subscription.js';

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

export async function processIncomeTick(db) {
  const users = await db.prepare('SELECT id FROM users').all();
  for (const user of users.results) {
    const subs = await getUserSubscriptions(db, user.id);
    const income = await getIncomePerMin(db, user.id, subs);
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet) continue;
    if (income > 0) {
      await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(income, income, user.id).run();
      await logHourly(db, user.id, 'income', income, '基礎收入');
    }

    // 生活費階梯（含保險保護：現金不低於30%）
    const rate = getLivingCostRate(income);
    const livingCost = Math.floor(income * rate);
    if (livingCost > 0 && wallet.cash > 0) {
      let cash = wallet.cash;
      const protectFloor = subs.insurance ? Math.floor((wallet.cash + income) * 0.3) : 0;
      const deductable = Math.max(0, cash - protectFloor);
      const actual = Math.min(livingCost, deductable);
      if (actual > 0) {
        await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(actual, user.id).run();
        await logHourly(db, user.id, 'living_cost', -actual, '生活費');
      }
    }
  }
}
