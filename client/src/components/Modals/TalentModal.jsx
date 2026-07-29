import { useState } from 'react';
import { useLanguage } from '../../LanguageContext';

export default function TalentModal({ data, onClose, socket }) {
  const { t } = useLanguage();
  const { points, spent, talents, all } = data;
  const [result, setResult] = useState(null);
  const trees = [
    { id: 'survival', name: '🛡️ 生存系', en: 'Survival', talents: ['iron_wall', 'regeneration', 'gecko', 'immortal'] },
    { id: 'production', name: '⚡ 產能系', en: 'Production', talents: ['overclock', 'calculus', 'burst', 'plunder'] },
    { id: 'social', name: '🤝 社交系', en: 'Social', talents: ['rally', 'network', 'resonance', 'leader'] },
  ];
  const handleAssign = (talentId) => {
    if (socket?.connected) {
      socket.emit('assign_talent', { talentId });
      socket.once('talent_result', (res) => setResult(res));
    }
  };
  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', maxWidth: '800px', width: '95%', maxHeight: '85vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, color: 'var(--text-color)', fontSize: '1.3rem' }}>{t('天賦樹')}</h2>
          <span style={{ marginLeft: 'auto', fontSize: '0.9rem', color: '#9333EA' }}>{t('可用點數')}: {points || 0}</span>
        </div>
        {result && (
          <div style={{ padding: '10px', marginBottom: '15px', borderRadius: '6px', background: result.success ? 'rgba(0,255,170,0.1)' : 'rgba(255,65,108,0.1)', border: `1px solid ${result.success ? '#00ffaa' : '#ff416c'}`, color: result.success ? '#00ffaa' : '#ff416c', fontSize: '0.9rem' }}>
            {result.message}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
          {trees.map(tree => (
            <div key={tree.id}>
              <h3 style={{ color: 'var(--text-color)', margin: '0 0 12px', fontSize: '1rem' }}>{tree.talents.map(id => all[id]).filter(Boolean).length > 0 ? tree.name : tree.en}</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tree.talents.map(id => {
                  const def = all[id];
                  if (!def) return null;
                  const lvl = talents[id] || 0;
                  const maxed = lvl >= def.maxLevel;
                  const hasPoint = (points || 0) > 0;
                  return (
                    <div key={id} style={{ padding: '10px', borderRadius: '8px', background: lvl > 0 ? 'rgba(147,51,234,0.1)' : 'rgba(255,255,255,0.03)', border: lvl > 0 ? '1px solid rgba(147,51,234,0.3)' : '1px solid transparent' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-color)', fontWeight: 'bold', fontSize: '0.9rem' }}>{def.name || id}</span>
                        <span style={{ color: maxed ? '#FFD700' : '#888', fontSize: '0.8rem' }}>Lv.{lvl}/{def.maxLevel}</span>
                      </div>
                      <div style={{ color: '#888', fontSize: '0.75rem', marginBottom: '6px' }}>{def.desc}</div>
                      {!maxed && (
                        <button onClick={() => handleAssign(id)} disabled={!hasPoint} style={{ width: '100%', padding: '4px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: hasPoint ? 'rgba(147,51,234,0.2)' : 'rgba(255,255,255,0.05)', color: hasPoint ? '#9333EA' : '#555', cursor: hasPoint ? 'pointer' : 'default' }}>
                          {hasPoint ? `+1 (${(points || 0)} ${t('剩餘')})` : t('點數不足')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          {spent > 0 && (
            <button onClick={() => { if (socket?.connected) { socket.emit('reset_talents'); socket.once('talent_result', (res) => setResult(res)); } }} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--danger-color)', background: 'rgba(255,65,108,0.1)', color: 'var(--danger-color)', cursor: 'pointer', fontWeight: 'bold' }}>
              {t('重置天賦 (500 PT)')}
            </button>
          )}
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-light)', color: 'var(--text-color)', cursor: 'pointer', fontWeight: 'bold' }}>{t('關閉')}</button>
        </div>
      </div>
    </div>
  );
}
