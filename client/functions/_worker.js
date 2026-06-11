export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Proxy API and socket requests to Render
    if (path.startsWith('/api/') || path.startsWith('/socket.io/')) {
      const targetUrl = 'https://earthonline.onrender.com' + path + url.search;
      const proxyResponse = await fetch(targetUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
      // Add CORS headers to proxied responses
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

    // Serve static assets — SPA fallback: serve index.html for unknown paths
    const response = await env.ASSETS.fetch(request);
    if (response.status === 404) {
      return env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
    }
    return response;
  },
};
