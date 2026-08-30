// AI Bot 自動修復系統 — 任務佇列 API
// 端點 (prefix /api/aibot):
//   POST   /report        { type, content, user_id, channel_id } -> { id, status }
//   GET    /queue?status=&type=&limit=  -> [{...}]
//   GET    /queue/:id     -> {...}
//   PATCH  /queue/:id     { status?, priority?, pr_url?, github_issue_url?, error_log?, branch?, files_changed? }
//   POST   /trigger       { ids:[] } -> { triggered }   (標記 processing，供本地 daemon 認領)
//   GET    /pending?limit= -> 本地 daemon 輪詢用，回傳 pending 任務
//   GET    /stats         -> 各狀態計數
// 此模組不依賴遊戲 JWT：/report 由 Discord bot 帶 AIBOT_TOKEN 寫入；
// 其餘管理/觸發端點由本地 daemon 或管理頁帶 AIBOT_TOKEN 呼叫。

import { json } from './utils.js';

const VALID_TYPES = ['bug', 'suggest', 'feature'];
const VALID_STATUS = ['pending', 'processing', 'done', 'failed', 'rejected'];

function now() { return Date.now(); }

// 簡單 Bearer token 驗證（AIBOT_TOKEN 存 wrangler vars/secrets）
export function aibotAuth(request, env) {
  if (!env.AIBOT_TOKEN) return true; // 未設則放行（開發期）
  const h = request.headers.get('Authorization') || '';
  if (!h.startsWith('Bearer ')) return false;
  return h.slice(7) === env.AIBOT_TOKEN;
}

async function readBody(request) {
  try { return await request.json(); } catch { return {}; }
}

// POST /api/aibot/report
export async function reportTask(request, env, headers) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, headers, 405);
  const b = await readBody(request);
  const type = String(b.type || '').toLowerCase();
  const content = String(b.content || '').trim();
  const userId = String(b.user_id || '').trim();
  const channelId = String(b.channel_id || '').trim();
  if (!VALID_TYPES.includes(type)) return json({ error: `type 必須是 ${VALID_TYPES.join('/')}` }, headers, 400);
  if (!content) return json({ error: 'content 不可為空' }, headers, 400);
  if (!userId || !channelId) return json({ error: '缺少 user_id / channel_id' }, headers, 400);

  const t = now();
  const info = await env.DB.prepare(
    'INSERT INTO ai_bot_queue (type, content, user_id, channel_id, status, priority, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(type, content, userId, channelId, 'pending', b.priority != null ? Number(b.priority) || 0 : 0, t, t).run();

  const id = info.meta?.last_row_id;
  return json({ id, status: 'pending' }, headers, 201);
}

// GET /api/aibot/queue | /api/aibot/queue/:id
export async function listQueue(request, env, headers, url, id) {
  if (id != null) {
    const row = await env.DB.prepare('SELECT * FROM ai_bot_queue WHERE id = ?').bind(id).first();
    if (!row) return json({ error: 'not found' }, headers, 404);
    return json(row, headers);
  }
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50') || 50, 200);
  let sql = 'SELECT * FROM ai_bot_queue WHERE 1=1';
  const binds = [];
  if (status) { sql += ' AND status = ?'; binds.push(status); }
  if (type) { sql += ' AND type = ?'; binds.push(type); }
  sql += ' ORDER BY priority DESC, id ASC LIMIT ?';
  binds.push(limit);
  const rows = await env.DB.prepare(sql).bind(...binds).all();
  return json(rows.results, headers);
}

// 本地 daemon 輪詢：回傳待處理任務（可選 limit）
export async function pendingTasks(request, env, headers, url) {
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '5') || 5, 20);
  const rows = await env.DB.prepare(
    "SELECT * FROM ai_bot_queue WHERE status = 'pending' ORDER BY priority DESC, id ASC LIMIT ?"
  ).bind(limit).all();
  return json(rows.results, headers);
}

// PATCH /api/aibot/queue/:id
export async function patchTask(request, env, headers, id) {
  if (!aibotAuth(request, env)) return json({ error: 'Unauthorized' }, headers, 401);
  const row = await env.DB.prepare('SELECT * FROM ai_bot_queue WHERE id = ?').bind(id).first();
  if (!row) return json({ error: 'not found' }, headers, 404);
  const b = await readBody(request);
  const sets = [];
  const binds = [];
  if (b.status != null) {
    const s = String(b.status).toLowerCase();
    if (!VALID_STATUS.includes(s)) return json({ error: `status 無效` }, headers, 400);
    sets.push('status = ?'); binds.push(s);
    // 寫 log
    await env.DB.prepare('INSERT INTO ai_bot_log (task_id, event, detail, created_at) VALUES (?, ?, ?, ?)')
      .bind(id, s === 'done' ? 'pushed' : (s === 'failed' ? 'failed' : 'update'), String(b.error_log || b.pr_url || ''), now()).run();
  }
  if (b.pr_url) { sets.push('pr_url = ?'); binds.push(String(b.pr_url)); }
  if (b.github_issue_url) { sets.push('github_issue_url = ?'); binds.push(String(b.github_issue_url)); }
  if (b.branch) { sets.push('branch = ?'); binds.push(String(b.branch)); }
  if (b.files_changed != null) { sets.push('files_changed = ?'); binds.push(JSON.stringify(b.files_changed)); }
  if (b.error_log != null) { sets.push('error_log = ?'); binds.push(String(b.error_log).slice(0, 4000)); }
  if (b.priority != null) { sets.push('priority = ?'); binds.push(Number(b.priority) || 0); }
  if (sets.length === 0) return json({ error: 'nothing to update' }, headers, 400);
  sets.push('updated_at = ?'); binds.push(now());
  binds.push(id);
  await env.DB.prepare(`UPDATE ai_bot_queue SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
  const updated = await env.DB.prepare('SELECT * FROM ai_bot_queue WHERE id = ?').bind(id).first();
  return json(updated, headers);
}

// POST /api/aibot/trigger  { ids: [] } -> 標記 processing
export async function triggerTasks(request, env, headers) {
  if (!aibotAuth(request, env)) return json({ error: 'Unauthorized' }, headers, 401);
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, headers, 405);
  const b = await readBody(request);
  const ids = Array.isArray(b.ids) ? b.ids.map(Number).filter(Boolean) : [];
  if (ids.length === 0) return json({ triggered: 0 }, headers);
  const t = now();
  const stmts = ids.map(id => env.DB.prepare(
    "UPDATE ai_bot_queue SET status = 'processing', updated_at = ? WHERE id = ? AND status = 'pending'"
  ).bind(t, id));
  await env.DB.batch(stmts);
  for (const id of ids) {
    await env.DB.prepare('INSERT INTO ai_bot_log (task_id, event, detail, created_at) VALUES (?, ?, ?, ?)')
      .bind(id, 'claimed', '', t).run();
  }
  return json({ triggered: ids.length }, headers);
}

// GET /api/aibot/stats
export async function queueStats(request, env, headers) {
  const rows = await env.DB.prepare(
    'SELECT status, COUNT(*) as c FROM ai_bot_queue GROUP BY status'
  ).all();
  const stats = { pending: 0, processing: 0, done: 0, failed: 0, rejected: 0, total: 0 };
  for (const r of rows.results) { stats[r.status] = r.c; stats.total += r.c; }
  return json(stats, headers);
}
