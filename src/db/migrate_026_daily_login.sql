CREATE TABLE IF NOT EXISTS daily_logins (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id),
  last_claim_at INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  total_claims  INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO game_meta (key, value) VALUES ('launch_event_start', '0');
INSERT OR IGNORE INTO game_meta (key, value) VALUES ('launch_double_income', '0');
INSERT OR IGNORE INTO game_meta (key, value) VALUES ('launch_last_lb_date', '');
