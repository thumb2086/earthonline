const CONFIG = {
  ICE_SERVERS: [{ urls: 'stun:stun.l.google.com:19302' }],
  SIGNAL_URL: 'https://earthonline-7odc.onrender.com/api/signal',
};

export default class P2PNetwork {
  constructor({ username, onMessage, onPeerStatus }) {
    this.username = username;
    this.onMessage = onMessage;
    this.onPeerStatus = onPeerStatus;
    this.peers = new Map();
    this.localStream = null;
  }

  async createOffer(targetId) {
    const pc = new RTCPeerConnection({ iceServers: CONFIG.ICE_SERVERS });
    this._setupPC(pc, targetId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(targetId, offer) {
    const pc = new RTCPeerConnection({ iceServers: CONFIG.ICE_SERVERS });
    this._setupPC(pc, targetId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(targetId, answer) {
    const pc = this.peers.get(targetId);
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  async handleIceCandidate(targetId, candidate) {
    const pc = this.peers.get(targetId);
    if (!pc) return;
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  _setupPC(pc, peerId) {
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        this._sendSignal({ type: 'candidate', target: peerId, candidate: e.candidate });
      }
    };
    pc.ondatachannel = (e) => this._setupChannel(e.channel, peerId);
    pc.oniceconnectionstatechange = () => {
      this.onPeerStatus?.(peerId, pc.iceConnectionState);
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
        this.peers.delete(peerId);
        pc.close();
      }
    };
    this.peers.set(peerId, pc);
    const channel = pc.createDataChannel('chat');
    this._setupChannel(channel, peerId);
  }

  _setupChannel(channel, peerId) {
    channel.onopen = () => this.onPeerStatus?.(peerId, 'connected');
    channel.onclose = () => this.onPeerStatus?.(peerId, 'disconnected');
    channel.onmessage = (e) => {
      try { this.onMessage?.(JSON.parse(e.data), peerId); }
      catch { this.onMessage?.(e.data, peerId); }
    };
  }

  send(targetId, data) {
    const pc = this.peers.get(targetId);
    if (!pc) return false;
    const channel = pc.dataChannels?.[0];
    if (channel?.readyState === 'open') {
      channel.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  broadcast(data) {
    for (const [id] of this.peers) this.send(id, data);
  }

  disconnect(targetId) {
    const pc = this.peers.get(targetId);
    if (pc) { pc.close(); this.peers.delete(targetId); }
  }

  destroy() {
    for (const [id] of this.peers) this.disconnect(id);
  }

  async _sendSignal(data) {
    try {
      await fetch(CONFIG.SIGNAL_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, from: this.username }),
      });
    } catch (e) { console.error('[P2P] Signal error:', e); }
  }
}
