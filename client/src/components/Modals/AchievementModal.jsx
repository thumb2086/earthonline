import { Trophy, X } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';

export default function AchievementModal({ data, onClose }) {
  const { t } = useLanguage();
  const { unlocked, all } = data;
  return (
    <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10001 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-color)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', maxWidth: '500px', width: '95%', maxHeight: '80vh', overflowY: 'auto' }}>
        <h2 style={{ margin: '0 0 20px', color: 'var(--text-color)', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Trophy size={22} color="#FFD700" /> {t('成就')}
          <span style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#888' }}>{unlocked?.length || 0}/{all?.length || 0}</span>
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(all || []).map(ach => {
            const done = (unlocked || []).includes(ach.id);
            return (
              <div key={ach.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '8px', background: done ? 'rgba(255,215,0,0.08)' : 'rgba(255,255,255,0.03)', border: done ? '1px solid rgba(255,215,0,0.3)' : '1px solid transparent', opacity: done ? 1 : 0.4 }}>
                <div style={{ fontSize: '1.5rem' }}>{done ? '🏆' : '🔒'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--text-color)', fontWeight: 'bold', fontSize: '0.95rem' }}>{t(ach.name)}</div>
                  <div style={{ color: '#888', fontSize: '0.8rem' }}>{t(ach.en)}</div>
                </div>
                {ach.reward > 0 && <div style={{ fontSize: '0.8rem', color: '#FFD700' }}>+{ach.reward} PT</div>}
              </div>
            );
          })}
        </div>
        <button onClick={onClose} style={{ marginTop: '20px', width: '100%', padding: '10px', background: 'var(--bg-light)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>{t('關閉')}</button>
      </div>
    </div>
  );
}
