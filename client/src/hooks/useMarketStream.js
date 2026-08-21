import { useState, useEffect, useRef, useCallback } from 'react';

// 即時股價 WebSocket hook
// 連線到 MarketWS DO, 接收即時股價推送
export default function useMarketStream(WSS_URL) {
  const [prices, setPrices] = useState({});
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const retryRef = useRef(0);
  const timerRef = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;
    if (!WSS_URL) return;

    try {
      const ws = new WebSocket(WSS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        retryRef.current = 0;
        // 心跳
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'snapshot' || data.type === 'prices') {
            if (data.prices) setPrices(data.prices);
          }
        } catch {}
      };

      ws.onclose = () => {
        setConnected(false);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        // 指數退避重連
        const delay = Math.min(1000 * Math.pow(2, retryRef.current), 30000);
        retryRef.current++;
        setTimeout(connect, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {}
  }, [WSS_URL]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) { try { wsRef.current.close(); } catch {} }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [connect]);

  return { prices, connected };
}
