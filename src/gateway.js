// Discord Gateway 連線 (Durable Object): 讓 bot 顯示在線
// 由 cron 每分鐘喚醒, 維持 WebSocket 心跳

const GATEWAY_URL = 'wss://gateway.discord.gg/?v=10&encoding=json';

export class DiscordGateway {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.ws = null;
    this.heartbeatTimer = null;
    this.lastPing = 0;
    this.sessionId = null;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === '/status') {
      const st = await this.state.storage.get('status');
      return new Response(JSON.stringify({
        status: st || 'not_connected',
        lastPing: this.lastPing,
        uptime: Date.now() - (await this.state.storage.get('connected_at') || Date.now()),
      }), { headers: { 'content-type': 'application/json' } });
    }

    // 觸發連線
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      await this.connect();
    }
    return new Response(JSON.stringify({ status: 'connecting' }), { headers: { 'content-type': 'application/json' } });
  }

  async connect() {
    try {
      if (this.ws) {
        try { this.ws.close(); } catch (e) {}
        this.ws = null;
      }
      if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }

      const ws = new WebSocket(GATEWAY_URL);
      this.ws = ws;
      ws.addEventListener('open', () => {
        this.state.storage.put('status', 'connected');
        this.state.storage.put('connected_at', Date.now());
      });
      ws.addEventListener('message', (event) => {
        this.handleMessage(event.data);
      });
      ws.addEventListener('close', () => {
        this.state.storage.put('status', 'disconnected');
        if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
        this.ws = null;
        // 5 秒後重連
        setTimeout(() => this.connect().catch(() => {}), 5000);
      });
      ws.addEventListener('error', () => {
        this.state.storage.put('status', 'error');
      });
    } catch (e) {
      this.state.storage.put('status', 'error: ' + e.message);
    }
  }

  handleMessage(data) {
    try {
      const msg = JSON.parse(data);
      switch (msg.op) {
        case 10: { // Hello
          const interval = msg.d.heartbeat_interval || 41250;
          this.lastPing = Date.now();
          this.state.storage.put('status', 'identified');
          // 心跳
          if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
          this.heartbeatTimer = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
              this.ws.send(JSON.stringify({ op: 1, d: Date.now() }));
            }
          }, interval);
          // Identify
          this.ws.send(JSON.stringify({
            op: 2,
            d: {
              token: this.env.DISCORD_BOT_TOKEN,
              intents: 0, // 只需要在線狀態
              properties: {
                $os: 'cloudflare',
                $browser: 'earthonline',
                $device: 'earthonline',
              },
              presence: {
                status: 'online',
                afk: false,
                activities: [{
                  name: '地球在線 EarthOnline',
                  type: 0,
                }],
              },
            },
          }));
          break;
        }
        case 0: { // Dispatch
          if (msg.t === 'READY') {
            this.sessionId = msg.d.session_id;
            this.state.storage.put('status', 'online');
            this.state.storage.put('ready_at', Date.now());
          }
          break;
        }
        case 11: // Heartbeat ACK
          this.lastPing = Date.now();
          break;
        case 1: // Heartbeat request from server
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ op: 1, d: Date.now() }));
          }
          break;
        case 7: // Reconnect
          this.connect().catch(() => {});
          break;
      }
    } catch (e) {}
  }
}
