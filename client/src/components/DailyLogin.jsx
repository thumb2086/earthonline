import { useState, useEffect } from 'react';
import { useToast } from './Toast.jsx';

const REWARDS = [
  { day: 1, label: '$500', icon: '💵' },
  { day: 2, label: '$1,000', icon: '💵' },
  { day: 3, label: '$1,500', icon: '💰' },
  { day: 4, label: '$2,000', icon: '💰' },
  { day: 5, label: '$3,000', icon: '💎' },
  { day: 6, label: '$5,000', icon: '💎' },
  { day: 7, label: '$10,000', icon: '🎁' },
];

export default function DailyLogin({ api }) {
  const { toast } = useToast();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => api('/api/daily-login/status').then(setStatus);
  useEffect(() => { load(); }, []);

  const claim = async () => {
    setLoading(true);
    const r = await api('/api/daily-login/claim', {});
    setLoading(false);
    if (r.error) { toast(r.error, 'error'); return; }
    toast(r.messages?.[0] || '領取成功', 'success');
    load();
  };

  if (!status) return null;

  const nextDay = status.streak % 7;

  return (
    <div className="card mb-12" style={{ borderLeft: '3px solid var(--accent)' }}>
      <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
        <div className="card-title">📅 每日登入</div>
        {status.streak > 0 && <span className="text-dim text-sm">連續 {status.streak} 天</span>}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {REWARDS.map((r, i) => {
          const isActive = i === nextDay && !status.todayClaimed;
          const isClaimed = i < nextDay;
          return (
            <div key={r.day} style={{
              flex: '1 1 0', minWidth: 80, padding: '8px 4px', borderRadius: 8, textAlign: 'center',
              background: isActive ? 'rgba(0,255,65,0.1)' : isClaimed ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
              border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
              opacity: isClaimed && !isActive ? 0.5 : 1,
            }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>D{r.day}</div>
              <div style={{ fontSize: 18 }}>{r.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 600, marginTop: 2 }}>{r.label}</div>
              {isClaimed && !isActive && <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 2 }}>✓</div>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center' }}>
        {status.todayClaimed ? (
          <span className="text-dim text-sm">明天再來領取</span>
        ) : (
          <button className="btn btn-primary" onClick={claim} disabled={loading}>
            {loading ? '處理中...' : '🎁 領取今日獎勵'}
          </button>
        )}
      </div>
    </div>
  );
}
