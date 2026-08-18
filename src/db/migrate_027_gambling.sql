CREATE TABLE IF NOT EXISTS scratch_cards (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  tier          TEXT NOT NULL,
  cost          INTEGER NOT NULL,
  reward        INTEGER NOT NULL,
  multiplier    REAL NOT NULL,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS scratch_daily (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id),
  date          TEXT NOT NULL DEFAULT '',
  free_used     INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lottery_rounds (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  draw_number   INTEGER NOT NULL,
  winning_numbers TEXT NOT NULL,
  total_pool    INTEGER NOT NULL DEFAULT 0,
  total_tickets INTEGER NOT NULL DEFAULT 0,
  status        TEXT DEFAULT 'open',
  drawn_at      INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lottery_tickets (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  round_id      INTEGER NOT NULL REFERENCES lottery_rounds(id),
  user_id       INTEGER NOT NULL REFERENCES users(id),
  numbers       TEXT NOT NULL,
  cost          INTEGER NOT NULL,
  prize         INTEGER DEFAULT 0,
  matches       INTEGER DEFAULT 0,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS lottery_daily (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id),
  date          TEXT NOT NULL DEFAULT '',
  free_used     INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_btc (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id),
  amount        REAL NOT NULL DEFAULT 0,
  claimed_at    INTEGER NOT NULL
);
