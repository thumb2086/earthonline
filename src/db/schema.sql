CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  username        TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL DEFAULT '',
  role            TEXT DEFAULT 'user',
  discord_id      TEXT UNIQUE,
  discord_username TEXT,
  discord_avatar  TEXT,
  created_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS wallets (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id),
  cash          INTEGER DEFAULT 0,
  savings       INTEGER DEFAULT 0,
  bank          INTEGER DEFAULT 0,
  total_earned  INTEGER DEFAULT 0,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS income_levels (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id),
  computer      INTEGER DEFAULT 1,
  server        INTEGER DEFAULT 1,
  ai_assistant  INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS employees (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  position      TEXT NOT NULL,
  morale        INTEGER DEFAULT 100,
  efficiency    REAL DEFAULT 1.00,
  salary        INTEGER NOT NULL,
  output        INTEGER NOT NULL,
  hired_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS loans (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  amount        INTEGER NOT NULL,
  interest_rate REAL NOT NULL,
  remaining     INTEGER NOT NULL,
  status        TEXT DEFAULT 'active',
  borrowed_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS investments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  type          TEXT NOT NULL,
  amount        INTEGER NOT NULL,
  started_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id        INTEGER NOT NULL,
  name            TEXT NOT NULL,
  industry        TEXT NOT NULL,
  total_shares    INTEGER NOT NULL,
  share_price     INTEGER NOT NULL,
  office_level    INTEGER DEFAULT 1,
  equipment_level INTEGER DEFAULT 1,
  brand_level     INTEGER DEFAULT 1,
  base_income     INTEGER DEFAULT 0,
  created_at      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ipo_subscriptions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  company_id    INTEGER NOT NULL REFERENCES companies(id),
  shares        INTEGER NOT NULL,
  total_cost    INTEGER NOT NULL,
  subscribed_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_holdings (
  user_id     INTEGER NOT NULL REFERENCES users(id),
  company_id  INTEGER NOT NULL REFERENCES companies(id),
  quantity    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, company_id)
);

CREATE TABLE IF NOT EXISTS stock_trades (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id    INTEGER NOT NULL REFERENCES companies(id),
  user_id       INTEGER NOT NULL REFERENCES users(id),
  type          TEXT NOT NULL,
  price         INTEGER NOT NULL,
  quantity      INTEGER NOT NULL,
  traded_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_klines (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id    INTEGER NOT NULL REFERENCES companies(id),
  open          INTEGER NOT NULL,
  high          INTEGER NOT NULL,
  low           INTEGER NOT NULL,
  close         INTEGER NOT NULL,
  volume        INTEGER NOT NULL,
  minute        INTEGER NOT NULL,
  UNIQUE(company_id, minute)
);

CREATE TABLE IF NOT EXISTS margin_positions (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id),
  company_id      INTEGER NOT NULL REFERENCES companies(id),
  type            TEXT NOT NULL,
  quantity        INTEGER NOT NULL,
  entry_price     INTEGER NOT NULL,
  loan_amount     INTEGER NOT NULL,
  margin_amount   INTEGER NOT NULL,
  leverage        INTEGER NOT NULL,
  dividend_debt   INTEGER DEFAULT 0,
  opened_at       INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS contracts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  type          TEXT NOT NULL,
  reward        INTEGER NOT NULL,
  requirement   TEXT,
  claimed       INTEGER DEFAULT 0,
  expires_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS user_contracts (
  user_id       INTEGER NOT NULL REFERENCES users(id),
  contract_id   INTEGER NOT NULL REFERENCES contracts(id),
  completed     INTEGER DEFAULT 0,
  claimed       INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, contract_id)
);

CREATE TABLE IF NOT EXISTS system_reserve (
  id              INTEGER PRIMARY KEY DEFAULT 1,
  cash            INTEGER NOT NULL DEFAULT 0,
  stock_inventory INTEGER NOT NULL DEFAULT 700000
);

CREATE TABLE IF NOT EXISTS ipo_state (
  company_id    INTEGER PRIMARY KEY REFERENCES companies(id),
  phase         TEXT NOT NULL DEFAULT 'ipo',
  started_at    INTEGER NOT NULL
);
