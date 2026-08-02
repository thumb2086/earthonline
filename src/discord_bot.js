// Discord Bot: slash commands via interactions webhook
// 指令: /ipo /price /leaderboard /profile /server /me /help

function textResponse(text, buttons = null) {
  const data = { content: text };
  if (buttons && buttons.length > 0) {
    data.components = [{ type: 1, components: buttons.map(b => ({ type: 2, style: 1, label: b.label, custom_id: b.id })) }];
  }
  return new Response(JSON.stringify({ type: 4, data }), {
    headers: { 'content-type': 'application/json' },
  });
}

// 更新現有訊息 (按鈕點擊後刷新)
function updateMessage(text, buttons = null) {
  const data = { content: text };
  if (buttons && buttons.length > 0) {
    data.components = [{ type: 1, components: buttons.map(b => ({ type: 2, style: 1, label: b.label, custom_id: b.id })) }];
  }
  return new Response(JSON.stringify({ type: 7, data }), {
    headers: { 'content-type': 'application/json' },
  });
}

const REFRESH_BTN = () => [{ label: '🔄 更新', id: 'refresh' }];

// 生成 /ipo 內容
async function ipoContent(db) {
  const ipos = await db.prepare(`
    SELECT i.company_id, i.phase, i.started_at, i.duration_minutes, c.name, c.share_price, c.total_shares,
           (SELECT COALESCE(SUM(shares),0) FROM ipo_subscriptions WHERE company_id=i.company_id) as subscribed
    FROM ipo_state i JOIN companies c ON c.id = i.company_id
  `).all();
  if (ipos.results.length === 0) return '📉 目前沒有進行中的 IPO';
  let out = '🚀 **IPO 狀態**\n';
  for (const ipo of ipos.results) {
    const inv = await db.prepare('SELECT stock_quantity FROM stock_inventory WHERE company_id = ?').bind(ipo.company_id).first();
    const maxSub = inv?.stock_quantity || Math.floor((ipo.total_shares || 0) * 0.3);
    const remain = ipo.started_at ? Math.max(0, ((ipo.duration_minutes || 60) * 60000) - (Date.now() - ipo.started_at)) : 0;
    if (ipo.phase === 'ipo') {
      const pct = maxSub > 0 ? (((ipo.subscribed || 0) / maxSub) * 100).toFixed(1) : '0';
      out += `**${ipo.name}** 🟡 認購中\n` +
        `價格 $${ipo.share_price} · ${(ipo.subscribed || 0).toLocaleString()}/${maxSub.toLocaleString()} 股 (${pct}%)\n` +
        `剩餘 ${fmtRemain(remain)}（滿了立即上市）\n\n`;
    } else if (ipo.phase === 'trading') {
      out += `**${ipo.name}** 🟢 已上市\n\n`;
    }
  }
  return out;
}

// 生成 /leaderboard 內容
async function leaderboardContent(db) {
  const rows = await db.prepare(`
    SELECT u.username, w.total_earned, w.cash,
      (SELECT COALESCE(SUM(quantity),0) FROM stock_holdings WHERE user_id = u.id) as stocks
    FROM users u JOIN wallets w ON w.user_id = u.id
    ORDER BY w.total_earned DESC LIMIT 10
  `).all();
  if (rows.results.length === 0) return '📊 尚無資料';
  let out = '🏆 **全球掛機排行榜 TOP 10**\n';
  rows.results.forEach((r, i) => {
    out += `**#${i + 1}** ${r.username}\n` +
      `　📈 累計 $${(r.total_earned || 0).toLocaleString()} · 💰 $${(r.cash || 0).toLocaleString()} · 📊 ${(r.stocks || 0).toLocaleString()}股\n`;
  });
  return out;
}

