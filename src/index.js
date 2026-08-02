import { corsHeaders, json, authCheck, createJWT, logTransaction, logHourly } from './utils.js';
import { handleIncome, processIncomeTick, getIncomePerMin } from './income.js';
import { handleBank, processBankTick } from './bank.js';
import { handleInvestment, processInvestmentTick } from './investment.js';
import { handleEmployee, processEmployeeTick } from './employee.js';
import { handleCompany, processCompanyTick } from './company.js';
import { handleStock, processMarginTick, finalizeIPO } from './stock.js';
import { handleDailyTasks, updateDailyTaskProgress } from './daily_tasks.js';
import { handleSubscription, processSubscriptionTick, getUserSubscriptions } from './subscription.js';
import { handleAdmin } from './admin.js';
import { handleInteractions, setupDiscordBot, listGuildBots, kickGuildBot, checkCryptoSupport, checkBodyEcho, listAppCommands, clearGuildCommands } from './discord_bot.js';
import { checkVoiceBoost, weeklySettlement } from './community.js';
import { DiscordGateway } from './gateway.js';

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

      // Discord Bot interactions (slash commands)
      if (path === '/interactions') {
        return await handleInteractions(request, env);
      }

      // 一次性 bot 設定 (註冊指令 + 查 public key + 改名)
      if (path === '/api/bot/setup' && request.method === 'GET') {
        const renameTo = url.searchParams.get('rename');
        const result = await setupDiscordBot(env, renameTo);
        return json(result, headers, result.error ? 400 : 200);
      }

      // 列出伺服器中的 bots
      if (path === '/api/bot/guild-bots' && request.method === 'GET') {
        const result = await listGuildBots(env);
        return json(result, headers, result.error ? 400 : 200);
      }

      // 列出應用指令
      if (path === '/api/bot/commands' && request.method === 'GET') {
        const result = await listAppCommands(env);
        return json(result, headers, result.error ? 400 : 200);
      }

      // 清除 guild commands 殘留
      if (path === '/api/bot/clear-guild-cmds' && request.method === 'GET') {
        const result = await clearGuildCommands(env);
        return json(result, headers, result.error ? 400 : 200);
      }

      // 踢除舊 bot
      if (path === '/api/bot/kick' && request.method === 'GET') {
        const botId = url.searchParams.get('botId');
        const result = await kickGuildBot(env, botId);
        return json(result, headers, result.error ? 400 : 200);
      }

      // 診斷 Ed25519 支援
      if (path === '/api/bot/crypto' && request.method === 'GET') {
        return json(await checkCryptoSupport(env), headers);
      }

      // 診斷 body 讀取
      if (path === '/api/bot/echo' && request.method === 'POST') {
        return json(await checkBodyEcho(request), headers);
      }

      // Gateway 狀態
      if (path === '/api/bot/gateway' && request.method === 'GET') {
        if (!env.GATEWAY) return json({ status: 'no_gateway_binding' }, headers);
        const id = env.GATEWAY.idFromName('main');
        const stub = env.GATEWAY.get(id);
        const resp = await stub.fetch('https://gateway/status');
        return new Response(resp.body, { headers: { 'content-type': 'application/json' } });
      }

      // Public leaderboard
      if (path === '/api/leaderboard') {
        const lb = await env.DB.prepare(`
          SELECT u.username, u.last_active, w.total_earned, w.cash,
            (SELECT COALESCE(SUM(quantity), 0) FROM stock_holdings WHERE user_id = u.id) as stocks
          FROM users u JOIN wallets w ON w.user_id = u.id
          ORDER BY w.total_earned DESC LIMIT 50
        `).all();
        const now = Date.now();
        return json(lb.results.map(u => ({ ...u, online: u.last_active && now - u.last_active < 300000 })), headers);
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
      // Track last active
      await env.DB.prepare('UPDATE users SET last_active = ? WHERE id = ?').bind(Date.now(), user.id).run();

      if (path === '/api/me') {
        const wallet = await env.DB.prepare('SELECT cash, savings, bank, total_earned FROM wallets WHERE user_id = ?').bind(user.id).first();
        const levels = await env.DB.prepare('SELECT computer, server, ai_assistant FROM income_levels WHERE user_id = ?').bind(user.id).first();
        const dbUser = await env.DB.prepare('SELECT username, role, discord_username, discord_avatar, last_active FROM users WHERE id = ?').bind(user.id).first();
        const investPending = await env.DB.prepare("SELECT COALESCE(SUM(pending_interest), 0) as p FROM investments WHERE user_id = ?").bind(user.id).first();

        // Offline earnings
        const now = Date.now();
        let offlineEarnings = 0;
        if (dbUser?.last_active) {
          const minutesAway = Math.floor((now - dbUser.last_active) / 60000);
          if (minutesAway > 2) {
            const subs = await getUserSubscriptions(env.DB, user.id);
            const income = await getIncomePerMin(env.DB, user.id, subs);
            const offlineRate = subs.cloud ? 0.8 : 0.5;
            const halfRate = Math.floor(income * offlineRate);
            offlineEarnings = halfRate * Math.min(minutesAway, 1440);
            if (offlineEarnings > 0) {
              await env.DB.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(offlineEarnings, offlineEarnings, user.id).run();
              await logTransaction(env.DB, user.id, 'income', offlineEarnings, '離線收益');
            }
          }
        }
        await env.DB.prepare('UPDATE users SET last_active = ? WHERE id = ?').bind(now, user.id).run();

        return json({ id: user.id, username: user.username, role: dbUser?.role || 'user', discord: dbUser?.discord_username, ...wallet, levels: levels || {}, pendingInterest: investPending?.p || 0, offlineEarnings }, headers);
      }

      if (path === '/api/transactions') {
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '50');
        const txs = await env.DB.prepare('SELECT * FROM transaction_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').bind(user.id, limit).all();
        return json(txs.results, headers);
      }

      const routes = [
        ['/api/income', handleIncome],
        ['/api/bank', handleBank],
        ['/api/investment', handleInvestment],
        ['/api/employee', handleEmployee],
        ['/api/company', handleCompany],
        ['/api/stock', handleStock],
        ['/api/subscription', handleSubscription],
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
    const db = env.DB;
    const minute = Math.floor(Date.now() / 60000);

    // 核心 tick: 每分鐘必跑 (income/扣費最重要)
    try {
      await processIncomeTick(db);
      await processBankTick(db);
      await processSubscriptionTick(db);
    } catch (err) {
      console.error('Scheduled core tick error:', err.message);
    }

    // 輪換 tick: 每 2 分鐘跑一次 (分鐘偶數)
    if (minute % 2 === 0) {
      try {
        await processInvestmentTick(db);
        await processEmployeeTick(db);
        await processCompanyTick(db);
      } catch (err) {
        console.error('Scheduled rotate tick error:', err.message);
      }
    }

    // 股票 tick: 每 2 分鐘跑一次 (分鐘奇數) — 最重
    if (minute % 2 === 1) {
      try {
        await finalizeIPO(db);
        await processMarginTick(db);
        await processStockTick(db, minute % 10 === 1); // 股利每10分鐘
      } catch (err) {
        console.error('Scheduled stock tick error:', err.message);
      }
    }

    // 社群維運: 語音監控每5分鐘, 週日24:00清算
    if (minute % 5 === 0) {
      try {
        await checkVoiceBoost(db, env);
      } catch (err) {
        console.error('Voice boost error:', err.message);
      }
      // 喚醒 Gateway DO (每5分鐘, 維持WebSocket)
      if (env.GATEWAY) {
        try {
          const stub = env.GATEWAY.get(env.GATEWAY.idFromName('main'));
          await stub.fetch('https://gateway/keepalive');
        } catch (e) {}
      }
    }
    const now = new Date();
    if (now.getDay() === 0 && now.getHours() === 0 && now.getMinutes() < 5) {
      try { await weeklySettlement(db, env); } catch (e) {}
    }
  },
};

