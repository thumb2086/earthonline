import { useState, useEffect } from 'react';

// 即時股價 hook: 從 API 輪詢股價
export default function useMarketStream(_unused, api) {
  const [prices, setPrices] = useState({});
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    let alive = true;
    const fetchPrices = () => {
      if (!api) return;
      api('/api/stock/index').then(d => {
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
  }, [api]);

  return { prices, connected };
}
