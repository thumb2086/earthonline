const CONTRACT_TEMPLATES = [
  { type: '資料標註', reward: 500, requirement: {} },
  { type: '伺服器託管', reward: 2000, requirement: { min_server_level: 5 } },
  { type: '軟體開發', reward: 10000, requirement: { min_engineers: 2 } },
  { type: '系統維護', reward: 25000, requirement: { min_managers: 1 } },
  { type: '緊急救援', reward: 100000, requirement: { min_employees: 5 } },
];

export async function handleContract(env, request, path, user) {
  const db = env.DB;
  await refreshContracts(db);

  if (path === '/api/contract/list') {
    const contracts = await db.prepare('SELECT * FROM contracts WHERE expires_at > ? AND claimed = 0 ORDER BY reward DESC').bind(Date.now()).all();
    return contracts.results;
  }

  if (path === '/api/contract/mine') {
    const contracts = await db.prepare('SELECT uc.*, c.type, c.reward FROM user_contracts uc JOIN contracts c ON c.id = uc.contract_id WHERE uc.user_id = ?').bind(user.id).all();
    return contracts.results;
  }

  if (path.startsWith('/api/contract/accept/')) {
    const contractId = parseInt(path.split('/').pop());
    const contract = await db.prepare('SELECT * FROM contracts WHERE id = ? AND claimed = 0 AND expires_at > ?').bind(contractId, Date.now()).first();
    if (!contract) return { error: '合約不存在' };

    const existing = await db.prepare('SELECT completed FROM user_contracts WHERE user_id = ? AND contract_id = ?').bind(user.id, contractId).first();
    if (existing) return { error: '已接取' };

    const req = JSON.parse(contract.requirement || '{}');
    if (req.min_server_level) {
      const levels = await db.prepare('SELECT server FROM income_levels WHERE user_id = ?').bind(user.id).first();
      if (!levels || levels.server < req.min_server_level) return { error: '伺服器等級不足' };
    }
    if (req.min_engineers) {
      const count = await db.prepare("SELECT COUNT(*) as c FROM employees WHERE user_id = ? AND position = 'engineer'").bind(user.id).first();
      if (count.c < req.min_engineers) return { error: '工程師不足' };
    }
    if (req.min_managers) {
      const count = await db.prepare("SELECT COUNT(*) as c FROM employees WHERE user_id = ? AND position = 'manager'").bind(user.id).first();
      if (count.c < req.min_managers) return { error: '經理不足' };
    }
    if (req.min_employees) {
      const count = await db.prepare('SELECT COUNT(*) as c FROM employees WHERE user_id = ?').bind(user.id).first();
      if (count.c < req.min_employees) return { error: '員工不足' };
    }

    await db.prepare('INSERT INTO user_contracts (user_id, contract_id) VALUES (?, ?)').bind(user.id, contractId).run();
    return { success: true };
  }

  if (path.startsWith('/api/contract/claim/')) {
    const contractId = parseInt(path.split('/').pop());
    const uc = await db.prepare('SELECT * FROM user_contracts WHERE user_id = ? AND contract_id = ? AND completed = 1 AND claimed = 0').bind(user.id, contractId).first();
    if (!uc) return { error: '尚未完成或已領取' };

    const contract = await db.prepare('SELECT reward FROM contracts WHERE id = ?').bind(contractId).first();
    if (!contract) return { error: '不存在' };

    await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(contract.reward, contract.reward, user.id).run();
    await db.prepare('UPDATE user_contracts SET claimed = 1 WHERE user_id = ? AND contract_id = ?').bind(user.id, contractId).run();
    await db.prepare('UPDATE contracts SET claimed = 1 WHERE id = ?').bind(contractId).run();
    return { success: true, reward: contract.reward };
  }

  return null;
}

async function refreshContracts(db) {
  const active = await db.prepare('SELECT COUNT(*) as count FROM contracts WHERE expires_at > ? AND claimed = 0').bind(Date.now()).first();
  if (active.count >= 5) return;
  for (let i = 0; i < 5 - active.count; i++) {
    const tpl = CONTRACT_TEMPLATES[Math.floor(Math.random() * CONTRACT_TEMPLATES.length)];
    const expiresAt = Date.now() + 300000 + Math.random() * 600000;
    await db.prepare('INSERT INTO contracts (type, reward, requirement, expires_at) VALUES (?, ?, ?, ?)').bind(tpl.type, tpl.reward, JSON.stringify(tpl.requirement), Math.floor(expiresAt)).run();
  }
}
