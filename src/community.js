// 社群維運系統: 每週階級清算 + 語音掛機加成
// 需求 env: DISCORD_GUILD_ID, DISCORD_BOT_TOKEN, DISCORD_VOICE_CHANNEL_ID (可選)
// 身分組配置: DISCORD_ROLE_RANK1..5 (選填, 依排名分配)

const RANK_ROLES = ['DISCORD_ROLE_RANK1', 'DISCORD_ROLE_RANK2', 'DISCORD_ROLE_RANK3', 'DISCORD_ROLE_RANK4', 'DISCORD_ROLE_RANK5'];
const RANK_LABELS = ['👑 傳奇', '💎 菁英', '🥇 高級', '🥈 中級', '🥉 平民'];

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

  const roleIds = RANK_ROLES.map(k => env[k]).filter(Boolean);
  if (roleIds.length === 0) return;

  try {
    const users = await db.prepare(`
      SELECT u.id, u.discord_id, w.total_earned FROM users u
      JOIN wallets w ON w.user_id = u.id
      WHERE u.discord_id IS NOT NULL
      ORDER BY w.total_earned DESC
    `).all();

    const total = users.results.length;
    let log = [];
    for (let i = 0; i < users.results.length; i++) {
      const u = users.results[i];
      const pct = (i + 1) / total;
      let rankIdx = 4;
      if (pct <= 0.1) rankIdx = 0;
      else if (pct <= 0.3) rankIdx = 1;
      else if (pct <= 0.6) rankIdx = 2;
      else if (pct <= 0.85) rankIdx = 3;
      const roleId = roleIds[rankIdx];
      if (!roleId) continue;

      const setRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${u.discord_id}/roles/${roleId}`, {
        method: 'PUT',
        headers: { Authorization: `Bot ${token}` },
      });
      if (setRes.ok) log.push(`${u.username} → ${RANK_LABELS[rankIdx]}`);
    }
    await db.prepare(`INSERT INTO community_state (key, value, updated_at) VALUES ('last_settlement', ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
      .bind(JSON.stringify({ time: Date.now(), applied: log.length }), Date.now()).run();
  } catch (e) {}
}