// 生成 /server 內容
async function serverContent(db) {
  const stats = await db.prepare('SELECT COUNT(*) as c FROM users').first();
  const totalCash = await db.prepare('SELECT COALESCE(SUM(cash),0) as c FROM wallets').first();
  const totalEarned = await db.prepare('SELECT COALESCE(SUM(total_earned),0) as c FROM wallets').first();
  const reserve = await db.prepare('SELECT COALESCE(SUM(stock_quantity),0) as s FROM stock_inventory').first();
  const trading = await db.prepare("SELECT COUNT(*) as c FROM ipo_state WHERE phase = 'trading'").first();
  const ipoing = await db.prepare("SELECT COUNT(*) as c FROM ipo_state WHERE phase = 'ipo'").first();
  const employees = await db.prepare('SELECT COUNT(*) as c FROM employees').first();
  const trades = await db.prepare('SELECT COUNT(*) as c FROM stock_trades').first();
  const online = await db.prepare('SELECT COUNT(*) as c FROM users WHERE last_active > ?').bind(Date.now() - 600000).first();
  return (
    `🌍 **Earth Online 伺服器狀態**\n` +
    `👥 玩家 ${(stats?.c || 0).toLocaleString()} 人（近10分在線 ${(online?.c || 0)}）\n` +
    `💰 總現金 $${(totalCash?.c || 0).toLocaleString()}\n` +
    `📈 全服累計賺取 $${(totalEarned?.c || 0).toLocaleString()}\n` +
    `📊 股票：🟢上市 ${(trading?.c || 0)} 支 · 🟡IPO中 ${(ipoing?.c || 0)} 支\n` +
    `🏦 系統庫存 ${(reserve?.s || 0).toLocaleString()} 股\n` +
    `👷 員工 ${(employees?.c || 0).toLocaleString()} 人 · 📋 總交易 ${(trades?.c || 0).toLocaleString()} 筆`
  );
}

function getHeaderIgnoreCase(headers, name) {
  // Cloudflare Workers: X-Signature-Ed25519-Timestamp 被改名為 x-signature-timestamp
  const lower = name.toLowerCase();
  let ts = null, sig = null;
  headers.forEach((v, k) => {
    const kLower = String(k).toLowerCase();
    if (kLower.includes('timestamp')) ts = v;
    if (kLower.includes('ed25519')) sig = v;
  });
  return lower.includes('timestamp') ? ts : sig;
}

