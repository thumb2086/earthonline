export default {
  async fetch(request, env) {
    let path = '';
    try {
      const url = new URL(request.url);
      path = url.pathname;

      const BACKEND_URL = env.TUNNEL_URL || 'https://earthonline-7odc.onrender.com';

      if (path.startsWith('/api/') || path.startsWith('/socket.io/')) {
        const targetUrl = BACKEND_URL + path + url.search;
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

      if (request.method === 'OPTIONS') {
        return new Response(null, {
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          },
        });
      }

      if (path === '/manifest.json' || path === '/manifest.pwa') {
        const manifest = { name: "Earth Online", short_name: "EarthOnline", description: "全球節點觀測與管理中心", start_url: "/", display: "standalone", background_color: "#0a0e17", theme_color: "#00ff41", lang: "en", scope: "/", icons: [{ src: "/favicon.ico", sizes: "64x64", type: "image/x-icon" }] };
        return new Response(JSON.stringify(manifest), { headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
      }

      const MAINTENANCE = false;
      if (MAINTENANCE) {
        return new Response('<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>系統維護中 | 地球在線</title><style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f4f7f9;text-align:center}.card{background:white;padding:50px 30px;border-radius:25px;box-shadow:0 15px 35px rgba(0,0,0,0.1);max-width:450px;width:90%}.icon{font-size:60px;animation:spin 4s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}h1{font-size:24px}p{color:#7f8c8d}.bar{background:#eee;border-radius:10px;height:8px;overflow:hidden;margin:20px 0}.fill{background:#3498db;height:100%;width:0%;animation:pulse 2s infinite}@keyframes pulse{50%{opacity:0.6}}</style></head><body><div class="card"><div class="icon">⚙️</div><h1>系統維修升級中</h1><p>正在進行後端邏輯優化，很快就會恢復連線。</p><div class="bar"><div class="fill"></div></div></div></body></html>', { headers: { 'content-type': 'text/html;charset=UTF-8' } });
      }

      const response = await env.ASSETS.fetch(request);
      if (response.status === 404) {
        return env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
      }
      return response;
    } catch (err) {
      if (path?.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: 'Backend unavailable' }), {
          status: 502, headers: { 'content-type': 'application/json' },
        });
      }
      return env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
    }
  },
};
