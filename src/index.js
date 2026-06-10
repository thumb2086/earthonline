export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
      return fetch('https://earthonline.onrender.com' + url.pathname + url.search, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
    }
    const response = await env.ASSETS.fetch(request);
    if (!response && url.pathname.startsWith('/assets/')) {
      return new Response('Not Found', { status: 404 });
    }
    return response;
  },
};
