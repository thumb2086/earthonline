import { getUserSubscriptions } from './subscription.js';
import { getIncomePerMin, getLivingCostRate } from './income.js';
import { getCompanyProfit } from './company.js';
import { forceResetGame } from './reset.js';
import { weeklySettlement, resolveRankRoleIds, normRoleName, RANK_ROLE_NAMES, RANK_LABELS } from './community.js';

const UPGRADE_INCOME = {
  computer: [0, 5, 12, 30, 75, 180, 450, 1200],
  server: [0, 10, 25, 60, 150, 380, 950, 2400],
  ai_assistant: [0, 20, 50, 120, 300, 750, 1900, 4800],
};

function getBaseIncomePerMin(levels) {
  if (!levels) return 0;
  return 20 + (UPGRADE_INCOME.computer[levels.computer] || 0) +
    (UPGRADE_INCOME.server[levels.server] || 0) +
    (UPGRADE_INCOME.ai_assistant[levels.ai_assistant] || 0);
}

// 解析 ?exclude=1,5,7 (用戶id) 或 ?exclude=名字1,名字2
async function resolveExclude(db, request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get('exclude');
  if (!raw) return [];
  const ids = [];
  for (const part of raw.split(',').map(s => s.trim()).filter(Boolean)) {
    if (/^\d+$/.test(part)) {
      ids.push(parseInt(part));
    } else {
      const u = await db.prepare('SELECT id FROM users WHERE username = ?').bind(part).first();
      if (u) ids.push(u.id);
    }
  }
  return ids;
}

function inClause(ids, prefix) {
  if (ids.length === 0) return '';
  return ` AND ${prefix} NOT IN (${ids.join(',')})`;
}

