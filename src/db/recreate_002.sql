-- Re-create 002 深海科技 (system company) and start IPO
INSERT INTO companies (id, owner_id, name, industry, total_shares, share_price, base_income, created_at)
VALUES (10, 0, '深海科技', 'tech', 500, 100, 40, strftime('%s','now') * 1000);

INSERT INTO stock_inventory (company_id, cash, stock_quantity) VALUES (10, 0, 500);

INSERT INTO ipo_state (company_id, phase, started_at, duration_minutes) VALUES (10, 'ipo', strftime('%s','now') * 1000, 60);
