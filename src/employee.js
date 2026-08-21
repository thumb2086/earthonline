import { logTransaction, logHourly } from './utils.js';

const POSITIONS = {
  intern: { label: '實習生', hireCost: 500, salary: 3, output: 5 },
  specialist: { label: '專員', hireCost: 5000, salary: 15, output: 25 },
  engineer: { label: '工程師', hireCost: 30000, salary: 50, output: 90 },
  manager: { label: '經理', hireCost: 150000, salary: 130, output: 250 },
  expert: { label: '專家', hireCost: 800000, salary: 350, output: 800 },
};

// 邊際效率: 第 N 人效率 = 0.8^(N-1)
function getMarginalEfficiency(index) {
  return Math.pow(0.8, index);
}

export async function handleEmployee(env, request, path, user) {
  const db = env.DB;
  if (path === '/api/employee/positions') {
    return Object.entries(POSITIONS).map(([key, p]) => ({ position: key, ...p, cap: 50 }));
  }

  if (path === '/api/employee/list') {
    const url = new URL(request.url);
    const companyId = parseInt(url.searchParams.get('companyId') || '0');
    let query = 'SELECT * FROM employees WHERE user_id = ?';
    const params = [user.id];
    if (companyId > 0) { query += ' AND company_id = ?'; params.push(companyId); }
    const employees = await db.prepare(query).bind(...params).all();
    return employees.results;
  }

  if (path === '/api/employee/hire') {
    const { position, companyId, quantity = 1, departmentId } = await request.json();
    const qty = parseInt(quantity);
    if (!Number.isInteger(qty) || qty <= 0 || qty > 50) return { error: '數量須為 1~50' };
    if (!companyId) return { error: '請選擇公司' };
    const company = await db.prepare('SELECT id FROM companies WHERE id = ? AND owner_id = ?').bind(companyId, user.id).first();
    if (!company) return { error: '公司不存在或非owner' };
    const info = POSITIONS[position];
    if (!info) return { error: '無效職位' };

    if (departmentId) {
      const dept = await db.prepare('SELECT id FROM departments WHERE id = ? AND company_id = ?').bind(departmentId, companyId).first();
      if (!dept) return { error: '部門不存在' };
    }

    const currentCount = await db.prepare('SELECT COUNT(*) as cnt FROM employees WHERE company_id = ?').bind(companyId).first();
    if ((currentCount?.cnt || 0) + qty > 50) return { error: '每公司最多50人' };

    const totalCost = info.hireCost * qty;
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < totalCost) return { error: '餘額不足' };
    const cashRes = await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ? AND cash >= ?').bind(totalCost, user.id, totalCost).run();
    if (cashRes.meta.changes === 0) return { error: '餘額不足' };

    const existingCount = await db.prepare('SELECT COUNT(*) as cnt FROM employees WHERE company_id = ? AND position = ?').bind(companyId, position).first();
    for (let i = 0; i < qty; i++) {
      const idx = (existingCount?.cnt || 0) + i;
      const eff = getMarginalEfficiency(idx);
      await db.prepare('INSERT INTO employees (user_id, company_id, department_id, position, salary, output, efficiency, hired_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(user.id, companyId, departmentId || null, position, info.salary, info.output, eff, Date.now()).run();
    }
    await logTransaction(db, user.id, 'employee_hire', -totalCost, `僱用${qty}位${info.label}`);
    return { success: true, hired: qty };
  }

  if (path === '/api/employee/fire') {
    const { position, companyId, quantity = 1 } = await request.json();
    const qty = parseInt(quantity);
    if (!Number.isInteger(qty) || qty <= 0 || qty > 50) return { error: '數量須為 1~50' };
    if (!companyId) return { error: '請選擇公司' };
    const company = await db.prepare('SELECT id FROM companies WHERE id = ? AND owner_id = ?').bind(companyId, user.id).first();
    if (!company) return { error: '公司不存在或非owner' };
    const info = POSITIONS[position];
    if (!info) return { error: '無效職位' };

    const rows = await db.prepare('SELECT id, efficiency FROM employees WHERE company_id = ? AND position = ? ORDER BY efficiency ASC LIMIT ?').bind(companyId, position, qty).all();
    if (rows.results.length === 0) return { error: '沒有可解僱的員工' };
    const fired = rows.results.length;
    const refund = Math.floor(info.hireCost * 0.5 * fired);
    // 條件刪除再退款: 防併發 fire 雙重退款
    const delRes = await db.prepare('DELETE FROM employees WHERE id IN (' + rows.results.map(() => '?').join(',') + ')').bind(...rows.results.map(r => r.id)).run();
    if (delRes.meta.changes === 0) return { error: '沒有可解僱的員工' };
    await db.prepare('UPDATE wallets SET cash = cash + ? WHERE user_id = ?').bind(refund, user.id).run();
    await db.prepare('DELETE FROM employees WHERE id IN (' + rows.results.map(() => '?').join(',') + ')').bind(...rows.results.map(r => r.id)).run();
    await logTransaction(db, user.id, 'employee_fire', refund, `解僱${fired}位${info.label}（退還50%）`);
    return { success: true, fired, refund };
  }

  if (path.startsWith('/api/employee/train/')) {
    const employeeId = parseInt(path.split('/').pop());
    const emp = await db.prepare('SELECT position, efficiency FROM employees WHERE id = ? AND user_id = ?').bind(employeeId, user.id).first();
    if (!emp) return { error: '員工不存在' };
    const info = POSITIONS[emp.position];
    const cost = Math.floor(info.hireCost * 0.5);
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < cost) return { error: '餘額不足' };
    const gain = 0.1 + Math.random() * 0.2;
    const newEff = Math.min(emp.efficiency + gain, 3.0);
    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(cost, user.id).run();
    await db.prepare('UPDATE employees SET efficiency = ? WHERE id = ?').bind(newEff, employeeId).run();
    await logTransaction(db, user.id, 'upgrade', -cost, '員工培訓');
    return { success: true, efficiency: newEff };
  }

  if (path.startsWith('/api/employee/salary/')) {
    const employeeId = parseInt(path.split('/').pop());
    const { salary } = await request.json();
    const s = parseInt(salary);
    if (!Number.isInteger(s) || s <= 0 || s > 1000000) return { error: '薪資無效（1~1,000,000）' };
    const emp = await db.prepare('SELECT id FROM employees WHERE id = ? AND user_id = ?').bind(employeeId, user.id).first();
    if (!emp) return { error: '員工不存在' };
    await db.prepare('UPDATE employees SET salary = ? WHERE id = ?').bind(s, employeeId).run();
    return { success: true };
  }

  return null;
}