export async function handleAdmin(env, request, path, user) {
  // 每請求從 DB 重新驗證角色 (防 token 內 stale admin role 持續 30 天)
  const dbRole = await env.DB.prepare('SELECT role FROM users WHERE id = ?').bind(user.id).first();
  if (!dbRole || dbRole.role !== 'admin') return { error: '管理員專用' };
  user.role = 'admin';

  const db = env.DB;

  if (path === '/api/admin/users') {
    const excludeIds = await resolveExclude(db, request);
    const excl = inClause(excludeIds, 'u.id');
    const users = await db.prepare(`
      SELECT u.id, u.username, u.role, u.discord_username, u.created_at,
             w.cash, w.savings, w.bank, w.total_earned,
             (SELECT COUNT(*) FROM employees WHERE user_id = u.id) as employees,
             (SELECT COALESCE(SUM(quantity), 0) FROM stock_holdings WHERE user_id = u.id) as stocks,
             (SELECT COUNT(*) FROM companies WHERE owner_id = u.id) as companies,
             (SELECT COUNT(*) FROM departments d JOIN companies c ON c.id = d.company_id WHERE c.owner_id = u.id) as departments,
             (SELECT COALESCE(SUM(amount), 0) FROM investments WHERE user_id = u.id AND type != 'deposit') as investments,
             (SELECT COALESCE(SUM(amount), 0) FROM investments WHERE user_id = u.id AND type = 'deposit') as deposits,
             (SELECT COALESCE(SUM(remaining), 0) FROM loans WHERE user_id = u.id AND status = 'active') as loans,
             (SELECT COUNT(*) FROM margin_positions WHERE user_id = u.id) as margin,
             (SELECT COUNT(*) FROM subscriptions WHERE user_id = u.id AND enabled = 1) as subscriptions,
             (SELECT computer FROM income_levels WHERE user_id = u.id) as computer,
             (SELECT server FROM income_levels WHERE user_id = u.id) as server,
             (SELECT ai_assistant FROM income_levels WHERE user_id = u.id) as ai_assistant
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.id
      WHERE 1=1${excl}
      ORDER BY w.total_earned DESC
    `).all();
    const results = [];
    for (const u of users.results) {
      const base = getBaseIncomePerMin({ computer: u.computer, server: u.server, ai_assistant: u.ai_assistant });
      const subs = await getUserSubscriptions(db, u.id);
      const baseIncome = await getIncomePerMin(db, u.id, subs);
      const companies = await db.prepare('SELECT * FROM companies WHERE owner_id = ?').bind(u.id).all();
      let companyProfit = 0;
      for (const c of companies.results) {
        const p = await getCompanyProfit(db, c, subs);
        companyProfit += Math.max(0, p.profit);
      }
      const invInterest = await db.prepare('SELECT COALESCE(SUM(amount),0) as a FROM investments WHERE user_id = ?').bind(u.id).first();
      const invPerMin = Math.floor((invInterest?.a || 0) * 0.0002);
      const livingCost = Math.floor((baseIncome + companyProfit) * getLivingCostRate(baseIncome + companyProfit));
      const subCost = Object.entries(subs).filter(([k, v]) => v).reduce((s, [k]) => s + ({ home: 2, cloud: 5, insurance: 10, ai: 20, finance: 50, consultant: 100 }[k] || 0), 0);
      results.push({
        ...u,
        incomePerMin: base + companyProfit + invPerMin,
        detail: {
          baseIncome, companyProfit, invPerMin,
          expenses: { livingCost, subCost, employeeSalary: 0 },
          netPerMin: baseIncome + companyProfit + invPerMin - livingCost - subCost,
          subscriptions: subs,
        },
      });
    }
    return results;
  }

  if (path === '/api/admin/stats') {
    const excludeIds = await resolveExclude(db, request);
    const excl = inClause(excludeIds, 'user_id');
    const totalUsers = await db.prepare('SELECT COUNT(*) as c FROM users' + (excludeIds.length ? ` WHERE id NOT IN (${excludeIds.join(',')})` : '')).first();
    const totalCash = await db.prepare('SELECT COALESCE(SUM(cash), 0) as c FROM wallets WHERE 1=1' + excl).first();
    const totalSavings = await db.prepare('SELECT COALESCE(SUM(savings), 0) as c FROM wallets WHERE 1=1' + excl).first();
    const totalEarned = await db.prepare('SELECT COALESCE(SUM(total_earned), 0) as c FROM wallets WHERE 1=1' + excl).first();
    const totalEmployees = await db.prepare('SELECT COUNT(*) as c FROM employees WHERE 1=1' + excl).first();
    const totalCompanies = await db.prepare('SELECT COUNT(*) as c FROM companies WHERE 1=1' + excl.replace('user_id', 'owner_id')).first();
    const totalTrades = await db.prepare('SELECT COUNT(*) as c FROM stock_trades WHERE 1=1' + excl).first();
    const totalMargin = await db.prepare('SELECT COUNT(*) as c FROM margin_positions WHERE 1=1' + excl).first();

    const reserve = await db.prepare('SELECT COALESCE(SUM(cash), 0) as cash, COALESCE(SUM(stock_quantity), 0) as stock_inventory FROM stock_inventory').first();
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

  if (path === '/api/admin/stocks') {
    const excludeIds = await resolveExclude(db, request);
    const excl = inClause(excludeIds, 'u.id');
    const companies = await db.prepare(`
      SELECT c.id, c.name, c.total_shares, COALESCE(inv.stock_quantity, 0) as system_inventory
      FROM companies c
      LEFT JOIN stock_inventory inv ON inv.company_id = c.id
      ORDER BY c.id
    `).all();
    const result = [];
    for (const c of companies.results) {
      const holders = await db.prepare(`
        SELECT u.username, h.quantity
        FROM stock_holdings h
        JOIN users u ON u.id = h.user_id
        WHERE h.company_id = ?${excl}
        ORDER BY h.quantity DESC
      `).bind(c.id).all();
      result.push({ ...c, holders: holders.results, held: holders.results.reduce((s, x) => s + x.quantity, 0) });
    }
    return result;
  }

  if (path === '/api/admin/announcements') {
    const rows = await db.prepare('SELECT * FROM community_announcements ORDER BY created_at DESC LIMIT 20').all();
    return rows.results;
  }

  if (path === '/api/admin/grant' && request.method === 'POST') {
    const { userId, amount, type = 'cash' } = await request.json();
    if (!userId || !amount || amount === 0) return { error: '參數無效' };
    const target = await db.prepare('SELECT id, username FROM users WHERE id = ?').bind(userId).first();
    if (!target) return { error: '用戶不存在' };
    const sign = amount > 0 ? '+' : '';
    if (type === 'cash') {
      await db.prepare('UPDATE wallets SET cash = cash + ? WHERE user_id = ?').bind(amount, userId).run();
      await db.prepare('INSERT INTO transaction_history (user_id, type, amount, description, created_at) VALUES (?, ?, ?, ?, ?)').bind(userId, 'admin_grant', amount, `管理員${amount > 0 ? '贈送' : '扣除'} $${sign}${amount.toLocaleString()} 現金`, Date.now()).run();
    } else if (type === 'earned') {
      await db.prepare('UPDATE wallets SET total_earned = total_earned + ? WHERE user_id = ?').bind(amount, userId).run();
    } else if (type === 'shares') {
      const { companyId } = await request.json();
      if (!companyId) return { error: '請指定公司' };
      const holding = await db.prepare('SELECT quantity FROM stock_holdings WHERE user_id = ? AND company_id = ?').bind(userId, companyId).first();
      if (holding) {
        await db.prepare('UPDATE stock_holdings SET quantity = quantity + ? WHERE user_id = ? AND company_id = ?').bind(amount, userId, companyId).run();
      } else {
        await db.prepare('INSERT INTO stock_holdings (user_id, company_id, quantity) VALUES (?, ?, ?)').bind(userId, companyId, amount).run();
      }
    }
    return { success: true };
  }

  if (path === '/api/admin/dilute' && request.method === 'POST') {
    const { companyId, shares } = await request.json();
    if (!companyId || !shares || shares <= 0) return { error: '參數無效' };
    const company = await db.prepare('SELECT id, name, total_shares FROM companies WHERE id = ?').bind(companyId).first();
    if (!company) return { error: '公司不存在' };
    await db.prepare('UPDATE companies SET total_shares = total_shares + ? WHERE id = ?').bind(shares, companyId).run();
    await db.prepare('UPDATE stock_inventory SET stock_quantity = stock_quantity + ? WHERE company_id = ?').bind(shares, companyId).run();
    await db.prepare('INSERT INTO community_announcements (message, created_at) VALUES (?, ?)').bind(`${company.name} 管理員增資發行 ${shares.toLocaleString()} 股新股`, Date.now()).run();
    return { success: true, newTotal: company.total_shares + shares };
  }

  if (path === '/api/admin/delist' && request.method === 'POST') {
    const { companyId } = await request.json();
    if (!companyId) return { error: '參數無效' };
    const company = await db.prepare('SELECT id, name FROM companies WHERE id = ?').bind(companyId).first();
    if (!company) return { error: '公司不存在' };
    const ipo = await db.prepare('SELECT phase FROM ipo_state WHERE company_id = ?').bind(companyId).first();
    if (!ipo || ipo.phase !== 'trading') return { error: '僅上市中的公司可下架' };
    await db.prepare("UPDATE ipo_state SET phase = 'delisted' WHERE company_id = ?").bind(companyId).run();
    await db.prepare('INSERT INTO community_announcements (message, created_at) VALUES (?, ?)').bind(`${company.name} 已下架（停止交易）`, Date.now()).run();
    return { success: true };
  }

  if (path === '/api/admin/relist' && request.method === 'POST') {
    const { companyId } = await request.json();
    if (!companyId) return { error: '參數無效' };
    const company = await db.prepare('SELECT id, name FROM companies WHERE id = ?').bind(companyId).first();
    if (!company) return { error: '公司不存在' };
    await db.prepare("UPDATE ipo_state SET phase = 'trading' WHERE company_id = ?").bind(companyId).run();
    await db.prepare('INSERT INTO community_announcements (message, created_at) VALUES (?, ?)').bind(`${company.name} 重新上市`, Date.now()).run();
    return { success: true };
  }

  // IPO 排程管理: 列出所有公司狀態
  if (path === '/api/admin/ipo/schedule') {
    const companies = await db.prepare(`
      SELECT c.id, c.code, c.name, c.industry, c.total_shares, c.share_price,
             i.phase, i.started_at, i.duration_minutes,
             COALESCE(inv.stock_quantity, 0) as inventory,
             (SELECT COALESCE(SUM(shares),0) FROM ipo_subscriptions WHERE company_id=c.id) as subscribed
      FROM companies c
      LEFT JOIN ipo_state i ON c.id = i.company_id
      LEFT JOIN stock_inventory inv ON c.id = inv.company_id
      ORDER BY c.code
    `).all();
    return companies.results;
  }

  // 設定 IPO 時間並開始
  if (path === '/api/admin/ipo/start' && request.method === 'POST') {
    const { companyId, durationMinutes, startTime } = await request.json();
    if (!companyId) return { error: '請選擇公司' };
    const company = await db.prepare('SELECT id, code, name FROM companies WHERE id = ?').bind(companyId).first();
    if (!company) return { error: '公司不存在' };
    const ipo = await db.prepare('SELECT phase FROM ipo_state WHERE company_id = ?').bind(companyId).first();
    if (!ipo) return { error: '公司無 IPO 狀態' };
    if (ipo.phase === 'ipo') return { error: '已在 IPO 中' };
    if (ipo.phase === 'trading') return { error: '已上市交易中' };
    if (ipo.phase === 'queued') return { error: '已在排隊中，等自動開始' };

    const duration = Math.max(60, Math.min(4320, parseInt(durationMinutes) || 4320)); // 1hr ~ 3days
    const startAt = startTime ? new Date(startTime).getTime() : Date.now();
    if (isNaN(startAt) || startAt < Date.now() - 60000) return { error: '開始時間無效' };

    // 檢查是否已有正在進行的系統公司 IPO（玩家公司不受此限）
    const ipoOwner = await db.prepare('SELECT owner_id FROM companies WHERE id = ?').bind(companyId).first();
    const isSystemCompany = !ipoOwner || ipoOwner.owner_id === 0;
    if (isSystemCompany) {
      const currentIpo = await db.prepare("SELECT company_id FROM ipo_state i JOIN companies c ON c.id = i.company_id WHERE i.phase = 'ipo' AND c.owner_id = 0").first();
      if (currentIpo && startAt <= Date.now()) {
        await db.prepare("UPDATE ipo_state SET phase = 'queued', started_at = ?, duration_minutes = ? WHERE company_id = ?").bind(startAt, duration, companyId).run();
      } else {
        await db.prepare("UPDATE ipo_state SET phase = 'ipo', started_at = ?, duration_minutes = ? WHERE company_id = ?").bind(startAt, duration, companyId).run();
      }
    } else {
      await db.prepare("UPDATE ipo_state SET phase = 'ipo', started_at = ?, duration_minutes = ? WHERE company_id = ?").bind(startAt, duration, companyId).run();
    }

    await db.prepare('INSERT INTO community_announcements (message, created_at) VALUES (?, ?)').bind(`📢 「${company.code} ${company.name}」IPO 已排程，認購期 ${duration} 分鐘`, Date.now()).run();
    return { success: true, message: `「${company.code} ${company.name}」IPO 已排程` };
  }

  // 取消 IPO 排程
  if (path === '/api/admin/ipo/cancel' && request.method === 'POST') {
    const { companyId } = await request.json();
    if (!companyId) return { error: '請選擇公司' };
    const ipo = await db.prepare('SELECT phase FROM ipo_state WHERE company_id = ?').bind(companyId).first();
    if (!ipo) return { error: '公司無 IPO 狀態' };
    if (ipo.phase === 'trading') return { error: '已上市交易中，無法取消' };
    await db.prepare("UPDATE ipo_state SET phase = 'pending', started_at = 0 WHERE company_id = ?").bind(companyId).run();
    return { success: true, message: '已取消 IPO 排程' };
  }

  if (path === '/api/admin/margin') {
    const excludeIds = await resolveExclude(db, request);
    const excl = excludeIds.length > 0 ? ` AND mp.user_id NOT IN (${excludeIds.join(',')})` : '';
    const rows = await db.prepare(`
      SELECT mp.id, mp.user_id, u.username, mp.company_id, c.name as company_name,
             mp.type, mp.quantity, mp.entry_price, mp.margin_amount, mp.loan_amount,
             mp.leverage, mp.opened_at, mp.margin_call_at, c.share_price
      FROM margin_positions mp
      JOIN users u ON u.id = mp.user_id
      JOIN companies c ON c.id = mp.company_id
      WHERE 1=1${excl}
      ORDER BY mp.opened_at DESC
    `).all();
    const list = rows.results.map(mp => {
      const diff = mp.type === 'long' ? (mp.share_price - mp.entry_price) * mp.quantity : (mp.entry_price - mp.share_price) * mp.quantity;
      const equity = mp.margin_amount + diff;
      // 維持率: 做多 = 持倉市值/借款; 做空 = (賣出款項+保證金-股息債務)/當前市值 (與 processMarginTick 一致)
      let maintenance;
      if (mp.type === 'long') {
        maintenance = mp.loan_amount > 0 ? ((mp.share_price * mp.quantity) / mp.loan_amount) : 0;
      } else {
        maintenance = mp.share_price * mp.quantity > 0 ? ((mp.loan_amount + mp.margin_amount - (mp.dividend_debt || 0)) / (mp.share_price * mp.quantity)) : 0;
      }
      return { ...mp, pnl: diff, equity: Math.floor(equity), maintenanceRate: Math.floor(maintenance * 100) };
    });
    // 圓餅圖: 按用戶統計槓桿曝險 (持倉市值)
    const byUser = {};
    for (const mp of list) {
      if (!byUser[mp.username]) byUser[mp.username] = { username: mp.username, exposure: 0, positions: 0 };
      byUser[mp.username].exposure += mp.quantity * mp.share_price;
      byUser[mp.username].positions++;
    }
    // 圓餅圖: 按公司統計
    const byCompany = {};
    for (const mp of list) {
      if (!byCompany[mp.company_name]) byCompany[mp.company_name] = { name: mp.company_name, exposure: 0, positions: 0 };
      byCompany[mp.company_name].exposure += mp.quantity * mp.share_price;
      byCompany[mp.company_name].positions++;
    }
    return {
      positions: list,
      byUser: Object.values(byUser).sort((a, b) => b.exposure - a.exposure),
      byCompany: Object.values(byCompany).sort((a, b) => b.exposure - a.exposure),
    };
  }

  if (path === '/api/admin/ipo') {
    const url = new URL(request.url);
    const companyId = url.searchParams.get('companyId');
    const excludeIds = await resolveExclude(db, request);
    let query = `
      SELECT s.id, s.shares, s.total_cost, s.subscribed_at, c.name as company_name, c.share_price, i.phase, u.username
      FROM ipo_subscriptions s
      JOIN companies c ON c.id = s.company_id
      LEFT JOIN ipo_state i ON i.company_id = s.company_id
      JOIN users u ON u.id = s.user_id
    `;
    const params = [];
    const conds = [];
    if (companyId) conds.push('s.company_id = ?');
    if (excludeIds.length > 0) conds.push(`s.user_id NOT IN (${excludeIds.join(',')})`);
    if (conds.length > 0) query += ' WHERE ' + conds.join(' AND ');
    if (companyId) params.push(parseInt(companyId));
    query += ' ORDER BY s.subscribed_at DESC';
    const rows = await db.prepare(query).bind(...params).all();
    return rows.results;
  }

  if (path === '/api/admin/trades') {
    const excludeIds = await resolveExclude(db, request);
    const excl = excludeIds.length > 0 ? ` AND t.user_id NOT IN (${excludeIds.join(',')})` : '';
    const trades = await db.prepare(`
      SELECT t.id, t.company_id, c.name as company_name, t.user_id, u.username, t.type, t.price, t.quantity, t.traded_at
      FROM stock_trades t
      JOIN users u ON u.id = t.user_id
      JOIN companies c ON c.id = t.company_id
      WHERE t.user_id > 0${excl}
      ORDER BY t.traded_at DESC
      LIMIT 300
    `).all();
    // 每人統計
    const stats = {};
    for (const tr of trades.results) {
      if (!stats[tr.username]) stats[tr.username] = { username: tr.username, user_id: tr.user_id, buyCount: 0, sellCount: 0, buyVol: 0, sellVol: 0, spent: 0, revenue: 0 };
      const s = stats[tr.username];
      if (tr.type === 'buy') { s.buyCount++; s.buyVol += tr.quantity; s.spent += tr.price * tr.quantity; }
      else { s.sellCount++; s.sellVol += tr.quantity; s.revenue += tr.price * tr.quantity; }
    }
    return { trades: trades.results, stats: Object.values(stats).sort((a, b) => (b.buyCount + b.sellCount) - (a.buyCount + a.sellCount)) };
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
    const companies = await db.prepare('SELECT * FROM companies WHERE owner_id = ?').bind(targetId).all();
    const depts = await db.prepare('SELECT d.* FROM departments d JOIN companies c ON c.id = d.company_id WHERE c.owner_id = ?').bind(targetId).all();
    const subs = await getUserSubscriptions(db, targetId);
    const incomeLevels = await db.prepare('SELECT * FROM income_levels WHERE user_id = ?').bind(targetId).first();

    return { ...target, holdings: holdings.results, loans: loans.results, investments: investments.results, employees: employees.results, marginPositions: positions.results, companies: companies.results, departments: depts.results, subscriptions: subs, incomeLevels };
  }

  // 立即執行每週階級清算 (手動觸發身分組分發)
  if (path === '/api/admin/rank-settle') {
    const result = await weeklySettlement(db, env);
    if (result?.errors?.length && !result.applied) return { error: `清算失敗：${result.errors.join('；')}` };
    return { success: true, applied: result?.applied || 0, log: result?.log || [], errors: result?.errors || [] };
  }

  // 身分組除錯: 檢查 bot 資訊/權限 + 公會角色清單 + 名稱比對結果
  if (path === '/api/admin/rank-debug') {
    const guildId = env.DISCORD_GUILD_ID;
    const token = env.DISCORD_BOT_TOKEN;
    const out = { ok: false, error: null, bot: null, guildName: null, roles: [], matched: {}, unmatched: [] };
    if (!guildId || !token) { out.error = '缺少 DISCORD_GUILD_ID 或 DISCORD_BOT_TOKEN'; return out; }
    try {
      const meRes = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: `Bot ${token}` } });
      if (!meRes.ok) { out.error = `bot token 無效 (HTTP ${meRes.status})`; return out; }
      const me = await meRes.json();
      const gRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, { headers: { Authorization: `Bot ${token}` } });
      const guild = gRes.ok ? await gRes.json() : null;
      const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${me.id}`, { headers: { Authorization: `Bot ${token}` } });
      const member = memberRes.ok ? await memberRes.json() : null;
      const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { headers: { Authorization: `Bot ${token}` } });
      const roles = rolesRes.ok ? await rolesRes.json() : [];

      out.ok = true;
      out.bot = { id: me.id, username: me.username, isInGuild: !!member, memberRoles: member?.roles || [] };
      out.guildName = guild?.name || '?';
      const byId = new Map(roles.map(r => [r.id, r]));
      out.bot.roleNames = (member?.roles || []).map(id => byId.get(id)?.name || id);

      // 排序角色清單 (Discord 顯示順序 = position 由高到低, @everyone 最低)
      out.roles = roles
        .filter(r => !r.managed)
        .sort((a, b) => b.position - a.position)
        .map(r => ({ id: r.id, name: r.name, position: r.position, hoist: !!r.hoist }));

      const byName = new Map(roles.map(r => [normRoleName(r.name), r]));
      RANK_ROLE_NAMES.forEach((n, idx) => {
        const r = byName.get(normRoleName(n));
        if (r) out.matched[`${RANK_LABELS[idx]} (${n})`] = `${r.name} (${r.id})`;
        else out.unmatched.push(`${RANK_LABELS[idx]} → ${n}`);
      });
      out.resolvedIds = await resolveRankRoleIds(env);
    } catch (e) { out.error = e.message || String(e); }
    return out;
  }

  // 重置系統: 正式版前單人可重置, 正式版後需3位管理員簽署
  if (path === '/api/admin/reset') {
    const url = new URL(request.url);
    const force = url.searchParams.get('force') === '1';
    const done = await db.prepare("SELECT value FROM game_meta WHERE key = 'v2_reset_done'").first();

    if (!done || force) {
      // 正式版前 或 強制: 單人可重置
      if (force) await db.prepare("DELETE FROM game_meta WHERE key = 'v2_reset_done'").run();
      const result = await forceResetGame(db);
      if (result) return { success: true, message: '全服重置完成' };
      return { error: '重置失敗' };
    }

    // 正式版後: 需要多管理員簽署
    return { error: '正式版已上線，需3位管理員簽署才能重置。請用 /api/admin/reset/request 發起請求', needSignatures: true };
  }

  // 發起重置請求
  if (path === '/api/admin/reset/request') {
    const existing = await db.prepare("SELECT * FROM game_meta WHERE key = 'reset_request'").first();
    if (existing) {
      const req = JSON.parse(existing.value || '{}');
      if (req.executed) return { error: '重置已執行過了' };
      return { error: '已有重置請求進行中', request: req };
    }
    const admins = await db.prepare("SELECT id, username FROM users WHERE role = 'admin'").all();
    if (admins.results.length < 3) return { error: `需要至少3位管理員，目前只有${admins.results.length}位` };
    const request = {
      initiator: user.id,
      initiatorName: user.username,
      signatures: [user.id],
      required: 3,
      createdAt: Date.now(),
      executed: false,
    };
    await db.prepare("INSERT OR REPLACE INTO game_meta (key, value) VALUES ('reset_request', ?)").bind(JSON.stringify(request)).run();
    // 通知其他管理員
    for (const admin of admins.results) {
      if (admin.id !== user.id) {
        await notify(db, admin.id, 'reset_request', `⚠️ ${user.username} 發起了全服重置請求，需要你的簽署。前往管理面板確認。`);
      }
    }
    return { success: true, message: `重置請求已發起（${request.signatures.length}/${request.required}）`, request };
  }

  // 簽署重置請求
  if (path === '/api/admin/reset/sign') {
    const existing = await db.prepare("SELECT value FROM game_meta WHERE key = 'reset_request'").first();
    if (!existing) return { error: '沒有進行中的重置請求' };
    const req = JSON.parse(existing.value || '{}');
    if (req.executed) return { error: '重置已執行過了' };
    if (req.signatures.includes(user.id)) return { error: '你已經簽署過了' };
    req.signatures.push(user.id);
    await db.prepare("INSERT OR REPLACE INTO game_meta (key, value) VALUES ('reset_request', ?)").bind(JSON.stringify(req)).run();

    if (req.signatures.length >= req.required) {
      // 足夠簽署: 執行重置
      await db.prepare("DELETE FROM game_meta WHERE key = 'v2_reset_done'").run();
      const result = await forceResetGame(db);
      req.executed = true;
      req.executedAt = Date.now();
      await db.prepare("INSERT OR REPLACE INTO game_meta (key, value) VALUES ('reset_request', ?)").bind(JSON.stringify(req)).run();
      // 通知全體
      const admins = await db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
      for (const admin of admins.results) {
        await notify(db, admin.id, 'reset_executed', `✅ 全服重置已由 ${req.signatures.length} 位管理員簽署並執行！`);
      }
      return { success: true, message: '全服重置完成！' };
    }

    return { success: true, message: `簽署成功（${req.signatures.length}/${req.required}）`, request: req };
  }

  // 查詢重置請求狀態
  if (path === '/api/admin/reset/status') {
    const existing = await db.prepare("SELECT value FROM game_meta WHERE key = 'reset_request'").first();
    if (!existing) return { request: null };
    return { request: JSON.parse(existing.value || '{}') };
  }

  return null;
}
