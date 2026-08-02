-- 買下公司: 公司掛牌出售 (0 = 未出售)
ALTER TABLE companies ADD COLUMN sell_price INTEGER NOT NULL DEFAULT 0;
