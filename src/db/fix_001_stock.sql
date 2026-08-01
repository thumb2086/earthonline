-- Reset stock 001 to correct values
-- total_shares = 1,000,000, system should hold ~72,855 in inventory
-- User 3 somehow got 2.4M shares (impossible), reset them

UPDATE stock_inventory SET stock_quantity = 72855, cash = 4609047951 WHERE company_id = 1;

-- Reset user holdings to match what's actually possible
-- Total distributed should be total_shares - inventory = 927,145
DELETE FROM stock_holdings WHERE company_id = 1;

-- Re-insert correct holdings based on trade history
-- User 3 net bought: 2,695,472 bought - 413,697 sold = 2,281,775 (impossible, cap at max)
-- User 1 net bought: 1,297,960 bought - 5,446,957 sold = -4,148,997 (sold more than had)
-- The trades are corrupted. Reset to give user 1 all circulating shares
INSERT INTO stock_holdings (user_id, company_id, quantity) VALUES (1, 1, 927145);
