import { logTransaction, logHourly } from './utils.js';
import { getUserSubscriptions } from './subscription.js';

export const INDUSTRY_MULT = { tech: 1.2, manufacturing: 1.0, finance: 1.3, service: 0.9 };
const UPGRADE_COSTS = {
  office: [0, 5000, 20000, 80000, 300000, 1000000, 3000000],
  equipment: [0, 10000, 40000, 150000, 500000, 1500000, 4000000],
  brand: [0, 8000, 30000, 100000, 400000, 1200000, 3500000],
};

// 部門類型: 職位加成 (per 部門等級 +10% 效率)
const DEPARTMENTS = {
  tech: { rnd: { label: '研發部', boost: ['engineer', 'expert'] }, datacenter: { label: '數據中心', boost: ['engineer', 'expert'] }, marketing: { label: '行銷部', boost: [] }, support: { label: '客服部', boost: [] } },
  manufacturing: { production: { label: '生產線', boost: ['intern', 'specialist'] }, qa: { label: '品管部', boost: [] }, logistics: { label: '物流部', boost: ['specialist', 'engineer'] }, rnd: { label: '研發部', boost: ['engineer', 'expert'] } },
  finance: { trading: { label: '交易室', boost: ['manager', 'expert'] }, risk: { label: '風控部', boost: ['manager', 'expert'] }, asset: { label: '資產部', boost: [] }, legal: { label: '法務部', boost: [] } },
  service: { store: { label: '門市', boost: ['intern', 'specialist'] }, support: { label: '客服部', boost: [] }, marketing: { label: '行銷部', boost: [] }, logistics: { label: '物流部', boost: ['specialist', 'engineer'] } },
};
const DEPT_COSTS = [0, 100000, 500000, 2000000, 8000000, 30000000, 100000000];
const DEPT_UPGRADE_COSTS = [0, 50000, 200000, 800000, 3000000, 12000000];

