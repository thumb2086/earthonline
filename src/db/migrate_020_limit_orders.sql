-- 掛單/條件交易 (Limit Orders): 價格到達門檻自動成交
CREATE TABLE IF NOT EXISTS stock_limit_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  company_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  filled_quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  created_at INTEGER NOT NULL,
  filled_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_slo_company ON stock_limit_orders (company_id, status);
CREATE INDEX IF NOT EXISTS idx_slo_user ON stock_limit_orders (user_id, status);
