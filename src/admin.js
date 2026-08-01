import { getUserSubscriptions } from './subscription.js';
import { getIncomePerMin, getLivingCostRate } from './income.js';
import { getCompanyProfit } from './company.js';

const UPGRADE_INCOME = {
  computer: [0, 5, 12, 30, 75, 180, 450, 1200],
  server: [0, 10, 25, 60, 150, 380, 950, 2400],
  ai_assistant: [0, 20, 50, 120, 300, 750, 1900, 4800],
};

function getBaseIncomePerMin(levels) {
  if (!levels) return 0;
  return 20 + (UPGRADE_INCOME.computer[levels.computer] || 0) +
    (UPGRADE_INCOME.server[levels.server] || 0) +
    (UPGRADE_INCOME.ai_assistant[levels.ai_assistant] || 0);
}

export async function handleAdmin(env, request, path, user) {
  if (user.role !== 'admin') return { error: '管理員專用' };

  const db = env.DB;

  if (path === '/api/admin/users') {
    const users = await db.prepare(`
      SELECT u.id, u.username, u.role, u.discord_username, u.created_at,
             w.cash, w.savings, w.bank, w.total_earned,
             (SELECT COUNT(*) FROM employees WHERE user_id = u.id) as employees,
             (SELECT COALESCE(SUM(quantity), 0) FROM stock_holdings WHERE user_id = u.id) as stocks,
             (SELECT COUNT(*) FROM companies WHERE owner_id = u.id) as companies,
             (SELECT COUNT(*) FROM departments d JOIN companies c ON c.id = d.company_id WHERE c.owner_id = u.id) as departments,
             (SELECT COALESCE(SUM(amount), 0) FROM investments WHERE user_id = u.id) as investments,
             (SELECT COALESCE(SUM(remaining), 0) FROM loans WHERE user_id = u.id AND status = 'active') as loans,
             (SELECT COUNT(*) FROM margin_positions WHERE user_id = u.id) as margin,
             (SELECT COUNT(*) FROM subscriptions WHERE user_id = u.id AND enabled = 1) as subscriptions,
             (SELECT computer FROM income_levels WHERE user_id = u.id) as computer,
             (SELECT server FROM income_levels WHERE user_id = u.id) as server,
             (SELECT ai_assistant FROM income_levels WHERE user_id = u.id) as ai_assistant
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      ORDER BY w.total_earned DESC
    `).all();
    const results = [];
    for (const u of users.results) {
      const base = getBaseIncomePerMin({ computer: u.computer, server: u.server, ai_assistant: u.ai_assistant });
      const subs = await getUserSubscriptions(db, u.id);
      const baseIncome = await getIncomePerMin(db, u.id, subs);
      const companies = await db.prepare('SELECT * FROM companies WHERE owner_id = ?').bind(u.id).all();
      let companyProfit = 0;
      for (const c of companies.results) {
        const p = await getCompanyProfit(db, c, subs);
        companyProfit += Math.max(0, p.profit);
      }
      const invInterest = await db.prepare('SELECT COALESCE(SUM(amount),0) as a FROM investments WHERE user_id = ?').bind(u.id).first();
      const invPerMin = Math.floor((invInterest?.a || 0) * 0.0002);
      const livingCost = Math.floor((baseIncome + companyProfit) * getLivingCostRate(baseIncome + companyProfit));
      const subCost = Object.entries(subs).filter(([k, v]) => v).reduce((s, [k]) => s + ({ home: 2, cloud: 5, insurance: 10, ai: 20, finance: 50, consultant: 100 }[k] || 0), 0);
      results.push({
        ...u,
        incomePerMin: base + companyProfit + invPerMin,
        detail: {
          baseIncome, companyProfit, invPerMin,
          expenses: { livingCost, subCost, employeeSalary: 0 },
          netPerMin: baseIncome + companyProfit + invPerMin - livingCost - subCost,
          subscriptions: subs,
        },
      });
    }
    return results;
  }

  if (path === '/api/admin/stats') {
    const totalUsers = await db.prepare('SELECT COUNT(*) as c FROM users').first();
    const totalCash = await db.prepare('SELECT COALESCE(SUM(cash), 0) as c FROM wallets').first();
    const totalSavings = await db.prepare('SELECT COALESCE(SUM(savings), 0) as c FROM wallets').first();
    const totalEarned = await db.prepare('SELECT COALESCE(SUM(total_earned), 0) as c FROM wallets').first();
    const totalEmployees = await db.prepare('SELECT COUNT(*) as c FROM employees').first();
    const totalCompanies = await db.prepare('SELECT COUNT(*) as c FROM companies').first();
    const totalTrades = await db.prepare('SELECT COUNT(*) as c FROM stock_trades').first();
    const totalMargin = await db.prepare('SELECT COUNT(*) as c FROM margin_positions').first();

    const reserve = await db.prepare('SELECT COALESCE(SUM(cash), 0) as cash, COALESCE(SUM(stock_quantity), 0) as stock_inventory FROM stock_inventory').first();
    const price = await db.prepare('SELECT share_price FROM companies WHERE id = 1').first();

    return {
      users: totalUsers?.c || 0,
      totalCash: totalCash?.c || 0,
      totalSavings: totalSavings?.c || 0,
      totalEarned: totalEarned?.c || 0,
      employees: totalEmployees?.c || 0,
      companies: totalCompanies?.c || 0,
      trades: totalTrades?.c || 0,
      marginPositions: totalMargin?.c || 0,
      systemReserve: reserve || { cash: 0, stock_inventory: 0 },
      stockPrice: price?.share_price || 100,
    };
  }

  if (path.startsWith('/api/admin/user/')) {
    const targetId = parseInt(path.split('/').pop());
    if (!targetId) return { error: '無效用戶' };

    const target = await db.prepare(`
      SELECT u.*, w.cash, w.savings, w.bank, w.total_earned
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      WHERE u.id = ?
    `).bind(targetId).first();
    if (!target) return { error: '用戶不存在' };

    const holdings = await db.prepare('SELECT company_id, quantity FROM stock_holdings WHERE user_id = ?').bind(targetId).all();
    const loans = await db.prepare('SELECT * FROM loans WHERE user_id = ? AND status = ?').bind(targetId, 'active').all();
    const investments = await db.prepare('SELECT * FROM investments WHERE user_id = ?').bind(targetId).all();
    const employees = await db.prepare('SELECT * FROM employees WHERE user_id = ?').bind(targetId).all();
    const positions = await db.prepare('SELECT * FROM margin_positions WHERE user_id = ?').bind(targetId).all();
    const companies = await db.prepare('SELECT * FROM companies WHERE owner_id = ?').bind(targetId).all();
    const depts = await db.prepare('SELECT d.* FROM departments d JOIN companies c ON c.id = d.company_id WHERE c.owner_id = ?').bind(targetId).all();
    const subs = await getUserSubscriptions(db, targetId);
    const incomeLevels = await db.prepare('SELECT * FROM income_levels WHERE user_id = ?').bind(targetId).first();

    return { ...target, holdings: holdings.results, loans: loans.results, investments: investments.results, employees: employees.results, marginPositions: positions.results, companies: companies.results, departments: depts.results, subscriptions: subs, incomeLevels };
  }

  return null;
}
