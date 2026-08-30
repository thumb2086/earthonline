#!/usr/bin/env node
'use strict';

// =============================================================================
// aibot-daemon.js — AI Bot 自動修復系統 Phase 1 本地觸發器 (WSL 本機)
// -----------------------------------------------------------------------------
// 職責：輪詢 Worker 的 D1 佇列 -> 認領 pending 任務 -> 叫本機 OpenCode CLI 修復
//       -> git 提交 (可選 push) -> 回報結果到 Worker API。
// 這是一支獨立 Node 腳本，不依賴專案的 ESM/Worker 環境，直接 `node aibot-daemon.js` 即可。
//
// 環境變數 (全部可選，都有預設值)：
//   AIBOT_API_BASE      輪詢/回報的 API 根網址 (預設 https://twonline.dpdns.org；本機測試 http://localhost:8787)
//   AIBOT_TOKEN         Worker 受保護 API 的 Bearer token (預設空；Worker 未設 AIBOT_TOKEN 時也放行)
//   AIBOT_OPENCODE_BIN  OpenCode CLI 絕對路徑 (預設 ~/.nvm/versions/node/v22.23.2/bin/opencode)
//   AIBOT_REPO_DIR      執行 git 的倉庫目錄 (預設本腳本所在目錄，即 ~/earthonline)
//   AIBOT_GIT_BRANCH    目標分支 (預設 master，董事長決策：earthonline 直接動 master 分支)
//   AIBOT_GIT_PUSH      是否真的 git push 到遠端 (預設 false = 只 commit 不 push，安全預設；設 true 才推送)
//   AIBOT_POLL_INTERVAL_MS  輪詢間隔毫秒 (預設 30000)
//   AIBOT_FIX_TIMEOUT_MS    OpenCode 修復超時毫秒 (預設 300000)
// =============================================================================

const { spawnSync } = require('child_process');
const os = require('os');
const path = require('path');

// ---- 設定 (讀 env，給預設) ----
const API_BASE = (process.env.AIBOT_API_BASE || 'https://twonline.dpdns.org').replace(/\/+$/, '');
const AIBOT_TOKEN = process.env.AIBOT_TOKEN || '';
const OPENCODE_BIN = process.env.AIBOT_OPENCODE_BIN
  || path.join(os.homedir(), '.nvm/versions/node/v22.23.2/bin/opencode');
const REPO_DIR = process.env.AIBOT_REPO_DIR || __dirname;
const TARGET_BRANCH = process.env.AIBOT_GIT_BRANCH || 'master';
const DO_PUSH = /^(1|true|yes|on)$/i.test(process.env.AIBOT_GIT_PUSH || 'false');
const POLL_INTERVAL_MS = Number(process.env.AIBOT_POLL_INTERVAL_MS || 30000);
const FIX_TIMEOUT_MS = Number(process.env.AIBOT_FIX_TIMEOUT_MS || 300000);
const MAX_FILES = 3;

const log = (...a) => console.log(`[aibot ${new Date().toISOString()}]`, ...a);
const err = (...a) => console.error(`[aibot ${new Date().toISOString()}]`, ...a);

// ---- HTTP 輔助 ----
function authHeaders() {
  const h = { 'content-type': 'application/json' };
  if (AIBOT_TOKEN) h['Authorization'] = `Bearer ${AIBOT_TOKEN}`;
  return h;
}

async function apiRequest(method, rel, body) {
  const url = `${API_BASE}${rel}`;
  const init = { method, headers: authHeaders(), signal: AbortSignal.timeout(15000) };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(url, init);
  const text = await res.text().catch(() => '');
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    throw new Error(`${method} ${rel} -> HTTP ${res.status}: ${typeof text === 'string' ? text.slice(0, 500) : ''}`);
  }
  return data;
}

const apiGet = (rel) => apiRequest('GET', rel);
const apiPost = (rel, body) => apiRequest('POST', rel, body);
const apiPatch = (rel, body) => apiRequest('PATCH', rel, body);

// ---- 建構 prompt ----
function buildPrompt(task) {
  const typeLabel = {
    bug: '錯誤修復 (bug)',
    suggest: '改善建議 (suggest)',
    feature: '新功能 (feature)',
  }[task.type] || String(task.type || 'unknown');
  return [
    '你是 Earth Online 專案的自動修復 AI。請處理以下來自使用者的任務：',
    '',
    `任務編號: #${task.id}`,
    `類型: ${typeLabel}`,
    `內容: ${task.content}`,
    '',
    '約束條件（必須嚴格遵守）：',
    '1. 只能修改 src/ 目錄下的檔案。',
    '2. 不要修改 wrangler.jsonc、.env 以及任何設定/密鑰檔。',
    '3. 每次最多改 3 個檔案。',
    '4. 請直接完成程式碼修改，不要自行執行 git push、不要開 PR。',
    '5. 若問題無法在不違反上述約束下解決，請說明原因，但絕對不要擅自更動受保護檔案。',
  ].join('\n');
}

// ---- 呼叫本機 OpenCode CLI (headless) ----
function runOpencode(prompt) {
  log(`呼叫 OpenCode 修復任務 (timeout ${FIX_TIMEOUT_MS}ms) ...`);
  const result = spawnSync(OPENCODE_BIN, ['run', prompt, '--print-logs'], {
    cwd: REPO_DIR,
    encoding: 'utf8',
    timeout: FIX_TIMEOUT_MS,
    maxBuffer: 64 * 1024 * 1024,
    env: process.env,
  });
  if (result.error) {
    // ENOENT = 找不到 opencode 執行檔
    if (result.error.code === 'ENOENT') {
      throw new Error(`找不到 OpenCode 執行檔: ${OPENCODE_BIN} (可用 AIBOT_OPENCODE_BIN 指定)`);
    }
    throw result.error;
  }
  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(
      `opencode 非零結束 (exit ${result.status}): ${(result.stderr || result.stdout || '').slice(0, 1500)}`
    );
  }
  const out = `${(result.stdout || '').trim()}\n${(result.stderr || '').trim()}`.trim();
  return out;
}

