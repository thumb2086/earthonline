const INDUSTRY_MULT = { tech: 1.2, manufacturing: 1.0, finance: 1.3, service: 0.9 };
const UPGRADE_COSTS = {
  office: [0, 5000, 20000, 80000, 300000],
  equipment: [0, 10000, 40000, 150000, 500000],
  brand: [0, 8000, 30000, 100000, 400000],
};

export async function handleCompany(env, request, path, user) {
  const db = env.DB;
  if (path === '/api/company/create') {
    const { name, industry } = await request.json();
    const mult = INDUSTRY_MULT[industry];
    if (!mult) return { error: '無效產業' };
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < 50000) return { error: '需要 $50,000' };

    await db.prepare('UPDATE wallets SET cash = cash - 50000 WHERE user_id = ?').bind(user.id).run();
    const info = await db.prepare('INSERT INTO companies (owner_id, name, industry, total_shares, share_price, base_income, created_at) VALUES (?, ?, ?, 100000, 10, ?, ?)').bind(user.id, name, industry, 100, Date.now()).run();
    return { success: true, id: info.meta.last_row_id };
  }

  if (path === '/api/company/list') {
    const companies = await db.prepare('SELECT * FROM companies WHERE owner_id = ?').bind(user.id).all();
    return Promise.all(companies.results.map(c => getCompanyProfit(db, c)));
  }

  if (path.startsWith('/api/company/upgrade/')) {
    const companyId = parseInt(path.split('/').pop());
    const { type } = await request.json();
    const company = await db.prepare('SELECT * FROM companies WHERE id = ? AND owner_id = ?').bind(companyId, user.id).first();
    if (!company) return { error: '公司不存在' };

    const levelKey = type === 'office' ? 'office_level' : type === 'equipment' ? 'equipment_level' : 'brand_level';
    const currentLevel = company[levelKey];
    const costs = UPGRADE_COSTS[type];
    if (!costs || currentLevel >= costs.length - 1) return { error: '已達最高' };

    const cost = costs[currentLevel + 1];
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < cost) return { error: '餘額不足' };

    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(cost, user.id).run();
    await db.prepare(`UPDATE companies SET ${levelKey} = ${levelKey} + 1 WHERE id = ?`).bind(companyId).run();
    return { success: true };
  }
  return null;
}

async function getCompanyProfit(db, company) {
  const employees = await db.prepare('SELECT output, efficiency, morale FROM employees WHERE user_id = ?').bind(company.owner_id).all();
  const totalOutput = employees.results.reduce((s, e) => s + Math.floor(e.output * e.efficiency * (e.morale / 100)), 0);
  const mult = INDUSTRY_MULT[company.industry] || 1.0;
  const equipBonus = 1 + 0.1 * (company.equipment_level - 1);
  const brandBonus = 1 + 0.05 * (company.brand_level - 1);
  const marketFactor = 0.8 + Math.random() * 0.4;
  const income = Math.floor(company.base_income * mult * (totalOutput || 1) * equipBonus * brandBonus * marketFactor);
  const rent = Math.floor(10 * Math.pow(0.95, company.office_level - 1));
  const costs = rent + 5 + 3;
  return { ...company, income, costs, profit: income - costs };
}
