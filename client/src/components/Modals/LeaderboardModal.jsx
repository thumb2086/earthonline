import React from 'react';
import { Globe2, Star, Clock, X, MapPin } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';

export default function LeaderboardModal({ show, onClose, leaderboard, sortMode, setSortMode, formatTime }) {
  const { t } = useLanguage();
  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div className="modal-content" style={{
        maxWidth: '900px', width: '90%', maxHeight: '85vh', overflowY: 'auto',
        background: 'var(--surface-color)', borderRadius: '12px', padding: '30px',
        border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
      }} onClick={e => e.stopPropagation()}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px', flexWrap: 'wrap', gap: '15px'}}>
          <h2 style={{margin: 0, color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.5rem'}}>
            <Globe2 size={28} className="icon-spin" /> {t('全球節點排行榜')}
          </h2>
          <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
            <button className="terminal-btn" onClick={() => setSortMode('points')} style={{
              padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', width: 'auto',
              background: sortMode === 'points' ? 'var(--accent-color)' : 'transparent',
              color: sortMode === 'points' ? '#fff' : 'var(--text-secondary)',
              border: sortMode === 'points' ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
              fontWeight: sortMode === 'points' ? 'bold' : 'normal', borderRadius: '4px'
            }}><Star size={16} /> {t('依點數排行')}</button>
            <button className="terminal-btn" onClick={() => setSortMode('time')} style={{
              padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', width: 'auto',
              background: sortMode === 'time' ? 'var(--accent-color)' : 'transparent',
              color: sortMode === 'time' ? '#fff' : 'var(--text-secondary)',
              border: sortMode === 'time' ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
              fontWeight: sortMode === 'time' ? 'bold' : 'normal', borderRadius: '4px'
            }}><Clock size={16} /> {t('依時間排行')}</button>
            <button className="terminal-btn" onClick={onClose} style={{
              padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', width: 'auto',
              background: 'transparent', color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)', marginLeft: '10px', borderRadius: '4px'
            }}><X size={16} /> {t('關閉')}</button>
          </div>
        </div>

        <table style={{width: '100%', fontSize: '0.9rem', color: 'var(--text-secondary)', borderCollapse: 'collapse', textAlign: 'left'}}>
          <thead>
            <tr style={{borderBottom: '1px solid rgba(255,255,255,0.2)'}}>
              <th style={{padding: '12px 8px', color: 'var(--text-primary)'}}>{t('排名')}</th>
              <th style={{padding: '12px 8px', color: 'var(--text-primary)'}}>{t('頭像')}</th>
              <th style={{padding: '12px 8px', color: 'var(--text-primary)'}}>{t('使用者 ID')}</th>
              <th style={{padding: '12px 8px', color: 'var(--text-primary)'}}>{t('國家/地區')}</th>
               <th style={{padding: '12px 8px', color: sortMode === 'time' ? 'var(--accent-color)' : 'var(--text-primary)'}}>{t('累積在線時間')} {sortMode === 'time' && '▼'}</th>
              <th style={{padding: '12px 8px', color: sortMode === 'points' ? 'var(--accent-color)' : 'var(--text-primary)'}}>{t('累積點數')} {sortMode === 'points' && '▼'}</th>
              <th style={{padding: '12px 8px', color: 'var(--text-primary)'}}>{t('Discord 身分組')}</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.length === 0 ? (
              <tr><td colSpan="7" style={{padding: '20px', textAlign: 'center'}}>{t('載入中或尚無資料...')}</td></tr>
            ) : [...leaderboard].sort((a, b) => sortMode === 'points' ? b.points - a.points : b.idleTime - a.idleTime).map((user, idx) => (
              <tr key={user.username} style={{
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                color: idx === 0 ? 'var(--accent-color)' : 'inherit',
                backgroundColor: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'
              }}>
                <td style={{padding: '12px 8px', fontWeight: idx === 0 ? 'bold' : 'normal'}}>#{idx + 1}</td>
                <td style={{padding: '12px 8px'}}>
                  {user.avatar ? <img src={user.avatar} alt="" style={{width: '32px', height: '32px', borderRadius: '50%', border: idx === 0 ? '2px solid var(--accent-color)' : 'none'}} /> : t('無')}
                </td>
                <td style={{padding: '12px 8px', fontWeight: 'bold', color: 'var(--text-main)'}}>{user.discordName !== t('未綁定') ? user.discordName : user.username}</td>
                <td style={{padding: '12px 8px'}}><MapPin size={16} style={{marginRight: '4px', verticalAlign: 'middle'}} />{user.country || 'UNKNOWN'}</td>
                <td style={{padding: '12px 8px'}}>{formatTime(user.idleTime)}</td>
                <td style={{padding: '12px 8px', color: 'var(--accent-color)', fontWeight: 'bold'}}>{user.points.toLocaleString()}</td>
                <td style={{padding: '12px 8px', color: user.role === 'admin' ? '#ef4444' : user.role === 'moderator' ? '#f59e0b' : '#888', fontSize: '0.8rem', fontWeight: user.role !== 'user' ? 'bold' : 'normal'}}>{user.role === 'admin' ? t('地球管理團隊') : user.role === 'moderator' ? t('管理') : t('市民')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
