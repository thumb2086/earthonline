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

## v2.0.x — Pixel Art 視覺重設計

> 去 AI 化、純粹回歸復古美式點陣美學。全面採用美式重工業復古點陣（Pixel Art）與極具厚重感的像素配色。

### v2.0.1 — 登入與條約頁點陣化

- **v2.0.1a 登入頁背景點陣紋理**
  - **做什麼：** 將登入頁背景改為深褐色粗糙礦岩點陣紋理（CSS pixel-art 重複背景），中央登入框為深灰色半透明面板，四周亮綠色發光邊框
  - **改哪個檔案：** `client/src/index.css`、`client/src/components/LoginGateway.jsx`
  - **驗證：** 登入頁呈現礦岩紋理 + 亮綠邊框登入框

- **v2.0.1b 底部條約點陣條**
  - **做什麼：** 底部《市民公約條約》改為深邃草地綠點陣條背景，文字改為粗白點陣體加黑色陰影（CSS text-shadow + pixel font）
  - **改哪個檔案：** `client/src/index.css`、`client/src/components/LoginGateway.jsx`
  - **驗證：** 條約區呈現草地綠點陣條 + 白字黑陰影

### v2.0.2 — 導航欄與選單點陣化

- **v2.0.2a 頂部導航欄點陣化**
  - **做什麼：** 導航欄改為深石磚灰色點陣紋理背景，上方壓一條草地綠細線；左側 LOGO 改為黃色立體爆裂紋藝術字（CSS pixel text effect）
  - **改哪個檔案：** `client/src/App.jsx`、`client/src/index.css`
  - **驗證：** 導航欄呈現石磚灰點陣 + 黃色爆裂紋 LOGO

- **v2.0.2b 分類拉頁選單點陣化**
  - **做什麼：** 下拉選單改為深灰色格子物品欄視覺；懸停時亮青色像素外框 + 機械按鍵音效（CSS outline + Howler.js）
  - **改哪個檔案：** `client/src/App.jsx`、`client/src/index.css`
  - **驗證：** 選單懸停出現青色像素框 + 音效

### v2.0.3 — 3D 像素藝術字元件

- **v2.0.3a Pixel WordArt 元件**
  - **做什麼：** 建立 `<PixelWordArt>` 元件，渲染帶黑色粗邊框 + 飽和漸層色的 3D 立體街機藝術字（多重 text-shadow + linear-gradient）
  - **改哪個檔案：** `client/src/components/PixelWordArt.jsx`（新建）
  - **驗證：** 所有標題套用後呈現 3D 立體像素字效果

- **v2.0.3b 全站標題套用 PixelWordArt**
  - **做什麼：** 將陣營名稱、核心標題等全部改用 `<PixelWordArt>`
  - **改哪個檔案：** `client/src/App.jsx`
  - **驗證：** 全站標題統一 3D 像素風格

---

## v2.1.x — 登入公約與引導流程

### v2.1.1 — Discord 登入 + 市民公約

- **v2.1.1a 強制公約勾選流程**
  - **做什麼：** 登入前強制閱讀並勾選《市民公約條約》，勾選後立體灰色按鈕亮起可點擊；Discord 一鍵登入整合
  - **改哪個檔案：** `client/src/components/LoginGateway.jsx`、`client/src/i18n.js`
  - **驗證：** 未勾約時按鈕禁用，勾約後亮起可登入

- **v2.1.1b 公約後端記錄**
  - **做什麼：** 使用者在勾選同意後，後端儲存 covenantAccepted 時間戳
  - **改哪個檔案：** `backend/models/User.js`、`backend/routes/auth.js`
  - **驗證：** 資料庫記錄 covenantAccepted 欄位

### v2.1.2 — 引導式文檔與陣營介紹

- **v2.1.2a 全球開採指南頁**
  - **做什麼：** 登入後進入單頁向下滾動引導頁，以深色硬質合金面板呈現獨立世界觀文檔
  - **改哪個檔案：** `client/src/components/OnboardingGuide.jsx`（新建）、`client/src/App.jsx`、`client/src/i18n.js`
  - **驗證：** 登入後先看到引導頁，可向下滾動閱讀

- **v2.1.2b 三大陣營介紹 + 點陣化照片**
  - **做什麼：** 展示三張真實建築照片經點陣化濾鏡處理（台北101、自由女神、巴黎鐵塔），對應亞洲/美洲/歐洲陣營，附帶簡介與選擇按鈕
  - **改哪個檔案：** `client/src/components/FactionSelect.jsx`（新建）、`client/public/assets/factions/`（新增點陣圖）、`client/src/i18n.js`
  - **驗證：** 三陣營卡片正確顯示，點擊選擇後記錄陣營

