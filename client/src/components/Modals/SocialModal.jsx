import { useState, useEffect, useRef } from 'react';
import { Users, X } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';

export default function SocialModal({ onClose, socialTab, setSocialTab, socialData, socket, myNode, onPmUser, toast }) {
  const { t } = useLanguage();
  const sortedPlayers = [...(socialData.allPlayers || [])].sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0));
  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        background: 'rgba(10, 15, 30, 0.95)',
        border: '1px solid var(--accent-color)',
        borderRadius: '10px', padding: '20px', width: '90%', maxWidth: '500px',
        boxShadow: '0 0 20px rgba(0, 255, 136, 0.2)', color: '#fff', position: 'relative',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column'
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
          <X size={24} />
        </button>
        <h2 style={{ color: 'var(--accent-color)', marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users size={24} /> {t('社交網路 (Social Matrix)')}
        </h2>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
          <button onClick={() => setSocialTab('all')} style={{ flex: 1, padding: '8px', background: socialTab === 'all' ? 'var(--accent-color)' : 'transparent', color: socialTab === 'all' ? '#000' : '#fff', border: '1px solid var(--accent-color)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{t('全服玩家')}</button>
          <button onClick={() => setSocialTab('friends')} style={{ flex: 1, padding: '8px', background: socialTab === 'friends' ? 'var(--accent-color)' : 'transparent', color: socialTab === 'friends' ? '#000' : '#fff', border: '1px solid var(--accent-color)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>{t('好友列表')}</button>
          <button onClick={() => setSocialTab('requests')} style={{ flex: 1, padding: '8px', background: socialTab === 'requests' ? 'var(--accent-color)' : 'transparent', color: socialTab === 'requests' ? '#000' : '#fff', border: '1px solid var(--accent-color)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            {t('交友邀請')} {socialData.friendRequests?.length > 0 && <span style={{ background: 'var(--danger-color)', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontSize: '0.8rem', marginLeft: '5px' }}>{socialData.friendRequests.length}</span>}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {socialTab === 'all' && (
            sortedPlayers.length === 0 ? <div style={{textAlign: 'center', color: '#888'}}>{t('查無資料')}</div> :
            sortedPlayers.map(p => (
              <div key={p.username} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: p.online ? '#0f0' : '#888', fontWeight: 'bold' }}>●</span>
                  <span>{p.username} [{p.country}]</span>
                </div>
                {p.username !== myNode?.username && !socialData.friends?.find(f => f.username === p.username) && (
                  <button 
                    onClick={(e) => {
                      socket.emit('send_friend_request', { targetUsername: p.username });
                      e.target.disabled = true;
                      e.target.innerText = '✓';
                      e.target.style.background = 'rgba(255,255,255,0.1)';
                      e.target.style.color = '#888';
                      e.target.style.borderColor = '#888';
                    }} 
                    style={{ background: 'rgba(0,255,136,0.2)', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    {t('加好友')}
                  </button>
                )}
              </div>
            ))
          )}

          {socialTab === 'friends' && (
            socialData.friends?.length === 0 ? <div style={{textAlign: 'center', color: '#888'}}>{t('目前沒有好友')}</div> :
            socialData.friends?.map(f => (
              <div key={f.username} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: f.online ? '#0f0' : '#888', fontWeight: 'bold' }}>●</span>
                  <span>{f.username}</span>
                </div>
                <div>
                <button onClick={() => onPmUser && onPmUser(f.username)} style={{ background: 'rgba(0,255,136,0.2)', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', marginRight: '5px' }}>{t('私訊')}</button>
                <button onClick={() => {
                  if (window.confirm(`${t('刪除')} ${f.username}?`)) {
                    socket.emit('remove_friend', { targetUsername: f.username });
                  }
                }} style={{ background: 'rgba(255,65,108,0.2)', border: '1px solid var(--danger-color)', color: 'var(--danger-color)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>{t('刪除')}</button>
                </div>
              </div>
            ))
          )}

          {socialTab === 'requests' && (
            socialData.friendRequests?.length === 0 ? <div style={{textAlign: 'center', color: '#888'}}>{t('目前沒有邀請')}</div> :
            socialData.friendRequests?.map(req => (
              <div key={req} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '5px' }}>
                <span>{req}{t('想要加您為好友')}</span>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={() => socket.emit('accept_friend_request', { targetUsername: req })} style={{ background: 'var(--accent-color)', color: '#000', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>{t('接受')}</button>
                  <button onClick={() => socket.emit('reject_friend_request', { targetUsername: req })} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>{t('拒絕')}</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {toast && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.15s ease',
        }}>
          <div style={{
            background: '#0a0e17', border: `1px solid ${toast.type === 'success' ? 'rgba(0,255,170,0.3)' : 'rgba(255,65,100,0.3)'}`,
            borderRadius: '16px', padding: '30px 40px',
            textAlign: 'center', maxWidth: '420px',
            boxShadow: toast.type === 'success'
              ? '0 0 60px rgba(0,255,170,0.12), 0 20px 60px rgba(0,0,0,0.5)'
              : '0 0 60px rgba(255,65,100,0.12), 0 20px 60px rgba(0,0,0,0.5)',
            animation: 'popIn 0.25s ease',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>
              {toast.type === 'success' ? '✅' : '⚠️'}
            </div>
            <div style={{
              color: toast.type === 'success' ? '#00ffaa' : '#ff416c',
              fontWeight: 'bold', fontSize: '1.2rem',
              lineHeight: 1.5, marginBottom: '16px',
            }}>
              {toast.message}
            </div>
            <div style={{ color: '#555', fontSize: '0.8rem', letterSpacing: '1px' }}>
              {t('視窗將自動關閉...')}
            </div>
          </div>
        </div>
      )}

      <div style={{ position: 'fixed', bottom: '15px', left: '0', width: '100%', textAlign: 'center', pointerEvents: 'none', zIndex: 9999 }}>
        <a href="https://github.com/huchialun9-ctrl/earthonline" target="_blank" rel="noreferrer" style={{ pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--panel-bg)', padding: '6px 14px', borderRadius: '20px', textDecoration: 'none', color: 'var(--text-dim)', fontSize: '0.8rem', backdropFilter: 'blur(4px)', border: '1px solid var(--border-color)', transition: 'all 0.2s' }} onMouseEnter={e => {e.currentTarget.style.background='var(--bg-light)'; e.currentTarget.style.color='var(--text-color)'}} onMouseLeave={e => {e.currentTarget.style.background='var(--panel-bg)'; e.currentTarget.style.color='var(--text-dim)'}}>
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
          Open Source on GitHub
          <img src="https://img.shields.io/github/license/huchialun9-ctrl/earthonline?style=flat-square&color=blue" alt="MIT License" style={{ height: '14px', marginLeft: '4px' }} />
        </a>
      </div>
    </div>
  );
}
