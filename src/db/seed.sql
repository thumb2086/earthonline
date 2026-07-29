INSERT OR IGNORE INTO companies (id, owner_id, name, industry, total_shares, share_price, base_income, created_at)
VALUES (1, 0, '地球互動科技', 'tech', 1000000, 100, 100, 1785328000000);

INSERT OR IGNORE INTO system_reserve (id, cash, stock_inventory)
VALUES (1, 0, 700000);

INSERT OR IGNORE INTO ipo_state (company_id, phase, started_at)
VALUES (1, 'ipo', 1785328000000);
