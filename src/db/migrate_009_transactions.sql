-- Transaction history for income/expense tracking
CREATE TABLE IF NOT EXISTS transaction_history (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL,
  type        TEXT NOT NULL,        -- income, expense, stock_buy, stock_sell, ipo_subscribe, bank_deposit, bank_withdraw, loan, employee_hire, company_create, upgrade, investment, dividend
  amount      INTEGER NOT NULL,     -- positive = income, negative = expense
  description TEXT,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tx_user ON transaction_history(user_id);
CREATE INDEX IF NOT EXISTS idx_tx_time ON transaction_history(created_at);