async function verifySignature(request, env) {
  const publicKey = env.DISCORD_PUBLIC_KEY;
  if (!publicKey) return true; // 未設定金鑰時跳過驗證（測試模式）
  try {
    const timestamp = getHeaderIgnoreCase(request.headers, 'X-Signature-Ed25519-Timestamp') || '';
    const signature = getHeaderIgnoreCase(request.headers, 'X-Signature-Ed25519-Signature') || '';
    if (!timestamp || !signature) return false;
    const body = await request.clone().text();
    const key = await crypto.subtle.importKey(
      'raw',
      hexToBytes(publicKey),
      { name: 'Ed25519' },
      false,
      ['verify']
    );
    return await crypto.subtle.verify(
      'Ed25519',
      key,
      hexToBytes(signature),
      new TextEncoder().encode(timestamp + body)
    );
  } catch (e) {
    console.error('Ed25519 verify error:', e?.message || e);
    return false;
  }
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

function fmtRemain(ms) {
  if (!ms || ms <= 0) return '已到期';
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}小時${m}分` : `${m}分${Math.floor((ms % 60000) / 1000)}秒`;
}

export async function handleInteractions(request, env) {
  if (request.method !== 'POST') return new Response('ok', { status: 200 });

  // 簽名驗證 (Discord 要求, 驗證失敗回 401)
  const valid = await verifySignature(request, env);
  if (!valid) {
    return new Response('invalid signature', { status: 401 });
  }
  if (request.headers.get('content-type')?.includes('application/json')) {
    const payload = await request.json().catch(() => null);
    if (!payload) return new Response('bad', { status: 400 });
    if (payload.type === 1) return new Response(JSON.stringify({ type: 1 }), { headers: { 'content-type': 'application/json' } });

    const db = env.DB;
    const discordId = payload.member?.user?.id || payload.user?.id;

    // 按鈕點擊 (type 3): 刷新指令內容
    if (payload.type === 3) {
      try {
        const customId = payload.data?.custom_id || '';
        const cmd = customId.replace('refresh_', '');
        if (cmd === 'ipo') {
          return updateMessage(await ipoContent(db), REFRESH_BTN().map(b => ({ ...b, id: 'refresh_ipo' })));
        }
        if (cmd === 'price' || cmd === 'stock') {
          // 從訊息內容提取股票名 (最後一行後的原始輸入無法取得, 改用 id)
          const content = payload.message?.content || '';
          return updateMessage('請重新輸入 /price 指令，按鈕更新僅支援 /ipo 與 /server', null);
        }
        if (cmd === 'server') {
          return updateMessage(await serverContent(db), REFRESH_BTN().map(b => ({ ...b, id: 'refresh_server' })));
        }
        if (cmd === 'leaderboard') {
          return updateMessage(await leaderboardContent(db), REFRESH_BTN().map(b => ({ ...b, id: 'refresh_leaderboard' })));
        }
      } catch (e) {
        return updateMessage(`❌ ${e.message}`, null);
      }
    }

    if (payload.type !== 2) return new Response('ok', { status: 200 });

    const name = payload.data?.name || '';

    try {
      if (name === 'ipo') {
        return textResponse(await ipoContent(db), REFRESH_BTN().map(b => ({ ...b, id: 'refresh_ipo' })));
      }

      if (name === 'price' || name === 'stock') {
        const stockName = payload.data?.options?.[0]?.value || '1';
        // 找公司: 名稱或代號(001/002...)或id
        let company = null;
        const num = parseInt(stockName);
        if (/^\d{3}$/.test(String(stockName))) {
          const idx = parseInt(stockName);
          const companies = await db.prepare('SELECT * FROM companies ORDER BY id').all();
          company = companies.results.filter(c => c.id !== 1 && c.id !== 0)[idx - 1] || companies.results.find(c => c.id === 1);
        } else {
          company = await db.prepare('SELECT * FROM companies WHERE name = ?').bind(stockName).first()
            || (num ? await db.prepare('SELECT * FROM companies WHERE id = ?').bind(num).first() : null);
        }
        if (!company) return textResponse('❌ 找不到該股票');
        const ipo = await db.prepare('SELECT phase FROM ipo_state WHERE company_id = ?').bind(company.id).first();
        if (!ipo || ipo.phase !== 'trading') return textResponse(`🟡 **${company.name}** 尚未上市（${ipo?.phase || '未IPO'}）`);
        const inv = await db.prepare('SELECT stock_quantity, cash FROM stock_inventory WHERE company_id = ?').bind(company.id).first();
        const circulating = (company.total_shares || 0) - (inv?.stock_quantity || 0);
        const lastTrade = await db.prepare('SELECT traded_at FROM stock_trades WHERE company_id = ? ORDER BY traded_at DESC LIMIT 1').bind(company.id).first();
        const lastTime = lastTrade?.traded_at ? new Date(lastTrade.traded_at).toLocaleString('zh-TW', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
        return textResponse(
          `📈 **${company.name}**\n` +
          `價格 **$${company.share_price}**\n` +
          `流通 ${circulating.toLocaleString()} 股 · 庫存 ${(inv?.stock_quantity || 0).toLocaleString()} 股\n` +
          `單筆上限 ${Math.max(1, Math.floor(circulating * 0.05)).toLocaleString()} 股\n` +
          `手續費 1.5%\n` +
          `⏱ 最後成交 ${lastTime}`
        );
      }

      if (name === 'leaderboard') {
        return textResponse(await leaderboardContent(db), REFRESH_BTN().map(b => ({ ...b, id: 'refresh_leaderboard' })));
      }

      if (name === 'server') {
        return textResponse(await serverContent(db), REFRESH_BTN().map(b => ({ ...b, id: 'refresh_server' })));
      }

      if (name === 'profile') {
        const discordId = payload.member?.user?.id || payload.user?.id;
        if (!discordId) return textResponse('❌ 無法取得 Discord 身分');
        const user = await db.prepare('SELECT id, username FROM users WHERE discord_id = ?').bind(discordId).first();
        if (!user) return textResponse('⚠️ 你還沒玩過遊戲！請到 https://twonline.dpdns.org 用 Discord 登入一次');
        const wallet = await db.prepare('SELECT cash, savings, total_earned FROM wallets WHERE user_id = ?').bind(user.id).first();
        const stocks = await db.prepare('SELECT COALESCE(SUM(quantity),0) as s FROM stock_holdings WHERE user_id = ?').bind(user.id).first();
        const debt = await db.prepare("SELECT COALESCE(SUM(remaining),0) as d FROM loans WHERE user_id = ? AND status = 'active'").bind(user.id).first();
        const inv = await db.prepare('SELECT COALESCE(SUM(amount),0) as a FROM investments WHERE user_id = ?').bind(user.id).first();
        const levels = await db.prepare('SELECT computer, server, ai_assistant FROM income_levels WHERE user_id = ?').bind(user.id).first();
        const rankRow = await db.prepare('SELECT COUNT(*) as c FROM wallets WHERE total_earned > ?').bind(wallet?.total_earned || 0).first();
        const rank = (rankRow?.c || 0) + 1;
        const totalUsers = await db.prepare('SELECT COUNT(*) as c FROM users').first();
        return textResponse(
          `🪪 **地球Online 身分卡**\n` +
          `━━━━━━━━━━━━━━\n` +
          `👤 ${user.username}\n` +
          `🏅 全球排名 **#${rank}** / ${(totalUsers?.c || 0)}\n` +
          `━━━━━━━━━━━━━━\n` +
          `💰 現金 $${(wallet?.cash || 0).toLocaleString()}\n` +
          `🏦 活存 $${(wallet?.savings || 0).toLocaleString()}\n` +
          `💼 投資 $${(inv?.a || 0).toLocaleString()}\n` +
          `📊 持股 ${(stocks?.s || 0).toLocaleString()} 股\n` +
          `💳 債務 $${(debt?.d || 0).toLocaleString()}\n` +
          `📈 累計賺取 $${(wallet?.total_earned || 0).toLocaleString()}\n` +
          `━━━━━━━━━━━━━━\n` +
          `⬆️ 電腦Lv.${levels?.computer || 1} · 伺服器Lv.${levels?.server || 1} · AI助手Lv.${levels?.ai_assistant || 1}`
        );
      }

      if (name === 'me') {
        const discordId = payload.member?.user?.id || payload.user?.id;
        if (!discordId) return textResponse('❌ 無法取得 Discord 身分');
        const user = await db.prepare('SELECT id, username FROM users WHERE discord_id = ?').bind(discordId).first();
        if (!user) return textResponse('⚠️ 你還沒玩過遊戲！請到 https://twonline.dpdns.org 用 Discord 登入一次');
        const wallet = await db.prepare('SELECT cash, savings, total_earned FROM wallets WHERE user_id = ?').bind(user.id).first();
        const stocks = await db.prepare('SELECT COALESCE(SUM(quantity),0) as s FROM stock_holdings WHERE user_id = ?').bind(user.id).first();
        const debt = await db.prepare("SELECT COALESCE(SUM(remaining),0) as d FROM loans WHERE user_id = ? AND status = 'active'").bind(user.id).first();
        return textResponse(
          `👤 **${user.username}**\n` +
          `💰 現金 $${(wallet?.cash || 0).toLocaleString()}\n` +
          `🏦 活存 $${(wallet?.savings || 0).toLocaleString()}\n` +
          `📈 累計賺取 $${(wallet?.total_earned || 0).toLocaleString()}\n` +
          `📊 持股 ${(stocks?.s || 0).toLocaleString()} 股\n` +
          `💳 債務 $${(debt?.d || 0).toLocaleString()}`
        );
      }

      if (name === 'help') {
        return textResponse(
          '🤖 **地球Online 機器人指令**\n' +
          '`/ipo` — IPO 認購狀態\n' +
          '`/price 001` — 查看股票價格（名稱或代號）\n' +
          '`/leaderboard` — 全球掛機排行榜 TOP 10\n' +
          '`/profile` — 你的專屬身分卡\n' +
          '`/server` — 伺服器即時狀態\n' +
          '`/me` — 你的遊戲資產\n' +
          '`/help` — 顯示指令'
        );
      }
    } catch (err) {
      return textResponse(`❌ 發生錯誤: ${err.message}`);
    }
  }
  return new Response('ok', { status: 200 });
}

