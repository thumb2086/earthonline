# Earth Online — 開發路線圖 (Current → v1.14.0 → v2.0.0+)

> 基於 v2.0.0-planning.md 與 2025-06-11 專案審計結果整合
> 每個小版號為可獨立部署、不破壞現有遊戲的增量更新
> 目標：v1.14.0 正式發布

---

## 目前進度

已完成：v1.8.x(v1.8.1~v1.8.4 後端重構)、v1.9.x(v1.9.1~v1.9.4 前端重構)、v1.10.x(v1.10.1~v1.10.3 經濟重塑)、v1.11.x(v1.11.1~v1.11.4 事件&目標)、v1.12.x(v1.12.1~v1.12.3 離線收益+天賦)
進行中：v1.12.4 區域對抗

---

## 審計重點摘要（2025-06-11）

| 嚴重度 | 數量 | 關鍵項目 |
|--------|------|---------|
| Critical | 7 | Secrets 外洩、弱 JWT Secret、Wildcard CORS、重複函數、crash.log 未 gitignore、IP 日誌洩漏 |
| High | 9 | Helmet 關閉、App.jsx 2719 行、server.js 761 行、重複程式碼、未使用 import、遺漏 rate limit、未定義變數、無 token 撤銷 |
| Medium | 9 | 遺漏輸入驗證、FP 精度、重複結算邏輯、50 人限制、100 次 Discord 查詢、console.log |
| Low | 10 | 無 lint、React keys、硬編碼字串、遺漏索引、靜默 catch |

---

## v1.12.x — 深度新功能

### v1.12.4 — 區域對抗系統

- **v1.12.4a 區域指標收集 (backend)**
  - **做什麼：** 在 regionState.js 新增 warStats（totalOnlineTime、avg/peak users、eventsCompleted、totalPTEarned），在 gameLoop 每 tick 更新
  - **改哪個檔案：** `backend/state/regionState.js`、`backend/services/gameLoop.js`、`backend/server.js`
  - **驗證：** 區域統計數據正確累積，socket 查詢返回即時三區對比
  - **狀態：** ✅ 已完成

- **v1.12.4b 區域結算 + 獎勵 (backend)**
  - **做什麼：** 整合 warStats 到 settlementService，結算時發放區域排名獎勵（冠軍全區 +200 PT + 邊框，亞軍 +100 PT，個人前 10 +500 PT）
  - **改哪個檔案：** `backend/services/settlementService.js`、`backend/state/regionState.js`
  - **驗證：** 結算時區域排名正確、獎勵正確發放

- **v1.12.4c 前端區域對抗面板 (frontend)**
  - **做什麼：** 新增三欄即時對比面板 UI，顯示各區 stats、本週趨勢、個人貢獻
  - **改哪個檔案：** `client/src/App.jsx`、`client/src/i18n.js`
  - **驗證：** 三欄即時對比顯示、socket 實時更新

### v1.12.5 — 多背景風格系統

- **v1.12.5a 背景架構 + Style 1 保留**
  - **做什麼：** 建立 `client/src/components/Backgrounds/` 目錄與 router，保留 EarthGlobe 為 Style 1
  - **改哪個檔案：** `client/src/components/Backgrounds/index.jsx`（新建）
  - **驗證：** 背景切換不影響 EarthGlobe 功能

- **v1.12.5b Style 2: 伺服器機房 (ServerRoom)**
  - **做什麼：** 新增伺服器機櫃動畫背景，刀片閃爍對應在線節點
  - **改哪個檔案：** `client/src/components/Backgrounds/ServerRoom.jsx`（新建）
  - **驗證：** 機房動畫正常渲染

- **v1.12.5c Style 3~5 + 切換 UI**
  - **做什麼：** 加入星雲(Nebula)、雷達(RadarTerminal)、賽博城市(CyberCity) + 設定面板切換
  - **改哪個檔案：** 3 個新背景元件 + `client/src/App.jsx` + `client/src/i18n.js`
  - **驗證：** 5 種背景可自由切換、儲存在 localStorage

