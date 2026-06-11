export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Proxy API and socket requests to Render
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
      return fetch('https://earthonline.onrender.com' + url.pathname + url.search, {
        method: request.method,
        headers: request.headers,
        body: request.body,
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
