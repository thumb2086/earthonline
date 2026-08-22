// Market WebSocket DO: 純 WS 廣播中繼站
// 價格由 cron 寫 DB，DO 只負責推送到 WebSocket client

export class MarketWS {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.clients = new Set();
  }

  async fetch(request) {
    const url = new URL(request.url);
    const subPath = url.pathname.replace('/ws/market', '') || '/';

    if (subPath === '/subscribe') {
      const pair = request.headers.get('Upgrade');
      if (pair !== 'websocket') return new Response('Expected Upgrade: websocket', { status: 426 });
      const { 0: client, 1: server } = Object.values(new WebSocketPair());
      this.clients.add(server);
      server.accept();
      server.addEventListener('message', (e) => {
        try { const m = JSON.parse(e.data); if (m.type === 'ping') server.send(JSON.stringify({ type: 'pong', ts: Date.now() })); } catch {}
      });
      server.addEventListener('close', () => this.clients.delete(server));
      server.addEventListener('error', () => this.clients.delete(server));
      return new Response(null, { status: 101, webSocket: client });
    }

    if (subPath === '/update' && request.method === 'POST') {
      const data = await request.json();
      this.broadcast(data);
      return new Response(JSON.stringify({ ok: true, clients: this.clients.size }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('Not found', { status: 404 });
  }

  async alarm() {}

  broadcast(data) {
    const payload = JSON.stringify(data);
    const dead = [];
    for (const ws of this.clients) {
      try { if (ws.readyState === WebSocket.OPEN) ws.send(payload); else dead.push(ws); } catch { dead.push(ws); }
    }
    for (const ws of dead) this.clients.delete(ws);
  }
}
