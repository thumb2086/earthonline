# Earth Online — 經濟系統實作計畫

## 一、後端架構

```
server/
├── index.js                 # Express 入口
├── socket.js                # Socket.io 初始化
├── config.js                # 環境變數與設定
├── db/
│   ├── pool.js              # PostgreSQL 連線池 (pg)
│   ├── migrate.js           # 執行遷移
│   └── seed.js              # 初始資料種子
├── middleware/
│   ├── auth.js              # JWT 驗證
│   └── validate.js          # 輸入驗證
├── modules/
│   ├── auth/
│   │   ├── auth.routes.js
│   │   ├── auth.service.js
│   │   └── auth.schema.js
│   ├── user/
│   │   ├── user.routes.js
│   │   └── user.service.js
│   ├── bank/
│   │   ├── bank.routes.js
│   │   ├── bank.service.js
│   │   └── bank.tick.js     # 每分鐘利息 + 貸款扣息
│   ├── income/
│   │   ├── income.routes.js
│   │   ├── income.service.js
│   │   └── income.tick.js   # 每分鐘收益 tick
│   ├── employee/
│   │   ├── employee.routes.js
│   │   ├── employee.service.js
│   │   └── employee.tick.js # 每分鐘員工扣薪+產出
│   ├── investment/
│   │   ├── investment.routes.js
│   │   └── investment.service.js
│   ├── company/
│   │   ├── company.routes.js
│   │   ├── company.service.js
│   │   └── company.tick.js  # 每分鐘公司營運
│   ├── stock/
│   │   ├── stock.routes.js
│   │   ├── stock.service.js   # 交易邏輯 + bonding curve
│   │   ├── stock.tick.js     # 每分鐘 kline + 股利配發
│   │   └── stock.reserve.js  # 系統儲備保護 + 熔斷
│   └── contract/
│       ├── contract.routes.js
│       └── contract.service.js
```

## 二、資料庫 Schema (PostgreSQL)

### users
```sql
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(10) DEFAULT 'user',
  created_at    BIGINT NOT NULL
);
```

### wallets
```sql
CREATE TABLE wallets (
  user_id   INTEGER PRIMARY KEY REFERENCES users(id),
  cash      BIGINT DEFAULT 0,          -- 可用現金
  savings   BIGINT DEFAULT 0,          -- 活期存款（隨時存領，0.05%/分）
  bank      BIGINT DEFAULT 0,          -- 銀行定存（鎖本金，0.1%/分）
  total_earned BIGINT DEFAULT 0,       -- 歷史總賺取（解鎖條件用）
  created_at BIGINT NOT NULL
);
```

### loans (銀行貸款)
```sql
CREATE TABLE loans (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  amount        BIGINT NOT NULL,           -- 原始借款金額
  interest_rate DECIMAL(6,4) NOT NULL,     -- 每分鐘利率 (例: 0.0015 = 0.15%/分)
  remaining     BIGINT NOT NULL,           -- 剩餘未還金額
  status        VARCHAR(10) DEFAULT 'active', -- active / closed
  borrowed_at   BIGINT NOT NULL
);
```

貸款規則：
- 最高可借 = `total_earned × 0.5`（信用額度）
- 利率：0.15%/分（隨借款金額遞增）
- 每分鐘自動從 cash 扣利息
- 若 cash 不足：利息累計至本金
- 可提前還款（一次還清 remaining）

### income_levels (掛機收入升級)
```sql
CREATE TABLE income_levels (
  user_id     INTEGER PRIMARY KEY REFERENCES users(id),
  computer    INT DEFAULT 1,  -- 電腦 Lv.
  server      INT DEFAULT 1,  -- 伺服器 Lv.
  ai_assistant INT DEFAULT 1  -- AI 助手 Lv.
);
```

升級價格與效果：

基礎收入 $20/分（無需任何升級，永久有效）。
升級為一次性購買，每個項目獨立計算，效果直接疊加。

| 等級 | 電腦 | | 伺服器 | | AI 助手 | |
|------|------|--|--------|--|---------|--|
| | 升級費 | +收入/分 | 升級費 | +收入/分 | 升級費 | +收入/分 |
| Lv.1 | $100 | +5 | $200 | +10 | $500 | +20 |
| Lv.2 | $500 | +12 | $1,000 | +25 | $2,500 | +50 |
| Lv.3 | $2,000 | +30 | $5,000 | +60 | $10,000 | +120 |
| Lv.4 | $10,000 | +75 | $20,000 | +150 | $50,000 | +300 |
| Lv.5 | $50,000 | +180 | $100,000 | +380 | $200,000 | +750 |
| Lv.6 | $250,000 | +450 | $500,000 | +950 | $1,000,000 | +1,900 |
| Lv.7 | $1,000,000 | +1,200 | $2,000,000 | +2,400 | $5,000,000 | +4,800 |

