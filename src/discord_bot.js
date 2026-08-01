// Discord Bot: slash commands via interactions webhook
// 指令: /ipo /price /leaderboard /me /help

function textResponse(text) {
  return new Response(JSON.stringify({ type: 4, data: { content: text } }), {
    headers: { 'content-type': 'application/json' },
  });
}

async function verifySignature(request, env) {
  const publicKey = env.DISCORD_PUBLIC_KEY;
  if (!publicKey) return true; // 未設定金鑰時跳過驗證（測試模式）
  try {
    const timestamp = request.headers.get('X-Signature-Ed25519-Timestamp') || '';
    const signature = request.headers.get('X-Signature-Ed25519-Signature') || '';
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
  } catch {
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

  if (request.headers.get('content-type')?.includes('application/json')) {
    const payload = await request.json().catch(() => null);
    if (!payload) return new Response('bad', { status: 400 });
    if (payload.type === 1) return new Response(JSON.stringify({ type: 1 }), { headers: { 'content-type': 'application/json' } });
    if (payload.type !== 2) return new Response('ok', { status: 200 });

    const name = payload.data?.name || '';
    const db = env.DB;

    try {
      if (name === 'ipo') {
        const ipos = await db.prepare(`
          SELECT i.company_id, i.phase, i.started_at, i.duration_minutes, c.name, c.share_price, c.total_shares,
                 (SELECT COALESCE(SUM(shares),0) FROM ipo_subscriptions WHERE company_id=i.company_id) as subscribed
          FROM ipo_state i JOIN companies c ON c.id = i.company_id
        `).all();
        if (ipos.results.length === 0) return textResponse('📉 目前沒有進行中的 IPO');
        let out = '🚀 **IPO 狀態**\n';
        for (const ipo of ipos.results) {
          const maxSub = Math.floor((ipo.total_shares || 0) * 0.3);
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
        return textResponse(out);
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
        return textResponse(
          `📈 **${company.name}**\n` +
          `價格 **$${company.share_price}**\n` +
          `流通 ${circulating.toLocaleString()} 股 · 庫存 ${(inv?.stock_quantity || 0).toLocaleString()} 股\n` +
          `單筆上限 ${Math.max(1, Math.floor(circulating * 0.05)).toLocaleString()} 股\n` +
          `手續費 1.5%`
        );
      }

      if (name === 'leaderboard') {
        const rows = await db.prepare(`
          SELECT u.username, w.total_earned, w.cash,
            (SELECT COALESCE(SUM(quantity),0) FROM stock_holdings WHERE user_id = u.id) as stocks
          FROM users u JOIN wallets w ON w.user_id = u.id
          ORDER BY w.total_earned DESC LIMIT 10
        `).all();
        if (rows.results.length === 0) return textResponse('📊 尚無資料');
        let out = '🏆 **全球掛機排行榜 TOP 10**\n';
        rows.results.forEach((r, i) => {
          out += `**#${i + 1}** ${r.username}\n` +
            `　📈 累計 $${(r.total_earned || 0).toLocaleString()} · 💰 $${(r.cash || 0).toLocaleString()} · 📊 ${(r.stocks || 0).toLocaleString()}股\n`;
        });
        return textResponse(out);
      }

      if (name === 'server') {
        const stats = await db.prepare('SELECT COUNT(*) as c FROM users').first();
        const totalCash = await db.prepare('SELECT COALESCE(SUM(cash),0) as c FROM wallets').first();
        const totalEarned = await db.prepare('SELECT COALESCE(SUM(total_earned),0) as c FROM wallets').first();
        const reserve = await db.prepare('SELECT COALESCE(SUM(stock_quantity),0) as s FROM stock_inventory').first();
        const trading = await db.prepare("SELECT COUNT(*) as c FROM ipo_state WHERE phase = 'trading'").first();
        const ipoing = await db.prepare("SELECT COUNT(*) as c FROM ipo_state WHERE phase = 'ipo'").first();
        const employees = await db.prepare('SELECT COUNT(*) as c FROM employees').first();
        const trades = await db.prepare('SELECT COUNT(*) as c FROM stock_trades').first();
        const online = await db.prepare('SELECT COUNT(*) as c FROM users WHERE last_active > ?').bind(Date.now() - 600000).first();
        return textResponse(
          `🌍 **Earth Online 伺服器狀態**\n` +
          `👥 玩家 ${(stats?.c || 0).toLocaleString()} 人（近10分在線 ${(online?.c || 0)}）\n` +
          `💰 總現金 $${(totalCash?.c || 0).toLocaleString()}\n` +
          `📈 全服累計賺取 $${(totalEarned?.c || 0).toLocaleString()}\n` +
          `📊 股票：🟢上市 ${(trading?.c || 0)} 支 · 🟡IPO中 ${(ipoing?.c || 0)} 支\n` +
          `🏦 系統庫存 ${(reserve?.s || 0).toLocaleString()} 股\n` +
          `👷 員工 ${(employees?.c || 0).toLocaleString()} 人 · 📋 總交易 ${(trades?.c || 0).toLocaleString()} 筆`
        );
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

// 一次性設定: 查 Public Key + 註冊 Slash Commands
export async function setupDiscordBot(env) {
  const botToken = env.DISCORD_BOT_TOKEN;
  if (!botToken) return { error: '缺少 DISCORD_BOT_TOKEN' };

  const appRes = await fetch('https://discord.com/api/v10/applications/@me', {
    headers: { Authorization: `Bot ${botToken}` },
  });
  if (!appRes.ok) return { error: `無法取得應用程式資訊: ${appRes.status}` };
  const app = await appRes.json();

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
    note: '在 Discord Developer Portal 的 General Information 設定 Interactions Endpoint URL 為 https://twonline.dpdns.org/interactions，並把 Public Key 設為 env.DISCORD_PUBLIC_KEY',
  };
}