export async function handleCompany(env, request, path, user) {
  const db = env.DB;
  if (path === '/api/company/create') {
    const { name, industry } = await request.json();
    const mult = INDUSTRY_MULT[industry];
    if (!mult) return { error: '無效產業' };
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < 200000) return { error: '需要 $200,000' };

    await db.prepare('UPDATE wallets SET cash = cash - 200000 WHERE user_id = ?').bind(user.id).run();
    const info = await db.prepare('INSERT INTO companies (owner_id, name, industry, total_shares, share_price, base_income, created_at) VALUES (?, ?, ?, 100000, 10, ?, ?)').bind(user.id, name, industry, 40, Date.now()).run();
    await logTransaction(db, user.id, 'company_create', -200000, `創建公司「${name}」`);
    return { success: true, id: info.meta.last_row_id };
  }

  if (path === '/api/company/list') {
    const companies = await db.prepare('SELECT * FROM companies WHERE owner_id = ?').bind(user.id).all();
    const subs = await getUserSubscriptions(db, user.id);
    return Promise.all(companies.results.map(async c => {
      const profit = await getCompanyProfit(db, c, subs);
      const depts = await db.prepare('SELECT * FROM departments WHERE company_id = ? ORDER BY id').bind(c.id).all();
      return { ...profit, departments: depts.results };
    }));
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

  // ===== 部門系統 =====
  if (path === '/api/company/departments') {
    const url = new URL(request.url);
    const companyId = parseInt(url.searchParams.get('companyId') || '0');
    if (!companyId) return { error: '請選擇公司' };
    const company = await db.prepare('SELECT * FROM companies WHERE id = ? AND owner_id = ?').bind(companyId, user.id).first();
    if (!company) return { error: '公司不存在' };
    const depts = await db.prepare('SELECT * FROM departments WHERE company_id = ? ORDER BY id').bind(companyId).all();
    return { company, departments: depts.results, available: DEPARTMENTS[company.industry] || {} };
  }

  if (path === '/api/company/department/create') {
    const { companyId, type } = await request.json();
    const company = await db.prepare('SELECT * FROM companies WHERE id = ? AND owner_id = ?').bind(companyId, user.id).first();
    if (!company) return { error: '公司不存在' };
    const deptDefs = DEPARTMENTS[company.industry];
    if (!deptDefs || !deptDefs[type]) return { error: '無效部門類型' };

    const deptCount = await db.prepare('SELECT COUNT(*) as cnt FROM departments WHERE company_id = ?').bind(companyId).first();
    const maxDepts = company.office_level + 1;
    if ((deptCount?.cnt || 0) >= maxDepts) return { error: `部門上限 ${maxDepts} 個（升級辦公室增加）` };

    const existing = await db.prepare('SELECT id FROM departments WHERE company_id = ? AND type = ?').bind(companyId, type).first();
    if (existing) return { error: '同類型部門已存在' };

    const cost = DEPT_COSTS[(deptCount?.cnt || 0) + 1] || DEPT_COSTS[6];
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < cost) return { error: `需要 $${cost.toLocaleString()}` };

    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(cost, user.id).run();
    const info = await db.prepare('INSERT INTO departments (company_id, type, level, created_at) VALUES (?, ?, 1, ?)').bind(companyId, type, Date.now()).run();
    await logTransaction(db, user.id, 'upgrade', -cost, `開設${deptDefs[type].label}`);
    return { success: true, id: info.meta.last_row_id };
  }

  if (path.startsWith('/api/company/department/upgrade/')) {
    const deptId = parseInt(path.split('/').pop());
    const dept = await db.prepare('SELECT d.*, c.owner_id FROM departments d JOIN companies c ON c.id = d.company_id WHERE d.id = ?').bind(deptId).first();
    if (!dept || dept.owner_id !== user.id) return { error: '部門不存在' };
    const cost = DEPT_UPGRADE_COSTS[dept.level] || 0;
    if (!cost) return { error: '已達最高等級' };
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < cost) return { error: '餘額不足' };
    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(cost, user.id).run();
    await db.prepare('UPDATE departments SET level = level + 1 WHERE id = ?').bind(deptId).run();
    await logTransaction(db, user.id, 'upgrade', -cost, '部門升級');
    return { success: true };
  }

  if (path === '/api/company/ipo/start') {
    const { companyId, ipoPrice, totalShares, ipoMinutes = 60, founderRatio = 0.6 } = await request.json();
    if (!companyId) return { error: '請選擇公司' };
    const company = await db.prepare('SELECT * FROM companies WHERE id = ? AND owner_id = ?').bind(companyId, user.id).first();
    if (!company) return { error: '公司不存在或非owner' };
    const existingIpo = await db.prepare('SELECT phase FROM ipo_state WHERE company_id = ?').bind(companyId).first();
    if (existingIpo && existingIpo.phase !== null) return { error: '已有IPO記錄' };
    if (!ipoPrice || ipoPrice < 10) return { error: 'IPO價格至少$10' };
    if (!totalShares || totalShares < 100 || totalShares > 5000) return { error: '發行股數需 100~5,000' };
    const minutes = Math.max(5, Math.min(1440, parseInt(ipoMinutes) || 60));
    // 創辦人保留比例 (IPO發行比例 = 1 - founderRatio)
    const founderKeep = Math.min(Math.max(parseFloat(founderRatio) || 0.6, 0), 0.9);

    await db.prepare('UPDATE companies SET total_shares = ?, share_price = ? WHERE id = ?').bind(totalShares, ipoPrice, companyId).run();
    const ipoShares = Math.floor(totalShares * (1 - founderKeep));
    await db.prepare('INSERT INTO ipo_state (company_id, phase, started_at, duration_minutes) VALUES (?, ?, ?, ?)').bind(companyId, 'ipo', Date.now(), minutes).run();
    await db.prepare('INSERT INTO stock_inventory (company_id, cash, stock_quantity) VALUES (?, 0, ?)').bind(companyId, ipoShares).run();
    // 創辦人持有剩餘股份
    const founderShares = totalShares - ipoShares;
    const founderHolding = await db.prepare('SELECT quantity FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(company.owner_id, companyId).first();
    if (founderHolding) {
      await db.prepare('UPDATE stock_holdings SET quantity = quantity + ? WHERE user_id = ? AND company_id = ?').bind(founderShares, company.owner_id, companyId).run();
    } else {
      await db.prepare('INSERT INTO stock_holdings (user_id, company_id, quantity) VALUES (?, ?, ?)').bind(company.owner_id, companyId, founderShares).run();
    }
    await logTransaction(db, company.owner_id, 'ipo_revenue', 0, `創辦人持有 ${founderShares.toLocaleString()} 股 (IPO發行 ${ipoShares.toLocaleString()} 股)`);
    return { success: true, message: `IPO已啟動，${minutes}分鐘後自動上市（創辦人保留 ${(founderKeep*100).toFixed(0)}%）` };
  }

  if (path === '/api/company/ipo/list') {
    const url = new URL(request.url);
    const myOnly = url.searchParams.get('my') === '1';
    let query = `SELECT c.*, i.phase, COALESCE(inv.stock_quantity, 0) as inventory,
      (SELECT COALESCE(SUM(shares),0) FROM ipo_subscriptions WHERE company_id=c.id) as subscribed
      FROM companies c LEFT JOIN ipo_state i ON c.id=i.company_id LEFT JOIN stock_inventory inv ON c.id=inv.company_id`;
    if (myOnly) {
      query += ' WHERE c.owner_id = ?';
    } else {
      // IPO/已上市是公開的, 所有玩家都看得到
      query += ' WHERE i.phase IS NOT NULL';
    }
    query += ' ORDER BY c.id';
    const params = myOnly ? [user.id] : [];
    const result = await db.prepare(query).bind(...params).all();
    return result.results;
  }

  // ===== 買下公司: 掛牌出售 / 收購市場 / 收購 =====
  if (path === '/api/company/sell/offer') {
    const { companyId, price } = await request.json();
    const company = await db.prepare('SELECT * FROM companies WHERE id = ? AND owner_id = ?').bind(companyId, user.id).first();
    if (!company) return { error: '公司不存在' };
    const ipo = await db.prepare("SELECT phase FROM ipo_state WHERE company_id = ?").bind(companyId).first();
    if (ipo && ipo.phase === 'ipo') return { error: 'IPO進行中無法出售' };

    const p = parseInt(price) || 0;
    if (p <= 0) {
      await db.prepare('UPDATE companies SET sell_price = 0 WHERE id = ?').bind(companyId).run();
      await logTransaction(db, user.id, 'company_cancel_sell', 0, `取消出售「${company.name}」`);
      return { success: true, selling: false };
    }
    if (p < 10000) return { error: '售價至少 $10,000' };
    await db.prepare('UPDATE companies SET sell_price = ? WHERE id = ?').bind(p, companyId).run();
    await logTransaction(db, user.id, 'company_offer', 0, `掛牌出售「${company.name}」 $${p.toLocaleString()}`);
    return { success: true, selling: true, price: p };
  }

  if (path === '/api/company/market') {
    const market = await db.prepare(`
      SELECT c.*, u.username as owner_name FROM companies c
      LEFT JOIN users u ON u.id = c.owner_id
      WHERE c.sell_price > 0 ORDER BY c.sell_price ASC
    `).all();
    const subs = await getUserSubscriptions(db, user.id);
    return Promise.all(market.results.map(async c => {
      const profit = await getCompanyProfit(db, c, subs);
      return { ...profit, owner_name: c.owner_name };
    }));
  }

  if (path === '/api/company/buy') {
    const { companyId } = await request.json();
    const company = await db.prepare('SELECT * FROM companies WHERE id = ?').bind(companyId).first();
    if (!company) return { error: '公司不存在' };
    if (!company.owner_id || company.owner_id <= 0) return { error: '系統公司無法收購' };
    if (company.owner_id === user.id) return { error: '不能收購自己的公司' };
    if (!company.sell_price || company.sell_price <= 0) return { error: '該公司未掛牌出售' };
    const ipo = await db.prepare("SELECT phase FROM ipo_state WHERE company_id = ?").bind(companyId).first();
    if (ipo && ipo.phase === 'ipo') return { error: 'IPO進行中無法收購' };

    const price = company.sell_price;
    const fee = Math.floor(price * 0.02);
    const total = price + fee;
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < total) return { error: `餘額不足（需 $${total.toLocaleString()}）` };

    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(total, user.id).run();
    await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(price, price, company.owner_id).run();
    await db.prepare('UPDATE companies SET owner_id = ?, sell_price = 0 WHERE id = ?').bind(user.id, companyId).run();
    // 公司員工一併轉移給新 owner
    await db.prepare('UPDATE employees SET user_id = ? WHERE company_id = ?').bind(user.id, companyId).run();
    await logTransaction(db, user.id, 'company_buy', -total, `收購「${company.name}」 $${price.toLocaleString()}（含手續費 $${fee.toLocaleString()}）`);
    await logTransaction(db, company.owner_id, 'company_sell', price, `出售「${company.name}」給 ${user.username || user.id}`);
    return { success: true, price, fee, total };
  }

  return null;
}