初期速算：
```
$20/分 → 等 5 分鐘買電腦 Lv.1 → $25/分
→ 再 4 分鐘買伺服器 Lv.1 → $35/分
→ 等 2.5 小時可達 ~$200/分（全 Lv.3）
→ 後期靠員工+投資+公司放大
```

### employees
```sql
CREATE TABLE employees (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  position      VARCHAR(20) NOT NULL,   -- intern/specialist/engineer/manager/expert
  morale        INT DEFAULT 100,        -- 滿意度 0~100
  efficiency    DECIMAL(5,2) DEFAULT 1.00, -- 效率倍率（受培訓與滿意度影響）
  hire_cost     INT NOT NULL,           -- 實際招募費
  salary        INT NOT NULL,           -- 實際薪水
  output        INT NOT NULL,           -- 實際產出
  hired_at      BIGINT NOT NULL
);
```

### investments
```sql
CREATE TABLE investments (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  type        VARCHAR(20) NOT NULL,     -- deposit/bond/index_fund/real_estate/startup
  amount      BIGINT NOT NULL,          -- 投入金額
  started_at  BIGINT NOT NULL
);
```

### companies
```sql
CREATE TABLE companies (
  id            SERIAL PRIMARY KEY,
  owner_id      INTEGER NOT NULL REFERENCES users(id),
  name          VARCHAR(30) NOT NULL,
  industry      VARCHAR(20) NOT NULL,   -- tech/manufacturing/finance/service
  total_shares  INT NOT NULL,           -- 總股數
  share_price   BIGINT NOT NULL,        -- 當前股價（分）
  office_level  INT DEFAULT 1,
  equipment_level INT DEFAULT 1,
  brand_level   INT DEFAULT 1,
  base_income   BIGINT DEFAULT 0,
  created_at    BIGINT NOT NULL
);
```

### stock_orders
```sql
CREATE TABLE stock_orders (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES companies(id),
  user_id     INTEGER NOT NULL REFERENCES users(id),
  type        VARCHAR(4) NOT NULL,      -- buy / sell
  price       BIGINT NOT NULL,          -- 每股單價
  quantity    INT NOT NULL,             -- 剩餘未成交股數
  created_at  BIGINT NOT NULL
);
```

### stock_holdings
```sql
CREATE TABLE stock_holdings (
  user_id     INTEGER NOT NULL REFERENCES users(id),
  company_id  INTEGER NOT NULL REFERENCES companies(id),
  quantity    INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, company_id)
);
```

### margin_positions (槓桿倉位)
```sql
CREATE TABLE margin_positions (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id),
  company_id    INTEGER NOT NULL REFERENCES companies(id),
  type          VARCHAR(4) NOT NULL,       -- long / short
  quantity      INT NOT NULL,
  entry_price   BIGINT NOT NULL,
  loan_amount   BIGINT NOT NULL,           -- 融資金額
  margin_amount BIGINT NOT NULL,           -- 保證金
  leverage      INT NOT NULL,              -- 槓桿倍數
  opened_at     BIGINT NOT NULL
);
```

### stock_trades (成交紀錄)
```sql
CREATE TABLE stock_trades (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES companies(id),
  buy_order_id INTEGER NOT NULL REFERENCES stock_orders(id),
  sell_order_id INTEGER NOT NULL REFERENCES stock_orders(id),
  price       BIGINT NOT NULL,
  quantity    INT NOT NULL,
  traded_at   BIGINT NOT NULL
);
```

### stock_klines
```sql
CREATE TABLE stock_klines (
  id          SERIAL PRIMARY KEY,
  company_id  INTEGER NOT NULL REFERENCES companies(id),
  open        BIGINT NOT NULL,
  high        BIGINT NOT NULL,
  low         BIGINT NOT NULL,
  close       BIGINT NOT NULL,
  volume      INT NOT NULL,
  minute      BIGINT NOT NULL,          -- unix minute timestamp
  UNIQUE(company_id, minute)
);
```

