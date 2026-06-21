export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    return new Response(`Worker OK\npath: ${url.pathname}\nmethod: ${request.method}`, {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    });
  },
};
