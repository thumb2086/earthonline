const POSITIONS = {
  intern: { label: '實習生', hireCost: 200, salary: 1, output: 3 },
  specialist: { label: '專員', hireCost: 1000, salary: 5, output: 20 },
  engineer: { label: '工程師', hireCost: 5000, salary: 20, output: 100 },
  manager: { label: '經理', hireCost: 20000, salary: 50, output: 300 },
  expert: { label: '專家', hireCost: 100000, salary: 200, output: 1000 },
};

export async function handleEmployee(env, request, path, user) {
  const db = env.DB;
  if (path === '/api/employee/positions') {
    return Object.entries(POSITIONS).map(([key, p]) => ({ position: key, ...p }));
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
    const { position, companyId, quantity = 1 } = await request.json();
    if (!companyId) return { error: '請選擇公司' };
    const company = await db.prepare('SELECT id FROM companies WHERE id = ? AND owner_id = ?').bind(companyId, user.id).first();
    if (!company) return { error: '公司不存在或非owner' };
    const info = POSITIONS[position];
    if (!info) return { error: '無效職位' };
    const totalCost = info.hireCost * quantity;
    const wallet = await db.prepare('SELECT cash FROM wallets WHERE user_id = ?').bind(user.id).first();
    if (!wallet || wallet.cash < totalCost) return { error: '餘額不足' };
    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(totalCost, user.id).run();
    for (let i = 0; i < quantity; i++) {
      await db.prepare('INSERT INTO employees (user_id, company_id, position, salary, output, hired_at) VALUES (?, ?, ?, ?, ?, ?)').bind(user.id, companyId, position, info.salary, info.output, Date.now()).run();
    }
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

    const salaryCost = emp.salary;
    await db.prepare('UPDATE wallets SET cash = cash - ? WHERE user_id = ?').bind(salaryCost, emp.user_id).run();
    const actualOutput = Math.floor(emp.output * emp.efficiency * (newMorale / 100));
    if (actualOutput > 0) {
      await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(actualOutput, actualOutput, emp.user_id).run();
    }
  }
}
