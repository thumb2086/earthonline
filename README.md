# Earth Online 🌍

即時多人線上經營遊戲，基於 Cloudflare Workers + D1 + React。

🔗 **線上遊玩**: https://twonline.dpdns.org

## 技術架構

| 層級 | 技術 |
|---|---|
| 後端 | Cloudflare Workers (edge computing) |
| 資料庫 | Cloudflare D1 (SQLite) |
| 前端 | React + Vite |
| 桌面版 | Electron (Windows NSIS / macOS dmg / Linux AppImage) |
| 認證 | Discord OAuth2 + JWT |
| 部署 | wrangler CLI |

## 桌面版 (Desktop App)

電腦專用版以 Electron 封裝，與網頁版共用同一份 React 前端，資料完全互通。

- 🖥️ **專屬視窗** — 無邊框、無網址列，1440×900 沉浸式掛機
- ⏱️ **Discord RPC** — 自動顯示「正在玩 地球在線」+ 掛機生存時間 + 工作列進度條
- ⚡ **離線掛機** — 本地遊戲引擎持續運作，斷線不中斷
- 📥 **安裝檔** — 網頁版「帳號設定」頁可下載 `EarthOnlineSetup.exe`

```bash
# 開發模式（Hot reload + Electron 視窗）
cd client && npm run dev:electron

# 打包 Windows 安裝檔（輸出至 client/release/）
cd client && npm run build:electron
```

> Windows 圖示: `client/build/icon.ico`（由 `client/public/logo.png` 生成，多尺寸 16/32/48/256）

### 安裝檔發布

安裝檔約 112 MB，超過 Cloudflare Workers Assets 單檔 25 MiB 上限，**請勿放入 `client/public/downloads/` 部署**。發布流程：

```bash
git tag v1.15.0 && git push origin v1.15.0
```

`.github/workflows/desktop-release.yml` 會自動打包並上傳到 GitHub Releases，網頁端下載連結（`client/src/components/Modals/AccountInfoModal.jsx` 與 `client/public/downloads/index.html`）已指向穩定下載網址：

`https://github.com/thumb2086/earthonline/releases/latest/download/EarthOnlineSetup.exe`

## 遊戲系統

### 💰 經濟系統
- **離線收入** — 每分鐘自動產生，離線時收入減半
- **升級系統** — 電腦/伺服器/AI助手，提升收入倍率
- **員工** — 實習生/專員/工程師/經理/專家，綁定公司產生收入

### 🏦 銀行
- **活存** — 即時存取，0.1%/分鐘複利
- **定存** — 鎖定期間，較高利率
- **貸款** — 可借貸，有利息

### 💼 投資
- **定存基金** — 穩定收益
- **股票基金** — 高風險高回報
- **房地產** — 長期增值
- **新創公司** — 高風險投資

### 🏢 公司
- **創建公司** — $50,000 開辦費
- **升級** — 辦公室/設備/品牌
- **IPO上市** — 公司owner可觸發IPO，1小時認購期後自動上市
- **員工綁定** — 各公司獨立員工系統

### 📈 股票市場
- **系統做市商** — 系統持有庫存，用戶向系統買賣
- **價格影響** — 大量交易影響價格，最高10%上限
- **K線圖** — 即時/5分/1時走勢
- **槓桿交易** — 做多/做空，2x/3x/5x槓桿
- **維持率** — 130%追繳，100%強制平倉

### 📋 每日任務
- 每日隨機任務，完成獲得獎勵

## 股票列表

| 代號 | 名稱 | 產業 | 狀態 |
|---|---|---|---|
| 001 | 地球互動科技 | tech | trading |
| 002 | 深海科技 | tech | ipo |
| 003 | 銀河金融 | finance | 待IPO |
| 004 | 星雲生技 | tech | 待IPO |
| 005 | 黑洞能源 | manufacturing | 待IPO |
| 006 | 元界科技 | tech | 待IPO |

## 開發

```bash
# 安裝依賴
npm install
cd client && npm install

# 本地開發
npx wrangler dev

# 部署前端
cd client && npm run build && npx wrangler deploy

# 部署後端
npx wrangler deploy --config wrangler.jsonc
```

## 環境變數

| 變數 | 說明 |
|---|---|
| `JWT_SECRET` | JWT 簽名密鑰 |
| `DISCORD_CLIENT_ID` | Discord OAuth Client ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth Client Secret (secret) |
| `DISCORD_BOT_TOKEN` | Discord Bot Token (secret) |
| `FRONTEND_URL` | 前端網址 |

## 資料庫

- D1 Database: `earthonline-db`
- 主要資料表: users, wallets, employees, companies, stock_holdings, stock_trades, stock_inventory, ipo_state, margin_positions
