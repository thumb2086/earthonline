// Market WebSocket DO: 即時推送股價給所有連線玩家
// DO alarm 每 5 秒從 DB 拉最新股價 + 廣播

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

      server.addEventListener('message', (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'ping') server.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
        } catch {}
      });

      server.addEventListener('close', () => this.clients.delete(server));
      server.addEventListener('error', () => this.clients.delete(server));

      const prices = await this.state.storage.get('prices');
      server.send(JSON.stringify({ type: 'snapshot', prices: prices || {}, ts: Date.now() }));

      // 啟動 alarm (只有第一個 client 連入時)
      await this.ensureAlarm();

      return new Response(null, { status: 101, webSocket: client });
    }

    if (subPath === '/prices' && request.method === 'GET') {
      const prices = await this.state.storage.get('prices');
      return Response.json({ prices: prices || {}, ts: Date.now() });
    }

    if (subPath === '/update' && request.method === 'POST') {
      const data = await request.json();
      this.broadcast(data);
      if (data.type === 'prices') {
        await this.state.storage.put('prices', data.prices);
      }
      return Response.json({ ok: true, clients: this.clients.size });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  async alarm() {
    // 每 5 秒從 DB 拉最新股價
    if (this.clients.size === 0) return;

    try {
      const res = await this.env.DB.prepare('SELECT id, share_price FROM companies').all();
      const prices = {};
      for (const r of res.results) prices[r.id] = r.share_price;
      await this.state.storage.put('prices', prices);
      this.broadcast({ type: 'prices', prices });
    } catch {}

    await this.ensureAlarm();
  }

  broadcast(data) {
    const payload = JSON.stringify(data);
    const dead = [];
    for (const ws of this.clients) {
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send(payload);
        else dead.push(ws);
      } catch { dead.push(ws); }
    }
    for (const ws of dead) this.clients.delete(ws);
  }

  async ensureAlarm() {
    const currentAlarm = await this.state.storage.getAlarm();
    if (!currentAlarm) {
      await this.state.storage.setAlarm(Date.now() + 5000);
    }
  }
}