// 踢除指定的 bot 成員 (需要管理成員權限)
export async function kickGuildBot(env, botId) {
  const token = env.DISCORD_BOT_TOKEN;
  const guildId = env.DISCORD_GUILD_ID;
  if (!token) return { error: '缺少 DISCORD_BOT_TOKEN' };
  if (!guildId) return { error: '缺少 DISCORD_GUILD_ID' };
  if (!botId) return { error: '缺少 botId' };

  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${botId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bot ${token}` },
  });
  if (res.ok) return { success: true, kicked: botId };
  const err = await res.text();
  return { error: `踢除失敗: ${res.status} ${err}` };
}

// 診斷: 檢查 body 讀取是否一致
export async function checkBodyEcho(request) {
  const clone = await request.clone().text();
  const raw = await request.text();
  const allHeaders = {};
  request.headers.forEach((v, k) => { allHeaders[k] = v; });
  return {
    same: raw === clone,
    allHeaders,
  };
}

// 診斷: 用固定測試案例驗證 Workers Ed25519 實作
export async function checkCryptoSupport(env) {
  const results = {};
  // 固定測試案例 (node 生成)
  const testPub = 'e6217fadac19d9e4118994d1717a94f7253a8704216203ed00163116f49c6d16';
  const testBody = '{"type":1}';
  const testTs = '1754100000';
  const testSig = 'c356a2461c55ac371e5e65740aa82bca8e7b233fb8604e45524a8bb5d787fcb440525ccba993314c7738d540d0e9d8a0560a92fb2ca29c2af6765f09434c300c';
  try {
    const key = await crypto.subtle.importKey('raw', hexToBytes(testPub), { name: 'Ed25519' }, false, ['verify']);
    results.importKey = 'OK';
    // 模擬 header 流程: hexToBytes(signature) + encode(timestamp+body)
    const ok = await crypto.subtle.verify('Ed25519', key, hexToBytes(testSig), new TextEncoder().encode(testTs + testBody));
    results.selfTest = ok ? 'PASS (正確簽名驗證通過)' : 'FAIL (正確簽名被拒)';
    results.sigBytesLen = hexToBytes(testSig).length;
    results.pubBytesLen = hexToBytes(testPub).length;
  } catch (e) {
    results.importKey = `ERROR: ${e.message}`;
    results.selfTest = 'N/A';
  }
  results.publicKeySet = !!env.DISCORD_PUBLIC_KEY;
  results.publicKeyPrefix = env.DISCORD_PUBLIC_KEY ? env.DISCORD_PUBLIC_KEY.slice(0, 8) + '...' : 'none';
  return results;
}

// 列出伺服器中的所有機器人 (方便分辨新舊)
export async function listGuildBots(env) {
  const token = env.DISCORD_BOT_TOKEN;
  const guildId = env.DISCORD_GUILD_ID;
  if (!token) return { error: '缺少 DISCORD_BOT_TOKEN' };
  if (!guildId) return { error: '缺少 DISCORD_GUILD_ID' };

  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=100`, {
    headers: { Authorization: `Bot ${token}` },
  });
  if (!res.ok) return { error: `查詢失敗: ${res.status}` };
  const members = await res.json();

  const bots = members
    .filter(m => m.user?.bot)
    .map(m => ({ id: m.user.id, username: m.user.username, display: m.nick || m.user.username }));

  // 我們的 bot 資訊
  const appRes = await fetch('https://discord.com/api/v10/applications/@me', {
    headers: { Authorization: `Bot ${token}` },
  });
  const app = appRes.ok ? await appRes.json() : null;

  return { ourBotId: app?.id, ourBotName: app?.name, bots };
}

