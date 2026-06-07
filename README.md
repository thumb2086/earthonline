地球在線 (Earth Online)
歡迎來到 地球在線 (Earth Online) ── 這是一個將網頁端數據、專屬桌面端與 Discord 社群體系完美聯動的全域掛機與虛擬生存社會實驗。

本專案採用極簡的賽博朋克（Cyberpunk）風格網頁架構，讓來自全球的玩家化身為共享網絡中的一個個「連線節點」。你保持在線的時間越長，為本伺服器貢獻的「生存時長」與榮譽點數（PT）就越多！數據不說謊，名次決定一切。

核心功能與特色
全實時聯動排行榜 (Global Live Leaderboard)：即時同步全服前 10 名的掛機大佬，依據累積生存時間與榮譽點數（PT）精準排序。

Discord OAuth 深度綁定：整合 Discord 第三方登入，即時同步玩家的頭像、暱稱，並每秒實時調用 API 讀取玩家在社群中的真實最高等級身分組（如 @【勉強夠付房租的平民】）。

外掛級永久登入 (Persistent Login)：前端快取導入 localStorage 機制，一次登入、永久記住節點，實現無縫掛機。

低延遲即時世界聊天室：基於 Socket.io 技術，讓全球所有在線節點達成零延遲的跨時區實時交流。

全域事件動態倍率 (Global Events)：後台隨機觸發「量子爆發 (3.0x)」、「數據淘金潮 (5.0x)」、「太陽風暴」或「系統維護」等全域突發事件，考驗島民的連線耐力。

專屬 Electron 桌面客戶端：支援全自動 Discord RPC 狀態寫入，打破瀏覽器背景休眠限制，並配有專屬「橘色地球」工作列圖示。

技術棧 (Tech Stack)
前端 (Frontend)：React + Vite + Vanilla CSS (賽博朋克視覺、極致行動端響應式排版)

桌面端 (Desktop Client)：Electron (整合 Discord Rich Presence / RPC)

後端 (Backend)：Node.js + Express + Socket.io + NodeMailer (Gmail 驗證信自動發送)

資料庫 (Database)：MongoDB + Mongoose (支援高效批次 updateMany 數據遷移)

本地環境部署 (Running Locally)
前置準備
確保本地已安裝 Node.js (推薦 LTS 版本) 以及 MongoDB。

至 Discord Developer Portal 創建應用程式，並取得 OAuth2 Token 與應用程式憑證。

1. 配置環境變數 (.env)
請分別在 /backend 以及 /client 資料夾下建立 .env 檔案並填入對應的密鑰：

/backend/.env：包含 MONGODB_URI、DISCORD_CLIENT_ID、DISCORD_CLIENT_SECRET、GMAIL_NODEMAILER_PASS 等。

/client/.env：包含 VITE_API_URL 與 VITE_DISCORD_REDIRECT_URI。
