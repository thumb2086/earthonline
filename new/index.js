require('dotenv').config(); // 1. 讀取 .env 檔案
const express = require('express');
const cloudflared = require('cloudflared');

const app = express();
// 2. 優先使用翼龍分配的 Port，沒有的話預設 3000
const PORT = process.env.SERVER_PORT || 3000; 

// 網頁的首頁內容
app.get('/', (req, res) => {
    res.send(`
        <h1>🎉 翼龍網頁伺服器啟動成功！</h1>
        <p>這是一個透過 Cloudflare Tunnel 穿透出來的網頁。</p>
        <p>現在任何人都可以透過你的自訂網域連進來了。</p>
    `);
});

// 啟動網頁伺服器
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`[翼龍內部] 網頁伺服器已在本地 Port ${PORT} 啟動。`);

    const token = process.env.CF_TUNNEL_TOKEN;
    if (!token || token.includes('這裡貼上')) {
        console.error("❌ 錯誤：請先修改 .env 檔案並填入正確的 CF_TUNNEL_TOKEN！");
        return;
    }

    try {
        console.log("🚀 正在啟動 Cloudflare Tunnel 穿透隧道...");
        
        // 3. 帶入金鑰，讓 Cloudflared 在背景跑隧道
        cloudflared.tunnel({ token: token });
        
        console.log("==================================================");
        console.log("✅ 穿透成功！請使用你在 Cloudflare 後台綁定的網域訪問網頁。");
        console.log("==================================================");
    } catch (error) {
        console.error("❌ 隧道建立失敗:", error);
    }
});