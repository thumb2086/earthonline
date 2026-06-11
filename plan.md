# Earth Online — Development Plan (v1.12.4 → v1.14.0 → v2.0.0)

> 本 plan 整合 v2.0.0-planning.md 與 2025-06-11 專案審計結果
> 每個 v 包含 2~5 個 task，可獨立執行、可驗證
> v1.14.0 完成後即為 v2.0.0

---

## 目前進度

已完成：v1.8.x ~ v1.12.3（後端重構、前端重構、經濟重塑、事件目標、離線收益、天賦系統）
進行中：無

---

## 優先級矩陣

| 優先級 | 定義 | 對應版本 |
|--------|------|---------|
| Critical | 可能 crash / 資料遺失 / 安全漏洞 | v3 |
| High | 功能缺陷 / 重大程式碼品質 | v1, v2, v4 |
| Medium | 程式碼品質 / 重構 | v4, v5 |
| Low | UX / 邊界情況 | v6, v7 |

---

## v1 — 區域對抗系統

### v1.1 區域指標收集 (backend)
- **做什麼：** 在 gameLoop.js 中收集每區域總存活時間、平均在線人數、事件參與率
- **改哪個檔案：**
  - `backend/services/gameLoop.js` — 每 tick 更新區域統計
  - `backend/state/regionState.js` — 新增區域統計欄位
  - `backend/models/User.js` (如需要)
- **驗證：** 區域統計數據正確累積，socket 查詢返回即時三區對比

### v1.2 區域對抗排行 (backend)
- **做什麼：** 實現跨週區域排名計算與獎勵發放，整合到 settlementService
- **改哪個檔案：**
  - `backend/services/settlementService.js` — 加入區域對抗結算
  - `backend/socket/settlementHandler.js` — 加入區域排行查詢
- **驗證：** 結算時區域排名正確、獎勵正確發放

### v1.3 區域對抗前端面板 (frontend)
- **做什麼：** 新增區域即時對比面板 UI
- **改哪個檔案：**
  - `client/src/App.jsx` — 新增 RegionWarPanel 按鈕與 modal
  - `client/src/i18n.js` — 新增翻譯
- **驗證：** 三欄即時對比顯示、個人貢獻正確

✅ v1 全部完成

---

## v2 — 多背景風格系統

### v2.1 背景架構 + Style 1 (3D 地球保留)
- **做什麼：** 建立背景選擇架構，保留現有 EarthGlobe 為 Style 1
- **改哪個檔案：**
  - `client/src/components/Backgrounds/index.jsx` — 新建背景 router
  - 將現有 EarthGlobe.jsx 標記為 Style 1
- **驗證：** 背景切換不影響 EarthGlobe 功能

### v2.2 Style 2: 伺服器機房
- **做什麼：** 新增 ServerRoom.jsx 背景動畫
- **改哪個檔案：**
  - `client/src/components/Backgrounds/ServerRoom.jsx` — 新建
- **驗證：** 機房動畫正常渲染，節點對應刀片閃爍

### v2.3 Style 3~5 與切換 UI
- **做什麼：** 加入星雲/雷達/賽博城市背景 + 設定面板切換按鈕
- **改哪個檔案：**
  - `client/src/components/Backgrounds/Nebula.jsx` — 新建
  - `client/src/components/Backgrounds/RadarTerminal.jsx` — 新建
  - `client/src/components/Backgrounds/CyberCity.jsx` — 新建
  - `client/src/App.jsx` — 設定面板加入背景切換
  - `client/src/i18n.js` — 新增翻譯
- **驗證：** 5 種背景可自由切換、儲存在 localStorage

✅ v2 全部完成

---

## v3 — 安全修正 (Critical)

### v3.1 修復洩漏的 secrets
- **做什麼：** 將 `.env` 從 git 中移除，輪換所有 exposed secrets（JWT_SECRET、DISCORD_CLIENT_SECRET）
- **改哪個檔案：**
  - `.gitignore` — 新增 `.env`
  - `backend/.env` — 更新 JWT_SECRET 為強密碼（crypto.randomBytes(64).toString('hex')）
  - `backend/config/env.js` — 強化 env 驗證
- **驗證：** `git status` 顯示 .env 不再被追蹤

### v3.2 修復 CORS 與 helmet
- **做什麼：** 限制 Socket.io CORS 為特定域名，重新啟用 helmet
- **改哪個檔案：**
  - `backend/server.js` — CORS 改為白名單 + 啟用 helmet
- **驗證：** 外部域名無法連接 WebSocket，安全 headers 正確發送

### v3.3 修復 crash.log 與 IP 洩漏
- **做什麼：** 將 crash.log 加入 gitignore，移除 stdout IP 日誌
- **改哪個檔案：**
  - `.gitignore` — 新增 `crash.log`
  - `backend/server.js` — 移除 IP logging 行
- **驗證：** crash.log 不再被 git 追蹤

### v3.4 修復 terminalHandler 未定義變數
- **做什麼：** 修正 INVEST_MAX_LEVEL 和 INVEST_COSTS 未定義問題
- **改哪個檔案：**
  - `backend/socket/terminalHandler.js` — 加入缺少的常數
- **驗證：** `/INVEST` 指令不再噴 ReferenceError

✅ v3 全部完成

---

## v4 — 程式碼品質 (High/Medium)

