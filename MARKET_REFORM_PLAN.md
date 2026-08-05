# 股市系統改版計畫 (Market Reform Plan)

> 目標：修復套利漏洞、讓「分鐘沖」玩法可行、新增衍生性商品。
> 狀態：✅ = 已完成 / ⬜ = 待執行

## Phase 1 — 市場基礎修正

### 1. 影響公式調軟 ✅
- `getPriceImpact`: `0.5 × √(q/(流通+q))` → **`0.15 × √(q/(流通+q))`**，上限 `10% → 5%`
- 買 0.1% 流通 → 影響 ~0.5%；買 5% → ~3.4%（大單對倒來回仍虧 ~7%）

### 2. 手續費 1.5% → 0.5% ✅
- `FEE_RATE = 0.005`（買/賣/掛單撮合 4 處）
- 前端 11 處「1.5%」顯示同步改
- 下市/清算一次性 1.5% 事件費不變

### 3. 影響價結算（殺套利核心）✅
- 買入成本 = 影響後價 × 股數；賣出實收 = 影響後價 × 股數
- 槓桿多/空同規則；掛單撮合維持市價
- 統一：扣款價 = 成交紀錄價 = share_price

### 4. 有上限回補（issue_cap = 2×）✅
- Migration：`companies.issue_cap`（回填 = 現在股本 × 2）
- 新公司 IPO/加股寫入 `issue_cap = 發行股數 × 2`
- 增資（dilute）不得超過 issue_cap
- tick：庫存 < 10% → 補到 20%，撞上限永久停止，發公告

### 5. 拆分股票 ✅
- owner 限定 ×2/×5/×10，費用 $50,000，24h 冷卻（`last_split_at`）
- 原子更新：股本×N、股價÷N、庫存/holdings×N、成交與K線÷N、槓桿倉位、issue_cap×N
- 該公司掛單全取消 + 通知 + 公告

### 6. UI 同步 ✅
- 手續費文字 0.5%
- 下單前預估影響後成交價 + 影響幅度
- 增資輸入框顯示剩餘發行額度

## Phase 2 — 衍生性商品

### 7. ETF（封閉式）⬜
- `etfs` + `etf_inventory` 表；價格 = 大盤指數 × $0.01
- 每分鐘 tick 同步；買賣規則與股票一致（0.5% 費/影響/漲跌停/issue_cap）

### 8. 指數期貨 ⬜
- `futures` 表；做多/做空；期限 1h/6h/24h
- 權利金 = 契約值 5%（契約值 = 指數 × $1/點 × 張數）
- cron 到期結算，損益上限 = 權利金；通知 + 歷史清單

## 檔案對應

| 檔案 | 內容 |
|---|---|
| `src/db/migrate_022_market.sql` | issue_cap / last_split_at |
| `src/db/migrate_023_derivatives.sql` | etfs / etf_inventory / futures |
| `src/stock.js` | 影響公式、費率、影響價結算、掛單 |
| `src/company.js` | issue_cap 寫入、dilute 約束、拆分 API |
| `src/index.js` | 上限回補 tick、ETF tick、期貨結算 |
| `src/etf.js`（新） | ETF 處理 |
| `src/futures.js`（新） | 期貨處理 |
| `client/src/App.jsx` | 前端 UI |
