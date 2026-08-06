-- 每小時公司財報快照 (基本面分析資料源)
CREATE TABLE IF NOT EXISTS company_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id INTEGER NOT NULL,
  period_start INTEGER NOT NULL,
  income_rate INTEGER NOT NULL,
  cost_rate INTEGER NOT NULL,
  profit_rate INTEGER NOT NULL,
  dividend_rate REAL NOT NULL DEFAULT 0,
  price INTEGER NOT NULL,
  total_shares INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_company_reports_cid ON company_reports (company_id, created_at DESC);
