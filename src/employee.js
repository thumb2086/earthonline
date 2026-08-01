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
    if ((currentCount?.cnt || 0) + quantity > 50) return { error: '每公司最多50人' };

    const totalCost = info.hireCost * quantity;
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < totalCost) return { error: '餘額不足' };
    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(totalCost, user.id).run();

    const existingCount = await db.prepare('SELECT COUNT(*) as cnt FROM employees WHERE company_id = ? AND position = ?').bind(companyId, position).first();
    for (let i = 0; i < quantity; i++) {
      const idx = (existingCount?.cnt || 0) + i;
      const eff = getMarginalEfficiency(idx);
      await db.prepare('INSERT INTO employees (user_id, company_id, department_id, position, salary, output, efficiency, hired_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(user.id, companyId, departmentId || null, position, info.salary, info.output, eff, Date.now()).run();
    }
    await logTransaction(db, user.id, 'employee_hire', -totalCost, `僱用${quantity}位${info.label}`);
    return { success: true, hired: quantity };
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
    const emp = await db.prepare('SELECT id FROM employees WHERE id = ? AND user_id = ?').bind(employeeId, user.id).first();
    if (!emp) return { error: '員工不存在' };
    await db.prepare('UPDATE employees SET salary = ? WHERE id = ?').bind(salary, employeeId).run();
    return { success: true };
  }

  return null;
}

export async function processEmployeeTick(db) {
  const employees = await db.prepare('SELECT e.id, e.user_id, e.company_id, e.position, e.morale, e.salary, e.efficiency, e.output FROM employees e WHERE e.company_id > 0').all();
  for (const emp of employees.results) {
    const company = await db.prepare('SELECT id FROM companies WHERE id = ?').bind(emp.company_id).first();
    if (!company) continue;

    const info = POSITIONS[emp.position];
    if (!info) continue;
    const moraleChange = emp.salary >= info.salary ? 0.1 : -0.5 * (1 - emp.salary / info.salary);
    const newMorale = Math.max(0, Math.min(100, emp.morale + moraleChange));
    await db.prepare('UPDATE employees SET morale = ? WHERE id = ?').bind(newMorale, emp.id).run();

    if (newMorale < 20 && Math.random() < 0.01) {
      await db.prepare('DELETE FROM employees WHERE id = ?').bind(emp.id).run();
      continue;
    }
  }
}
