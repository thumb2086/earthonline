import { logTransaction } from './utils.js';

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
    await logTransaction(db, user.id, 'company_create', -50000, `創建公司「${name}」`);
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
    await logTransaction(db, user.id, 'upgrade', -cost, `升級${type === 'office' ? '辦公室' : type === 'equipment' ? '設備' : '品牌'}`);
    return { success: true };
  }

  if (path === '/api/company/ipo/start') {
    const { companyId, ipoPrice, totalShares } = await request.json();
    if (!companyId) return { error: '請選擇公司' };
    const company = await db.prepare('SELECT * FROM companies WHERE id = ? AND owner_id = ?').bind(companyId, user.id).first();
    if (!company) return { error: '公司不存在或非owner' };
    const existingIpo = await db.prepare('SELECT phase FROM ipo_state WHERE company_id = ?').bind(companyId).first();
    if (existingIpo && existingIpo.phase !== null) return { error: '已有IPO記錄' };
    if (!ipoPrice || ipoPrice < 10) return { error: 'IPO價格至少$10' };
    if (!totalShares || totalShares < 10000) return { error: '發行股數至少10,000' };

    await db.prepare('UPDATE companies SET total_shares = ?, share_price = ? WHERE id = ?').bind(totalShares, ipoPrice, companyId).run();
    await db.prepare('INSERT INTO ipo_state (company_id, phase, started_at) VALUES (?, ?, ?)').bind(companyId, 'ipo', Date.now()).run();
    await db.prepare('INSERT INTO stock_inventory (company_id, cash, stock_quantity) VALUES (?, 0, ?)').bind(companyId, totalShares).run();
    return { success: true, message: 'IPO已啟動，1小時後自動上市' };
  }

  if (path === '/api/company/ipo/list') {
    const url = new URL(request.url);
    const myOnly = url.searchParams.get('my') === '1';
    let query = `SELECT c.*, i.phase, COALESCE(inv.stock_quantity, 0) as inventory,
      (SELECT COALESCE(SUM(shares),0) FROM ipo_subscriptions WHERE company_id=c.id) as subscribed
      FROM companies c LEFT JOIN ipo_state i ON c.id=i.company_id LEFT JOIN stock_inventory inv ON c.id=inv.company_id`;
    if (myOnly) { query += ' WHERE c.owner_id = ?'; }
    else { query += ' WHERE c.owner_id = 0 OR c.owner_id = ?'; }
    query += ' ORDER BY c.id';
    const params = myOnly ? [user.id] : [user.id];
    const result = await db.prepare(query).bind(...params).all();
    return result.results;
  }

  return null;
}

async function getCompanyProfit(db, company) {
  const employees = await db.prepare('SELECT output, efficiency, morale FROM employees WHERE user_id = ? AND company_id = ?').bind(company.owner_id, company.id).all();
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

export async function processCompanyTick(db) {
  const companies = await db.prepare('SELECT * FROM companies').all();
  for (const c of companies.results) {
    const data = await getCompanyProfit(db, c);
    const profit = data.profit;
    if (profit > 0) {
      await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(profit, profit, c.owner_id).run();
    }
  }
}
