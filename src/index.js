import { corsHeaders, json, authCheck, createJWT, logTransaction, logHourly, notify, createHourlyLogger, validateUsername } from './utils.js';
import { handleIncome, processIncomeTick, getIncomePerMin } from './income.js';
import { handleBank, processBankTick } from './bank.js';
import { handleInvestment, processInvestmentTick } from './investment.js';
import { handleEmployee, processEmployeeTick } from './employee.js';
import { handleCompany, processCompanyTick } from './company.js';
import { handleStock, processMarginTick, finalizeIPO, matchLimitOrders } from './stock.js';
import { handleEtf, etfTick } from './etf.js';
import { handleFutures, settleFutures } from './futures.js';
import { computeMarketIndex } from './stock.js';
import { MarketWS } from './market_ws.js';
import { adjustInterestRates } from './rates.js';
import { postV2Announcement, maybeResetGame } from './reset.js';
import { snapshotCompanyReports } from './reports.js';
import { handleDailyTasks, updateDailyTaskProgress } from './daily_tasks.js';
import { handleSubscription, processSubscriptionTick, getUserSubscriptions } from './subscription.js';
import { handleAdmin } from './admin.js';
import { handleInteractions, setupDiscordBot, listGuildBots, kickGuildBot, checkCryptoSupport, checkBodyEcho, listAppCommands, clearGuildCommands } from './discord_bot.js';
import { checkVoiceBoost, weeklySettlement, rankIdxFromPct, RANK_LABELS } from './community.js';
import { DiscordGateway } from './gateway.js';
import { getDailyLoginStatus, claimDailyLogin } from './daily_login.js';
import { handleLaunchEvent, getLaunchEventStatus, giveNewbieGift, maybeDistributeDailyLeaderboard } from './launch_event.js';
import { getScratchStatus, scratch, getScratchHistory } from './scratch.js';
import { getLotteryStatus, buyTicket, drawLottery, getLotteryHistory } from './lottery.js';
import { handleMining, processMiningTick, loadMiningModels } from './mining.js';
import { handleCasino } from './casino.js';

const ADMIN_GUILD_ID = '1512345209005015101';
const ADMIN_ROLE_NAME = '地球管理團隊';

// 與 client/index.html 的 meta CSP 一致; 這裡用 header 傳送才能支援 frame-ancestors
const CSP_HEADER = "default-src 'self'; script-src 'self' https://pagead2.googlesyndication.com https://static.cloudflareinsights.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://discord.com https://www.googleapis.com https://static.cloudflareinsights.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google; frame-src https://googleads.g.doubleclick.net https://pagead2.googlesyndication.com https://ep1.adtrafficquality.google https://ep2.adtrafficquality.google https://www.google.com; frame-ancestors 'none'";

const rateLimitMap = new Map();
function checkRateLimit(key, limit = 30, windowMs = 60000) {
  const now = Date.now();
  let entry = rateLimitMap.get(key);
  if (!entry || now - entry.start > windowMs) { entry = { start: now, count: 0 }; rateLimitMap.set(key, entry); }
  entry.count++;
  if (entry.count > limit) return false;
  if (rateLimitMap.size > 10000) { for (const [k, v] of rateLimitMap) { if (now - v.start > windowMs) rateLimitMap.delete(k); } }
  return true;
}

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
const GOOGLE_CALLBACK_PATH = '/api/auth/google/cb';

// OAuth state 驗證: 產生隨機 state 存 DB (10 分鐘有效), callback 時驗證並刪除
async function createOAuthState(db, provider) {
  const state = [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, '0')).join('');
  await db.prepare('INSERT INTO oauth_states (state, provider, created_at) VALUES (?, ?, ?)').bind(state, provider, Date.now()).run();
  return state;
}

async function consumeOAuthState(db, state, provider) {
  if (!state) return false;
  const row = await db.prepare('SELECT created_at FROM oauth_states WHERE state = ? AND provider = ?').bind(state, provider).first();
  if (!row) return false;
  if (Date.now() - row.created_at > 10 * 60000) {
    await db.prepare('DELETE FROM oauth_states WHERE state = ?').bind(state).run();
    return false;
  }
  await db.prepare('DELETE FROM oauth_states WHERE state = ?').bind(state).run();
  return true;
}

