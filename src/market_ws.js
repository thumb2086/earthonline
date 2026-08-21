// Market WebSocket DO: 即時推送股價/交易/通知給所有連線玩家
// 每次 priceWave 或交易發生時, broadcast 給所有連線客戶端

export class MarketWS {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.clients = new Set();
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === '/subscribe') {
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

      // 發送歡迎訊息 + 當前股價快照
      const prices = await this.state.storage.get('prices');
      server.send(JSON.stringify({ type: 'snapshot', prices: prices || {}, ts: Date.now() }));
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === '/prices' && request.method === 'GET') {
      const prices = await this.state.storage.get('prices');
      return Response.json({ prices: prices || {}, ts: Date.now() });
    }

    if (url.pathname === '/update' && request.method === 'POST') {
      // 從 cron 或 API 呼叫, 推送更新
      const data = await request.json();
      const payload = JSON.stringify(data);

      // 廣播給所有連線玩家
      const dead = [];
      for (const ws of this.clients) {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(payload);
          } else {
            dead.push(ws);
          }
        } catch {
          dead.push(ws);
        }
      }
      for (const ws of dead) this.clients.delete(ws);

      // 快取最新股價
      if (data.type === 'prices') {
        await this.state.storage.put('prices', data.prices);
      }

      return Response.json({ ok: true, clients: this.clients.size });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  }
}
