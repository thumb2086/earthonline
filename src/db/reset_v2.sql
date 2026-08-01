-- FULL RESET v2: keep only company 001, 20 shares, re-IPO

-- === Delete child records first (FK order) ===
DELETE FROM employees;
DELETE FROM ipo_subscriptions;
DELETE FROM stock_trades;
DELETE FROM stock_klines;
DELETE FROM margin_positions;
DELETE FROM stock_holdings;
DELETE FROM investments;
DELETE FROM loans;
DELETE FROM daily_tasks;
DELETE FROM transaction_history;
DELETE FROM ipo_state WHERE company_id != 1;
DELETE FROM stock_inventory WHERE company_id != 1;

-- === Close all other companies ===
DELETE FROM companies WHERE id != 1;

-- === Reset wallets/income ===
UPDATE wallets SET cash = 100, savings = 0, bank = 0, total_earned = 100;
UPDATE income_levels SET computer = 1, server = 1, ai_assistant = 1;

-- === Set 001 to 20 total shares, $100 IPO ===
UPDATE companies SET total_shares = 20, share_price = 100, base_income = 100, office_level = 1, equipment_level = 1, brand_level = 1 WHERE id = 1;
UPDATE stock_inventory SET stock_quantity = 20, cash = 0 WHERE company_id = 1;

-- === Restart IPO for 001 (60 min) ===
DELETE FROM ipo_state WHERE company_id = 1;
INSERT INTO ipo_state (company_id, phase, started_at, duration_minutes) VALUES (1, 'ipo', strftime('%s','now') * 1000, 60);