### contracts (合約/Offer)
```sql
CREATE TABLE contracts (
  id          SERIAL PRIMARY KEY,
  type        VARCHAR(30) NOT NULL,
  reward      INT NOT NULL,
  requirement JSONB,                    -- {"upgrade_level": 5, "engineers": 2, ...}
  claimed     BOOLEAN DEFAULT FALSE,
  expires_at  BIGINT NOT NULL
);

CREATE TABLE user_contracts (
  user_id     INTEGER NOT NULL REFERENCES users(id),
  contract_id INTEGER NOT NULL REFERENCES contracts(id),
  completed   BOOLEAN DEFAULT FALSE,
  claimed     BOOLEAN DEFAULT FALSE,
  PRIMARY KEY (user_id, contract_id)
);
```

## 三、主要系統邏輯

### 3.0 初始狀態 — 001 股票「地球互動科技」

遊戲啟動時只有一檔股票（seed 資料）：

| 項目 | 值 |
|------|-----|
| 股票代號 | 001 |
| 公司名稱 | 地球互動科技 |
| 產業 | 科技 (tech) |
| 總股數 | 1,000,000 股 |
| IPO 價格 | $100/股 |
| 每人認購上限 | 1,000 股 |
| 系統持有 | 700,000 股 (70%，未上市流通) |
| 公開流通 | 300,000 股 (30%) |

IPO 認購階段結束後即開放二級市場交易。

### 3.1 每分鐘收益 Tick (server/modules/income/income.tick.js)

每秒（或每分鐘）由 socket 通知上線玩家，排程計算：

```
收入 = 基礎掛機收入 + Σ員工產出 + Σ投資回報 + Σ公司利潤
```

流程：
1. 載入所有上線玩家（有 socket connection 的 user）
2. 對每個上線玩家計算該分鐘收入
3. 更新 wallet.cash
4. 透過 socket.emit('tick', data) 推送即時收入

### 3.2 銀行系統邏輯

活期存款（savings）：
- 每分鐘 +0.05% × savings 餘額
- 隨時可以存入或提取，無鎖定
- 利息發到 cash

貸款（loans）：
- 最高借款額 = total_earned × 0.5
- 利率 0.15%/分（基本利率）
- 每分鐘從 cash 扣利息；若 cash 不足則利息併入本金（複利）
- 可提前全額還款
- 貸款逾期（remaining > amount × 2）→ 信用降低，限制借款

### 3.3 投資系統邏輯

```
定存:     每分鐘 +0.1% × 投資額
債券:     每分鐘 +0.3% × 投資額
指數基金: 每分鐘 random(0.5%, 1%) × 投資額
房地產:   每分鐘 +0.8% × 投資額
新創投資: 每分鐘 random(2%, 5%) × 投資額
```

定存本金在 bank 欄位，利息發到 cash。
其他投資本金不可撤回，僅領取收益。

### 3.3 員工系統邏輯

```
滿意度每分鐘變化：
  若實際薪水 >= 預設薪水 → +0.1
  若實際薪水 < 預設薪水  → -0.5 × (1 - 實際/預設)
  若 morale < 20 且 random < 0.01 → 離職

實際產出 = 基礎產出 × efficiency × (morale / 100)
```

培訓：
```
花費金錢提升 efficiency
每次培訓花費 = 職位招募費 × 0.5
提升 efficiency +0.1 ~ +0.3 (隨機)
```

### 3.4 公司系統邏輯

營運成本/分：
```
租金 = 10 × (0.95 ^ (office_level - 1))
設備維護 = 5
水電網路 = 3
總成本 = 租金 + 設備維護 + 水電網路 + Σ(員工薪水)
```

收入/分公式：
```
收入 = base_income × 產業倍率 × Σ(員工產出) × (1 + 0.1×(equipment_level-1)) × (1 + 0.05×(brand_level-1)) × 市場狀況
```

市場狀況每小時變動一次（0.8~1.2 隨機）。

### 3.5 股票交易 — 系統莊家模式

#### 核心定義

| 名詞 | 值 | 說明 |
|------|-----|------|
| 總股數 | 1,000,000 股 | 永遠不變 |
| 系統庫存 | 初始 700,000 股 | 玩家買入時減少，賣出時增加 |
| 流通在外 | 總股數 - 系統庫存 | 即玩家持有的總量 |
| IPO 開盤價 | $100/股 | 上市參考價 |

#### 交易機制

玩家不互相交易，**系統永遠是對手盤**：

```
玩家買入 → 系統從庫存賣給他（庫存減少，流通增加）
玩家賣出 → 系統用現金買回來（庫存增加，流通減少）
```

