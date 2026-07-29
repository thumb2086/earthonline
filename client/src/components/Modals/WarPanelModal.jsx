import { useLanguage } from '../../LanguageContext';

export default function WarPanelModal({ data, onClose, region }) {
  const { t } = useLanguage();
  if (!data) return null;
  const regions = Object.entries(data).sort(([, a], [, b]) => b.totalOnlineTime - a.totalOnlineTime);
  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', maxWidth: '700px', width: '95%' }}>
        <h2 style={{ margin: '0 0 20px', color: 'var(--text-color)', fontSize: '1.3rem' }}>{t('區域對抗')}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {regions.map(([r, s], i) => (
            <div key={r} style={{ padding: '15px', borderRadius: '8px', background: i === 0 ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.03)', border: i === 0 ? '1px solid rgba(255,215,0,0.4)' : '1px solid var(--border-color)', position: 'relative' }}>
              {i === 0 && <div style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#FFD700', color: '#000', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold' }}>🏆 1st</div>}
              <h3 style={{ color: r === region ? 'var(--accent-color)' : 'var(--text-color)', margin: '0 0 10px', fontSize: '0.95rem' }}>{r === 'asia' ? t('亞洲') : r === 'us' ? t('美洲') : t('歐洲')}</h3>
              <div style={{ fontSize: '0.8rem', color: '#888', lineHeight: '1.8' }}>
                <div>{t('在線時間')}: {Math.round((s.totalOnlineTime || 0) / 3600000)}h</div>
                <div>{t('平均在線')}: {s.avgOnlineUsers || 0}</div>
                <div>Peak: {s.peakOnlineUsers || 0}</div>
                <div>{t('事件完成率')}: {s.eventRate || 0}%</div>
                <div>PT: {(s.totalPTEarned || 0).toFixed(0)}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={onClose} style={{ marginTop: '20px', width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-light)', color: 'var(--text-color)', cursor: 'pointer', fontWeight: 'bold' }}>{t('關閉')}</button>
      </div>
    </div>
  );
}