// 部門對員工效率加成: 職位命中 => 1 + 0.10 * deptLevel (plus 全體 +10% for marketing/support/asset/legal)
async function getDeptEffects(db, companyId) {
  const depts = await db.prepare('SELECT type, level FROM departments WHERE company_id = ?').bind(companyId).all();
  const effects = { allBonus: 1, positionBoost: {} };
  for (const d of depts.results) {
    const def = Object.values(DEPARTMENTS).find(i => i[d.type]);
    if (!def) continue;
    const info = def[d.type];
    if (info.boost.length === 0) effects.allBonus *= (1 + 0.10 * d.level);
    for (const pos of info.boost) {
      effects.positionBoost[pos] = (effects.positionBoost[pos] || 1) * (1 + 0.10 * d.level);
    }
  }
  return effects;
}

export async function getCompanyProfit(db, company, subs) {
  const employees = await db.prepare('SELECT e.position, e.salary, e.output, e.efficiency, e.morale, d.type as dept_type FROM employees e LEFT JOIN departments d ON d.id = e.department_id WHERE e.user_id = ? AND e.company_id = ?').bind(company.owner_id, company.id).all();
  const deptEffects = await getDeptEffects(db, company.id);

  // 光環: 經理 +2% 全公司效率(上限20%), 專家 +1.5% 收入(上限15%)
  const managerCount = employees.results.filter(e => e.position === 'manager').length;
  const expertCount = employees.results.filter(e => e.position === 'expert').length;
  const haloEff = 1 + Math.min(managerCount * 0.02, 0.20);
  const haloIncome = 1 + Math.min(expertCount * 0.015, 0.15);

  // AI 訂閱 +10% 員工效率
  const aiBonus = subs?.ai ? 1.1 : 1;

  const totalOutput = employees.results.reduce((s, e) => {
    const posBoost = deptEffects.positionBoost[e.position] || 1;
    return s + Math.floor(e.output * e.efficiency * (e.morale / 100) * posBoost * aiBonus * haloEff);
  }, 0);

  const mult = INDUSTRY_MULT[company.industry] || 1.0;
  const equipBonus = 1 + 0.1 * (company.equipment_level - 1);
  const brandBonus = 1 + 0.05 * (company.brand_level - 1);
  const marketFactor = 0.7 + Math.random() * 0.6;
  const consultantBonus = subs?.consultant ? 1.1 : 1;

  const income = Math.floor(company.base_income * mult * (1 + totalOutput / 1000) * equipBonus * brandBonus * marketFactor * haloIncome * consultantBonus * deptEffects.allBonus);
  const salaries = employees.results.reduce((s, e) => s + e.salary, 0);
  const rent = Math.floor(10 * Math.pow(0.95, company.office_level - 1));
  const depreciation = company.equipment_level * 2;
  const costs = salaries + rent + depreciation + 5 + 3;
  return { ...company, income, costs, profit: income - costs, managerCount, expertCount };
}

export async function processCompanyTick(db) {
  const companies = await db.prepare('SELECT * FROM companies').all();
  for (const c of companies.results) {
    const subs = await getUserSubscriptions(db, c.owner_id);
    const data = await getCompanyProfit(db, c, subs);
    const profit = data.profit;
    if (profit > 0) {
      await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(profit, profit, c.owner_id).run();
      await logHourly(db, c.owner_id, 'company_profit', profit, `公司利潤 ${c.name}`);
    } else {
      const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(c.owner_id).first();
      if (wallet && wallet.cash > 0) {
        await db.prepare('UPDATE wallets SET cash = MAX(cash + ?, 0) WHERE user_id = ?').bind(profit, c.owner_id).run();
        await logHourly(db, c.owner_id, 'company_loss', profit, `公司虧損 ${c.name}`);
      }
    }
  }
}
