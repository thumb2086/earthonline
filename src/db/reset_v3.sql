-- Balance v2 reset: fresh economy

DELETE FROM employees;
DELETE FROM subscriptions;
DELETE FROM departments;
DELETE FROM ipo_subscriptions;
DELETE FROM stock_trades;
DELETE FROM stock_klines;
DELETE FROM margin_positions;
DELETE FROM stock_holdings;
DELETE FROM investments;
DELETE FROM loans;
DELETE FROM daily_tasks;
DELETE FROM transaction_history;

-- Close all user companies, keep system 001
DELETE FROM companies WHERE owner_id != 0;
DELETE FROM ipo_state WHERE company_id != 1;
DELETE FROM stock_inventory WHERE company_id != 1;

UPDATE wallets SET cash = 100, savings = 0, bank = 0, total_earned = 100;
UPDATE income_levels SET computer = 1, server = 1, ai_assistant = 1;

-- 001: 500 shares, $100 IPO
UPDATE companies SET total_shares = 500, share_price = 100, base_income = 40, office_level = 1, equipment_level = 1, brand_level = 1 WHERE id = 1;
UPDATE stock_inventory SET stock_quantity = 500, cash = 0 WHERE company_id = 1;

DELETE FROM ipo_state WHERE company_id = 1;
INSERT INTO ipo_state (company_id, phase, started_at, duration_minutes) VALUES (1, 'ipo', strftime('%s','now') * 1000, 60);
