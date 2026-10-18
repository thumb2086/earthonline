// aibot_queue 單元測試（離線 fake D1，不碰真資料庫）
// 執行: node tests/aibot-queue.test.mjs
//
// 覆蓋 4 個不變量：
//   T1 /report 必須驗 AIBOT_TOKEN（否則任何人都能寫入 D1）
//   T2 /report 必須限制 content 長度（否則單一請求就能塞爆 D1）
//   T3 /trigger 必須回報「實際」認領數，不是「請求」數（否則冪等性失效）
//   T4 /pending 必須回收卡在 processing 的逾時任務（否則永久卡死）

import { reportTask, triggerTasks, pendingTasks } from '../src/aibot_queue.js';

const TOKEN = 'test-token-abc';
let failures = 0;
function check(name, cond, detail = '') {
  if (cond) { console.log(`  PASS  ${name}`); }
  else { console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`); failures++; }
}

// ---------------------------------------------------------------------------
// 極簡 in-memory D1 替身：只實作 ai_bot_queue / ai_bot_log 會用到的查詢
// ---------------------------------------------------------------------------
function makeDB() {
  const q = [];
  let logSeq = 0;
  const api = {
    q: [],
    nextId: 1,
    insert(status = 'pending', content = 'x') {
      const id = api.nextId++;
      q.push({ id, type: 'bug', content, user_id: 'u1', channel_id: 'c1', status, priority: 0, created_at: 0, updated_at: 0 });
      return id;
    },
    rows(status) { return status ? q.filter(r => r.status === status) : q; },
    logs: [],
    reset() { q.length = 0; api.logs.length = 0; },
  };

  const db = {
    prepare(sql) {
      let binds = [];
      const stmt = {
        bind(...b) { binds = b; return stmt; },
        async run() {
          api.q.push({ sql, binds });
          let meta = { changes: 0, last_row_id: 0 };
          if (/^\s*INSERT INTO ai_bot_queue/.test(sql)) {
            const id = api.insert();
            api.q[api.q.length - 1].row = { id };
            meta = { changes: 1, last_row_id: id };
          } else if (/UPDATE ai_bot_queue SET status = 'processing'/.test(sql)) {
            const [, id, , t] = binds; // updated_at, id  (WHERE id = ? AND status = 'pending')
            const row = q.find(r => r.id === id && r.status === 'pending');
            if (row) { row.status = 'processing'; row.updated_at = t; meta.changes = 1; }
          } else if (/UPDATE ai_bot_queue SET/.test(sql)) {
            const id = binds[binds.length - 1];
            const row = q.find(r => r.id === id);
            if (row) {
              // 只模擬 status / updated_at（其他欄位本測試不驗證）
              const setPart = sql.slice(sql.indexOf('SET') + 3, sql.indexOf('WHERE id = ?'));
              if (/status = \?/.test(setPart)) row.status = binds[0];
              meta = { changes: 1 };
            }
          } else if (/UPDATE ai_bot_queue SET status = 'pending' WHERE status = 'processing'/.test(sql)) {
            const cutoff = Number(binds[0]);
            let n = 0;
            for (const r of q) if (r.status === 'processing' && r.updated_at < cutoff) { r.status = 'pending'; n++; }
            meta = { changes: n };
          } else if (/INSERT INTO ai_bot_log/.test(sql)) {
            api.logs.push({ task_id: binds[0], event: binds[1] });
            meta = { changes: 1, last_row_id: ++logSeq };
          }
          return meta;
        },
        async first() {
          if (/FROM ai_bot_queue WHERE id = \?/.test(sql)) {
            return q.find(r => r.id === Number(binds[0])) || null;
          }
          return null;
        },
        async all() {
          api.q.push({ sql, binds });
          if (/FROM ai_bot_queue WHERE status = 'pending'/.test(sql)) {
            const lim = Number(binds[binds.length - 1]) || 5;
            // 只有 SQL 真的帶了逾時回收條件才撈 processing —— 逼測試能分辨
            // 「改了 WHERE 子句」與「只改了 bind 參數」兩種 mutation
            const reclaims = /status = 'processing' AND updated_at < \?/.test(sql);
            const cutoff = reclaims ? Number(binds[0]) : 0;
            return { results: q.filter(r => r.status === 'pending'
              || (reclaims && r.status === 'processing' && r.updated_at < cutoff)).slice(0, lim) };
          }
          if (/status = 'pending'/.test(sql)) {
            const lim = Number(binds[binds.length - 1]) || 5;
            return { results: q.filter(r => r.status === 'pending').slice(0, lim) };
          }
          return { results: [] };
        },
      };
      return stmt;
    },
    async batch(stmts) {
      // 真實 D1: 回傳 D1Result[]，異動筆數在 .meta.changes
      const metas = [];
      for (const s of stmts) metas.push({ success: true, meta: await s.run() });
      return metas;
    },
  };
  return { db, api };
}

function req(method, body, headers = {}) {
  return new Request('https://x/api/aibot/report', {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
const authed = { Authorization: `Bearer ${TOKEN}` };
const env = (db) => ({ DB: db, AIBOT_TOKEN: TOKEN });
const H = {};
const body = { type: 'bug', content: 'crash on login', user_id: 'u1', channel_id: 'c1' };

// --- T1: /report 未授權必須拒絕 ---------------------------------------------
{
  console.log('T1 /report 驗證');
  const { db, api } = makeDB();
  const res = await reportTask(req('POST', body), env(db), H);
  check('未帶 token 時 status 401', res.status === 401, `實際 ${res.status}`);
  check('未帶 token 時不寫入 D1', api.q.length === 0, `寫了 ${api.q.length} 筆`);
}

// --- T1b: 帶對 token 應該過 -----------------------------------------------
{
  console.log('T1b /report 帶正確 token');
  const { db, api } = makeDB();
  const res = await reportTask(req('POST', body, authed), env(db), H);
  check('status 201', res.status === 201, `實際 ${res.status}`);
  check('寫入 1 筆佇列', api.rows().length === 1, `實際 ${api.rows().length}`);
}

// --- T1c: fail-closed —— 沒有設定 AIBOT_TOKEN 時必須拒絕 ---------------------
//
// ★ 2026-10-18 線上實測：production 的 secret 清單裡根本沒有 AIBOT_TOKEN，
//   而原本 `if (!env.AIBOT_TOKEN) return true;` → 無 token 的 POST 拿到 HTTP 201。
//   這個測試就是為了讓那種狀態不可能再發生。
{
  console.log('T1c fail-closed（secret 未設定時）');
  const { db, api } = makeDB();
  const res = await reportTask(req('POST', body), { DB: db }, H);
  check('AIBOT_TOKEN 未設定 → 401', res.status === 401, `實際 ${res.status}`);
  check('AIBOT_TOKEN 未設定 → 不寫入 D1', api.q.length === 0, `寫了 ${api.q.length} 筆`);
}
{
  console.log('T1d 明確 opt-in 才有例外');
  const { db, api } = makeDB();
  const res = await reportTask(req('POST', body),
    { DB: db, AIBOT_ALLOW_ANONYMOUS: 'true' }, H);
  check('AIBOT_ALLOW_ANONYMOUS=true → 放行', res.status === 201, `實際 ${res.status}`);
}
{
  console.log('T1e 長度不符的 token 必須拒絕');
  const { db, api } = makeDB();
  const res = await reportTask(req('POST', body, { Authorization: 'Bearer short' }),
    env(db), H);
  check('長度不符 → 401', res.status === 401, `實際 ${res.status}`);
  check('長度不符 → 不寫入 D1', api.q.length === 0, `寫了 ${api.q.length} 筆`);
}

// --- T2: content 長度上限 ---------------------------------------------------
{
  console.log('T2 /report content 長度上限');
  const { db } = makeDB();
  const res = await reportTask(req('POST', { ...body, content: 'x'.repeat(100000) }, authed), env(db), H);
  check('超長 content 被拒 (400)', res.status === 400, `實際 ${res.status}`);
}

// --- T3: /trigger 回報實際認領數 ---------------------------------------------
{
  console.log('T3 /trigger 冪等性');
  const { db, api } = makeDB();
  const id = api.insert();
  const r1 = await triggerTasks(req('POST', { ids: [id] }, authed), env(db), H);
  const r2 = await triggerTasks(req('POST', { ids: [id] }, authed), env(db), H);
  const j1 = await r1.json(), j2 = await r2.json();
  check('第一次認領 triggered=1', j1.triggered === 1, `實際 ${j1.triggered}`);
  check('第二次重複認領 triggered=0', j2.triggered === 0, `實際 ${j2.triggered}`);
  check('只有實際認領的那次寫 claimed log', api.logs.length === 1 && api.logs[0].event === 'claimed',
    `logs=${JSON.stringify(api.logs)}`);
}

// --- T4: pending 回收卡住的 processing ---------------------------------------
{
  console.log('T4 /pending 回收逾時 processing');
  const { db, api } = makeDB();
  const stale = api.insert('processing');
  api.q.find; // noop
  // 把該列 updated_at 設為 2 小時前（模擬 daemon 認領後崩潰）
  for (const r of api.rows()) r.updated_at = Date.now() - 2 * 3600 * 1000;
  const fresh = api.insert('processing');
  for (const r of api.rows()) if (r.id === fresh) r.updated_at = Date.now();

  const res = await pendingTasks(req('GET', undefined, authed), env(db), H, new URL('https://x/api/aibot/pending?limit=20'));
  const ids = (await res.json()).map(r => r.id);
  check('逾時的 processing 任務被回收', ids.includes(stale), `ids=${ids}`);
  check('未逾時的 processing 不被回收', !ids.includes(fresh), `ids=${ids}`);
}

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);