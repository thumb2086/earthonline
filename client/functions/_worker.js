export default {
  async fetch(request, env) {
    return new Response(JSON.stringify({
      running: true,
      path: new URL(request.url).pathname,
      env: Object.keys(env),
      ts: Date.now(),
    }), {
      headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
    });
  },
};
