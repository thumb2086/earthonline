import { logTransaction, logHourly } from './utils.js';
import { getUserSubscriptions } from './subscription.js';

const INDUSTRY_MULT = { tech: 1.2, manufacturing: 1.0, finance: 1.3, service: 0.9 };
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
    const { companyId, ipoPrice, totalShares, ipoMinutes = 60 } = await request.json();
    if (!companyId) return { error: '請選擇公司' };
    const company = await db.prepare('SELECT * FROM companies WHERE id = ? AND owner_id = ?').bind(companyId, user.id).first();
    if (!company) return { error: '公司不存在或非owner' };
    const existingIpo = await db.prepare('SELECT phase FROM ipo_state WHERE company_id = ?').bind(companyId).first();
    if (existingIpo && existingIpo.phase !== null) return { error: '已有IPO記錄' };
    if (!ipoPrice || ipoPrice < 10) return { error: 'IPO價格至少$10' };
    if (!totalShares || totalShares < 10000) return { error: '發行股數至少10,000' };
    const minutes = Math.max(5, Math.min(1440, parseInt(ipoMinutes) || 60));

    await db.prepare('UPDATE companies SET total_shares = ?, share_price = ? WHERE id = ?').bind(totalShares, ipoPrice, companyId).run();
    await db.prepare('INSERT INTO ipo_state (company_id, phase, started_at, duration_minutes) VALUES (?, ?, ?, ?)').bind(companyId, 'ipo', Date.now(), minutes).run();
    await db.prepare('INSERT INTO stock_inventory (company_id, cash, stock_quantity) VALUES (?, 0, ?)').bind(companyId, totalShares).run();
    return { success: true, message: `IPO已啟動，${minutes}分鐘後自動上市` };
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
