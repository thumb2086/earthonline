import { corsHeaders, json, authCheck, createJWT } from './utils.js';
import { handleIncome } from './income.js';
import { handleBank, processBankTick } from './bank.js';
import { handleInvestment, processInvestmentTick } from './investment.js';
import { handleEmployee, processEmployeeTick } from './employee.js';
import { handleCompany } from './company.js';
import { handleStock, processMarginTick } from './stock.js';
import { handleContract } from './contract.js';
import { handleAdmin } from './admin.js';

const ADMIN_GUILD_ID = '1512345209005015101';
const ADMIN_ROLE_NAME = '地球管理團隊';

async function isAdmin(discordId, env) {
  if (!env.DISCORD_BOT_TOKEN) return false;
  try {
    const rolesRes = await fetch(`https://discord.com/api/v10/guilds/${ADMIN_GUILD_ID}/roles`, {
      headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` },
    });
    if (!rolesRes.ok) return false;
    const roles = await rolesRes.json();
    const adminRole = roles.find(r => r.name === ADMIN_ROLE_NAME);
    if (!adminRole) return false;

    const memberRes = await fetch(`https://discord.com/api/v10/guilds/${ADMIN_GUILD_ID}/members/${discordId}`, {
      headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` },
    });
    if (!memberRes.ok) return false;
    const member = await memberRes.json();
    return member.roles && member.roles.includes(adminRole.id);
  } catch {
    return false;
  }
}

const CALLBACK_PATH = '/api/auth/cb';

async function handleDiscordLogin(request, env, headers, url) {
  try {
  const code = url.searchParams.get('code');
  if (!code) return json({ error: 'Missing code' }, headers, 400);

  const redirectUri = (env.FRONTEND_URL || `${url.origin}`) + CALLBACK_PATH;
  const bodyParams = new URLSearchParams();
  bodyParams.append('client_id', env.DISCORD_CLIENT_ID);
  bodyParams.append('client_secret', env.DISCORD_CLIENT_SECRET);
  bodyParams.append('code', code);
  bodyParams.append('grant_type', 'authorization_code');
  bodyParams.append('redirect_uri', redirectUri);

  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    body: bodyParams.toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  if (!tokenRes.ok) return json({ error: 'Discord token exchange failed' }, headers, 400);
  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) return json({ error: 'Discord OAuth failed' }, headers, 400);

  const userRes = await fetch('https://discord.com/api/users/@me', {
    headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` },
  });
  if (!userRes.ok) return json({ error: 'Discord user fetch failed' }, headers, 400);
  const discordUser = await userRes.json();

  const admin = await isAdmin(discordUser.id, env);
  const role = admin ? 'admin' : 'user';

  let account = await env.DB.prepare('SELECT id, username, role FROM users WHERE discord_id = ?').bind(discordUser.id).first();
  if (!account) {
    let baseName = (discordUser.global_name || discordUser.username).replace(/\s+/g, '_');
    let finalName = baseName;
    let counter = 1;
    while (await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(finalName).first()) {
      finalName = `${baseName}_${counter++}`;
    }
    const info = await env.DB.prepare('INSERT INTO users (username, password_hash, role, discord_id, discord_username, discord_avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(finalName, '', role, discordUser.id, discordUser.global_name || discordUser.username, '', Date.now()).run();
    const userId = info.meta.last_row_id;
    await env.DB.prepare('INSERT INTO wallets (user_id, cash, created_at) VALUES (?, 100, ?)').bind(userId, Date.now()).run();
    await env.DB.prepare('INSERT INTO income_levels (user_id) VALUES (?)').bind(userId).run();
    account = { id: userId, username: finalName, role };
  } else if (role === 'admin' && account.role !== 'admin') {
    await env.DB.prepare("UPDATE users SET role = 'admin' WHERE discord_id = ?").bind(discordUser.id).run();
    account.role = 'admin';
  }

  const token = await createJWT({ id: account.id, username: account.username, role: account.role }, env.JWT_SECRET);
  const frontendUrl = env.FRONTEND_URL || `${url.origin}`;
  return Response.redirect(`${frontendUrl}/?token=${token}`, 302);
  } catch (err) {
    return json({ error: 'callback error: ' + err.message }, headers, 500);
  }
}

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const headers = corsHeaders(request);

      if (request.method === 'OPTIONS') return new Response(null, { headers });

      if (path === '/api/health') return json({ status: 'ok', timestamp: Date.now() }, headers);

      if (path === '/api/auth/discord' && request.method === 'GET') {
        const state = url.searchParams.get('state') || 'discord_login';
        const redirectUri = (env.FRONTEND_URL || `${url.origin}`) + CALLBACK_PATH;
        const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify&state=${state}`;
        return Response.redirect(discordAuthUrl, 302);
      }

      if (path === CALLBACK_PATH && request.method === 'GET') {
        return await handleDiscordLogin(request, env, headers, url);
      }

      // Public leaderboard
      if (path === '/api/leaderboard') {
        const lb = await env.DB.prepare(`
          SELECT u.username, w.total_earned, w.cash,
            (SELECT COALESCE(SUM(quantity), 0) FROM stock_holdings WHERE user_id = u.id) as stocks
          FROM users u JOIN wallets w ON w.user_id = u.id
          ORDER BY w.total_earned DESC LIMIT 50
        `).all();
        return json(lb.results, headers);
      }

      // Static assets — no auth required
      if (!path.startsWith('/api/')) {
        const res = await env.ASSETS.fetch(request);
        if (res.status === 404 && path !== '/') {
          return env.ASSETS.fetch(new URL('/index.html', url.origin));
        }
        return res;
      }

      const user = await authCheck(request, env);
      if (!user) return json({ error: 'Unauthorized' }, headers, 401);

      if (path === '/api/me') {
        const wallet = await env.DB.prepare('SELECT cash, savings, bank, total_earned FROM wallets WHERE user_id = ?').bind(user.id).first();
        const levels = await env.DB.prepare('SELECT computer, server, ai_assistant FROM income_levels WHERE user_id = ?').bind(user.id).first();
        const dbUser = await env.DB.prepare('SELECT username, role, discord_username, discord_avatar FROM users WHERE id = ?').bind(user.id).first();
        return json({ id: user.id, username: user.username, role: dbUser?.role || 'user', discord: dbUser?.discord_username, ...wallet, levels: levels || {} }, headers);
      }

      const routes = [
        ['/api/income', handleIncome],
        ['/api/bank', handleBank],
        ['/api/investment', handleInvestment],
        ['/api/employee', handleEmployee],
        ['/api/company', handleCompany],
        ['/api/stock', handleStock],
        ['/api/contract', handleContract],
        ['/api/admin', handleAdmin],
      ];

      for (const [prefix, handler] of routes) {
        if (path.startsWith(prefix)) {
          const result = await handler(env, request, path, user);
          if (result !== null) return json(result, headers, result.error ? 400 : 200);
        }
      }

      return json({ error: 'Not found' }, headers, 404);
    } catch (err) {
      return json({ error: err.message, stack: err.stack }, headers, 500);
    }
  },

  async scheduled(event, env, ctx) {
    try {
      const db = env.DB;
      await processBankTick(db);
      await processInvestmentTick(db);
      await processEmployeeTick(db);
      await processMarginTick(db);
      await processStockTick(db);
    } catch (err) {
      console.error('Scheduled tick error:', err.message);
    }
  },
};

async function processStockTick(db) {
  const companies = await db.prepare('SELECT * FROM companies').all();
  for (const company of companies.results) {
    const ipo = await db.prepare("SELECT phase FROM ipo_state WHERE company_id = ?").bind(company.id).first();
    if (!ipo || ipo.phase !== 'trading') continue;

    const minute = Math.floor(Date.now() / 60000);
    const trades = await db.prepare('SELECT price, quantity FROM stock_trades WHERE company_id = ? AND traded_at >= ?').bind(company.id, minute * 60000).all();
    const last = await db.prepare('SELECT price FROM stock_trades WHERE company_id = ? ORDER BY traded_at DESC LIMIT 1').bind(company.id).first();
    const close = last?.price || company.share_price;

    if (trades.results.length > 0) {
      const open = trades.results[0].price;
      const high = Math.max(...trades.results.map(t => t.price));
      const low = Math.min(...trades.results.map(t => t.price));
      const volume = trades.results.reduce((s, t) => s + t.quantity, 0);
      try { await db.prepare('INSERT INTO stock_klines (company_id, open, high, low, close, volume, minute) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(company.id, open, high, low, close, volume, minute).run(); } catch (e) {}
    } else {
      const prev = await db.prepare('SELECT close FROM stock_klines WHERE company_id = ? ORDER BY minute DESC LIMIT 1').bind(company.id).first();
      const prevClose = prev?.close || company.share_price;
      try { await db.prepare('INSERT INTO stock_klines (company_id, open, high, low, close, volume, minute) VALUES (?, ?, ?, ?, ?, 0, ?)').bind(company.id, prevClose, prevClose, prevClose, prevClose, minute).run(); } catch (e) {}
    }

    const baseIncome = company.base_income || 100;
    const growthRate = 0.0005;
    const elapsed = (Date.now() - company.created_at) / 60000;
    const currentIncome = Math.floor(baseIncome * Math.pow(1 + growthRate, Math.max(elapsed, 0)));
    const dividendPerShare = currentIncome / company.total_shares;

    const holdings = await db.prepare('SELECT user_id, quantity FROM stock_holdings WHERE company_id = ?').bind(company.id).all();
    for (const h of holdings.results) {
      const payout = Math.floor(dividendPerShare * h.quantity);
      if (payout > 0) await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(payout, payout, h.user_id).run();
    }

    const shortPositions = await db.prepare("SELECT id, user_id, quantity FROM margin_positions WHERE company_id = ? AND type = 'short'").bind(company.id).all();
    for (const pos of shortPositions.results) {
      const debt = Math.floor(dividendPerShare * pos.quantity);
      await db.prepare('UPDATE margin_positions SET dividend_debt = dividend_debt + ? WHERE id = ?').bind(debt, pos.id).run();
    }
  }
}