export { DiscordGateway };

async function processStockTick(db, doDividend = true) {
  const companies = await db.prepare('SELECT * FROM companies').all();
  for (const company of companies.results) {
    const ipo = await db.prepare("SELECT phase FROM ipo_state WHERE company_id = ?").bind(company.id).first();
    if (!ipo || ipo.phase !== 'trading') continue;

    const interval = 5000;
    const block = Math.floor(Date.now() / interval) * interval;
    const trades = await db.prepare('SELECT price, quantity FROM stock_trades WHERE company_id = ? AND traded_at >= ?').bind(company.id, block).all();
    const companyData = await db.prepare('SELECT share_price FROM companies WHERE id = ?').bind(company.id).first();
    const close = companyData?.share_price || 100;

    if (trades.results.length > 0) {
      const open = trades.results[0].price;
      const high = Math.max(...trades.results.map(t => t.price));
      const low = Math.min(...trades.results.map(t => t.price));
      const volume = trades.results.reduce((s, t) => s + t.quantity, 0);
      const buyVol = trades.results.filter(t => t.type === 'buy').reduce((s, t) => s + t.quantity, 0);
      const sellVol = trades.results.filter(t => t.type === 'sell').reduce((s, t) => s + t.quantity, 0);
      try { await db.prepare('INSERT OR REPLACE INTO stock_klines (company_id, open, high, low, close, volume, buy_volume, sell_volume, minute) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(company.id, open, high, low, close, volume, buyVol, sellVol, block).run(); } catch (e) {}
    } else {
      // 無交易: 價格不變, 只補K線
      const prev = await db.prepare('SELECT close FROM stock_klines WHERE company_id = ? ORDER BY minute DESC LIMIT 1').bind(company.id).first();
      const prevClose = prev?.close || company.share_price || 100;
      try { await db.prepare('INSERT OR REPLACE INTO stock_klines (company_id, open, high, low, close, volume, minute) VALUES (?, ?, ?, ?, ?, 0, ?)').bind(company.id, prevClose, prevClose, prevClose, prevClose, block).run(); } catch (e) {}
    }

    if (!doDividend) continue;

    const baseIncome = company.base_income || 100;
    const growthRate = 0.0005;
    const elapsed = (Date.now() - company.created_at) / 60000;
    const currentIncome = Math.floor(baseIncome * Math.pow(1 + growthRate, Math.max(elapsed, 0)));
    const dividendPerShare = currentIncome / company.total_shares;

    const holdings = await db.prepare('SELECT user_id, quantity FROM stock_holdings WHERE company_id = ?').bind(company.id).all();
    for (const h of holdings.results) {
      const payout = Math.floor(dividendPerShare * h.quantity);
      if (payout > 0) {
        await db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(payout, payout, h.user_id).run();
        await logHourly(db, h.user_id, 'dividend', payout, `${company.name}股利`);
      }
    }

    const shortPositions = await db.prepare("SELECT id, user_id, quantity FROM margin_positions WHERE company_id = ? AND type = 'short'").bind(company.id).all();
    for (const pos of shortPositions.results) {
      const debt = Math.floor(dividendPerShare * pos.quantity);
      await db.prepare('UPDATE margin_positions SET dividend_debt = dividend_debt + ? WHERE id = ?').bind(debt, pos.id).run();
    }
  }
}
