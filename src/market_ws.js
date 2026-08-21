// Market WebSocket DO: 每 5 秒波動股價 + 推送給所有連線玩家

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
      const prices = await this.state.storage.get('prices');
      server.send(JSON.stringify({ type: 'snapshot', prices: prices || {}, ts: Date.now() }));
      // 確保 alarm 啟動
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
      if (data.type === 'prices') await this.state.storage.put('prices', data.prices);
      return Response.json({ ok: true, clients: this.clients.size });
    }

    if (subPath === '/init' && request.method === 'POST') {
      // cron 每分鐘呼叫，確保 alarm 持續運作
      await this.ensureAlarm();
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  async alarm() {
    try {
      const db = this.env.DB;
      const companies = await db.prepare('SELECT id, share_price FROM companies').all();
      if (companies.results.length === 0) { await this.ensureAlarm(); return; }

      const ipoRes = await db.prepare("SELECT company_id, phase FROM ipo_state").all();
      const ipoPhase = {};
      for (const r of ipoRes.results) ipoPhase[r.company_id] = r.phase;

      const stmts = [];
      const prices = {};

      for (const c of companies.results) {
        if (ipoPhase[c.id] !== 'trading') { prices[c.id] = c.share_price; continue; }
        const price = c.share_price || 100;
        const drift = (Math.random() * 2 - 1) * 0.015;
        const newPrice = Math.max(1, Math.round(price * (1 + drift)));
        prices[c.id] = newPrice;
        if (newPrice !== price) {
          stmts.push(db.prepare('UPDATE companies SET share_price = ? WHERE id = ?').bind(newPrice, c.id));
        }
      }

      if (stmts.length > 0) {
        for (let i = 0; i < stmts.length; i += 50) {
          try { await db.batch(stmts.slice(i, i + 50)); } catch {}
        }
      }

      await this.state.storage.put('prices', prices);
      this.broadcast({ type: 'prices', prices });
    } catch (e) {
      console.error('MarketWS alarm error:', e.message);
    }

    // 無論成功失敗都重新排程，確保持續運作
    await this.ensureAlarm();
  }

  broadcast(data) {
    const payload = JSON.stringify(data);
    const dead = [];
    for (const ws of this.clients) {
      try { if (ws.readyState === WebSocket.OPEN) ws.send(payload); else dead.push(ws); } catch { dead.push(ws); }
    }
    for (const ws of dead) this.clients.delete(ws);
  }

  async ensureAlarm() {
    if (!(await this.state.storage.getAlarm())) {
      await this.state.storage.setAlarm(Date.now() + 5000);
    }
  }
}
