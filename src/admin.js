export async function handleAdmin(env, request, path, user) {
  if (user.role !== 'admin') return { error: '管理員專用' };

  const db = env.DB;

  if (path === '/api/admin/users') {
    const users = await db.prepare(`
      SELECT u.id, u.username, u.role, u.discord_username, u.created_at,
             w.cash, w.savings, w.bank, w.total_earned,
             (SELECT COUNT(*) FROM employees WHERE user_id = u.id) as employees,
             (SELECT COALESCE(SUM(quantity), 0) FROM stock_holdings WHERE user_id = u.id) as stocks
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      ORDER BY w.total_earned DESC
    `).all();
    return users.results;
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

    const reserve = await db.prepare('SELECT * FROM system_reserve WHERE id = 1').first();
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
