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

// 解析 ?exclude=1,5,7 (用戶id) 或 ?exclude=名字1,名字2
async function resolveExclude(db, request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get('exclude');
  if (!raw) return [];
  const ids = [];
  for (const part of raw.split(',').map(s => s.trim()).filter(Boolean)) {
    if (/^\d+$/.test(part)) {
      ids.push(parseInt(part));
    } else {
      const u = await db.prepare('SELECT id FROM users WHERE username = ?').bind(part).first();
      if (u) ids.push(u.id);
    }
  }
  return ids;
}

function inClause(ids, prefix) {
  if (ids.length === 0) return '';
  return ` AND ${prefix} NOT IN (${ids.join(',')})`;
}

export async function handleAdmin(env, request, path, user) {
  if (user.role !== 'admin') return { error: '管理員專用' };

  const db = env.DB;

  if (path === '/api/admin/users') {
    const excludeIds = await resolveExclude(db, request);
    const excl = inClause(excludeIds, 'u.id');
    const users = await db.prepare(`
      SELECT u.id, u.username, u.role, u.discord_username, u.created_at,
             w.cash, w.savings, w.bank, w.total_earned,
             (SELECT COUNT(*) FROM employees WHERE user_id = u.id) as employees,
             (SELECT COALESCE(SUM(quantity), 0) FROM stock_holdings WHERE user_id = u.id) as stocks,
             (SELECT COUNT(*) FROM companies WHERE owner_id = u.id) as companies,
             (SELECT COUNT(*) FROM departments d JOIN companies c ON c.id = d.company_id WHERE c.owner_id = u.id) as departments,
             (SELECT COALESCE(SUM(amount), 0) FROM investments WHERE user_id = u.id AND type != 'deposit') as investments,
             (SELECT COALESCE(SUM(amount), 0) FROM investments WHERE user_id = u.id AND type = 'deposit') as deposits,
             (SELECT COALESCE(SUM(remaining), 0) FROM loans WHERE user_id = u.id AND status = 'active') as loans,
             (SELECT COUNT(*) FROM margin_positions WHERE user_id = u.id) as margin,
             (SELECT COUNT(*) FROM subscriptions WHERE user_id = u.id AND enabled = 1) as subscriptions,
             (SELECT computer FROM income_levels WHERE user_id = u.id) as computer,
             (SELECT server FROM income_levels WHERE user_id = u.id) as server,
             (SELECT ai_assistant FROM income_levels WHERE user_id = u.id) as ai_assistant
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      WHERE 1=1${excl}
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
    const excludeIds = await resolveExclude(db, request);
    const excl = inClause(excludeIds, 'user_id');
    const totalUsers = await db.prepare('SELECT COUNT(*) as c FROM users' + (excludeIds.length ? ` WHERE id NOT IN (${excludeIds.join(',')})` : '')).first();
    const totalCash = await db.prepare('SELECT COALESCE(SUM(cash), 0) as c FROM wallets WHERE 1=1' + excl).first();
    const totalSavings = await db.prepare('SELECT COALESCE(SUM(savings), 0) as c FROM wallets WHERE 1=1' + excl).first();
    const totalEarned = await db.prepare('SELECT COALESCE(SUM(total_earned), 0) as c FROM wallets WHERE 1=1' + excl).first();
    const totalEmployees = await db.prepare('SELECT COUNT(*) as c FROM employees WHERE 1=1' + excl).first();
    const totalCompanies = await db.prepare('SELECT COUNT(*) as c FROM companies WHERE 1=1' + excl.replace('user_id', 'owner_id')).first();
    const totalTrades = await db.prepare('SELECT COUNT(*) as c FROM stock_trades WHERE 1=1' + excl).first();
    const totalMargin = await db.prepare('SELECT COUNT(*) as c FROM margin_positions WHERE 1=1' + excl).first();

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

  if (path === '/api/admin/stocks') {
    const excludeIds = await resolveExclude(db, request);
    const excl = inClause(excludeIds, 'u.id');
    const companies = await db.prepare(`
      SELECT c.id, c.name, c.total_shares, COALESCE(inv.stock_quantity, 0) as system_inventory
      FROM companies c
      LEFT JOIN stock_inventory inv ON inv.company_id = c.id
      ORDER BY c.id
    `).all();
    const result = [];
    for (const c of companies.results) {
      const holders = await db.prepare(`
        SELECT u.username, h.quantity
        FROM stock_holdings h
        JOIN users u ON u.id = h.user_id
        WHERE h.company_id = ?${excl}
        ORDER BY h.quantity DESC
      `).bind(c.id).all();
      result.push({ ...c, holders: holders.results, held: holders.results.reduce((s, x) => s + x.quantity, 0) });
    }
    return result;
  }

  if (path === '/api/admin/ipo') {
    const url = new URL(request.url);
    const companyId = url.searchParams.get('companyId');
    const excludeIds = await resolveExclude(db, request);
    let query = `
      SELECT s.id, s.shares, s.total_cost, s.subscribed_at, c.name as company_name, c.share_price, i.phase, u.username
      FROM ipo_subscriptions s
      JOIN companies c ON c.id = s.company_id
      LEFT JOIN ipo_state i ON i.company_id = s.company_id
      JOIN users u ON u.id = s.user_id
    `;
    const params = [];
    const conds = [];
    if (companyId) conds.push('s.company_id = ?');
    if (excludeIds.length > 0) conds.push(`s.user_id NOT IN (${excludeIds.join(',')})`);
    if (conds.length > 0) query += ' WHERE ' + conds.join(' AND ');
    if (companyId) params.push(parseInt(companyId));
    query += ' ORDER BY s.subscribed_at DESC';
    const rows = await db.prepare(query).bind(...params).all();
    return rows.results;
  }

  if (path === '/api/admin/trades') {
    const excludeIds = await resolveExclude(db, request);
    const excl = excludeIds.length > 0 ? ` AND t.user_id NOT IN (${excludeIds.join(',')})` : '';
    const trades = await db.prepare(`
      SELECT t.id, t.company_id, c.name as company_name, t.user_id, u.username, t.type, t.price, t.quantity, t.traded_at
      FROM stock_trades t
      JOIN users u ON u.id = t.user_id
      JOIN companies c ON c.id = t.company_id
      WHERE t.user_id > 0${excl}
      ORDER BY t.traded_at DESC
      LIMIT 300
    `).all();
    // 每人統計
    const stats = {};
    for (const tr of trades.results) {
      if (!stats[tr.username]) stats[tr.username] = { username: tr.username, user_id: tr.user_id, buyCount: 0, sellCount: 0, buyVol: 0, sellVol: 0, spent: 0, revenue: 0 };
      const s = stats[tr.username];
      if (tr.type === 'buy') { s.buyCount++; s.buyVol += tr.quantity; s.spent += tr.price * tr.quantity; }
      else { s.sellCount++; s.sellVol += tr.quantity; s.revenue += tr.price * tr.quantity; }
    }
    return { trades: trades.results, stats: Object.values(stats).sort((a, b) => (b.buyCount + b.sellCount) - (a.buyCount + a.sellCount)) };
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