// 清除 guild commands (殘留的舊描述指令)
export async function clearGuildCommands(env) {
  const botToken = env.DISCORD_BOT_TOKEN;
  const guildId = env.DISCORD_GUILD_ID;
  if (!botToken) return { error: '缺少 DISCORD_BOT_TOKEN' };
  if (!guildId) return { error: '缺少 DISCORD_GUILD_ID' };
  const appRes = await fetch('https://discord.com/api/v10/applications/@me', {
    headers: { Authorization: `Bot ${botToken}` },
  });
  if (!appRes.ok) return { error: `無法取得應用: ${appRes.status}` };
  const app = await appRes.json();
  const res = await fetch(`https://discord.com/api/v10/applications/${app.id}/guilds/${guildId}/commands`, {
    method: 'PUT',
    headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
    body: '[]', // 清空 guild commands
  });
  if (!res.ok) return { error: `清除失敗: ${res.status} ${await res.text()}` };
  return { success: true, message: 'Guild commands 已清除' };
}

// 列出應用程式目前註冊的指令 (全局 + guild)
export async function listAppCommands(env) {
  const botToken = env.DISCORD_BOT_TOKEN;
  const guildId = env.DISCORD_GUILD_ID;
  if (!botToken) return { error: '缺少 DISCORD_BOT_TOKEN' };
  const appRes = await fetch('https://discord.com/api/v10/applications/@me', {
    headers: { Authorization: `Bot ${botToken}` },
  });
  if (!appRes.ok) return { error: `無法取得應用: ${appRes.status}` };
  const app = await appRes.json();

  // 全局指令
  const gRes = await fetch(`https://discord.com/api/v10/applications/${app.id}/commands`, {
    headers: { Authorization: `Bot ${botToken}` },
  });
  const globalCmds = gRes.ok ? await gRes.json() : [];

  // guild 指令 (若有 guild)
  let guildCmds = [];
  if (guildId) {
    const lRes = await fetch(`https://discord.com/api/v10/applications/${app.id}/guilds/${guildId}/commands`, {
      headers: { Authorization: `Bot ${botToken}` },
    });
    if (lRes.ok) guildCmds = await lRes.json();
  }

  return {
    appId: app.id,
    global: globalCmds.map(c => ({ name: c.name, id: c.id, description: c.description })),
    guild: guildCmds.map(c => ({ name: c.name, id: c.id, description: c.description })),
  };
}