報價：
```
系統賣價（玩家買入價）= 當前價 × (1 + spread/2)
系統買價（玩家賣出價）= 當前價 × (1 - spread/2)
```

#### 價格影響（Bonding Curve — 非線性）

每次交易對價格的影響**遞減**，防止鯨魚操盤：

```
成交量佔流通比 = 成交量 / 流通在外
價格變動% = ln(1 + 成交量佔流通比 × 100) × 2
```

實例：
```
流通 300,000 股，當前價 $100

買 100 股  → 佔比 0.033% → ln(1+0.033) × 2 = +0.065% → $100.07
買 1,000 股 → 佔比 0.333% → ln(1+0.333) × 2 = +0.575% → $100.58
買 10,000 股→ 佔比 3.33%  → ln(1+3.33) × 2 = +2.93%   → $102.93
買 100,000 股→ 佔比 33.3%  → ln(1+33.3) × 2 = +7.08%   → $107.08
```

同樣資金，第一次買 impact 大，再買同樣量 impact 變小（因為流通變少），形成自然護欄。

#### 熔斷保護（每分鐘）

```
單分鐘最大漲跌幅：±5%
若觸發 → 該分鐘剩餘時間暫停交易
```

#### 系統儲備保護

系統有兩個庫存需要保護：

```
現金儲備 = IPO 收入 + 手續費收入（交易收 1.5%）
庫存水位 = 系統持有的股數
```

保護機制：
```
若庫存 < 50,000 股 → 賣價提高（spread 加倍至 6%），減緩庫存消耗
若庫存 > 950,000 股 → 買價壓低（spread 加倍），減緩現金消耗
若現金儲備 < $1,000,000 → 降低買價，減少回購
若兩者同時觸底 → 熔斷停盤，管理員介入
```

#### Spread 動態調整

```
基礎 spread = 3%
若每分鐘價格變動 > 3% → spread × 1.5（擴大保護系統）
若每分鐘價格變動 < 0.5% → spread × 0.8（縮小鼓勵交易）
spread 範圍：1% ~ 10%
```

#### 股利配發

```
每分鐘股利收入 = 公司盈餘/分 × 持有股數 ÷ 總股數
股利自動入 cash
無需手動領取
```

地球互動科技起始盈餘 $100/分，每分鐘 +0.05% 成長：
```
你持 100 股 → $100 × 100 ÷ 1,000,000 = $0.01/分
持 1,000 股 → $0.10/分
持 10,000 股 → $1.00/分
```

#### 內在價值均值回歸

```
內在價值 = 年化股利 / 期望報酬率
期望報酬率 = 0.5%（每分鐘）

每分鐘價格微幅朝內在價值靠攏：
  若價格偏離內在價值 > ±50%
  → 每分鐘向內在價值回歸 0.1%

這只是一個軟錨，防止價格完全失控，
玩家交易仍然主導價格方向。
```

### 3.6 Kline 紀錄 (stock.tick.js)

```
每分鐘：
1. 對有成交的公司，用該分鐘的 trade 算出 open/high/low/close/volume
2. 若無成交，close = 前一分鐘 close
3. 寫入 stock_klines
4. 廣播給前端
```

### 3.7 IPO 流程 (stock.ipo.js)

```
階段一：IPO 認購期（遊戲啟動後前 1 小時）
- 玩家可以認購 001 股票，價格 $100/股
- 每人上限 1,000 股
- 超額認購時按比例分配

階段二：掛牌上市（認購結束後自動觸發）
- 剩餘未認購的公開流通股回流系統庫存
- 開放系統莊家交易（詳見 3.5）
- 初始參考價 = IPO 價格 $100
```

IPO 資料表：
```sql
CREATE TABLE ipo_subscriptions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  company_id  INTEGER NOT NULL REFERENCES companies(id),
  shares      INT NOT NULL,
  total_cost  BIGINT NOT NULL,
  subscribed_at BIGINT NOT NULL
);
```

### 3.8 槓桿交易 (stock.leverage.js)

玩家可以用保證金方式開槓桿做多或做空。

```
融資做多 (Long)：
- 槓桿倍數：2x / 3x / 5x
- 例：5x 槓桿，$100 保證金可買 $500 股票
- $400 為融資金額，每分鐘收利息 0.01%

融券做空 (Short)：
- 槓桿倍數：2x / 3x / 5x
- 向系統借股票賣出，之後低價買回還券
- 每分鐘收利息 0.015%（做空利率較高）

維持率計算：
  做多維持率 = (持股現值) / (融資金額) × 100%
  做空維持率 = (保證金 + 賣出金額 - 買回成本) / (保證金) × 100%

追繳規則：
  維持率 < 130% → 發送 margin_call 通知
  維持率 < 100% → 強制平倉（市價賣出/買回）

強制平倉流程：
1. 系統以當前市價掛單強制平倉
2. 扣除手續費後結算損益
3. 剩餘資金退回 wallet.cash
4. 若不足扣，餘額列為負債
```

