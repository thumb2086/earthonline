-- Re-create 003-006 system companies (reserve only, no IPO)
INSERT INTO companies (id, owner_id, name, industry, total_shares, share_price, base_income, created_at)
VALUES
  (12, 0, '銀河金融', 'finance', 500, 100, 40, strftime('%s','now') * 1000),
  (13, 0, '星雲生技', 'tech', 500, 100, 40, strftime('%s','now') * 1000),
  (14, 0, '黑洞能源', 'manufacturing', 500, 100, 40, strftime('%s','now') * 1000),
  (15, 0, '元界科技', 'tech', 500, 100, 40, strftime('%s','now') * 1000);

-- Inventory for when they IPO later
INSERT INTO stock_inventory (company_id, cash, stock_quantity)
SELECT id, 0, total_shares FROM companies WHERE id IN (12, 13, 14, 15);