// 一次性設定: 查 Public Key + 註冊 Slash Commands (+可改名)
export async function setupDiscordBot(env, renameTo) {
  const botToken = env.DISCORD_BOT_TOKEN;
  if (!botToken) return { error: '缺少 DISCORD_BOT_TOKEN' };

  const appRes = await fetch('https://discord.com/api/v10/applications/@me', {
    headers: { Authorization: `Bot ${botToken}` },
  });
  if (!appRes.ok) return { error: `無法取得應用程式資訊: ${appRes.status}` };
  const app = await appRes.json();

  let renamed = null;
  if (renameTo) {
    // 改 bot 帳號 username (顯示名稱)
    const patchRes = await fetch('https://discord.com/api/v10/users/@me', {
      method: 'PATCH',
      headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: renameTo }),
    });
    if (patchRes.ok) {
      const updated = await patchRes.json();
      renamed = updated.username;
    } else {
      const errBody = await patchRes.text();
      // 若 users/@me 被拒, 退回改 application name
      const appPatch = await fetch('https://discord.com/api/v10/applications/@me', {
        method: 'PATCH',
        headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameTo }),
      });
      if (appPatch.ok) {
        const updated = await appPatch.json();
        renamed = updated.name;
      } else {
        return { error: `改名失敗: ${patchRes.status} ${errBody}` };
      }
    }
  }

  const commands = [
    { name: 'ipo', description: '🚀 查看 IPO 認購狀態' },
    { name: 'price', description: '📈 查看股票價格', options: [{ type: 3, name: 'stock', description: '股票名稱或代號 (001/002...)', required: true }] },
    { name: 'leaderboard', description: '🏆 全球掛機排行榜 TOP 10' },
    { name: 'profile', description: '🪪 產生你的專屬身分卡' },
    { name: 'server', description: '🌍 伺服器即時狀態' },
    { name: 'me', description: '👤 你的遊戲資產' },
    { name: 'help', description: '🤖 顯示指令列表' },
  ];

  const regRes = await fetch(`https://discord.com/api/v10/applications/${app.id}/commands`, {
    method: 'PUT',
    headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!regRes.ok) {
    const err = await regRes.text();
    return { error: `註冊指令失敗: ${regRes.status} ${err}` };
  }

  return {
    success: true,
    appName: app.name,
    appId: app.id,
    publicKey: app.verify_key,
    commandsRegistered: commands.map(c => c.name),
    renamed,
    note: '在 Discord Developer Portal 的 General Information 設定 Interactions Endpoint URL 為 https://twonline.dpdns.org/interactions，並把 Public Key 設為 env.DISCORD_PUBLIC_KEY',
  };
}