### v4.1 移除重複程式碼
- **做什麼：** 移除 `obfuscateIp()`、`getEventDuration()`、`sendDiscordWebhook()` 重複定義
- **改哪個檔案：**
  - `backend/server.js` — 刪除重複函數，改為 require
  - `backend/routes/auth.js` — 刪除重複 obfuscateIp
  - `backend/services/eventSystem.js` — 刪除重複 getEventDuration
  - `backend/socket/terminalHandler.js` — 刪除重複 sendDiscordWebhook
- **驗證：** 共用函數只定義一次，所有引用處正常工作

### v4.2 清理未使用 import
- **做什麼：** 移除 server.js 中未使用的 import（helmet, bcrypt, jwt, nodemailer 等）
- **改哪個檔案：**
  - `backend/server.js` — 移除未使用的 require
- **驗證：** Node.js 啟動無警告

### v4.3 App.jsx 瘦身 — 組件拆分
- **做什麼：** 將 LoginGateway、CountdownBanner、DonateBanner、FourPetalSpiral 抽出到獨立檔案
- **改哪個檔案：**
  - `client/src/components/LoginGateway.jsx` — 新建
  - `client/src/components/CountdownBanner.jsx` — 新建
  - `client/src/components/DonateBanner.jsx` — 新建
  - `client/src/components/FourPetalSpiral.jsx` — 新建
  - `client/src/App.jsx` — 刪除抽出部分，改為 import
- **驗證：** UI 行為與拆分前完全一致

### v4.4 重構重複的 Discord 角色分配邏輯
- **做什麼：** 統一 `assignExclusiveRole` 和 `assignWeeklyRoles`
- **改哪個檔案：**
  - `backend/discordBot.js` — 整合兩個角色分配函數
- **驗證：** 週 cron 正常執行，角色正確發放

✅ v4 全部完成

---

## v5 — 開發體驗與基礎建設

### v5.1 ESLint + Prettier 設定
- **做什麼：** 加入 linting 與格式化設定
- **改哪個檔案：**
  - `.eslintrc.cjs` — 新建
  - `.prettierrc` — 新建
  - `backend/package.json` — 加入 lint script
  - `client/package.json` — 加入 lint script
- **驗證：** `npm run lint` 正常執行

### v5.2 MongoDB Indexes 補齊
- **做什麼：** 加入遺漏的查詢索引
- **改哪個檔案：**
  - `backend/models/User.js` — 加入 homeRegion、accumulatedTime、weeklyScore 索引
- **驗證：** MongoDB 查詢使用正確索引

### v5.3 GameContext 整併
- **做什麼：** 將 App.jsx 中的 50+ useState 逐步搬進 GameContext
- **改哪個檔案：**
  - `client/src/context/GameContext.jsx` — 擴充狀態管理
  - `client/src/App.jsx` — 改用 context
- **驗證：** 狀態同步與拆分前一致

✅ v5 全部完成

---

## v6 — 最終優化與壓力測試

### v6.1 Rate Limiting 補完
- **做什麼：** 為 Discord OAuth 端點加入 rate limit
- **改哪個檔案：**
  - `backend/server.js` — 加入 Discord OAuth rate limiter
- **驗證：** 短時間大量請求被正確限制

### v6.2 離線補償防重複
- **做什麼：** 限制每 5min 最多一次離線補償
- **改哪個檔案：**
  - `backend/server.js` — 加入補償冷卻檢查
- **驗證：** 短時間重複連線只補償一次

### v6.3 大量連線模擬
- **做什麼：** 測試 100/500 同時連線，確認 tick delay < 100ms
- **改哪個檔案：**
  - `backend/scripts/stress-test.js` — 新建壓力測試腳本
- **驗證：** 高併發下 tick 正常、資料一致

### v6.4 邊界情況驗證
- **做什麼：** 檢查健康度 <0/>100、背包負數、Buff 過期等邊界
- **改哪個檔案：**
  - `backend/services/gameLoop.js` — 加入邊界防護
  - `backend/services/shopService.js` — 加入邊界防護
- **驗證：** 所有邊界情況正確處理

✅ v6 全部完成

---

## v7 — 正式發布 (v1.14.0)

### v7.1 更新 README.md
- **做什麼：** 完整遊戲規則說明 + 新功能使用指南
- **改哪個檔案：**
  - `README.md` — 重寫
- **驗證：** 文件涵蓋所有功能

### v7.2 更新 AGENTS.md
- **做什麼：** 更新開發指引為新架構
- **改哪個檔案：**
  - `AGENTS.md` — 更新
- **驗證：** 開發指引準確反映當前架構

### v7.3 回歸測試
- **做什麼：** 完整跑一遍所有功能（登入、掛機、商城、背包、事件、任務、成就、天賦）
- **驗證：** 所有功能正常

### v7.4 部署至 main
- **做什麼：** dev → main merge，確認 Cloudflare Pages 部署成功
- **驗證：** `earthonline1.pages.dev` 可正常訪問

✅ v7 全部完成

---

## 🎉 v1.14.0 全部完成！以下為 v2.0.0 規劃

---

## v2.0.0 — 全面重構 (第二階段)

- 前端全面改用 Pixel Art 點陣美學
- 多國派遣掛機系統
- 全服限量秘寶抽獎
- 真實國家 GDP 連動
- 反作弊安全系統
