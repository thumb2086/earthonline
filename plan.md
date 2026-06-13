# Earth Online — 完整開發路線圖

> 最後更新：2026-06-13 | 分支：dev

---

## 一、現狀摘要

### 已完成的基礎建設

| 領域 | 狀態 | 說明 |
|------|------|------|
| 後端重構 (v1.8.x) | ✅ | services / socket / routes / config 抽出，server.js 瘦身 |
| 前端重構 (v1.9.x) | ✅ | hooks 提取、modals 獨立、GameContext |
| 經濟重塑 (v1.10.x) | ✅ | 健康曲線 decay、道具平衡、死亡限制、區域投資 |
| 事件與目標 (v1.11.x) | ✅ | 全域事件投票、每日任務、成就、週結算 |
| 新功能 (v1.12.1~v1.12.3) | ✅ | 離線收益、天賦系統、區域對抗統計 |
| Offline-First (v2.0.0) | ✅ | GameEngine + IndexedDB + PWA SW + Mobile CSS |
| 手機 UI Redesign (v2.0.1) | ✅ | 底部 4 Tab 導航 (Dashboard/Globe/Chat/Profile) |
| 管理員判定修復 | ✅ | 角色同步搬到 init_data 之前 |
| Electron 發布管道 (v2.1.0) | ✅ | 整併至 client/electron/ + electron-builder 設定 |

### v1.14.0 ✅ 全部完成

| Task | 狀態 |
|------|------|
| 修復 server.js catch(e) => {} 靜默失敗 | ✅ |
| 修復 /api/global/stats 硬編碼 region=asia (改為所有 region 聚合) | ✅ |
| 修復 heartbeatTimestamps 重啟消失 (fallback 到 DB lastHeartbeat) | ✅ |
| App.jsx 元件拆分 (-556 行，抽出 5 個 Modal 到獨立檔案) | ✅ |
| 更新 README + CHANGELOG | ✅ |
| 更新 AGENTS.md | ✅ |

---

## 二、現有技術棧

```
前端：    React 19 + Vite 8 + TypeScript + vanilla CSS + Leaflet
後端：    Express 5 + Socket.io + Mongoose (MongoDB) + CommonJS
桌面：    Electron 42 (client/) + Electron 31 (desktop/) 
          └─ desktop/ 使用 electron-builder 打包 Windows NSIS
PWA：     vite-plugin-pwa (injectManifest) + Service Worker
離線引擎： GameEngine.js + IndexedDB (StorageAdapter.js)
即時通訊： Socket.io (WebSocket) + 未來 WebRTC P2P
部署：     Cloudflare Pages (前端) + Render (後端)
CI/CD：    無（手動部署）
```

---

## 三、版本路線總圖

```
v2.0.x ── 離線基礎 + 行動版 redesign
  │
v2.1.x ── Electron 發布流水線 + Steamworks 整合
  │
v2.2.x ── Pixel Art 視覺重設計
  │
v2.3.x ── 滿版世界地圖 + 派遣掛機
  │
v2.4.x ── 全服秘寶抽獎
  │
v2.5.x ── 真實數據 + P2P 聊天
  │
v3.0.x ── Steam 正式發布 + 反作弊 + 備援節點
```

---

## 四、v2.0.x — 離線基礎 + 行動版

### v2.0.0 — Offline-First 核心 ✅ 已完成

| Task | 檔案 | 狀態 |
|------|------|------|
| Service Worker + vite-plugin-pwa | `sw.js`, `vite.config.js`, `main.jsx` | ✅ |
| GameEngine.js (mirror gameLoop) | `client/src/engine/GameEngine.js` | ✅ |
| StorageAdapter.js (IndexedDB) | `client/src/engine/StorageAdapter.js` | ✅ |
| GameContext 整合引擎+離線模式 | `client/src/context/GameContext.jsx` | ✅ |
| 離線模式 UI (⚡ 標籤 + 側欄數值) | `client/src/App.jsx` | ✅ |
| Mobile CSS 重構 (768px + 480px) | `client/src/index.css` | ✅ |
| 管理員判定修復（同步搬至 init_data 前） | `backend/server.js` | ✅ |

### v2.0.1 — 行動版 UI Redesign ✅ 已完成