---

## v2.2.x — 滿版世界地圖與派遣掛機

### v2.2.1 — 2D 像素世界地圖

- **v2.2.1a 像素世界地圖核心**
  - **做什麼：** 滿畫面 2D 像素世界地圖（含各國國旗），支援自由拖曳與滾輪縮放（react-leaflet 或自訂 canvas）
  - **改哪個檔案：** `client/src/components/WorldMap.jsx`（新建）、`client/src/App.jsx`
  - **驗證：** 地圖可拖曳縮放，各國位置正確

- **v2.2.1b 地圖點陣紋理疊加**
  - **做什麼：** 地圖表面疊加 pixel-art 紋理濾鏡，各國輪廓以粗像素邊框繪製
  - **改哪個檔案：** `client/src/components/WorldMap.jsx`
  - **驗證：** 地圖呈現點陣風格而非平滑向量

### v2.2.2 — 跨國派遣掛機 + 情報窗

- **v2.2.2a 國家情報窗**
  - **做什麼：** 點擊國家彈出情報窗（真實數據：在線人數、GDP/秒、已進駐玩家數）
  - **改哪個檔案：** `client/src/components/CountryInfoPanel.jsx`（新建）、`client/src/i18n.js`
  - **驗證：** 點擊國家顯示正確情報數據

- **v2.2.2b 派遣建立礦場**
  - **做什麼：** 情報窗點擊「在此建立我的礦場」，右側掛機面板開始自動跳錢，後端記錄玩家派遣國家
  - **改哪個檔案：** `client/src/components/CountryInfoPanel.jsx`、`client/src/App.jsx`、`backend/socket/gameHandler.js`
  - **驗證：** 派遣後右側面板金幣跳動，資料庫更新派駐國家

### v2.2.3 — 五大礦層升級

- **v2.2.3a 礦層升級邏輯 (backend)**
  - **做什麼：** 實作 Lv.1 碎石地層 → Lv.5 地球星核共五層指數級產出公式，每層花費遞增
  - **改哪個檔案：** `backend/config/constants.js`、`backend/services/mineService.js`（新建）
  - **驗證：** 升級花費與產出符合指數曲線

- **v2.2.3b 礦層升級 UI (frontend)**
  - **做什麼：** 掛機面板顯示當前礦層、升級按鈕與下一層預覽；升級時播放點陣爆炸動畫
  - **改哪個檔案：** `client/src/components/MinePanel.jsx`（新建）、`client/src/App.jsx`
  - **驗證：** 點擊升級按鈕後礦層提升、產出增加、動畫播放

### v2.2.4 — 萬人開採反饋動畫

- **v2.2.4a 十字鎬敲擊動畫**
  - **做什麼：** 玩家派遣礦場至某國後，該國地圖上方實時冒出十字鎬像素敲擊動畫（多個小 sprite 隨機跳動）
  - **改哪個檔案：** `client/src/components/PickaxeAnimation.jsx`（新建）、`client/src/components/WorldMap.jsx`
  - **驗證：** 有玩家進駐的國家上方出現十字鎬動畫

- **v2.2.4b 動畫人數連動**
  - **做什麼：** 十字鎬數量與進駐玩家數成正比，socket 實時增減
  - **改哪個檔案：** `client/src/components/WorldMap.jsx`、`backend/socket/gameHandler.js`
  - **驗證：** 玩家人數增減時動畫數量同步變化

---

## v2.3.x — 全服限量秘寶抽獎

### v2.3.1 — 抽獎系統核心

- **v2.3.1a 抽獎後端邏輯**
  - **做什麼：** 實作抽獎 API，四種稀有度（Common 89.99% / Epic 9.9% / Mythic 0.1% / Unique 0.001%），後端安全隨機數生成，消耗百億資金
  - **改哪個檔案：** `backend/services/lotteryService.js`（新建）、`backend/server.js`、`backend/config/constants.js`
  - **驗證：** 抽獎機率分布符合設定，資金正確扣除

- **v2.3.1b 抽獎前端 UI + 動畫**
  - **做什麼：** 【探尋地球秘寶】按鈕、方塊加載動畫與金光閃爍開獎動畫，顯示抽中物品
  - **改哪個檔案：** `client/src/components/LotteryModal.jsx`（新建）、`client/src/App.jsx`、`client/src/i18n.js`
  - **驗證：** 點擊按鈕後播放動畫，正確顯示抽獎結果

