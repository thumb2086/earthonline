-- 央行基準利率 (Fed 式升降息): 依市場熱度調整
CREATE TABLE IF NOT EXISTS market_rates (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  savings_rate REAL NOT NULL DEFAULT 0.0005,
  deposit_mult REAL NOT NULL DEFAULT 1.0,
  adjusted_at INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO market_rates (id, savings_rate, deposit_mult, adjusted_at) VALUES (1, 0.0005, 1.0, 0);

-- 全域元資料 (公告/重置標記等)
CREATE TABLE IF NOT EXISTS game_meta (
  key TEXT PRIMARY KEY,
  value TEXT
);
