-- 發行上限: 總股本最多長到發行量 × 2 (防無限稀釋)
ALTER TABLE companies ADD COLUMN issue_cap INTEGER NOT NULL DEFAULT 0;
-- 拆分冷卻時間
ALTER TABLE companies ADD COLUMN last_split_at INTEGER NOT NULL DEFAULT 0;

-- 回填: 存量公司以現在總股本 × 2 凍結 (參考點已隨過去增資漂移)
UPDATE companies SET issue_cap = MAX(total_shares, 1) * 2;
