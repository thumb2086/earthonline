# Earth Online 🌍

全球節點觀測與管理中心 — 一款基於《三體》概念與賽博龐克美學的實驗性全球網路觀測掛機遊戲。

## 快速開始

```bash
# 後端
cd backend && npm install && node server.js

# 前端開發
cd client && npm install && npm run dev
```

## 架構

- **後端**: Express 5 + Socket.io + MongoDB
- **前端**: React 19 + Vite 8 + vanilla CSS
- **部署**: Cloudflare Pages (前端) + Render (後端)
- **Discord**: discord.js bot (slash commands, role assignment, chat bridge)

## 功能

- 🌐 即時全球節點地圖
- ⏱️ 放置掛機生存系統
- 🏪 黑市商城（道具購買/使用）
- 🎲 隨身碟抽獎系統
- 🌍 3D 地球視覺化
- 🖥️ 5 種背景風格切換（地球/機房/星雲/雷達/賽博城市）
- 📊 即時排行榜
- 🤝 好友系統 + 私訊
- 🎯 每日任務 + 成就系統
- 🏆 週結算 + 榮譽值
- ⚡ 天賦系統（3 系 × 12 天賦）
- 🌍 區域對抗系統
- 🗳️ 全域事件投票 + 互動選擇
- 🔗 Discord 整合（登入、聊天橋接、身分組）
- 📱 離線收益補償

## 版本歷史

### v1.14.0 — 正式發布
- 完整安全修正（CORS/helmet/secrets）
- MongoDB 索引優化
- App.jsx 拆分為獨立組件（-439 行）
- 5 種背景風格系統
- 壓力測試腳本

### v1.13.x — 系統優化
- 安全修正（secrets/CORS/helmet/IP）
- 效能優化（快取、索引）
- ESLint 設定

### v1.12.x — 新功能
- 離線收益系統
- 天賦系統（3 系 × 12 天賦）
- 區域對抗系統
- 多背景風格

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
