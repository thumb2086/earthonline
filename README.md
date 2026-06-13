# Earth Online 🌍

全球節點觀測與管理中心 — 一款基於《三體》概念與賽博龐克美學的實驗性全球網路觀測掛機遊戲。

## 快速開始

```bash
# 後端
cd backend && npm install && npm start

# 前端開發
cd client && npm install && npm run dev
```

## 架構

- **後端**: Express 5 + Socket.io + MongoDB
- **前端**: React 19 + Vite 8 + vanilla CSS + PWA (Service Worker)
- **離線支援**: GameEngine.js + IndexedDB (StorageAdapter)
- **桌面**: Electron (獨立安裝版)
- **部署**: Cloudflare Pages (前端) + Render (後端)
- **Discord**: discord.js bot (slash commands, role assignment, chat bridge)

## 功能

- 🌐 即時全球節點地圖 (3D 地球 / 伺服器機房 / 星雲 / 雷達 / 賽博城市)
- ⏱️ 放置掛機生存系統 (健康度 / PT / 等級 / 天賦)
- 🏪 黑市商城（道具購買/使用）
- 🎲 隨身碟抽獎系統
- 📊 即時排行榜 + 區域對抗
- 🤝 好友系統 + 私訊
- 🎯 每日任務 + 成就系統 + 天賦系統 (3 系 × 12 天賦)
- 🏆 週結算 + 榮譽值
- 🗳️ 全域事件投票 + 互動選擇
- 🔗 Discord 整合（登入、聊天橋接、身分組）
- 📱 手機版底部 Tab 導航 (儀表板 / 地球 / 聊天 / 個人)
- ⚡ 離線模式 (斷線不中斷遊戲，本地引擎持續運作)
- 🔄 自動健康回復 (低血量時被動恢復至 50%)

## 版本歷史

### v1.14.0 — 正式發布
- 修復管理員角色同步 (Discord 角色搬到 init_data 之前)
- 修復排行榜全顯示「市民」(補 role 欄位 + 社交頁面)
- 修復 Render crash (ALLOWED_ORIGINS 未 import)
- 修復伺服器重啟後離線補償失效 (heartbeat 寫入 DB)
- App.jsx 拆分 -556 行 (抽出 5 個 Modal 到獨立檔案)
- 啟動時全體角色同步 (離線管理員自動更新)
- 被動健康回復系統 (血量 < 50% 時自動恢復)
- PWA manifest 修復 (403 → .json)
- 管理員按鈕判定修復 (角色同步不再落後於 init_data)

### v2.0.0 — Offline-First 核心
- Service Worker + PWA 離線載入
- GameEngine.js 客戶端遊戲引擎
- IndexedDB 自動存檔
- 離線模式 UI (⚡ 標籤 + 本地引擎數值)
- vite-plugin-pwa 整合 (自動更新提示)
- 行動版 CSS 重構 (768px + 480px 斷點)

### v2.0.1 — 行動版 UI Redesign
- 底部 4 Tab 導航 (儀表板 / 地球 / 聊天 / 個人)
- 卡片式儀表板 (健康度 / PT / 等級 / 存活 + 快捷按鈕)
- 全螢幕聊天室 + 全螢幕地球
- 個人頁 (設定 / 主題 / 語言 / BGM / 登出)

### v1.13.x — 系統優化
- 安全修正（secrets/CORS/helmet/IP）
- 效能優化（快取、索引）
- ESLint 設定

### v1.12.x — 新功能
- 離線收益系統
- 天賦系統（3 系 × 12 天賦）
- 區域對抗系統
- 多背景風格 (5 種)

### v1.11.x — 事件與目標
- 全域事件互動化（投票/選擇/連鎖）
- 每日任務
- 成就里程碑（18 項）
- 週結算 + 榮譽值

### v1.10.x — 經濟重塑
- 健康系統重設計
- 道具重平衡 + 新道具
- 節點升級 + 區域投資

### v1.9.x — 前端重構
- hooks 提取、modals 獨立、GameContext

### v1.8.x — 後端重構
- services/socket/routes/config 提取

## License

MIT