export async function processEmployeeTick(db) {
  const employees = await db.prepare('SELECT e.id, e.user_id, e.company_id, e.position, e.morale, e.salary, e.efficiency, e.output FROM employees e WHERE e.company_id > 0').all();
  if (employees.results.length === 0) return;

  // 1 次 batch 預載公司存在性, 迴圈內零查詢
  const companyIds = [...new Set(employees.results.map(e => e.company_id))];
  // 改用 WHERE IN (1 查詢) 取代 N 個 batch 查詢
  const exists = {};
  if (companyIds.length > 0) {
    for (let i = 0; i < companyIds.length; i += 99) {
      const chunk = companyIds.slice(i, i + 99);
      const placeholders = chunk.map(() => '?').join(',');
      const res = await db.prepare(`SELECT id FROM companies WHERE id IN (${placeholders})`).bind(...chunk).all();
      for (const r of res.results) exists[r.id] = true;
    }
  }

  const stmts = [];
  for (const emp of employees.results) {
    if (!exists[emp.company_id]) continue;
    const info = POSITIONS[emp.position];
    if (!info) continue;
    const moraleChange = emp.salary >= info.salary ? 0.1 : -0.5 * (1 - emp.salary / info.salary);
    const newMorale = Math.max(0, Math.min(100, emp.morale + moraleChange));
    stmts.push(db.prepare('UPDATE employees SET morale = ? WHERE id = ?').bind(newMorale, emp.id));

    if (newMorale < 20 && Math.random() < 0.01) {
      stmts.push(db.prepare('DELETE FROM employees WHERE id = ?').bind(emp.id));
    }
  }
  if (stmts.length > 0) await db.batch(stmts);
}
