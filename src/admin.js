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

async function getUserCompanyProfit(db, userId) {
  const companies = await db.prepare('SELECT * FROM companies WHERE owner_id = ?').bind(userId).all();
  let total = 0;
  for (const c of companies.results) {
    const employees = await db.prepare('SELECT output, efficiency, morale FROM employees WHERE user_id = ? AND company_id = ?').bind(userId, c.id).all();
    const totalOutput = employees.results.reduce((s, e) => s + Math.floor(e.output * e.efficiency * (e.morale / 100)), 0);
    const mult = { tech: 1.2, manufacturing: 1.0, finance: 1.3, service: 0.9 }[c.industry] || 1.0;
    const equipBonus = 1 + 0.1 * (c.equipment_level - 1);
    const brandBonus = 1 + 0.05 * (c.brand_level - 1);
    const income = Math.floor(c.base_income * mult * (totalOutput || 1) * equipBonus * brandBonus);
    total += Math.max(0, income - 18);
  }
  return total;
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
      const companyProfit = await getUserCompanyProfit(db, u.id);
      results.push({ ...u, incomePerMin: base + companyProfit });
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

    return { ...target, holdings: holdings.results, loans: loans.results, investments: investments.results, employees: employees.results, marginPositions: positions.results };
  }

  return null;
}
