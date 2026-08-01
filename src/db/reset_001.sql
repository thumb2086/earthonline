-- Reset stock 001 (地球互動科技) for re-IPO

-- Clear all holdings
DELETE FROM stock_holdings WHERE company_id = 1;

-- Clear all trades
DELETE FROM stock_trades WHERE company_id = 1;

-- Clear all klines
DELETE FROM stock_klines WHERE company_id = 1;

-- Clear margin positions
DELETE FROM margin_positions WHERE company_id = 1;

-- Reset inventory: full stock_quantity, 0 cash
UPDATE stock_inventory SET stock_quantity = 1000000, cash = 0 WHERE company_id = 1;

-- Reset company: share_price = 5000 (IPO price)
UPDATE companies SET share_price = 5000 WHERE id = 1;

-- Reset IPO state to ipo phase
DELETE FROM ipo_state WHERE company_id = 1;
INSERT INTO ipo_state (company_id, phase, started_at) VALUES (1, 'ipo', 0);