> 手機上開 earthonline.qzz.io 改為原生 App 體驗的底部 Tab 導航。

**設計結果：**

```
┌─────────────────┐
│  Header (精簡)    │
│  ⚡ 離線標籤      │
│                   │
│   主要內容區       │
│   (每個 Tab 全螢幕) │
│                   │
├─────────────────┤
│ 📊 🌍 💬 👤     │  ← 底部固定導航列
└─────────────────┘
```

- **v2.0.1a 底部 Tab 導航架構 ✅**
  - 做什麼：建立 `client/src/components/Mobile/MobileNav.jsx` + `MobileLayout.jsx`，四頁輪換，僅手機 (<768px) 顯示
  - 改哪個檔案： `client/src/components/Mobile/MobileNav.jsx`（新建）、`client/src/components/Mobile/MobileLayout.jsx`（新建）、`client/src/App.jsx`、`client/src/index.css`
  - 驗證：手機上四頁可自由切換，桌面不受影響

- **v2.0.1b 手機儀表板 ✅**
  - 做什麼：卡片式佈局顯示健康度% + PT + 等級 + 生存時間，快捷按鈕列（商城、背包、成就、天賦、排行、區域、關於）
  - 改哪個檔案： `client/src/components/Mobile/MobileDashboard.jsx`（新建）
  - 驗證：所有數據正確顯示，按鈕可操作

- **v2.0.1c 手機地圖 ✅**
  - 做什麼：全螢幕 DataCenterVisualizer（3D 地球）+ 浮動聊天按鈕
  - 改哪個檔案： `client/src/components/Mobile/MobileGlobe.jsx`（新建）
  - 驗證：地圖操作流暢，聊天面板可開關

- **v2.0.1d 手機聊天 ✅**
  - 做什麼：全螢幕聊天室，輸入框固定在底部，僅顯示聊天/DC 訊息
  - 改哪個檔案： `client/src/components/Mobile/MobileChat.jsx`（新建）
  - 驗證：聊天發送/接收正常

- **v2.0.1e 手機個人頁 ✅**
  - 做什麼：頭像 + Discord 狀態 + 統計摘要 + 設定開關（主題、語言、BGM、通知、背景）+ 登出
  - 改哪個檔案： `client/src/components/Mobile/MobileProfile.jsx`（新建）
  - 驗證：設定可切換，登出正常

---

## 五、v2.1.x — Electron 發布流水線 + Steamworks

> 目標：一鍵 build 出 Windows/Mac/Linux 安裝檔，並整合 Steamworks SDK。

### 現有 Electron 架構

```
desktop/
├── main.js          ← Electron main process，載入 pages.dev
├── preload.js       ← contextBridge 暴露 electronAPI
├── package.json     ← electron-builder 已設定 Windows NSIS
├── build/
│   ├── icon.ico
│   └── icon.png
└── package-lock.json
```

### 需要改進的點

1. **載入本機 build 而非遠端 pages.dev** — 目前 `mainWindow.loadURL('https://earthonline1.pages.dev')`，離線時無法使用。應改為：
   - 開發模式：`loadURL('http://localhost:5173')`
   - 生產模式：`loadFile('dist/index.html')`（使用 client 的 vite build 產出）

2. **electron-builder 需統一** — 目前 desktop/ 有獨立設定，但 client/ 也有 electron 依賴。兩者需整併。

3. **Steamworks SDK 整合** — 使用 `steamworks.js` 或 `greenworks`。

4. **自動更新** — 整合 `electron-updater`。

### v2.1.0 — Electron 發布管道

