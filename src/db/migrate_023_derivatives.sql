-- ETF: 封閉式，追蹤大盤指數 (單位價 = 指數 × $0.01)
CREATE TABLE IF NOT EXISTS etfs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  unit_price INTEGER NOT NULL DEFAULT 10,
  total_units INTEGER NOT NULL DEFAULT 1000000,
  issue_cap INTEGER NOT NULL DEFAULT 2000000,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS etf_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  etf_id INTEGER NOT NULL UNIQUE,
  cash REAL NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 1000000
);

CREATE TABLE IF NOT EXISTS etf_holdings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  etf_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, etf_id)
);

CREATE TABLE IF NOT EXISTS etf_trades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  etf_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  price INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  traded_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_etf_trades ON etf_trades (etf_id, traded_at);

-- 指數期貨: 權益期權式 (最大虧損 = 權利金)
CREATE TABLE IF NOT EXISTS futures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  direction TEXT NOT NULL,
  term_minutes INTEGER NOT NULL,
  entry_index REAL NOT NULL,
  contracts INTEGER NOT NULL DEFAULT 1,
  multiplier INTEGER NOT NULL DEFAULT 1,
  premium INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  opened_at INTEGER NOT NULL,
  settle_at INTEGER NOT NULL,
  settle_index REAL,
  pnl INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_futures_open ON futures (status, settle_at);
CREATE INDEX IF NOT EXISTS idx_futures_user ON futures (user_id);

-- 種子: 一支大盤 ETF「元指ETF」
INSERT INTO etfs (id, name, symbol, unit_price, total_units, issue_cap, created_at) VALUES (1, '元指ETF', 'TWD-1', 10, 1000000, 2000000, strftime('%s','now') * 1000)
ON CONFLICT(id) DO NOTHING;
INSERT INTO etf_inventory (etf_id, cash, stock_quantity) VALUES (1, 0, 1000000)
ON CONFLICT(etf_id) DO NOTHING;