export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

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

      return;
    } catch (err) {
      if (path?.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: 'Backend unavailable' }), {
          status: 502, headers: { 'content-type': 'application/json' },
        });
      }
    }
  },
};
