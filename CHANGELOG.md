# Changelog

## v1.14.0 — 正式發布
- 安全修正：CORS 白名單、啟用 helmet CSP、移除 stdout IP 日誌、修復 terminalHandler 未定義變數
- 效能：MongoDB 索引補齊（homeRegion/accumulatedTime/weeklyScore）、leaderboard 快取 5s
- 組件拆分：LoginGateway/CountdownBanner/DonateBanner/FourPetalSpiral 抽出為獨立檔案
- App.jsx 瘦身 2757 → 2318 行
- 5 種背景風格切換（設定面板）：3D 地球/機房/星雲/雷達/賽博城市
- Discord OAuth rate limit（60s/10 requests）
- 離線補償防重複（5min cooldown）
- ESLint 設定檔
- 壓力測試腳本（`node scripts/stress-test.js`）

## v1.13.2 — 效能優化
- MongoDB indexes: homeRegion, accumulatedTime(-1), weeklyScore(-1), registerIp+createdAt
- Leaderboard cache 5s
- 修復 /global/stats 硬編碼 region

## v1.13.1 — 安全修正
- .env + crash.log 從 git 移除
- 輪換 JWT_SECRET 為強密碼
- CORS 白名單（ALLOWED_ORIGINS env）
- 啟用 helmet（含 CSP 設定）
- 移除 IP 日誌洩漏
- 修復 INVEST_MAX_LEVEL / INVEST_COSTS 未定義

## v1.12.5 — 多背景風格系統
- 背景 Router + 5 種風格（地球/機房/星雲/雷達/賽博城市）
- 設定面板切換、localStorage 保存

## v1.12.4 — 區域對抗系統
- regionState warStats（totalOnlineTime/avg/peak/events/PT）
- 每 tick 收集區域統計
- 結算區域排名獎勵（冠軍 +200 PT、個人前 10 +500 PT）
- 前端三欄即時對比面板

## v1.12.3 — 天賦系統（前端）
- 三欄式天賦樹面板
- 升級/重置（500 PT）

## v1.12.2 — 天賦系統（後端）
- 3 系 × 12 天賦 × 3 級
- 每 24h 1 天賦點（上限 20）
- Lv.10 解鎖

## v1.12.1 — 離線收益系統
- 離線 PT 收益：earnedMinutes × (health/100) × 6
- 每日上限 120min 等效
- 前端重連通知

## v1.11.4 — 週結算 + 榮譽值
- honor/weeklyScore/weeklyResetAt
- 每週自動結算
- Discord 身分組發放

## v1.11.3 — 成就里程碑
- 18 項成就（生存/PT/等級/事件/社交）
- 成就面板

## v1.11.2 — 每日任務
- 在線/聊天/道具/bonus 任務
- UTC 16:00 重置

## v1.11.1 — 全域事件互動化
- 事件投票機制
- 事件中選擇（避難/硬撐/協助/漠視）
- 事件連鎖（淘金潮→黑市）

## v1.10.3 — 經濟擴充
- 節點升級（Lv.1~10）
- 區域投資（冷卻/頻寬/防護罩）
- 排行榜賭注 /BET

## v1.10.2 — 道具重平衡
- 價格調整、新道具（網路加速器/備份節點）
- 死亡狀態限制

## v1.10.1 — 健康系統重設計
- 非線性 decay curve
- 離線恢復 +5%/h（上限 60%）
- 集體負載效應

## v1.9.x — 前端重構
- hooks（useSocket/useTimer/useGameState）
- modals 獨立（Shop/Backpack/Leaderboard/Social/AccountInfo）
- GameContext

## v1.8.x — 後端重構
- config/jobs/services/routes/socket/state 分離
- server.js 1863→533 行
