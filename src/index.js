// ─── Maintenance Mode ────────────────────────────────────────────
// Set to true during upgrades to show maintenance page to all visitors
const MAINTENANCE_MODE = true;

const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>系統維護中 | 地球在線 EarthOnline</title>
    <style>
        :root { --primary: #2c3e50; --accent: #3498db; --bg: #f4f7f9; }
        body { font-family: 'Segoe UI',"Microsoft JhengHei",sans-serif; background: var(--bg); margin: 0; display: flex; align-items: center; justify-content: center; height: 100vh; color: var(--primary); text-align: center; }
        .maintenance-card { background: white; padding: 50px 30px; border-radius: 25px; box-shadow: 0 15px 35px rgba(0,0,0,0.1); max-width: 450px; width: 90%; }
        .icon-box { font-size: 60px; margin-bottom: 20px; display: inline-block; animation: rotate 4s linear infinite; }
        @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        h1 { margin: 10px 0; font-size: 24px; font-weight: 900; }
        p { color: #7f8c8d; line-height: 1.6; margin-bottom: 30px; }
        .progress-container { background: #eee; border-radius: 10px; height: 8px; width: 100%; margin-bottom: 10px; overflow: hidden; }
        .progress-bar { background: var(--accent); height: 100%; width: 0%; border-radius: 10px; animation: pulse 2s ease-in-out infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
        .status-text { font-size: 12px; font-weight: bold; color: var(--accent); text-transform: uppercase; }
        .footer { margin-top: 30px; font-size: 13px; color: #bdc3c7; }
    </style>
</head>
<body><div class="maintenance-card">
    <div class="icon-box">⚙️</div>
    <div class="status-text">System Maintenance</div>
    <h1>系統維修升級中</h1>
    <p>為了提供更好的地球在線 EarthOnline服務，<br>正在進行後端邏輯優化。<br>我們很快就會恢復連線，請稍候。</p>
    <div class="progress-container"><div class="progress-bar"></div></div>
    <div style="font-size:12px;color:#95a5a6;">優化進度：不知</div>
    <div class="footer">&copy; 2026 Earthquake Monitor<br>由 地球在線 EarthOnline 管理團隊 進行維護</div>
</div></body></html>`;

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // Proxy API and socket requests to Render (always, even in maintenance)
      if (path.startsWith('/api/') || path.startsWith('/socket.io/')) {
        const targetUrl = 'https://earthonline-bay7.onrender.com' + path + url.search;
        const proxyResponse = await fetch(targetUrl, {
          method: request.method,
          headers: request.headers,
          body: request.body,
        });
        const corsHeaders = {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };
        const response = new Response(proxyResponse.body, proxyResponse);
        for (const [key, value] of Object.entries(corsHeaders)) {
          response.headers.set(key, value);
        }
        return response;
      }

      // Handle preflight OPTIONS request
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      }

      // Manifest.json: Cloudflare ASSETS blocks .json, serve inline
      if (path === '/manifest.json') {
        const manifest = { name: "Earth Online", short_name: "EarthOnline", description: "全球節點觀測與管理中心", start_url: "/", display: "standalone", background_color: "#0a0e17", theme_color: "#00ff41", lang: "en", scope: "/", icons: [{ src: "/favicon.ico", sizes: "64x64", type: "image/x-icon" }] };
        return new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
      }

      // Maintenance mode: show maintenance page for non-API requests
      if (MAINTENANCE_MODE) {
        return new Response(MAINTENANCE_HTML, {
          headers: { 'content-type': 'text/html;charset=UTF-8' },
        });
      }

      // Serve static assets — SPA fallback: serve index.html for unknown paths
      const response = await env.ASSETS.fetch(request);
      if (response.status === 404) {
        return env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
      }
      return response;
    } catch (err) {
      // Global fallback: serve index.html on any Worker error
      return env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
    }
  },
};
