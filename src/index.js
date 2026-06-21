export default {
  async fetch(request, env) {
    let path = '';
    try {
      const url = new URL(request.url);
      path = url.pathname;

      if (path.startsWith('/api/') || path.startsWith('/socket.io/')) {
        const BACKEND_URL = env.TUNNEL_URL || 'https://earthonline-7odc.onrender.com';
        const targetUrl = BACKEND_URL + path + url.search;
        const proxyHeaders = new Headers(request.headers);
        proxyHeaders.set('Host', new URL(BACKEND_URL).host);
        const proxyResponse = await fetch(targetUrl, {
          method: request.method,
          headers: proxyHeaders,
          body: request.method !== 'GET' ? request.body : null,
        });
        const response = new Response(proxyResponse.body, proxyResponse);
        response.headers.set('Access-Control-Allow-Origin', '*');
        return response;
      }

      const response = await env.ASSETS.fetch(request);
      if (response.status === 404) {
        return env.ASSETS.fetch(new Request(new URL('/index.html', request.url)));
      }
      return response;
    } catch (err) {
      if (path.startsWith('/api/') || path.startsWith('/socket.io/')) {
        return new Response(JSON.stringify({ error: 'Backend unavailable' }), {
          status: 502, headers: { 'content-type': 'application/json' },
        });
      }
      return new Response('Internal error', { status: 500 });
    }
  },
};
