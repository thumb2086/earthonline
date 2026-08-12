// 社群維運系統: 每週階級清算 + 語音掛機加成
// 需求 env: DISCORD_GUILD_ID, DISCORD_BOT_TOKEN, DISCORD_VOICE_CHANNEL_ID (可選)
// 身分組配置: 預設依名稱查找公會內建身分組; 也可用 DISCORD_ROLE_RANK1..5 env 指定 ID 覆寫

export const RANK_ROLE_NAMES = [
  '現充（有現實生活的人）',   // 第一階 (前10%)
  '已實現財務自由的人',       // 第二階 (10~30%)
  '24小時在線 the 無業遊民',  // 第三階 (30~60%)
  '勉強夠付房租的平民',       // 第四階 (60~85%)
  '戶頭剩三位數的月光族',     // 墊底
];
const RANK_ROLES = ['DISCORD_ROLE_RANK1', 'DISCORD_ROLE_RANK2', 'DISCORD_ROLE_RANK3', 'DISCORD_ROLE_RANK4', 'DISCORD_ROLE_RANK5'];
// 排行榜顯示名稱 = 與 Discord 身分組名稱一致
export const RANK_LABELS = ['現充（有現實生活的人）', '已實現財務自由的人', '24小時在線 the 無業遊民', '勉強夠付房租的平民', '戶頭剩三位數的月光族'];

export function normRoleName(name) {
  return String(name || '')
    .replace(/[【】()（）\[\]{}、]|[\s\u200B\u200C\u200D\u2060\uFEFF\u00A0\u00AD]/g, '')
    .toLowerCase();
}

async function recordSettlement(db, summary) {
  await db.prepare(`INSERT INTO community_state (key, value, updated_at) VALUES ('last_settlement', ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
    .bind(JSON.stringify(summary), Date.now()).run();
}

// 依名稱解析身分組 ID (優先 env 覆寫, 否則查公會內同名身分組)
export async function resolveRankRoleIds(env) {
  const guildId = env.DISCORD_GUILD_ID;
  const token = env.DISCORD_BOT_TOKEN;
  if (!guildId || !token) return null;
  const overrides = RANK_ROLES.map(k => env[k]).filter(Boolean);
  if (overrides.length === RANK_ROLES.length) return overrides;

const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${token}` },
  });
  if (!res.ok) return null;
  const roles = await res.json();
  const byName = new Map(roles.map(r => [normRoleName(r.name), r.id]));
  // 逐個比對名稱, 失敗的用兜底 ID 補上 (不再整個失敗)
  return RANK_ROLE_NAMES.map((n, i) => byName.get(normRoleName(n)) || RANK_ROLE_ID_FALLBACK[i] || null);
}

// 兜底: 名稱比對若仍失敗, 直接用除錯端點取得的真實角色 ID (2026-08-11)
const RANK_ROLE_ID_FALLBACK = [
  '1512350832874750051', // 現充（有現實生活的人） pos 11
  '1512350598350246039', // 已實現財務自由的人 pos 8
  '1512350521929760908', // 24小時在線 the 無業遊民 pos 9
  '1512350680822841404', // 勉強夠付房租的平民 pos 7
  '1512350758320865320', // 戶頭剩三位數的月光族 pos 6
];

// 依排名百分位 (0.0~1.0, 越小越前面) 取得階級索引 — 與排行榜顯示共用同一套標準
export function rankIdxFromPct(pct) {
  if (pct <= 0.1) return 0;
  if (pct <= 0.3) return 1;
  if (pct <= 0.6) return 2;
  if (pct <= 0.85) return 3;
  return 4;
}

export async function getBoostMultiplier(db) {
  const row = await db.prepare("SELECT value FROM community_state WHERE key = 'voice_boost'").first();
  return row?.value === '1' ? 1.2 : 1;
}

// 語音掛機區監控: 在線人數 >= 5 啟動全服 1.2x 加成
export async function checkVoiceBoost(db, env) {
  const guildId = env.DISCORD_GUILD_ID;
  const token = env.DISCORD_BOT_TOKEN;
  if (!guildId || !token) return;

  try {
    // 語音掛機區設定 (預設取該公會第一個語音頻道, 或指定 DISCORD_VOICE_CHANNEL_ID)
    const targetChannel = env.DISCORD_VOICE_CHANNEL_ID;
    const channelsRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${token}` },
    });
    if (!channelsRes.ok) return;
    const channels = await channelsRes.json();
    const voiceChannels = channels.filter(c => c.type === 2 && (!targetChannel || c.id === targetChannel));

    let voiceCount = 0;
    for (const ch of voiceChannels) {
      const statesRes = await fetch(`https://discord.com/api/v10/channels/${ch.id}/voice-status`, {
        headers: { Authorization: `Bot ${token}` },
      }).catch(() => null);
      if (statesRes && statesRes.ok) {
        const data = await statesRes.json();
        voiceCount += data?.members?.length || 0;
      }
    }
    // 若 voice-status 不支援, 改用頻道內成員數
    if (voiceCount === 0 && voiceChannels.length > 0) {
      const chRes = await fetch(`https://discord.com/api/v10/channels/${voiceChannels[0].id}`, {
        headers: { Authorization: `Bot ${token}` },
      }).catch(() => null);
      if (chRes && chRes.ok) {
        const ch = await chRes.json();
        voiceCount = ch?.member_count || 0;
      }
    }

    const active = voiceCount >= 5;
    await db.prepare(`INSERT INTO community_state (key, value, updated_at) VALUES ('voice_boost', ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
      .bind(active ? '1' : '0', Date.now()).run();
    await db.prepare(`INSERT INTO community_state (key, value, updated_at) VALUES ('voice_count', ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
      .bind(String(voiceCount), Date.now()).run();
  } catch (e) {}
}

