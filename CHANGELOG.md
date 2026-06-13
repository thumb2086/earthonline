# Changelog

## v1.14.0 — 正式發布
- 管理員角色同步修復（Discord 檢查搬到 init_data 之前，管理員一連線就正確）
- 修復排行榜全顯示「市民」（leaderboard.js + socialService.js 補 role 欄位）
- 修復 Render crash（ALLOWED_ORIGINS 未 import）
- 修復伺服器重啟後離線補償失效（heartbeat 同步寫入 DB）
- 被動健康回復（血量 < 50% 自動恢復至 50%，低於 25% 恢復更快）
- 啟動時全體角色同步（離線管理員自動更新 DB）
- App.jsx 元件拆分 -556 行（抽出 5 個 Modal 到獨立檔案）
- PWA manifest 403 修復（改 manifest.json）
- Discord role sync 偵錯 log 強化
- 管理員判定修復（角色同步不再落後於 init_data）

## v2.0.0 — Offline-First 核心
- Service Worker + PWA 離線載入 (vite-plugin-pwa)
- GameEngine.js 客戶端遊戲引擎 (mirror backend gameLoop)
- IndexedDB 自動存檔 (StorageAdapter.js, 每 10 秒)
- 離線模式 UI（⚡ 離線標籤 + 本地引擎數值）
- 行動版 CSS 重構（768px + 480px 斷點，底部彈出 Modal）

## v2.0.1 — 行動版 UI Redesign
- 底部 4 Tab 導航（儀表板 / 地球 / 聊天 / 個人）
- 卡片式儀表板（健康度 bar / PT / 等級 / 存活 + 7 個快捷按鈕）
- 全螢幕地球 + 浮動聊天按鈕
- 全螢幕聊天室（輸入框固定底部）
- 個人頁（設定/主題/語言/BGM/通知/背景/登出）

## v1.13.x — 系統優化
- 安全修正（secrets/CORS/helmet/IP）
- 效能優化（快取、索引）
- ESLint 設定

## v1.12.x — 新功能
- 離線收益系統
- 天賦系統（3 系 × 12 天賦）
- 區域對抗系統
- 多背景風格 (5 種)

## v1.11.x — 事件與目標
- 全域事件互動化（投票/選擇/連鎖）
- 每日任務
- 成就里程碑（18 項）
- 週結算 + 榮譽值

## v1.10.x — 經濟重塑
- 健康系統重設計
- 道具重平衡 + 新道具
- 節點升級 + 區域投資

## v1.9.x — 前端重構
- hooks 提取、modals 獨立、GameContext

## v1.8.x — 後端重構
- services/socket/routes/config 提取
