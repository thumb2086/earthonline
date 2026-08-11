-- Fresh starting rebuild for the 8/19 official-launch reset flow.
-- Fixes reset.js doReset() crashing on production schema (companies lacks `code` column)
-- and rebuilds the system-companie world. Safe to re-run (idempotent deletes).

-- 1) Schema repair: add missing `code` column (old prod schema predates the code column)
ALTER TABLE companies ADD COLUMN code TEXT;

-- 2) Wipe all gameplay data (same table list as src/reset.js doReset; keeps accounts)
DELETE FROM stock_trades;
DELETE FROM stock_holdings;
DELETE FROM stock_inventory;
DELETE FROM stock_klines;
DELETE FROM margin_positions;
DELETE FROM ipo_state;
DELETE FROM ipo_subscriptions;
DELETE FROM stock_limit_orders;
DELETE FROM investments;
DELETE FROM loans;
DELETE FROM futures;
DELETE FROM etf_trades;
DELETE FROM etf_holdings;
DELETE FROM etf_inventory;
DELETE FROM employees;
DELETE FROM departments;
DELETE FROM companies;
DELETE FROM notifications;
DELETE FROM transaction_history;
DELETE FROM community_announcements;

-- 3) Reset player wallets/levels, keep accounts
UPDATE wallets SET cash = 100, savings = 0, bank = 0, total_earned = 0;
DELETE FROM income_levels;
INSERT INTO income_levels (user_id) SELECT id FROM users;
DELETE FROM subscriptions;

-- 4) Rebuild the 9 system companies (id 1-9, with code)
INSERT INTO companies (id, code, owner_id, name, industry, total_shares, share_price, base_income, issue_cap, created_at) VALUES
  (1, '001', 0, '地球互動科技',  'tech',         10000, 100, 100, 20000, strftime('%s','now')*1000),
  (2, '002', 0, '深海科技',      'tech',         10000, 100, 80,  20000, strftime('%s','now')*1000),
  (3, '003', 0, '銀河金融',      'finance',      10000, 100, 70,  20000, strftime('%s','now')*1000),
  (4, '004', 0, '星雲生技',      'tech',         10000, 100, 60,  20000, strftime('%s','now')*1000),
  (5, '005', 0, '黑洞能源',      'manufacturing',10000, 100, 50,  20000, strftime('%s','now')*1000),
  (6, '006', 0, '元界科技',      'tech',         10000, 100, 40,  20000, strftime('%s','now')*1000),
  (7, '007', 0, '星際物流集團',  'service',      10000, 100, 45,  20000, strftime('%s','now')*1000),
  (8, '008', 0, '量子金融控股',  'finance',      10000, 100, 55,  20000, strftime('%s','now')*1000),
  (9, '009', 0, '曙光生技農場',  'manufacturing',10000, 100, 35,  20000, strftime('%s','now')*1000);

-- 5) System inventory: 7000 shares each
INSERT INTO stock_inventory (company_id, cash, stock_quantity) VALUES
  (1, 0, 7000), (2, 0, 7000), (3, 0, 7000), (4, 0, 7000), (5, 0, 7000),
  (6, 0, 7000), (7, 0, 7000), (8, 0, 7000), (9, 0, 7000);

-- 6) IPO queue: 001 starts immediately, 002/003 queued 3d apart, rest pending for admins
INSERT INTO ipo_state (company_id, phase, started_at, duration_minutes) VALUES
  (1, 'ipo',     strftime('%s','now')*1000,                     4320),
  (2, 'queued',  strftime('%s','now')*1000 + 1*4320*60000,      4320),
  (3, 'queued',  strftime('%s','now')*1000 + 2*4320*60000,      4320),
  (4, 'pending', 0, 4320),
  (5, 'pending', 0, 4320),
  (6, 'pending', 0, 4320),
  (7, 'pending', 0, 4320),
  (8, 'pending', 0, 4320),
  (9, 'pending', 0, 4320);

-- 7) ETF inventory
INSERT INTO etf_inventory (etf_id, cash, stock_quantity) VALUES (1, 0, 1000000);