import { logTransaction, logHourly, notify } from './utils.js';
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
    const companies = await db.prepare(`
      SELECT c.*, i.phase FROM companies c LEFT JOIN ipo_state i ON c.id = i.company_id WHERE c.owner_id = ?
    `).bind(user.id).all();
    const subs = await getUserSubscriptions(db, user.id);
    return Promise.all(companies.results.map(async c => {
      const profit = await getCompanyProfit(db, c, subs);
      const depts = await db.prepare('SELECT * FROM departments WHERE company_id = ? ORDER BY id').bind(c.id).all();
      const liquidationValue = await getLiquidationValue(db, c);
      return { ...profit, liquidationValue, departments: depts.results };
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

  // 自訂增資: owner 對自己公司增資發行新股 (賣給系統換現金)
  if (path === '/api/company/dilute') {
    const { companyId, shares, price } = await request.json();
    if (!companyId || !shares || shares <= 0) return { error: '參數無效' };
    const company = await db.prepare('SELECT * FROM companies WHERE id = ? AND owner_id = ?').bind(companyId, user.id).first();
    if (!company) return { error: '公司不存在或非owner' };
    const pricePerShare = Math.max(1, parseInt(price) || company.share_price || 10);
    const revenue = shares * pricePerShare;
    // 新股進入庫存 (系統持有, 玩家可買)
    await db.prepare('UPDATE companies SET total_shares = total_shares + ? WHERE id = ?').bind(shares, companyId).run();
    const inv = await db.prepare('SELECT id FROM stock_inventory WHERE company_id = ?').bind(companyId).first();
    if (inv) {
      await db.prepare('UPDATE stock_inventory SET stock_quantity = stock_quantity + ?, cash = cash - ? WHERE company_id = ?').bind(shares, revenue, companyId).run();
    } else {
      await db.prepare('INSERT INTO stock_inventory (company_id, cash, stock_quantity) VALUES (?, ?, ?)').bind(companyId, -revenue, shares).run();
    }
    await db.prepare('UPDATE wallets SET cash = cash + ? WHERE user_id = ?').bind(revenue, user.id).run();
    await logTransaction(db, user.id, 'ipo_revenue', revenue, `增資 ${shares} 股 @ $${pricePerShare}`);
    return { success: true, shares, revenue };
  }

  if (path === '/api/company/ipo/start') {
    const { companyId, ipoPrice, totalShares, ipoMinutes = 60, founderRatio = 0.6 } = await request.json();
    if (!companyId) return { error: '請選擇公司' };
    const company = await db.prepare('SELECT * FROM companies WHERE id = ? AND owner_id = ?').bind(companyId, user.id).first();
    if (!company) return { error: '公司不存在或非owner' };
    const existingIpo = await db.prepare('SELECT phase FROM ipo_state WHERE company_id = ?').bind(companyId).first();
    if (existingIpo && existingIpo.phase !== null) return { error: '已有IPO記錄' };
    if (!ipoPrice || ipoPrice < 10) return { error: 'IPO價格至少$10' };
    if (!totalShares || totalShares < 100 || totalShares > 100000) return { error: '發行股數需 100~100,000' };
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

  // 強制收購: owner 以市價×1.2 溢價買回所有其他股東的流通股 (下市/私有化前置)
  if (path === '/api/company/forcebuy') {
    const { companyId } = await request.json();
    const company = await db.prepare('SELECT * FROM companies WHERE id = ? AND owner_id = ?').bind(companyId, user.id).first();
    if (!company) return { error: '公司不存在' };
    const otherHoldings = await db.prepare('SELECT user_id, quantity FROM stock_holdings WHERE company_id = ? AND user_id != ? AND quantity > 0').bind(companyId, user.id).all();
    if (otherHoldings.results.length === 0) return { error: '沒有其他股東持股，可直接下市' };
    const totalShares = otherHoldings.results.reduce((s, h) => s + h.quantity, 0);
    const premium = 1.2;
    const totalCost = Math.floor((company.share_price || 100) * totalShares * premium);
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < totalCost) return { error: `強制收購需要 $${totalCost.toLocaleString()}（現金不足）` };
    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(totalCost, user.id).run();
    for (const h of otherHoldings.results) {
      const pay = Math.floor((company.share_price || 100) * h.quantity * premium);
      await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(pay, pay, h.user_id).run();
      await db.prepare('DELETE FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(h.user_id, companyId).run();
      await logTransaction(db, h.user_id, 'forced_sell', pay, `${company.name} 被強制收購 ${h.quantity.toLocaleString()} 股 @ $${company.share_price}×1.2`);
      await notify(db, h.user_id, 'forced_sell', `💼 ${user.username || user.id} 強制收購了你的「${company.name}」${h.quantity.toLocaleString()} 股（市價×1.2，入帳 $${pay.toLocaleString()}）`);
    }
    await logTransaction(db, user.id, 'forcebuy', -totalCost, `強制收購 ${company.name} ${totalShares.toLocaleString()} 股（含20%溢價）`);
    return { success: true, totalCost, totalShares, premium: 1.2 };
  }

  if (path === '/api/company/delist') {
    const { companyId } = await request.json();
    const company = await db.prepare('SELECT * FROM companies WHERE id = ? AND owner_id = ?').bind(companyId, user.id).first();
    if (!company) return { error: '公司不存在' };
    const ipo = await db.prepare("SELECT phase FROM ipo_state WHERE company_id = ?").bind(companyId).first();
    if (!ipo || ipo.phase !== 'trading') return { error: '尚未上市或不在交易階段' };
    const marginCount = await db.prepare('SELECT COUNT(*) as cnt FROM margin_positions WHERE company_id = ?').bind(companyId).first();
    if ((marginCount?.cnt || 0) > 0) return { error: '該公司有槓桿持倉，無法下市' };
    const otherHolders = await db.prepare('SELECT COUNT(*) as cnt, COALESCE(SUM(quantity),0) as total FROM stock_holdings WHERE company_id = ? AND user_id != ? AND quantity > 0').bind(companyId, user.id).first();
    if ((otherHolders?.cnt || 0) > 0) return { error: `尚有 ${otherHolders.total.toLocaleString()} 股在外流通，請先使用「強制收購」買回全部股票` };

    // 創辦人持股以市價兌現（下市後無市場可交易）
    const holding = await db.prepare('SELECT quantity FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(user.id, companyId).first();
    let payout = 0;
    if (holding && holding.quantity > 0) {
      const gross = (company.share_price || 100) * holding.quantity;
      const fee = Math.floor(gross * 0.015);
      payout = gross - fee;
      await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(payout, payout, user.id).run();
      await db.prepare('DELETE FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(user.id, companyId).run();
    }
    // 下市: 移除上市狀態, 公司本身保留
    await db.prepare('DELETE FROM ipo_state WHERE company_id = ?').bind(companyId).run();
    await logTransaction(db, user.id, 'company_delist', payout, `「${company.name}」下市${payout > 0 ? `，持股兌現 $${payout.toLocaleString()}` : ''}`);
    return { success: true, payout };
  }

  if (path === '/api/company/liquidate') {
    const { companyId } = await request.json();
    const company = await db.prepare('SELECT * FROM companies WHERE id = ? AND owner_id = ?').bind(companyId, user.id).first();
    if (!company) return { error: '公司不存在' };
    const ipo = await db.prepare("SELECT phase FROM ipo_state WHERE company_id = ?").bind(companyId).first();
    if (ipo && ipo.phase === 'ipo') return { error: 'IPO進行中無法清算，請先等待上市' };
    const marginCount = await db.prepare('SELECT COUNT(*) as cnt FROM margin_positions WHERE company_id = ?').bind(companyId).first();
    if ((marginCount?.cnt || 0) > 0) return { error: '該公司有槓桿持倉，無法清算' };
    const otherHolders = await db.prepare('SELECT COUNT(*) as cnt FROM stock_holdings WHERE company_id = ? AND user_id != ? AND quantity > 0').bind(companyId, user.id).first();
    if ((otherHolders?.cnt || 0) > 0) return { error: '尚有其他股東持股，無法清算' };

    const value = await getLiquidationValue(db, company);
    await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(value, value, user.id).run();
    await logTransaction(db, user.id, 'company_liquidate', value, `清算公司「${company.name}」`);

    await db.prepare('DELETE FROM companies WHERE id = ?').bind(companyId).run();
    await db.prepare('DELETE FROM ipo_state WHERE company_id = ?').bind(companyId).run();
    await db.prepare('DELETE FROM stock_inventory WHERE company_id = ?').bind(companyId).run();
    await db.prepare('DELETE FROM departments WHERE company_id = ?').bind(companyId).run();
    await db.prepare('DELETE FROM employees WHERE company_id = ?').bind(companyId).run();
    await db.prepare('DELETE FROM stock_holdings WHERE company_id = ?').bind(companyId).run();
    await db.prepare('DELETE FROM ipo_subscriptions WHERE company_id = ?').bind(companyId).run();
    return { success: true, payout: value };
  }

  return null;
}

// 清算價值: 升級/部門/員工投資的折價回收 + 營收基數
const EMPLOYEE_HIRE_COSTS = { intern: 500, specialist: 5000, engineer: 30000, manager: 150000, expert: 800000 };
const sumCosts = (arr, level) => arr.slice(1, Math.min(level + 1, arr.length)).reduce((a, b) => a + b, 0);

async function getLiquidationValue(db, company) {
  let value = 0;
  value += Math.floor(sumCosts(UPGRADE_COSTS.office, company.office_level) * 0.6);
  value += Math.floor(sumCosts(UPGRADE_COSTS.equipment, company.equipment_level) * 0.6);
  value += Math.floor(sumCosts(UPGRADE_COSTS.brand, company.brand_level) * 0.6);
  const depts = await db.prepare('SELECT type, level FROM departments WHERE company_id = ? ORDER BY id').bind(company.id).all();
  depts.results.forEach((d, i) => {
    value += Math.floor((DEPT_COSTS[i + 1] || 0) * 0.5);
    value += Math.floor(sumCosts(DEPT_UPGRADE_COSTS, d.level) * 0.5);
  });
  const employees = await db.prepare('SELECT position FROM employees WHERE company_id = ?').bind(company.id).all();
  employees.results.forEach(e => { value += Math.floor((EMPLOYEE_HIRE_COSTS[e.position] || 0) * 0.5); });
  value += company.base_income * 60;
  return value;
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
