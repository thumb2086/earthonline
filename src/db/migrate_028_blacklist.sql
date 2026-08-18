CREATE TABLE IF NOT EXISTS blacklist (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id),
  reason        TEXT NOT NULL DEFAULT '',
  banned_by     INTEGER,
  banned_at     INTEGER NOT NULL
);