async function handleGoogleLogin(request, env, headers, url) {
  try {
    const code = url.searchParams.get('code');
    if (!code) return json({ error: 'Missing code' }, headers, 400);
    if (!(await consumeOAuthState(env.DB, url.searchParams.get('state'), 'google'))) return json({ error: 'OAuth state 驗證失敗' }, headers, 400);

    const redirectUri = (env.FRONTEND_URL || `${url.origin}`) + GOOGLE_CALLBACK_PATH;
    const bodyParams = new URLSearchParams();
    bodyParams.append('client_id', env.GOOGLE_CLIENT_ID);
    bodyParams.append('client_secret', env.GOOGLE_CLIENT_SECRET);
    bodyParams.append('code', code);
    bodyParams.append('grant_type', 'authorization_code');
    bodyParams.append('redirect_uri', redirectUri);

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: bodyParams.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    if (!tokenRes.ok) return json({ error: 'Google token exchange failed' }, headers, 400);
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return json({ error: 'Google OAuth failed' }, headers, 400);

    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok) return json({ error: 'Google user fetch failed' }, headers, 400);
    const gUser = await userRes.json();

    let account = await env.DB.prepare('SELECT id, username, role FROM users WHERE google_id = ?').bind(gUser.id).first();
    if (!account) {
      let baseName = (gUser.name || gUser.email || 'google_user').replace(/\s+/g, '_').replace(/[^\w\u4e00-\u9fff-]/g, '');
      if (!baseName) baseName = 'google_user';
      let finalName = baseName;
      let counter = 1;
      while (validateUsername(finalName) || await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(finalName).first()) {
        finalName = `${baseName}_${counter++}`;
      }
      const info = await env.DB.prepare('INSERT INTO users (username, password_hash, role, google_id, google_username, google_avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(finalName, '', 'user', gUser.id, gUser.name || gUser.email, gUser.picture || '', Date.now()).run();
      const userId = info.meta.last_row_id;
      await env.DB.prepare('INSERT INTO wallets (user_id, cash, created_at) VALUES (?, 100, ?)').bind(userId, Date.now()).run();
      await env.DB.prepare('INSERT INTO income_levels (user_id) VALUES (?)').bind(userId).run();
      account = { id: userId, username: finalName, role: 'user' };
    }

    const token = await createJWT({ id: account.id, username: account.username, role: account.role }, env.JWT_SECRET);
    const frontendUrl = env.FRONTEND_URL || `${url.origin}`;
    return Response.redirect(`${frontendUrl}/login#token=${token}`, 302);
  } catch (err) {
    return json({ error: 'google callback error: ' + err.message }, headers, 500);
  }
}

