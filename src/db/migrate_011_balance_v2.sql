-- Balance v2: departments, subscriptions, employee department_id

CREATE TABLE IF NOT EXISTS departments (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id  INTEGER NOT NULL,
  type        TEXT NOT NULL,          -- rnd, production, trading, marketing, support, logistics, qa, legal, datacenter, store
  level       INTEGER NOT NULL DEFAULT 1,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  key         TEXT NOT NULL,          -- home, cloud, insurance, ai, finance, consultant
  enabled     INTEGER NOT NULL DEFAULT 0,
  started_at  INTEGER,
  UNIQUE(user_id, key)
);

ALTER TABLE employees ADD COLUMN department_id INTEGER DEFAULT NULL;