---

## v1.13.x — 系統優化與安全

### v1.13.1 — 安全修正 (Critical)

- **v1.13.1a 修復外洩 secrets**
  - **做什麼：** 將 `.env` 從 git 移除，輪換所有 exposed secrets（JWT_SECRET、DISCORD_CLIENT_SECRET），更新為 crypto.randomBytes(64) 強密碼
  - **改哪個檔案：** `.gitignore`、`backend/.env`、`backend/config/env.js`
  - **驗證：** `git status` 顯示 .env 不再被追蹤

- **v1.13.1b 修復 CORS 與啟用 helmet**
  - **做什麼：** 限制 Socket.io CORS 為白名單域名，重新啟用 helmet（設定 CSP 允許 Socket.io）
  - **改哪個檔案：** `backend/server.js`
  - **驗證：** 外部域名無法連接 WebSocket，安全 headers 正確發送

- **v1.13.1c 修復 crash.log 與 IP 洩漏**
  - **做什麼：** crash.log 加入 gitignore，移除 stdout IP 日誌
  - **改哪個檔案：** `.gitignore`、`backend/server.js`
  - **驗證：** crash.log 不再被 git 追蹤

- **v1.13.1d 修復 terminalHandler 未定義變數**
  - **做什麼：** 補上 INVEST_MAX_LEVEL 和 INVEST_COSTS 常數
  - **改哪個檔案：** `backend/socket/terminalHandler.js`
  - **驗證：** `/INVEST` 指令不再噴 ReferenceError

- **v1.13.1e 移除重複程式碼**
  - **做什麼：** 移除 obfuscateIp()、getEventDuration()、sendDiscordWebhook() 重複定義
  - **改哪個檔案：** `backend/server.js`、`backend/routes/auth.js`、`backend/services/eventSystem.js`、`backend/socket/terminalHandler.js`
  - **驗證：** 共用函數只定義一次，所有引用處正常工作

- **v1.13.1f 清理未使用 import**
  - **做什麼：** 移除 server.js 中未使用的 import（helmet、bcrypt、jwt、nodemailer 等）
  - **改哪個檔案：** `backend/server.js`
  - **驗證：** Node.js 啟動無警告

### v1.13.2 — 效能優化 (Medium)

- **v1.13.2a MongoDB Indexes**
  - **做什麼：** 補上 homeRegion、accumulatedTime、weeklyScore 的查詢索引
  - **改哪個檔案：** `backend/models/User.js`
  - **驗證：** MongoDB 查詢使用正確索引

- **v1.13.2b 快取層**
  - **做什麼：** regionPopulation 快取 30s、leaderboard 快取 5s、roleCache TTL 維持 1min
  - **改哪個檔案：** `backend/server.js`、`backend/routes/leaderboard.js`
  - **驗證：** countDocuments 呼叫次數減少

- **v1.13.2c App.jsx 組件拆分**
  - **做什麼：** 將 LoginGateway、CountdownBanner、DonateBanner、FourPetalSpiral 抽出到獨立檔案
  - **改哪個檔案：** `client/src/components/LoginGateway.jsx`、`CountdownBanner.jsx`、`DonateBanner.jsx`、`FourPetalSpiral.jsx`（新建） + `client/src/App.jsx`
  - **驗證：** UI 行為與拆分前完全一致

- **v1.13.2d 統一 Discord 角色分配**
  - **做什麼：** 整合 assignExclusiveRole 和 assignWeeklyRoles 為單一函數
  - **改哪個檔案：** `backend/discordBot.js`
  - **驗證：** 週 cron 正常執行

### v1.13.3 — 開發體驗

- **v1.13.3a ESLint + Prettier**
  - **做什麼：** 加入 linting 與格式化設定
  - **改哪個檔案：** `.eslintrc.cjs`、`.prettierrc`（新建） + `package.json`（兩端）
  - **驗證：** `npm run lint` 正常執行