async function handleDiscordLogin(request, env, headers, url) {
  try {
  const code = url.searchParams.get('code');
  if (!code) return json({ error: 'Missing code' }, headers, 400);
  if (!(await consumeOAuthState(env.DB, url.searchParams.get('state'), 'discord'))) return json({ error: 'OAuth state 驗證失敗' }, headers, 400);

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
    while (validateUsername(finalName) || await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(finalName).first()) {
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
  return Response.redirect(`${frontendUrl}/login#token=${token}`, 302);
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
        const state = await createOAuthState(env.DB, 'discord');
        const redirectUri = (env.FRONTEND_URL || `${url.origin}`) + CALLBACK_PATH;
        const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify&state=${state}`;
        return Response.redirect(discordAuthUrl, 302);
      }

      if (path === CALLBACK_PATH && request.method === 'GET') {
        return await handleDiscordLogin(request, env, headers, url);
      }

      if (path === '/api/auth/google' && request.method === 'GET') {
        const state = await createOAuthState(env.DB, 'google');
        const redirectUri = (env.FRONTEND_URL || `${url.origin}`) + GOOGLE_CALLBACK_PATH;
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&prompt=select_account&state=${state}`;
        return Response.redirect(googleAuthUrl, 302);
      }

      if (path === GOOGLE_CALLBACK_PATH && request.method === 'GET') {
        return await handleGoogleLogin(request, env, headers, url);
      }

      // Discord Bot interactions (slash commands)
      if (path === '/interactions') {
        return await handleInteractions(request, env);
      }

      // 一次性 bot 設定 (註冊指令 + 查 public key + 改名)
      if (path === '/api/bot/setup' && request.method === 'GET') {
        const au = await authCheck(request, env);
        if (!au || au.role !== 'admin') return json({ error: 'Unauthorized' }, headers, 401);
        const renameTo = url.searchParams.get('rename');
        const result = await setupDiscordBot(env, renameTo);
        return json(result, headers, result.error ? 400 : 200);
      }

      // 列出伺服器中的 bots
      if (path === '/api/bot/guild-bots' && request.method === 'GET') {
        const au = await authCheck(request, env);
        if (!au || au.role !== 'admin') return json({ error: 'Unauthorized' }, headers, 401);
        const result = await listGuildBots(env);
        return json(result, headers, result.error ? 400 : 200);
      }

      // 列出應用指令
      if (path === '/api/bot/commands' && request.method === 'GET') {
        const au = await authCheck(request, env);
        if (!au || au.role !== 'admin') return json({ error: 'Unauthorized' }, headers, 401);
        const result = await listAppCommands(env);
        return json(result, headers, result.error ? 400 : 200);
      }

      // 清除 guild commands 殘留
      if (path === '/api/bot/clear-guild-cmds' && request.method === 'GET') {
        const au = await authCheck(request, env);
        if (!au || au.role !== 'admin') return json({ error: 'Unauthorized' }, headers, 401);
        const result = await clearGuildCommands(env);
        return json(result, headers, result.error ? 400 : 200);
      }

      // 踢除舊 bot
      if (path === '/api/bot/kick' && request.method === 'GET') {
        const au = await authCheck(request, env);
        if (!au || au.role !== 'admin') return json({ error: 'Unauthorized' }, headers, 401);
        const botId = url.searchParams.get('botId');
        const result = await kickGuildBot(env, botId);
        return json(result, headers, result.error ? 400 : 200);
      }

      // 診斷 Ed25519 支援 — 需登入
      if (path === '/api/bot/crypto' && request.method === 'GET') {
        const au = await authCheck(request, env);
        if (!au) return json({ error: 'Unauthorized' }, headers, 401);
        return json(await checkCryptoSupport(env), headers);
      }

      // 診斷 body 讀取 — 需 admin (回顯請求頭含 IP)
      if (path === '/api/bot/echo' && request.method === 'POST') {
        const au = await authCheck(request, env);
        if (!au || au.role !== 'admin') return json({ error: '管理員專用' }, headers, 401);
        return json(await checkBodyEcho(request), headers);
      }

      // Gateway 狀態 — 需登入
      if (path === '/api/bot/gateway' && request.method === 'GET') {
        const au = await authCheck(request, env);
        if (!au) return json({ error: 'Unauthorized' }, headers, 401);
        if (!env.GATEWAY) return json({ status: 'no_gateway_binding' }, headers);
        const id = env.GATEWAY.idFromName('main');
        const stub = env.GATEWAY.get(id);
        const resp = await stub.fetch('https://gateway/status');
        return new Response(resp.body, { headers: { 'content-type': 'application/json' } });
      }

      // Public leaderboard — 只暴露排名所需 (不洩漏個人錢包細節)
      if (path === '/api/leaderboard') {
        const users = await env.DB.prepare(`
          SELECT u.id, u.username, u.last_active, u.discord_id IS NOT NULL AS has_dc, w.total_earned, w.cash, w.savings, w.bank,
            (SELECT COALESCE(SUM(h.quantity * c.share_price), 0) FROM stock_holdings h JOIN companies c ON c.id = h.company_id WHERE h.user_id = u.id) as stock_value,
            (SELECT COALESCE(SUM(quantity), 0) FROM stock_holdings WHERE user_id = u.id) as stocks,
            (SELECT COALESCE(SUM(remaining), 0) FROM loans WHERE user_id = u.id AND status = 'active') as debt,
            (SELECT COALESCE(SUM(amount), 0) FROM investments WHERE user_id = u.id) as investments
          FROM users u JOIN wallets w ON w.user_id = u.id
        `).all();
        const now = Date.now();
        // 身份計算基數 = 所有玩家
        const total = users.results.length || 1;
        const earnedOrder = [...users.results].sort((a, b) => (b.total_earned || 0) - (a.total_earned || 0));
        const earnedIdx = new Map(earnedOrder.map((u, i) => [u.id, i]));
        const rows = users.results.map(u => {
          const i = earnedIdx.get(u.id);
          const rank = i === undefined ? null : RANK_LABELS[rankIdxFromPct((i + 1) / total)];
          return {
            id: u.id,
            username: u.username,
            rank,
            worth: (u.cash || 0) + (u.savings || 0) + (u.bank || 0) + (u.stock_value || 0) + (u.investments || 0) - (u.debt || 0),
            stocks: u.stocks || 0,
            online: u.last_active && now - u.last_active < 300000,
          };
        });
        rows.sort((a, b) => b.worth - a.worth);
        return json(rows.slice(0, 50), headers);
      }

      // Static assets — no auth required
      if (!path.startsWith('/api/') && !path.startsWith('/ws/')) {
        let res = await env.ASSETS.fetch(request);
        if (res.status === 404 && path !== '/') {
          res = await env.ASSETS.fetch(new URL('/index.html', url.origin));
        }
        const withCsp = new Response(res.body, res);
        withCsp.headers.set('Content-Security-Policy', CSP_HEADER);
        // HTML 不進邊緣快取 (private), 確保 worker 的 CSP header 每次都送達; js/css 不在此列
        if ((res.headers.get('content-type') || '').includes('text/html')) {
          withCsp.headers.set('Cache-Control', 'private, max-age=0, must-revalidate');
        }
        return withCsp;
      }

      // Market WebSocket (不需要 auth, DO 自己處理)
      if (path.startsWith('/ws/market/')) {
        const stub = env.MARKET_WS.get(env.MARKET_WS.idFromName('market'));
        return stub.fetch(request);
      }

      const user = await authCheck(request, env);
      if (!user) return json({ error: 'Unauthorized' }, headers, 401);
      const banned = await env.DB.prepare('SELECT reason FROM blacklist WHERE user_id = ?').bind(user.id).first();
      if (banned) return json({ error: `帳號已被停權：${banned.reason}` }, headers, 403);
      if (!checkRateLimit(`user:${user.id}`, 300)) return json({ error: '請求過於頻繁，請稍後再試' }, headers, 429);
      // Track last active (每 60 秒才寫一次，省 DB 寫入)
      const lastActiveKey = `la:${user.id}`;
      if (!checkRateLimit(lastActiveKey, 1, 60000)) {
        // skip
      } else {
        await env.DB.prepare('UPDATE users SET last_active = ? WHERE id = ?').bind(Date.now(), user.id).run();
      }

      if (path === '/api/me') {
        const wallet = await env.DB.prepare('SELECT cash, savings, bank, total_earned FROM wallets WHERE user_id = ?').bind(user.id).first();
        const levels = await env.DB.prepare('SELECT computer, server, ai_assistant FROM income_levels WHERE user_id = ?').bind(user.id).first();
        const dbUser = await env.DB.prepare('SELECT username, role, discord_username, discord_avatar, last_active FROM users WHERE id = ?').bind(user.id).first();
        const investPending = await env.DB.prepare("SELECT COALESCE(SUM(pending_interest), 0) as p FROM investments WHERE user_id = ?").bind(user.id).first();
        const btcRow = await env.DB.prepare("SELECT amount FROM user_btc WHERE user_id = ?").bind(user.id).first();

        // 離線收益
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

        // 預估每分鐘股利 (持股數 × 每股股利/分)
        const holdings = await env.DB.prepare('SELECT company_id, quantity FROM stock_holdings WHERE user_id = ?').bind(user.id).all();
        let estDivPerMin = 0;
        for (const h of (holdings.results || [])) {
          const comp = await env.DB.prepare('SELECT base_income, total_shares, created_at, industry FROM companies WHERE id = ?').bind(h.company_id).first();
          if (!comp || comp.total_shares <= 0) continue;
          const elapsed = Math.max((now - (comp.created_at || now)) / 60000, 0);
          const growth = 0.0005;
          const currentIncome = Math.floor((comp.base_income || 100) * Math.pow(1 + growth, elapsed));
          const divPerShare = currentIncome / comp.total_shares / 10;
          estDivPerMin += divPerShare * h.quantity;
        }

        return json({ id: user.id, username: user.username, role: dbUser?.role || 'user', discord: dbUser?.discord_username, ...wallet, levels: levels || {}, pendingInterest: investPending?.p || 0, offlineEarnings, estDivPerMin: Math.round(estDivPerMin * 100) / 100, btc: btcRow?.amount || 0 }, headers);
      }

      if (path === '/api/auth/rename' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const name = String(body.username || '').trim();
        const err = validateUsername(name);
        if (err) return json({ error: err }, headers, 400);
        const dup = await env.DB.prepare('SELECT id FROM users WHERE username = ? AND id != ?').bind(name, user.id).first();
        if (dup) return json({ error: '此名稱已被使用' }, headers, 400);
        await env.DB.prepare('UPDATE users SET username = ? WHERE id = ?').bind(name, user.id).run();
        return json({ success: true, username: name }, headers);
      }

      if (path === '/api/transactions') {
        const url = new URL(request.url);
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '50') || 50, 200);
        const txs = await env.DB.prepare('SELECT * FROM transaction_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').bind(user.id, limit).all();
        return json(txs.results, headers);
      }

      if (path === '/api/notifications') {
        const url = new URL(request.url);
        const limit = Math.min(parseInt(url.searchParams.get('limit') || '30') || 30, 200);
        const rows = await env.DB.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?').bind(user.id, limit).all();
        const unread = await env.DB.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND read = 0').bind(user.id).first();
        return json({ items: rows.results, unread: unread?.c || 0 }, headers);
      }

      if (path === '/api/notifications/read' && request.method === 'POST') {
        await env.DB.prepare('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0').bind(user.id).run();
        return json({ success: true }, headers);
      }

      if (path === '/api/daily-login/status') {
        return json(await getDailyLoginStatus(env.DB, user.id), headers);
      }
      if (path === '/api/daily-login/claim' && request.method === 'POST') {
        const r = await claimDailyLogin(env.DB, user.id, (uid, type, msg) => notify(env.DB, uid, type, msg));
        return json(r, headers);
      }
      if (path === '/api/launch/newbie-gift' && request.method === 'POST') {
        return json(await giveNewbieGift(env.DB, user.id), headers);
      }

      const launchResult = await handleLaunchEvent(env, request, path, user);
      if (launchResult !== null) return json(launchResult, headers);

      if (path === '/api/scratch/status') {
        return json(await getScratchStatus(env.DB, user.id), headers);
      }
      if (path === '/api/scratch/buy' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        return json(await scratch(env.DB, user.id, body.tier, !!body.free), headers);
      }
      if (path === '/api/scratch/history') {
        return json(await getScratchHistory(env.DB, user.id), headers);
      }
      if (path === '/api/lottery/status') {
        return json(await getLotteryStatus(env.DB, user.id), headers);
      }
      if (path === '/api/lottery/buy' && request.method === 'POST') {
        const body = await request.json().catch(() => ({}));
        return json(await buyTicket(env.DB, user.id, body.numbers, !!body.free), headers);
      }
      if (path === '/api/lottery/history') {
        return json(await getLotteryHistory(env.DB), headers);
      }
      if (path.startsWith('/api/mining')) {
        const r = await handleMining(env, request, path, user);
        if (r !== null) return json(r, headers);
      }
      if (path.startsWith('/api/casino')) {
        const r = await handleCasino(env, request, path, user);
        if (r !== null) return json(r, headers);
      }

      const routes = [
        ['/api/income', handleIncome],
        ['/api/bank', handleBank],
        ['/api/investment', handleInvestment],
        ['/api/employee', handleEmployee],
        ['/api/company', handleCompany],
        ['/api/stock', handleStock],
        ['/api/etf', handleEtf],
        ['/api/futures', handleFutures],
        ['/api/subscription', handleSubscription],
        ['/api/admin', handleAdmin],
      ];

      // 公開資料邊緣快取 (秒): 只快取「全用戶相同」的資料, 提高 Cache hit rate
      const PUBLIC_CACHE_TTL = {
        '/api/stock/index': 3,
        '/api/stock/quote': 3,
        '/api/leaderboard': 15,
        '/api/investment/terms': 60,
        '/api/stock/report': 30,
      };

      for (const [prefix, handler] of routes) {
        if (path.startsWith(prefix)) {
          const result = await handler(env, request, path, user);
          if (result !== null) {
            // 公開 GET 且無錯誤 → 加 Cache-Control 進邊緣快取
            const ttl = request.method === 'GET' && !result.error ? PUBLIC_CACHE_TTL[path] : undefined;
            if (ttl) {
              return json(result, { ...headers, 'Cache-Control': `public, max-age=${ttl}` }, 200);
            }
            return json(result, headers, result.error ? 400 : 200);
          }
        }
      }

      return json({ error: 'Not found' }, headers, 404);
    } catch (err) {
      console.error('Request error:', err.message);
      return json({ error: '伺服器錯誤' }, headers, 500);
    }
  },

  async scheduled(event, env, ctx) {
    const db = env.DB;
    const minute = Math.floor(Date.now() / 60000);

    // 核心 tick: 每分鐘必跑 (income/扣費/投資利息) — 各自獨立容錯
    // 共用批次 logger: 1次預載 + 記憶體累加 + 最後1次 batch 寫入 (取代逐用戶 logHourly)
    const hourlyLogger = await createHourlyLogger(db);
    try { await processIncomeTick(db, hourlyLogger); } catch (err) { console.error('Scheduled income error:', err.message); }
    try { await processBankTick(db, hourlyLogger); } catch (err) { console.error('Scheduled bank error:', err.message); }
    try { await processSubscriptionTick(db, hourlyLogger); } catch (err) { console.error('Scheduled subscription error:', err.message); }
    try { await processInvestmentTick(db, hourlyLogger); } catch (err) { console.error('Scheduled investment error:', err.message); }
    try { await processMiningTick(db, hourlyLogger); } catch (err) { console.error('Scheduled mining error:', err.message); }

    // K線生成: cron每分鐘
    try { await processPriceWave(db); } catch (err) { console.error('Scheduled wave error:', err.message); }

    // cron每分鐘確保 DO alarm 持續運作
    if (env.MARKET_WS) {
      try {
        const stub = env.MARKET_WS.get(env.MARKET_WS.idFromName('market'));
        await stub.fetch('https://market/init', { method: 'POST' });
      } catch {}
    }

    // 掛單撮合: 每分鐘執行
    try {
      await matchLimitOrders(db);
    } catch (err) {
      console.error('Scheduled limit orders error:', err.message);
    }

    // ETF + 期貨結算: 共用一次 computeMarketIndex (省 ~41 查詢)
    try {
      const marketIndex = await computeMarketIndex(db);
      await etfTick(db, marketIndex);
      await settleFutures(db, marketIndex);
    } catch (err) {
      console.error('Scheduled derivatives error:', err.message);
    }

    // 央行利率決策: 每 30 分鐘 (仿聯準會升降息)
    if (minute % 30 === 0) {
      try {
        await adjustInterestRates(db);
      } catch (err) {
        console.error('Scheduled rate decision error:', err.message);
      }
    }

    // 財報快照: 每小時 (基本面分析資料源)
    if (minute % 60 === 0) {
      try {
        await snapshotCompanyReports(db);
      } catch (err) {
        console.error('Scheduled report snapshot error:', err.message);
      }
    }

    // 正式版公告 + 8/19 重置檢查: 每分鐘 (一次性)
    try {
      await postV2Announcement(db);
      await maybeResetGame(db);
    } catch (err) {
      console.error('Scheduled v2 reset check error:', err.message);
    }

    // 輪換 tick: 每 2 分鐘跑一次 (分鐘偶數)
    if (minute % 2 === 0) {
      try {
        await processEmployeeTick(db);
        await processCompanyTick(db, hourlyLogger);
        await processStockTick(db, minute % 10 === 0, hourlyLogger); // K線+股利每10分鐘
      } catch (err) {
        console.error('Scheduled rotate tick error:', err.message);
      }
    }

    // 股票關鍵 tick: 每 2 分鐘 (分鐘奇數) — IPO/槓桿
    if (minute % 2 === 1) {
      try {
        await finalizeIPO(db);
        await processMarginTick(db);
        // K 線留存: 保留最近 48 小時 (半小時清理一次, 防表無限膨脹)
        if (minute % 60 === 30) {
          await db.prepare('DELETE FROM stock_klines WHERE minute < ?').bind(Date.now() - 48 * 3600000).run();
        }
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
    // 每天 00:00~00:10 UTC (台灣 08:00) 社會階級清算 + 開服排行榜每日發獎
    if (now.getHours() === 0 && now.getMinutes() < 10) {
      try { await weeklySettlement(db, env); } catch (e) {}
      try { await maybeDistributeDailyLeaderboard(db); } catch (e) {}
    }
    // 樂透: 每分鐘都檢查，滿 24 小時自動開獎
    try { await drawLottery(db); } catch (e) { console.error('Lottery draw error:', e.message); }
    // 最後才 flush 小時彙總 log (收集所有 tick 後一次 batch 寫入)
    try { await hourlyLogger.flush(); } catch (err) { console.error('Scheduled hourly log flush error:', err.message); }
  },
};

// K線生成: cron每分鐘, ±1.5% + 回歸力
async function processPriceWave(db) {
  const companies = await db.prepare('SELECT id, name, share_price, total_shares, issue_cap FROM companies').all();
  if (companies.results.length === 0) return;
  const now = Date.now();
  const interval = 5000;

  const [ipoRes, invRes, klineRes] = await db.batch([
    db.prepare("SELECT company_id, phase FROM ipo_state"),
    db.prepare('SELECT company_id, stock_quantity FROM stock_inventory'),
    db.prepare('SELECT company_id, close, minute FROM stock_klines WHERE minute > ? ORDER BY company_id, minute DESC').bind(now - 3600000),
  ]);
  const ipoPhase = {};
  for (const r of ipoRes.results) ipoPhase[r.company_id] = r.phase;
  const invQty = {};
  for (const r of invRes.results) invQty[r.company_id] = r.stock_quantity;
  const klinesByCompany = {};
  for (const r of klineRes.results) {
    if (!klinesByCompany[r.company_id]) klinesByCompany[r.company_id] = [];
    klinesByCompany[r.company_id].push(r);
  }

  const allStmts = [];
  const announcements = [];

  for (const c of companies.results) {
    if (ipoPhase[c.id] !== 'trading') continue;

    const stockQty = invQty[c.id];
    const issueCap = c.issue_cap || (c.total_shares * 2);
    if (stockQty !== undefined) {
      const floor = Math.floor(c.total_shares * 0.1);
      if (stockQty < floor && c.total_shares < issueCap) {
        const topUp = Math.min(Math.floor(c.total_shares * 0.2) - stockQty, issueCap - c.total_shares);
        if (topUp > 0) {
          allStmts.push(db.prepare('UPDATE companies SET total_shares = total_shares + ? WHERE id = ?').bind(topUp, c.id));
          allStmts.push(db.prepare('UPDATE stock_inventory SET stock_quantity = stock_quantity + ? WHERE company_id = ?').bind(topUp, c.id));
          announcements.push(`${c.name} 庫存不足，系統限量回補 ${topUp.toLocaleString()} 股（發行上限內）`);
        }
      }
    }

    const klines = klinesByCompany[c.id] || [];
    const closes = klines.map(k => k.close);
    const basePrice = closes.length > 0 ? closes.reduce((s, v) => s + v, 0) / closes.length : (c.share_price || 100);
    let price = c.share_price || basePrice;

    const lastKlineTime = klines.length > 0 ? klines[0].minute : (Math.floor(now / interval) * interval - interval);
    const stepsNeeded = Math.min(Math.floor((now - lastKlineTime) / interval), 12);

    for (let step = 0; step <= stepsNeeded; step++) {
      const blockTime = step < stepsNeeded ? (lastKlineTime + (step + 1) * interval) : (Math.floor(now / interval) * interval);
      if (blockTime > now) break;
      const deviation = basePrice > 0 ? (price - basePrice) / basePrice : 0;
      const drift = (Math.random() * 2 - 1) * 0.015;
      const revert = -deviation * 0.005;
      const newPrice = Math.max(1, Math.round(price * (1 + drift + revert)));
      allStmts.push(db.prepare('INSERT OR REPLACE INTO stock_klines (company_id, open, high, low, close, volume, buy_volume, sell_volume, minute) VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?)').bind(c.id, price, Math.max(price, newPrice), Math.min(price, newPrice), newPrice, blockTime));
      price = newPrice;
    }
    allStmts.push(db.prepare('UPDATE companies SET share_price = ? WHERE id = ?').bind(price, c.id));
  }

  for (const msg of announcements) {
    allStmts.push(db.prepare('INSERT INTO community_announcements (message, created_at) VALUES (?, ?)').bind(msg, now));
  }
  if (allStmts.length > 0) {
    for (let i = 0; i < allStmts.length; i += 50) {
      try { await db.batch(allStmts.slice(i, i + 50)); } catch (e) {}
    }
  }
}

export { DiscordGateway, MarketWS };

async function processStockTick(db, doDividend = true, logger) {
  const companies = await db.prepare('SELECT * FROM companies').all();
  if (companies.results.length === 0) return;

  const now = Date.now();
  const interval = 5000;
  const block = Math.floor(now / interval) * interval;

  // 預載: 所有 IPO 狀態 + 全部持股 (奪權/股利用)
  const [ipoRes, holdingsRes] = await db.batch([
    db.prepare("SELECT company_id, phase FROM ipo_state"),
    db.prepare('SELECT user_id, company_id, quantity FROM stock_holdings WHERE quantity > 0'),
  ]);
  const ipoPhase = {};
  for (const r of ipoRes.results) ipoPhase[r.company_id] = r.phase;
  const holdingsByCompany = {};
  for (const r of holdingsRes.results) (holdingsByCompany[r.company_id] ||= []).push(r);

  // 近10分鐘有買入的 (company,user) 集合 — 股利防套利
  const recentBuySet = new Set();
  if (doDividend) {
    const buys = await db.prepare("SELECT DISTINCT company_id, user_id FROM stock_trades WHERE type = 'buy' AND traded_at >= ?").bind(now - 600000).all();
    for (const b of buys.results) recentBuySet.add(`${b.company_id}|${b.user_id}`);
  }
  // 全部空單 (股利債務)
  const shortsRes = await db.prepare("SELECT id, user_id, company_id, quantity FROM margin_positions WHERE type = 'short'").all();
  const shortsByCompany = {};
  for (const s of shortsRes.results) (shortsByCompany[s.company_id] ||= []).push(s);

  const stmts = [];
  const logs = [];
  const notifs = [];

  for (const company of companies.results) {
    if (ipoPhase[company.id] !== 'trading') continue;

    // 自動奪權: 任何玩家持股超過 50% 總股數 → 自動成為 owner (現實控股邏輯, 適用所有公司)
    const top = (holdingsByCompany[company.id] || []).sort((a, b) => b.quantity - a.quantity)[0];
    if ((company.owner_id || 0) !== 0 && top && top.quantity > company.total_shares * 0.5 && top.user_id !== company.owner_id) {
      const oldOwner = company.owner_id;
      stmts.push(db.prepare('UPDATE companies SET owner_id = ?, sell_price = 0 WHERE id = ?').bind(top.user_id, company.id));
      const holderName = await db.prepare('SELECT username FROM users WHERE id = ?').bind(top.user_id).first();
      const oldOwnerName = oldOwner > 0 ? await db.prepare('SELECT username FROM users WHERE id = ?').bind(oldOwner).first() : null;
      stmts.push(db.prepare('INSERT INTO community_announcements (message, created_at) VALUES (?, ?)').bind(`${holderName?.username || '玩家'} 持股超過 50%，奪得 ${company.name} 控制權！`, now));
      if (oldOwner > 0) {
        notifs.push(db.prepare('INSERT INTO notifications (user_id, type, message, created_at) VALUES (?, ?, ?, ?)').bind(oldOwner, 'takeover', `⚠️ ${holderName?.username || '玩家'} 持股超過 50%，奪取了你的公司「${company.name}」控制權！`, now));
        stmts.push(db.prepare('INSERT INTO transaction_history (user_id, type, amount, description, created_at) VALUES (?, ?, ?, ?, ?)').bind(oldOwner, 'takeover', 0, `${holderName?.username || '玩家'} 持股過半，奪取 ${company.name} 控制權`, now));
      }
      notifs.push(db.prepare('INSERT INTO notifications (user_id, type, message, created_at) VALUES (?, ?, ?, ?)').bind(top.user_id, 'takeover', `🎉 你持股超過 50%，奪得「${company.name}」控制權，成為新 owner！`, now));
    }

    // 自動增資已移除: 系統庫存有限, 不再發新股稀釋現有股東 (庫存買完即停止賣出)

    // 有交易才寫K線 (無交易的波動由 MarketWS DO alarm 每5秒處理)
    const trades = await db.prepare('SELECT price, quantity, type FROM stock_trades WHERE company_id = ? AND traded_at >= ?').bind(company.id, block).all();
    const companyData = await db.prepare('SELECT share_price FROM companies WHERE id = ?').bind(company.id).first();
    const close = companyData?.share_price || 100;

    if (trades.results.length > 0) {
      const open = trades.results[0].price;
      const high = Math.max(...trades.results.map(t => t.price));
      const low = Math.min(...trades.results.map(t => t.price));
      const volume = trades.results.reduce((s, t) => s + t.quantity, 0);
      const buyVol = trades.results.filter(t => t.type === 'buy').reduce((s, t) => s + t.quantity, 0);
      const sellVol = trades.results.filter(t => t.type === 'sell').reduce((s, t) => s + t.quantity, 0);
      stmts.push(db.prepare('INSERT OR REPLACE INTO stock_klines (company_id, open, high, low, close, volume, buy_volume, sell_volume, minute) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(company.id, open, high, low, close, volume, buyVol, sellVol, block));
    }

    if (!doDividend) continue;

    const baseIncome = company.base_income || 100;
    // 成長率 0.000005/分 ≈ 0.72%/天 (原 0.0005 = ×2/天 是財務爆炸的根源)
    const growthRate = 0.000005;
    const elapsed = (now - company.created_at) / 60000;
    const currentIncome = Math.min(Math.floor(baseIncome * Math.pow(1 + growthRate, Math.max(elapsed, 0))), baseIncome * 3);
    const dividendPerShare = currentIncome / company.total_shares;

    for (const h of holdingsByCompany[company.id] || []) {
      // 最低持有 10 分鐘才可領股利 (防 買→領→賣 無風險套利)
      if (recentBuySet.has(`${company.id}|${h.user_id}`)) continue;
      const payout = Math.floor(dividendPerShare * h.quantity);
      if (payout > 0) {
        stmts.push(db.prepare('UPDATE wallets SET cash = cash + ?, total_earned = total_earned + ? WHERE user_id = ?').bind(payout, payout, h.user_id));
        logs.push([h.user_id, 'dividend', payout, `${company.name}股利`]);
      }
    }

    for (const pos of shortsByCompany[company.id] || []) {
      const debt = Math.floor(dividendPerShare * pos.quantity);
      stmts.push(db.prepare('UPDATE margin_positions SET dividend_debt = dividend_debt + ? WHERE id = ?').bind(debt, pos.id));
    }
  }

  const allStmts = [...stmts, ...notifs];
  if (allStmts.length > 0) await db.batch(allStmts);
  if (logger) {
    for (const [u, t, a, d] of logs) logger.log(u, t, a, d);
  } else {
    for (const [u, t, a, d] of logs) await logHourly(db, u, t, a, d);
  }
}
