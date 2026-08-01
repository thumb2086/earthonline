-- FULL ECONOMY RESET

-- Reset all wallets to starting cash
UPDATE wallets SET cash = 100, savings = 0, bank = 0, total_earned = 100;

-- Reset income levels
UPDATE income_levels SET computer = 1, server = 1, ai_assistant = 1;

-- Delete all employees
DELETE FROM employees;

-- Delete all investments
DELETE FROM investments;

-- Delete all loans
DELETE FROM loans;

-- Delete all company upgrades (keep companies but reset upgrades)
UPDATE companies SET office_level = 1, equipment_level = 1, brand_level = 1;

-- Reset stock 001
DELETE FROM stock_holdings;
DELETE FROM stock_trades WHERE company_id = 1;
DELETE FROM stock_klines WHERE company_id = 1;
DELETE FROM margin_positions;
UPDATE stock_inventory SET stock_quantity = 1000000, cash = 0;
UPDATE companies SET share_price = 100 WHERE id = 1;
DELETE FROM ipo_state WHERE company_id = 1;
INSERT INTO ipo_state (company_id, phase, started_at) VALUES (1, 'ipo', 0);

-- Delete IPO subscriptions
DELETE FROM ipo_subscriptions;

-- Clear transaction history
DELETE FROM transaction_history;

-- Clear daily tasks
DELETE FROM daily_tasks;