- **v1.13.3b Rate Limiting 補完**
  - **做什麼：** 為 Discord OAuth 端點加入 rate limit
  - **改哪個檔案：** `backend/server.js`
  - **驗證：** 短時間大量請求被正確限制

- **v1.13.3c 離線補償防重複**
  - **做什麼：** 限制每 5min 最多一次離線補償
  - **改哪個檔案：** `backend/server.js`
  - **驗證：** 短時間重複連線只補償一次

### v1.13.4 — 壓力測試

- **v1.13.4a 大量連線模擬**
  - **做什麼：** 測試 100/500 同時連線，確認 tick delay < 100ms
  - **改哪個檔案：** `backend/scripts/stress-test.js`（新建）
  - **驗證：** 高併發下 tick 正常

- **v1.13.4b 邊界情況驗證**
  - **做什麼：** 檢查健康度 <0/>100、背包負數、Buff 過期
  - **改哪個檔案：** `backend/services/gameLoop.js`、`backend/services/shopService.js`
  - **驗證：** 所有邊界情況正確處理

- **v1.13.4c 完整回歸測試**
  - **做什麼：** 跑一遍所有功能（登入、掛機、商城、背包、事件、任務、成就、天賦、區域對抗）
  - **驗證：** 所有功能正常

---

## v1.14.0 — 正式發布

- **v1.14.0a 更新 README.md**
  - **做什麼：** 完整遊戲規則說明、新功能使用指南
  - **改哪個檔案：** `README.md`
  - **驗證：** 文件涵蓋所有功能

- **v1.14.0b 更新 AGENTS.md**
  - **做什麼：** 開發指引更新為新架構
  - **改哪個檔案：** `AGENTS.md`
  - **驗證：** 開發指引準確反映當前架構

- **v1.14.0c 更新 CHANGELOG**
  - **做什麼：** 所有 v1.8.x ~ v1.13.x 版本摘要
  - **改哪個檔案：** `CHANGELOG.md`（新建）
  - **驗證：** 版本歷史完整

- **v1.14.0d dev → main merge + CF Pages 部署**
  - **做什麼：** 合併 dev 到 main，確認部署成功
  - **驗證：** earthonline1.pages.dev 正常訪問

---

## v2.0.0+ — 第二階段（規劃中）

### 前端全面重設計
- 全面改用 Pixel Art 點陣美學（復古街機風格）
- 登入頁面點陣礦岩紋理、3D 立體像素藝術字
- 滿版 2D 像素世界地圖，可自由拖曳縮放

### 多國派遣掛機系統
- 點擊國家建立礦場，五大礦層升級（碎石→星核）
- 萬人開採反饋：地圖上實時十字鎬敲擊動畫

### 全服限量秘寶抽獎
- 普通(89.99%) / 史詩(9.9%) / 神話(0.1%) / 獨特(0.001%)
- 真・資料庫行級鎖定保證絕版
- 錯失恐懼(FOMO) — 被抽走即永久絕版

### 真實國家 GDP 連動
- 在線玩家真實開採時薪加總
- 高階玩家轉移陣地引發全球數據波動

### 反作弊安全系統
- 資產權限在後端，前端僅視覺效果
- 後端安全隨機數抽獎
- 嚴格行級鎖定防超發

---

## 總版本時程表

| 版本 | 主題 | 相依性 | 優先級 |
|------|------|--------|--------|
| v1.12.4 | 區域對抗系統 | v1.11.4 | High |
| v1.12.5 | 多背景風格系統 | — | Medium |
| v1.13.1 | 安全修正 | — | Critical |
| v1.13.2 | 效能優化 | v1.13.1 | Medium |
| v1.13.3 | 開發體驗 | — | Low |
| v1.13.4 | 壓力測試 | v1.13.2 | Low |
| v1.14.0 | 正式發布 | 全部 | High |

---

## 版本標記規則

```
✅ = 已完成
⬜ = 待執行
🔴 = 阻塞
```

> 最後更新：2025-06-11