- **v2.1.0a 整併 Electron 到 client/**
  - 做什麼：將 desktop/ 的 main.js/preload.js 搬至 `client/electron/`，統一使用 client/ 的依賴版本（Electron 42）。移除 `desktop/` 目錄。
  - 改哪個檔案： 搬移 `desktop/main.js` → `client/electron/main.cjs`、`desktop/preload.js` → `client/electron/preload.cjs`、更新 `client/package.json`（scripts/build + build config）、刪除 `desktop/`
  - 驗證：`npm run dev:electron` 啟動後載入本機 Vite dev server

- **v2.1.0b electron-builder 設定**
  - 做什麼：在 client/package.json 加入 `build` 區塊（win/mac/linux targets），加入 `electron-updater` 支援自動更新
  - 改哪個檔案： `client/package.json`
  - 驗證：`npm run build:electron` 產出 `.exe` / `.dmg` / `.AppImage`

- **v2.1.0c 生產模式載入本機 build**
  - 做什麼：electron/main.cjs 判斷 `process.env.NODE_ENV`，dev 載 localhost:5173，production 載 `dist/index.html`
  - 改哪個檔案： `client/electron/main.cjs`
  - 驗證：`npm run build && npm run preview` + Electron 載入本機 build，離線可用

### v2.1.1 — Steamworks 整合

- **v2.1.1a Steamworks SDK 初始化**
  - 做什麼：安裝 `steamworks.js`，在 Electron main process 初始化 Steam API，封裝成 preload API
  - 改哪個檔案： `client/electron/main.cjs`、`client/electron/preload.cjs`、`client/package.json`
  - 驗證：Steam overlay 可喚起，steam 初始化 log 正常

- **v2.1.1b Steam 成就同步**
  - 做什麼：將遊戲內成就（achievementService）對應至 Steam 成就，在解鎖時呼叫 `SteamUserStats.SetAchievement`
  - 改哪個檔案： `client/electron/steam.js`（新建）、`client/src/context/GameContext.jsx`（成就解鎖時呼叫 preload API）
  - 驗證：遊戲內解成就 → Steam overlay 彈出成就通知

- **v2.1.1c Steam 好友 + 邀請**
  - 做什麼：好友列表可看到 Steam 好友狀態，發送遊戲邀請直接啟用 Steam 內建 overlay
  - 改哪個檔案： `client/electron/steam.js`、`client/electron/preload.cjs`
  - 驗證：Steam 好友上線通知 + 可邀請

### v2.1.2 — Discord RPC 強化

- **v2.1.2a Electron Discord Rich Presence 改善**
  - 做什麼：現有 RPC 只顯示靜態狀態，改為即時更新（區域、PT、生存時間），支援按鈕「Join Game」
  - 改哪個檔案： `client/electron/main.cjs`、`client/src/context/GameContext.jsx`
  - 驗證：Discord 個人檔案顯示遊戲進度

- **v2.1.2b 視窗管理**
  - 做什麼：支援無邊框視窗切換、記憶視窗位置/大小、工作列進度條顯示健康度
  - 改哪個檔案： `client/electron/main.cjs`
  - 驗證：關掉重開後視窗位置還原

---

## 六、v2.2.x — Pixel Art 視覺重設計

> 去 AI 化、純粹回歸復古美式點陣美學。

### v2.2.0 — 登入與導航點陣化

| Task | 說明 | 檔案 |
|------|------|------|
| v2.2.0a 登入頁點陣紋理 + 亮綠邊框 | 登入框改為深灰半透明面板 | `index.css`, `LoginGateway.jsx` |
| v2.2.0b 底部條約點陣條 | 深邃草地綠點陣條背景 | `index.css`, `LoginGateway.jsx` |
| v2.2.0c 導航欄點陣化 | 深石磚灰紋理，黃色爆裂紋 LOGO | `App.jsx`, `index.css` |
| v2.2.0d 分類拉頁選單點陣化 | 深灰格子物品欄，懸停青框+音效 | `App.jsx`, `index.css` |
| v2.2.0e PixelWordArt 元件 | 3D 立體像素藝術字 | `components/PixelWordArt.jsx` |
| v2.2.0f 全站標題套用 | 陣營名稱、核心標題統一風格 | `App.jsx` |

### v2.2.1 — 登入公約與引導流程

| Task | 說明 | 檔案 |
|------|------|------|
| v2.2.1a 強制公約勾選 | Discord 登入前須勾約 | `LoginGateway.jsx`, `i18n.js` |
| v2.2.1b 公約後端記錄 | covenantAccepted 時間戳 | `User.js`, `auth.js` |
| v2.2.1c 引導式文檔 | 登入後單頁引導 | `OnboardingGuide.jsx` |
| v2.2.1d 三大陣營介紹 | 點陣化照片 + 選擇按鈕 | `FactionSelect.jsx` |

---

## 七、v2.3.x — 滿版世界地圖 + 派遣掛機

### v2.3.0 — 像素世界地圖

| Task | 說明 | 檔案 |
|------|------|------|
| v2.3.0a 2D 像素世界地圖 | 滿畫面地圖，支援拖曳縮放 | `WorldMap.jsx`（新建） |
| v2.3.0b 地圖點陣紋理疊加 | pixel-art 濾鏡 + 粗邊框 | `WorldMap.jsx` |

### v2.3.1 — 跨國派遣 + 礦層

| Task | 說明 | 檔案 |
|------|------|------|
| v2.3.1a 國家情報窗 | 在線人數/GDP/進駐玩家 | `CountryInfoPanel.jsx` |
| v2.3.1b 派遣建立礦場 | 點擊國家建立礦場，自動跳錢 | `App.jsx`, `gameHandler.js` |
| v2.3.1c 五大礦層升級邏輯 | Lv.1 碎石→Lv.5 星核，指數產出 | `constants.js`, `mineService.js` |
| v2.3.1d 礦層升級 UI | 升級按鈕 + 點陣爆炸動畫 | `MinePanel.jsx` |
| v2.3.1e 十字鎬敲擊動畫 | 進駐國家上方實時動畫 | `PickaxeAnimation.jsx` |

---

## 八、v2.4.x — 全服限量秘寶抽獎

### v2.4.0 — 抽獎系統

| Task | 說明 | 檔案 |
|------|------|------|
| v2.4.0a 抽獎後端邏輯 | 四稀有度 + 安全隨機數 | `lotteryService.js` |
| v2.4.0b 抽獎前端動畫 | 方塊加載 + 金光開獎 | `LotteryModal.jsx` |
| v2.4.0c 神物庫存行級鎖 | MongoDB findOneAndUpdate | `lotteryService.js` |
| v2.4.0d 神物效果 | +5%/+20% 掛機速度 | `gameLoop.js` |

### v2.4.1 — 轉生與 FOMO

| Task | 說明 | 檔案 |
|------|------|------|
| v2.4.1a 熔煉轉生系統 | 化石→晶石→轉生 | `lotteryService.js` |
| v2.4.1b 全服廣播通知 | 獨特/神話被抽時 Discord + 地圖特效 | `lotteryService.js`, `discordBot.js` |

---

## 九、v2.5.x — 真實數據 + P2P 聊天

### v2.5.0 — 真實數據底層

| Task | 說明 | 檔案 |
|------|------|------|
| v2.5.0a Redis 國家在線 Set | 即時在線人數統計 | `redisService.js` |
| v2.5.0b 國家 GDP 連動 | 該國玩家開採時薪加總 | `gdpService.js` |
| v2.5.0c 全服氣運排行 | 神物權重 + 轉生次數 SUM | `luckService.js` |

### v2.5.1 — P2P 聊天 (選擇性啟用)

| Task | 說明 | 檔案 |
|------|------|------|
| v2.5.1a WebRTC 信號交換 | Cloudflare Worker 或 Render 端點 | `_worker.js` or `server.js` |
| v2.5.1b GossipProtocol | 去重廣播 + Peer 管理 | `engine/GossipProtocol.js` |
| v2.5.1c P2PNetwork | RTCPeerConnection 管理 | `engine/P2PNetwork.js` |
| v2.5.1d 聊天 fallback | P2P 失敗降級至 socket.io | `useSocket.js` |

---

## 十、v3.0.x — Steam 正式發布 + 反作弊 + 備援

### v3.0.0 — Steam 發布準備

| Task | 說明 | 檔案 |
|------|------|------|
| v3.0.0a Steam 商品頁設定 | Steamworks 後台設定 | （外部） |
| v3.0.0b Steam DRM 整合 | appid.txt + 加密 | `electron/steam.js` |
| v3.0.0c 自動更新管道 | electron-updater + 發布伺服器 | `electron/main.cjs` |

### v3.0.1 — 反作弊與安全

| Task | 說明 | 檔案 |
|------|------|------|
| v3.0.1a 後端資產驗證 | 升級/抽獎時重算理論產出 | `validationService.js` |
| v3.0.1b 安全抽獎校驗 | crypto.randomBytes() | `lotteryService.js` |

### v3.0.2 — 備援節點輕量版

| Task | 說明 | 檔案 |
|------|------|------|
| v3.0.2a VolunteerNode.js | 100-150 行輕量 relay | `desktop/VolunteerNode.js`（復活） |
| v3.0.2b Render 健康度監控 | 自動切換備援 | `useSocket.js` |
| v3.0.2c 啟動檢查 | 環境變數完整性檢查 | `env.js` |

---

## 十一、現有問題清單

### Critical（v1.14.0 已修正）

- [x] `backend/server.js` 多處 `catch(e) => {}` 靜默失敗
- [x] `/api/global/stats` 硬編碼 `region = 'asia'`
- [x] `heartbeatTimestamps` 為 in-memory Map，重啟後消失

### High（已完成修正）

- [x] `discordBot.js` 直接 import User model + 持有 io 實例（加註解說明）
- [x] 聊天 filter regex 未 escape，可能引發 ReDoS（已有 escape，確認安全）
- [ ] MongoDB 更新 bypass `db.js` — 多處直接 `User.findOne()`（需要大規模重構）
- [x] 部分 client 使用 `document.getElementById()` 操作 DOM（改用 useRef）
- [ ] App.jsx 1878 行，需要持續拆分（v1.14.0 已拆分 -556 行，仍有改善空間）

### Medium（已完成修正）

- [x] CSS `text-transform: lowercase` 影響非英文語系（從 body 移除）
- [x] Docker compose 部分環境變數未用引號包裹（加引號）
- [x] 無 `npm start` script（README 說有但實際沒有）（README 已修正，script 已存在）
- [x] `desktop/` 與 `client/` 重複的 Electron 依賴（desktop/ 已刪除，統一 client/）

---

## 十二、版本時程總表

| 版本 | 主題 | 預計天數 | 相依性 | 優先級 |
|------|------|---------|--------|--------|
| v2.0.1a-e | 行動版 UI Redesign (底部 Tab) | 5 天 | v2.0.0 | High | ✅ |
| v1.14.0a-d | 問題修正 + App.jsx 拆分 -556 行 | 4 天 | — | High | ✅ |
| v1.14.0e-f | 文件更新 (README/CHANGELOG/AGENTS) | 2 天 | — | Medium | ✅ |
| v2.1.0a-c | Electron 發布管道 | 3 天 | v2.0.0 | High | ✅ |
| v2.1.1a-c | Steamworks 整合 | 5 天 | v2.1.0 | Medium |
| v2.1.2a-b | Discord RPC 強化 + 視窗管理 | 2 天 | v2.1.0 | Low |
| v2.2.0a-f | Pixel Art 登入+導航 | 5 天 | — | Medium |
| v2.2.1a-d | 登入公約+引導流程 | 4 天 | v2.2.0 | Medium |
| v2.3.0a-b | 像素世界地圖 | 4 天 | v2.2.1 | High |
| v2.3.1a-e | 跨國派遣+礦層 | 6 天 | v2.3.0 | High |
| v2.4.0a-d | 抽獎系統核心 | 4 天 | v2.3.1 | High |
| v2.4.1a-b | 轉生+FOMO | 3 天 | v2.4.0 | Medium |
| v2.5.0a-c | Redis+GDP+氣運 | 4 天 | v2.3.1 | Medium |
| v2.5.1a-d | P2P 聊天 | 4 天 | v2.0.0 | Low |
| v3.0.0a-c | Steam 發布 | 5 天 | v2.4.1 | High |
| v3.0.1a-b | 反作弊 | 3 天 | v3.0.0 | Medium |
| v3.0.2a-c | 備援節點 | 3 天 | v2.5.1 | Low |

**總計：16 個子版本，約 67 個工作日（~3.5 個月）**

---

## 十三、開發原則

1. **Offline-First** — 每個功能在實作時都確保離線可用
2. **雙平台同步** — Web 與 Electron 共用同一份前端程式碼
3. **向後相容** — 每個版本不破壞現有玩家資料
4. **增量發布** — 每個子版本可獨立部署
5. **Steam 優先** — 需要外部設定的功能（Steam SDK）盡早開始

---

## 版本標記

```
✅ = 已完成
⬜ = 待執行
🔄 = 進行中