// ---- git 輔助 ----
function git(args, { allowFail = false, timeout = 60000 } = {}) {
  const r = spawnSync('git', args, { cwd: REPO_DIR, encoding: 'utf8', timeout, env: process.env });
  if (r.error && !allowFail) throw r.error;
  if (typeof r.status === 'number' && r.status !== 0 && !allowFail) {
    throw new Error(`git ${args.join(' ')} 失敗: ${(r.stderr || r.stdout || `exit ${r.status}`).slice(0, 1000)}`);
  }
  return `${(r.stdout || '').trim()}\n${(r.stderr || '').trim()}`.trim();
}

function doGit(task) {
  // 若不在目標分支先 checkout（失敗不阻擋，繼續用目前分支）
  git(['checkout', TARGET_BRANCH], { allowFail: true });
  const currentBranch = git(['rev-parse', '--abbrev-ref', 'HEAD'], { allowFail: true }) || TARGET_BRANCH;

  git(['add', '-A']);
  const hasChanges = git(['status', '--porcelain'], { allowFail: true }).trim().length > 0;
  if (!hasChanges) {
    log(`任務 #${task.id}: 沒有檔案變更，跳過 commit/push`);
    return { files: [], branch: currentBranch };
  }

  const msg = `aibot: #${task.id} ${String(task.content || '').slice(0, 50)}`.replace(/\s+/g, ' ').trim();
  git(['commit', '-m', msg]);

  if (DO_PUSH) {
    git(['push', 'origin', TARGET_BRANCH]);
    log(`任務 #${task.id}: 已 push 到 origin/${TARGET_BRANCH}`);
  } else {
    log(`任務 #${task.id}: DO_PUSH=false，已 commit 但未 push（設 AIBOT_GIT_PUSH=true 才推送）`);
  }

  const diff = git(['diff', '--name-only', 'HEAD~1'], { allowFail: true });
  const files = diff.split('\n').map((s) => s.trim()).filter(Boolean);
  return { files, branch: currentBranch };
}

// ---- 單一任務處理 ----
async function processTask(task) {
  const id = task.id;
  try {
    // 1) 認領：標記 processing（若已被別的 daemon 認走，triggered=0）
    const trig = await apiPost('/api/aibot/trigger', { ids: [id] });
    if (!trig || Number(trig.triggered) === 0) {
      log(`任務 #${id} 已被其他 daemon 認領，跳過`);
      return;
    }

    // 2) 修復
    const prompt = buildPrompt(task);
    runOpencode(prompt);

    // 3) git 提交 / 推送
    const { files, branch } = doGit(task);

    // 4) 安全檢查：改超過 3 個檔案只警告不阻擋
    if (files.length > MAX_FILES) {
      err(`WARN 任務 #${id} 修改了 ${files.length} 個檔案 (> ${MAX_FILES}): ${files.join(', ')}`);
    }

    // 5) 回報成功
    await apiPatch(`/api/aibot/queue/${id}`, {
      status: 'done',
      pr_url: '',
      branch: branch || TARGET_BRANCH,
      files_changed: files,
    });
    log(`任務 #${id} 完成。branch=${branch || TARGET_BRANCH}, files=${files.length}: ${files.join(', ') || '(無)'}`);
  } catch (e) {
    const msg = (e && e.message) ? e.message : String(e);
    err(`任務 #${id} 處理失敗: ${msg}`);
    // 單任務失敗仍要回報 failed，不中斷整體迴圈
    try {
      await apiPatch(`/api/aibot/queue/${id}`, {
        status: 'failed',
        error_log: msg.slice(0, 4000),
      });
      log(`任務 #${id} 已回報 failed`);
    } catch (pe) {
      err(`任務 #${id} 回報 failed 也失敗: ${pe && pe.message ? pe.message : pe}`);
    }
  }
}

// ---- 輪詢 ----
async function pollOnce() {
  const tasks = await apiGet('/api/aibot/pending?limit=3');
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return;
  }
  log(`輪詢到 ${tasks.length} 個待處理任務`);
  for (const task of tasks) {
    // 逐個處理，單一失敗不影響其他
    await processTask(task);
  }
}

async function loop() {
  for (;;) {
    try {
      await pollOnce();
    } catch (e) {
      err(`輪詢錯誤（繼續）： ${e && e.message ? e.message : e}`);
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

// ---- 啟動 ----
let stopping = false;
async function main() {
  log('========================================');
  log('AI Bot 自動修復 daemon 啟動 (Phase 1)');
  log(`API_BASE        = ${API_BASE}`);
  log(`REPO_DIR        = ${REPO_DIR}`);
  log(`OPENCODE_BIN    = ${OPENCODE_BIN}`);
  log(`TARGET_BRANCH   = ${TARGET_BRANCH}`);
  log(`DO_PUSH         = ${DO_PUSH}`);
  log(`POLL_INTERVAL   = ${POLL_INTERVAL_MS}ms`);
  log(`FIX_TIMEOUT     = ${FIX_TIMEOUT_MS}ms`);
  log(`AUTH            = ${AIBOT_TOKEN ? 'Bearer ***' : '(無 token，依 Worker 設定)'}`);
  log('========================================');
  loop().catch((e) => err('loop 崩潰：', e));
}

function shutdown(sig) {
  if (stopping) return;
  stopping = true;
  log(`收到 ${sig}，結束 daemon`);
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main();
