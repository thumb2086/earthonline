CREATE TABLE IF NOT EXISTS casino_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  game        TEXT NOT NULL,
  amount      INTEGER NOT NULL,
  payout      INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_casino_history_user ON casino_history(user_id, created_at);
