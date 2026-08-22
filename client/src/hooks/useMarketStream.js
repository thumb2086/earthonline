import { useState, useEffect, useCallback } from 'react';

// 即時股價 hook: 從 API 輪詢股價 (不依賴 WS)
export default function useMarketStream(_unused) {
  const [prices, setPrices] = useState({});
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    let alive = true;
    const fetchPrices = () => {
      fetch('/api/stock/index').then(r => r.json()).then(d => {
        if (!alive) return;
        if (d && d.stocks) {
          const p = {};
          for (const s of d.stocks) p[s.id] = s.price;
          setPrices(p);
        }
      }).catch(() => {});
    };
    fetchPrices();
    const id = setInterval(fetchPrices, 2000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  return { prices, connected };
}
