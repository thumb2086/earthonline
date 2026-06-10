export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle email sending directly (no proxy to Render)
    if (url.pathname === '/email/send' && request.method === 'POST') {
      try {
        const { to, subject, html } = await request.json();
        if (!to || !subject || !html) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
        }
        await env.SEND_EMAIL.send({
          from: 'noreply@earthonline.qzz.io',
          to,
          subject,
          html,
        });
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
      }
    }

    // Proxy API and socket requests to Render
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
      return fetch('https://earthonline.onrender.com' + url.pathname + url.search, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
    }

    // Serve static assets
    const response = await env.ASSETS.fetch(request);
    if (!response && url.pathname.startsWith('/assets/')) {
      return new Response('Not Found', { status: 404 });
    }
    return response;
  },
};
