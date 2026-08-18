import { useState, useEffect } from 'react';

function formatRemaining(ms) {
  if (ms <= 0) return '已結束';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h} 小時 ${m} 分 ${s} 秒`;
}

export default function LaunchBanner({ api }) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    api('/api/launch/status').then(setInfo).catch(() => {});
    const id = setInterval(() => {
      api('/api/launch/status').then(setInfo).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, []);

  if (!info || !info.active) return null;

  return (
    <div className="card mb-12" style={{
      borderLeft: '3px solid #f59e0b',
      background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(245,158,11,0.02))',
    }}>
      <div className="flex justify-between items-center">
        <div>
          <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: 14 }}>🚀 開服慶典進行中！</div>
          <div className="text-dim text-sm" style={{ marginTop: 4 }}>
            {info.doubleActive && <span style={{ color: 'var(--accent)' }}>💰 收入 x2 加成啟動中</span>}
            <span style={{ marginLeft: 8 }}>剩餘 {formatRemaining(info.remainingMs)}</span>
          </div>
        </div>
        <div style={{ fontSize: 24 }}>🎉</div>
      </div>
    </div>
  );
}
