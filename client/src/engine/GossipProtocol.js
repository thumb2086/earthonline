const SEEN = new Set();
const TTL = 30;

export default class GossipProtocol {
  constructor(onMessage) {
    this.onMessage = onMessage;
    this.peers = new Map();
  }

  addPeer(id, sendFn) {
    this.peers.set(id, sendFn);
  }

  removePeer(id) {
    this.peers.delete(id);
  }

  broadcast(type, payload, ttl = TTL) {
    const msgId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const msg = { id: msgId, type, payload, ttl, sender: this.peers.size > 0 ? 'local' : 'unknown' };
    SEEN.add(msgId);
    for (const [, send] of this.peers) {
      try { send(msg); } catch (e) { /* peer gone */ }
    }
  }

  receive(msg) {
    if (!msg || !msg.id || SEEN.has(msg.id)) return;
    SEEN.add(msg.id);
    if (SEEN.size > 1000) SEEN.clear();
    if (msg.ttl > 1) {
      msg.ttl--;
      for (const [id, send] of this.peers) {
        if (id !== msg.sender) {
          try { send(msg); } catch (e) { this.removePeer(id); }
        }
      }
    }
    this.onMessage?.(msg);
  }
}
