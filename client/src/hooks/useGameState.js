import { useState, useEffect } from 'react';

export default function useGameState(socket, API_URL, BASE_URL) {
  const [nodes, setNodes] = useState([]);
  const [myNode, setMyNode] = useState(null);
  const [myRole, setMyRole] = useState('user');
  const [globalStats, setGlobalStats] = useState({ activeUsers: 0, totalPopulation: 0, globalProduction: 0, socialCompression: '1.000' });
  const [hubStats, setHubStats] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);

  // Fetch hub stats periodically (with race condition protection)
  useEffect(() => {
    let reqId = 0;
    const fetchHub = async () => {
      const myId = ++reqId;
      try {
        const res = await fetch(`${BASE_URL}/api/global/stats`);
        if (res.ok && myId === reqId) setHubStats(await res.json());
      } catch (e) { console.error('[HUB]', e); }
    };
    fetchHub();
    const inv = setInterval(fetchHub, 5000);
    return () => clearInterval(inv);
  }, [BASE_URL]);

  // Fetch leaderboard periodically (with race condition protection)
  useEffect(() => {
    let reqId = 0;
    const fetchLB = async () => {
      const myId = ++reqId;
      try {
        const res = await fetch(`${API_URL}/leaderboard`, { cache: 'no-store' });
        if (res.ok && myId === reqId) setLeaderboard(await res.json());
      } catch (e) { console.error('[LB]', e); }
    };
    fetchLB();
    const intv = setInterval(fetchLB, 5000);
    return () => clearInterval(intv);
  }, [API_URL]);

  // Socket event listeners for game state
  useEffect(() => {
    if (!socket) return;
    const s = socket;

    s.on('init_data', (data) => {
      setMyNode(data);
      setMyRole(data.role || 'user');
      if (data.currentGlobalEvent) setCurrentEvent(data.currentGlobalEvent);
      if (data.offlineEarnings && data.offlineEarnings.pts > 0) {
        setTimeout(() => {
          alert(`離線收益：${data.offlineEarnings.minutes} 分鐘，獲得 ${data.offlineEarnings.pts} PT`);
        }, 500);
      }
    });

    s.on('user_state_update', (data) => {
      const normalized = { ...data };
      if ('pts' in normalized) {
        normalized.accumulatedBonusPoints = normalized.pts;
        delete normalized.pts;
      }
      setMyNode(prev => prev ? { ...prev, ...normalized } : normalized);
    });

    s.on('global_stats', (stats) => setGlobalStats(stats));
    s.on('global_event_started', (eventData) => setCurrentEvent(eventData));
    s.on('global_event_ended', () => setCurrentEvent(null));

    s.on('all_nodes', (data) => setNodes(data));
    s.on('node_connected', (node) => {
      setNodes(prev => prev.find(n => n.id === node.id) ? prev : [...prev, node]);
    });
    s.on('node_disconnected', ({ id }) => {
      setNodes(prev => prev.filter(n => n.id !== id));
    });

    return () => {
      s.off('init_data');
      s.off('user_state_update');
      s.off('global_stats');
      s.off('global_event_started');
      s.off('global_event_ended');
      s.off('all_nodes');
      s.off('node_connected');
      s.off('node_disconnected');
    };
  }, [socket]);

  return { nodes, myNode, setMyNode, myRole, globalStats, hubStats, leaderboard, currentEvent };
}