### 3.9 合約系統 (contract.service.js)

```
定時刷新（每 5 分鐘）：
1. 檢查過期合約，移除
2. 隨機生成新合約（池子裡保持 3~5 個活躍）
3. 廣播給所有玩家

玩家接取：
1. 檢查條件是否符合（等級、員工數等）
2. 開啟定時檢查，條件滿足後自動標記完成
3. 玩家可領取 reward
```

## 四、Socket.io 事件

```
Client → Server:
  upgrade_income      { item, level }
  hire_employee       { position }
  train_employee      { employee_id }
  adjust_salary       { employee_id, new_salary }
  deposit_savings     { amount }           // 存入活存
  withdraw_savings    { amount }           // 提取活存
  borrow_loan         { amount }           // 申請貸款
  repay_loan          { loan_id }          // 還款
  invest              { type, amount }
  create_company      { name, industry }
  upgrade_company     { type }             // office/equipment/brand
  buy_shares          { company_id, quantity }
  sell_shares         { company_id, quantity }
  open_margin         { company_id, type, quantity, leverage }
  close_margin        { position_id }
  subscribe_ipo       { company_id, shares }
  accept_contract     { contract_id }
  claim_contract      { contract_id }

Server → Client:
  tick                { cash, savings, income_per_min, costs, loan_interest }
  employee_update     { employees[] }
  investment_update   { investments[] }
  company_update      { companies[] }
  stock_update        { price, spread, system_reserve, holdings[] }
  trade_executed      { company_id, price, quantity, type }
  kline_update        { company_id, kline }
  margin_update       { positions[] }
  margin_call         { position_id, maintenance_rate }
  forced_liquidation  { position_id, reason }
  ipo_update          { company_id, phase, end_time }
  contract_update     { contracts[] }
  loan_update         { loans[] }
  notification        { type, message }
```

## 五、前端頁面 (React)

```
src/
├── pages/
│   ├── Game.jsx            # 遊戲主頁面（頂部狀態列）
│   ├── IdleIncome.jsx      # 掛機收入 + 升級商店
│   ├── Employees.jsx       # 員工管理
│   ├── Investments.jsx     # 投資頁面
│   ├── Company.jsx         # 公司管理
│   ├── StockMarket.jsx     # 股票市場 + K線圖
│   └── Contracts.jsx       # 合約列表
├── components/
│   ├── TopBar.jsx          # 頂部狀態列 (💰 +$X/分)
│   ├── UpgradeCard.jsx     # 升級卡片
│   ├── EmployeeCard.jsx    # 員工卡片
│   ├── InvestmentCard.jsx  # 投資卡片
│   ├── KLineChart.jsx      # K線圖表（使用 Canvas 自繪）
│   ├── OrderBook.jsx       # 掛單簿
│   └── ContractCard.jsx    # 合約卡片
├── hooks/
│   ├── useSocket.js        # Socket.io 連線
│   └── useGameState.js     # 遊戲狀態管理
├── context/
│   └── GameContext.jsx     # 全域遊戲狀態
```

## 六、實作順序

| 階段 | 內容 | 預估工時 |
|------|------|---------|
| 1 | PostgreSQL schema + migrate + seed | 1h |
| 2 | Express 框架 + JWT auth + Socket.io 初始化 | 1h |
| 3 | 基礎掛機收入 + 升級系統 | 1h |
| 4 | 員工系統（招募、薪水、滿意度、培訓） | 2h |
| 5 | 銀行系統（活存、貸款、利息 tick） | 1.5h |
| 6 | 投資系統（五種投資標的） | 1.5h |
| 6 | 公司系統（創建、營運、升級） | 2h |
| 7 | 股票市場（掛單、撮合、持倉、K線） | 3h |
| 8 | IPO 系統（認購、分配、掛牌） | 1.5h |
| 9 | 槓桿交易（融資融券、維持率、強平） | 2h |
| 10 | 合約系統 | 1.5h |
| 11 | Socket.io 即時推送整合 | 1h |
| 12 | React 前端頁面串接 | 4h |
| 13 | 測試與調試 | 2h |
