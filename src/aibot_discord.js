// 獨立 AI Bot 修復系統 — Discord Application
// 這是一個「全新、獨立」的 Discord bot，不掛在遊戲 discord_bot.js 之下。
// 職責：
//   - 接收 slash command: /report bug|suggest|feature <描述>、/aistatus、/aiqueue
//   - 寫入 D1 ai_bot_queue（透過內部 /api/aibot/report）
//   - 回報處理結果（由本地 daemon 呼叫 /api/aibot/queue/:id patch 後，這邊只負責主動推播）
//
// 環境變數（與遊戲 bot 完全分開）：
//   AIBOT_DISCORD_TOKEN      - 新 bot 的 token
//   AIBOT_DISCORD_PUBLIC_KEY - 新 bot 的 Ed25519 public key（驗簽用）
//   AIBOT_TOKEN              - Worker 內部 API 共享密鑰（report 寫入用）
//   AIBOT_REPORT_CHANNEL     - 回報頻道 id（結果推播）

import { json } from './utils.js';

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

// Discord 在 Workers 上會把 header 轉小寫並改名
function getHeaderIgnoreCase(headers, name) {
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
  const publicKey = env.AIBOT_DISCORD_PUBLIC_KEY;
  if (!publicKey) return true; // 未設定時跳過（開發/本地）
  const timestamp = getHeaderIgnoreCase(request.headers, 'X-Signature-Ed25519-Timestamp') || '';
  const signature = getHeaderIgnoreCase(request.headers, 'X-Signature-Ed25519-Signature') || '';
  if (!timestamp || !signature) return false;
  try {
    const body = await request.clone().text();
    const key = await crypto.subtle.importKey('raw', hexToBytes(publicKey), { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify('Ed25519', key, hexToBytes(signature), new TextEncoder().encode(timestamp + body));
  } catch (e) {
    console.error('aibot Ed25519 verify error:', e?.message || e);
    return false;
  }
}

function textResponse(content) {
  return new Response(JSON.stringify({ type: 4, data: { content } }), {
    headers: { 'content-type': 'application/json' },
  });
}

// 註冊 slash commands（全域）到新 bot
const COMMANDS = [
  { name: 'report', description: '回報一個問題或建議給 AI 自動修復佇列',
    options: [
      { type: 3, name: 'kind', description: '類型', required: true,
        choices: [
          { name: 'bug 錯誤', value: 'bug' },
          { name: 'suggest 建議', value: 'suggest' },
          { name: 'feature 功能', value: 'feature' },
        ] },
      { type: 3, name: 'desc', description: '描述', required: true },
    ] },
  { name: 'aistatus', description: '查看 AI 修復佇列統計' },
  { name: 'aiqueue', description: '查看最近的待處理任務',
    options: [ { type: 4, name: 'limit', description: '數量 (預設10)', required: false } ] },
];

export async function handleAIBotInteractions(request, env) {
  if (request.method !== 'POST') return new Response('ok', { status: 200 });
  const valid = await verifySignature(request, env);
  if (!valid) return new Response('invalid signature', { status: 401 });

  const payload = await request.json().catch(() => null);
  if (!payload) return new Response('bad', { status: 400 });

  // PING
  if (payload.type === 1) {
    return new Response(JSON.stringify({ type: 1 }), { headers: { 'content-type': 'application/json' } });
  }
  if (payload.type !== 2) return new Response('ok', { status: 200 });

  const name = payload.data?.name || '';
  const opts = (payload.data?.options || []).reduce((m, o) => (m[o.name] = o.value, m), {});
  const channelId = payload.channel_id || payload.guild_id || '';

  try {
    if (name === 'report') {
      const kind = opts.kind || 'bug';
      const desc = String(opts.desc || '').trim();
      if (!desc) return textResponse('❌ 描述不可為空');
      const userId = payload.member?.user?.id || payload.user?.id || 'unknown';
      // 寫入 D1（走內部 API，帶 AIBOT_TOKEN）
      const origin = new URL(request.url).origin;
      const res = await fetch(`${origin}/api/aibot/report`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${env.AIBOT_TOKEN || ''}` },
        body: JSON.stringify({ type: kind, content: desc, user_id: userId, channel_id: channelId }),
      });
      if (!res.ok) return textResponse('❌ 寫入佇列失敗，請稍後再試');
      const { id } = await res.json();
      return textResponse(`✅ 已收到！任務編號 #${id}\n類型: ${kind}\n處理後會自動通知你。`);
    }

    if (name === 'aistatus') {
      const origin = new URL(request.url).origin;
      const res = await fetch(`${origin}/api/aibot/stats`, {
        headers: { Authorization: `Bearer ${env.AIBOT_TOKEN || ''}` },
      });
      const s = res.ok ? await res.json() : {};
      return textResponse(
        `🤖 **AI 修復佇列狀態**\n` +
        `待處理 ${s.pending || 0} · 處理中 ${s.processing || 0}\n` +
        `完成 ${s.done || 0} · 失敗 ${s.failed || 0} · 拒絕 ${s.rejected || 0}\n` +
        `累計 ${s.total || 0}`
      );
    }

    if (name === 'aiqueue') {
      const limit = Math.min(parseInt(opts.limit) || 10, 25);
      const origin = new URL(request.url).origin;
      const res = await fetch(`${origin}/api/aibot/queue?status=pending&limit=${limit}`, {
        headers: { Authorization: `Bearer ${env.AIBOT_TOKEN || ''}` },
      });
      const rows = res.ok ? (await res.json()) : [];
      if (!rows.length) return textResponse('📭 目前沒有待處理任務');
      const out = rows.slice(0, limit).map(r => `#${r.id} [${r.type}] ${String(r.content).slice(0, 40)}`).join('\n');
      return textResponse(`📋 **待處理任務** (${rows.length})\n${out}`);
    }
  } catch (err) {
    return textResponse(`❌ 發生錯誤: ${err.message}`);
  }

  return new Response('ok', { status: 200 });
}

// 一次性設定：把 slash commands 註冊到新 bot（admin 呼叫 /aibot/setup）
export async function setupAIBotDiscord(env) {
  const token = env.AIBOT_DISCORD_TOKEN;
  if (!token) return { error: '缺少 AIBOT_DISCORD_TOKEN' };
  const res = await fetch('https://discord.com/api/v10/applications/@me/commands', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(COMMANDS),
  });
  if (!res.ok) return { error: `註冊失敗: ${res.status} ${await res.text()}` };
  const app = await fetch('https://discord.com/api/v10/applications/@me', {
    headers: { Authorization: `Bearer ${token}` },
  }).then(r => r.json()).catch(() => ({}));
  return { success: true, appId: app.id, appName: app.name, commands: COMMANDS.map(c => c.name) };
}

// 把處理結果推播到回報頻道（由本地 daemon 觸發，或手動呼叫 /api/aibot/notify）
export async function pushResult(env, task) {
  const token = env.AIBOT_DISCORD_TOKEN;
  const channel = env.AIBOT_REPORT_CHANNEL;
  if (!token || !channel) return false;
  const ok = task.status === 'done';
  const content = ok
    ? `✅ 自動修復完成 #${task.id}\n問題: ${String(task.content).slice(0, 200)}\nPR: ${task.pr_url || '(無)'}`
    : `❌ 自動修復失敗 #${task.id}\n問題: ${String(task.content).slice(0, 200)}\n原因: ${String(task.error_log || '未知').slice(0, 200)}`;
  const res = await fetch(`https://discord.com/api/v10/channels/${channel}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  return res.ok;
}