### v2.3.2 — 神物庫存與絕版

- **v2.3.2a 資料庫行級鎖定**
  - **做什麼：** 神物庫存採用 MongoDB 行級鎖（findOneAndUpdate 原子操作），庫存歸零即拒發
  - **改哪個檔案：** `backend/services/lotteryService.js`、`backend/models/User.js`
  - **驗證：** 高併發抽獎不會超發，庫存 0 時回傳錯誤

- **v2.3.2b 神物庫存管理後台**
  - **做什麼：** 管理介面設定每國家神話限量 1 個、全服獨特僅 1 個；被抽走後全服庫存歸零
  - **改哪個檔案：** `backend/services/lotteryService.js`、`backend/config/constants.js`
  - **驗證：** 庫存正確扣減，絕版後不可再抽得

### v2.3.3 — 神物效果與轉生

- **v2.3.3a 神物 Buff 系統**
  - **做什麼：** 史詩 +5%、神話 +20% 掛機速度；獨特全服唯一地圖懸浮特效 + Discord 閃爍身分組
  - **改哪個檔案：** `backend/services/gameLoop.js`、`backend/discordBot.js`、`client/src/components/WorldMap.jsx`
  - **驗證：** 持有神物後產出正確提升，地圖顯示專屬特效

- **v2.3.3b 熔煉轉生系統**
  - **做什麼：** 普通級化石可熔煉為「幸運晶石」，消耗晶石進行礦場轉生，永久提升下一輪開採速度
  - **改哪個檔案：** `backend/services/lotteryService.js`、`client/src/components/LotteryModal.jsx`、`client/src/i18n.js`
  - **驗證：** 熔煉後晶石數量正確，轉生後產出加成生效

- **v2.3.3c FOMO 全服通知**
  - **做什麼：** 獨特/神話被抽走時，全服廣播 + Discord Webhook 通知，地圖特效即時更新
  - **改哪個檔案：** `backend/services/lotteryService.js`、`backend/discordBot.js`、`client/src/components/WorldMap.jsx`
  - **驗證：** 全服玩家收到抽中通知，絕版物品不再顯示

---

## v2.4.x — 真實數據底層架構

### v2.4.1 — 真實在線人數統計

- **v2.4.1a Redis 國家在線 Set**
  - **做什麼：** 利用 Redis Set 統計每個國家的當前在線玩家，玩家離線或切換國時實時增減
  - **改哪個檔案：** `backend/services/redisService.js`（新建）、`backend/server.js`、`backend/socket/gameHandler.js`
  - **驗證：** 切換國家後 Redis Set 正確 +1/-1，地圖顯示正確在線數

### v2.4.2 — 真實國家 GDP 連動

- **v2.4.2a 國家 GDP 即時加總**
  - **做什麼：** 點擊國家顯示的「總資源產出/秒」由該國所有在線玩家的真實開採時薪加總，每秒更新
  - **改哪個檔案：** `backend/services/gdpService.js`（新建）、`client/src/components/CountryInfoPanel.jsx`
  - **驗證：** 高階玩家進駐後該國 GDP 暴漲，離開後下跌

### v2.4.3 — 全服氣運值排行

- **v2.4.3a 氣運值計算 cron**
  - **做什麼：** 每 5 分鐘 SUM 三大陣營神物權重 + 轉生次數，第一名陣營地圖板塊渲染金色粒子特效
  - **改哪個檔案：** `backend/services/luckService.js`（新建）、`backend/jobs/`、`client/src/components/WorldMap.jsx`
  - **驗證：** 氣運排行第一的陣營區域顯示金色粒子特效

---

## v2.5.x — 反作弊與安全性

### v2.5.1 — 後端資產驗證

- **v2.5.1a 伺服器端產出重算**
  - **做什麼：** 升級/抽獎時後端根據「上次存檔時間 × 理論每秒產出」重新計算玩家資產，拒絕前端偽造數據
  - **改哪個檔案：** `backend/services/validationService.js`（新建）、`backend/services/gameLoop.js`、`backend/services/lotteryService.js`
  - **驗證：** 修改前端請求數值被後端拒絕

### v2.5.2 — 安全抽獎校驗

- **v2.5.2a 後端安全隨機數**
  - **做什麼：** 抽獎亂數由 crypto.randomBytes() 生成，前端僅播放動畫不參與邏輯
  - **改哪個檔案：** `backend/services/lotteryService.js`
  - **驗證：** 前後端抽獎結果一致，無法偽造

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
