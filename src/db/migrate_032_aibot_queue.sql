-- AI Bot 自動修復系統：任務佇列
-- 執行: wrangler d1 execute earthonline-db --local --file=src/db/migrate_032_aibot_queue.sql
--      wrangler d1 execute earthonline-db --remote --file=src/db/migrate_032_aibot_queue.sql

CREATE TABLE IF NOT EXISTS ai_bot_queue (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  type            TEXT NOT NULL CHECK(type IN ('bug','suggest','feature')),
  content         TEXT NOT NULL,
  user_id         TEXT NOT NULL,          -- 提報者 Discord id
  channel_id      TEXT NOT NULL,          -- 來源頻道
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK(status IN ('pending','processing','done','failed','rejected')),
  priority        INTEGER DEFAULT 0,
  github_issue_url TEXT,
  pr_url          TEXT,
  branch          TEXT,
  files_changed   TEXT,                    -- JSON array，安全審計用
  error_log       TEXT,
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aibot_status ON ai_bot_queue(status);
CREATE INDEX IF NOT EXISTS idx_aibot_priority ON ai_bot_queue(priority DESC, id ASC);

-- 處理紀錄（保留 7 天修復記錄用）
CREATE TABLE IF NOT EXISTS ai_bot_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id    INTEGER NOT NULL,
  event      TEXT NOT NULL,               -- claimed | fixed | pushed | failed | rejected
  detail     TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_aibot_log_task ON ai_bot_log(task_id);