// 每週日 24:00 社會階級清算: 依累計賺取排名分配身分組
export async function weeklySettlement(db, env) {
  const guildId = env.DISCORD_GUILD_ID;
  const token = env.DISCORD_BOT_TOKEN;
  if (!guildId || !token) return;

  const roleIds = await resolveRankRoleIds(env);
  if (!roleIds || roleIds.every(r => !r)) {
    const reason = !roleIds ? '缺少 DISCORD_GUILD_ID/DISCORD_BOT_TOKEN 或公會查詢失敗' : `身分組名稱全部比對失敗: 期望 ${JSON.stringify(RANK_ROLE_NAMES)} → 得到 ${JSON.stringify(roleIds)}`;
    const info = { time: Date.now(), applied: 0, errors: [reason] };
    await recordSettlement(db, info).catch(() => {});
    return info;
  }

  try {
    // 減少請求次數: 先抓全部公會成員(含現有角色), 只對實際掛著的舊身份做 DELETE
    const membersRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`, {
      headers: { Authorization: `Bot ${token}` },
    });
    const memberRoles = new Map();
    if (membersRes.ok) {
      const members = await membersRes.json();
      for (const m of members) memberRoles.set(m.user?.id, m.roles || []);
    }

    const users = await db.prepare(`
      SELECT u.id, u.username, u.discord_id, w.total_earned FROM users u
      JOIN wallets w ON w.user_id = u.id
      WHERE u.discord_id IS NOT NULL
      ORDER BY w.total_earned DESC
    `).all();

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    // Discord 限流: 每 5 秒最多約 5 次角色變更, 429 時依 Retry-After 退避重試
    const changeRole = async (method, discordId, roleId) => {
      for (let attempt = 1; attempt <= 3; attempt++) {
        const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${discordId}/roles/${roleId}`, {
          method,
          headers: { Authorization: `Bot ${token}` },
        });
        if (res.ok) return res;
        if (res.status === 429) {
          const retry = Math.max(parseInt(res.headers.get('Retry-After') || '1') || 1, 1);
          await sleep(retry * 1000 + 100);
          continue;
        }
        return res;
      }
      return null;
    };

    const total = users.results.length || 1;
    let log = [];
    let errors = [];
    for (let i = 0; i < users.results.length; i++) {
      const u = users.results[i];
      const pct = (i + 1) / total;
      const rankIdx = rankIdxFromPct(pct);
      const roleId = roleIds[rankIdx];
      if (!roleId) continue;
      const have = memberRoles.get(u.discord_id) || [];

      // 只移除實際掛著的舊階級身分組, 再套用新階級
      for (const oldId of roleIds) {
        if (!oldId || oldId === roleId || !have.includes(oldId)) continue;
        const delRes = await changeRole('DELETE', u.discord_id, oldId);
        await sleep(150);
        if (delRes && !delRes.ok) errors.push(`${u.username} 移除舊身份失敗 HTTP ${delRes.status}`);
      }

      if (!have.includes(roleId)) {
        const setRes = await changeRole('PUT', u.discord_id, roleId);
        if (setRes && setRes.ok) log.push(`${u.username} → ${RANK_LABELS[rankIdx]}`);
        else errors.push(`${u.username} → 失敗${setRes ? ` HTTP ${setRes.status}` : ' 重試用盡'}`);
      } else {
        log.push(`${u.username} → ${RANK_LABELS[rankIdx]} (已持有)`);
      }
      await sleep(150);
    }
    const summary = { time: Date.now(), applied: log.length, log, errors };
    await db.prepare(`INSERT INTO community_state (key, value, updated_at) VALUES ('last_settlement', ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
      .bind(JSON.stringify(summary), Date.now()).run();
    return summary;
  } catch (e) {
    const err = { time: Date.now(), applied: 0, errors: [`exception: ${e.message || e}`] };
    try {
      await db.prepare(`INSERT INTO community_state (key, value, updated_at) VALUES ('last_settlement', ?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
        .bind(JSON.stringify(err), Date.now()).run();
    } catch {}
    return err;
  }
}
