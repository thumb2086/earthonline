# Goal
- GoalID: c4d5e6f7-8a9b-0c1d-2e3f-4a5b6c7d8e9f
- Status: pursuing
- Created: 2026-09-14T02:00:00+08:00
- Updated: 2026-09-14T02:00:00+08:00
## Objective
1. 確認完整移植：比對所有 Workers 原始碼功能 vs Node.js 版，列出缺漏並補齊
2. 效能優化：DB 查詢/索引、scheduler 精度、前端載入、快取策略
3. 推送 dev 分支：git add + commit + push 到 GitHub
## Stopping condition
1. test_all.sh 34/34 通過
2. 功能比對表顯示無關鍵缺漏（WebSocket/Discord/Scheduler/API/DB 全覆蓋）
3. git branch dev 存在且最新 commit 包含所有 server/ 檔案
4. pm2 logs 無 error
## Must read first
- src/ 目錄所有原始碼（比對用）
- server/ 目錄所有已遷移檔案
- test_all.sh
- wrangler.jsonc（Workers 設定）
## Verification
- bash test_all.sh 34/34
- git log --oneline -5（dev 分支）
- pm2 logs earthonline --err --lines 5
## Progress log
- [2026-09-14T02:00+08:00] checkpoint：建立 goal。前三個 goal 已完成（投資修復 + 伺服器遷移 + API/WS/Discord 修復）；還剩：功能比對、效能優化、git push。
