-- 礦機模型表
CREATE TABLE IF NOT EXISTS mining_models (
  model       TEXT PRIMARY KEY,
  type        TEXT NOT NULL,         -- gpu / asic / psu / cooler / rack / software / ups / switch
  category    TEXT NOT NULL DEFAULT 'gpu',
  tflops      REAL NOT NULL DEFAULT 0,
  watts       INTEGER NOT NULL DEFAULT 0,
  price       INTEGER NOT NULL,
  ai_score    INTEGER NOT NULL DEFAULT 0,
  vram        INTEGER NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0
);

-- 玩家礦機庫存
CREATE TABLE IF NOT EXISTS mining_hardware (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  model       TEXT NOT NULL,
  mode        TEXT DEFAULT 'mining',  -- mining / ai
  efficiency  REAL NOT NULL DEFAULT 1.0,
  running     INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mining_hardware_user ON mining_hardware(user_id);
CREATE INDEX IF NOT EXISTS idx_mining_hardware_running ON mining_hardware(running);

-- 礦機交易掛單
CREATE TABLE IF NOT EXISTS mining_orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  type        TEXT NOT NULL,          -- buy / sell
  model       TEXT NOT NULL,
  quantity    INTEGER NOT NULL,
  price       INTEGER NOT NULL,       -- 每台 Cash 價
  filled      INTEGER DEFAULT 0,
  status      TEXT DEFAULT 'open',    -- open / filled / cancelled
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mining_orders_market ON mining_orders(status, model, type, price);

-- BTC 市場掛單
CREATE TABLE IF NOT EXISTS btc_orders (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  type        TEXT NOT NULL,          -- buy / sell
  btc_amount  REAL NOT NULL,
  price       INTEGER NOT NULL,       -- 每顆 BTC 的 Cash 價格
  filled      REAL DEFAULT 0,
  status      TEXT DEFAULT 'open',
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_btc_orders_market ON btc_orders(status, type, price);

-- BTC K線
CREATE TABLE IF NOT EXISTS btc_klines (
  minute      INTEGER PRIMARY KEY,
  open        INTEGER NOT NULL,
  high        INTEGER NOT NULL,
  low         INTEGER NOT NULL,
  close       INTEGER NOT NULL,
  volume      INTEGER NOT NULL DEFAULT 0
);

-- 玩家 AI 合約
CREATE TABLE IF NOT EXISTS ai_contracts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  tier        TEXT NOT NULL,          -- chat / image / voice / video / llm
  expires_at  INTEGER NOT NULL,
  reward_per_min INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_contracts_user ON ai_contracts(user_id, expires_at);

-- game_meta: btc_market_price
INSERT OR IGNORE INTO game_meta (key, value) VALUES ('btc_market_price', '50000');
INSERT OR IGNORE INTO game_meta (key, value) VALUES ('btc_network_hash', '100');
INSERT OR IGNORE INTO game_meta (key, value) VALUES ('btc_daily_reward', '625');
INSERT OR IGNORE INTO game_meta (key, value) VALUES ('btc_halving_count', '0');
