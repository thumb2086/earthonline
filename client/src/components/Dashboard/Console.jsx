import React, { useRef } from 'react';
import Draggable from 'react-draggable';
import { Activity, X } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';

export default function Console({ logs, chatInput, setChatInput, socket, pmData, onClosePm }) {
  const { t } = useLanguage();
  const logRef = useRef(null);
  const logEndRef = useRef(null);
  const { showPm, pmTarget, pmInput, setPmInput, pmLog } = pmData || {};

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    socket.emit('send_chat', { message: chatInput });
    setChatInput('');
  };

  const handleSendPm = (e) => {
    e.preventDefault();
    if (!pmTarget || !pmInput.trim() || !socket) return;
    socket.emit('send_private_message', { targetUsername: pmTarget, message: pmInput });
    setPmInput('');
  };

  return (
    <>
      <Draggable nodeRef={logRef} handle=".log-header">
        <div ref={logRef} className="bottom-log-console" style={{display: 'flex', flexDirection: 'column'}}>
          <div className="log-header" style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-color)', cursor: 'move'}}>
            <Activity size={16} />             {t('世界頻道 / 系統日誌 (World Chat)')}
          </div>
          <div className="log-content" style={{flex: 1, overflowY: 'auto'}}>
            {logs.map((log, i) => {
              let logColor = 'inherit';
              if (log.isChat) logColor = '#FFF';
              if (log.isDiscordChat) logColor = 'var(--info-color)';
              if (log.isWarning) logColor = 'var(--danger-color)';
              return (
                <div key={i} style={{ color: logColor, marginTop: '4px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{color: 'var(--accent-color)', opacity: 0.7}}>&gt;</span>
                  {log.avatar && <img src={log.avatar} alt="" style={{width: '20px', height: '20px', borderRadius: '50%'}} />}
                  <span style={{wordBreak: 'break-all', opacity: (log.isChat || log.isDiscordChat) ? 1 : 0.8}}>
                    <span style={{color: '#888', marginRight: '5px'}}>[{log.time}]</span>
                    {log.text}
                  </span>
                </div>
              );
            })}
            <div ref={logEndRef} />
          </div>
          <form onSubmit={handleChatSubmit} onMouseDown={e => e.stopPropagation()} style={{display: 'flex', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '5px'}}>
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
              placeholder={t("輸入訊息，與全球節點交流...")} maxLength={200}
              style={{flex: 1, background: 'var(--bg-light)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '8px', borderRadius: '4px', outline: 'none', fontSize: '0.9rem'}} />
            <button type="submit" style={{background: 'var(--accent-color)', color: '#000', border: 'none', padding: '0 15px', borderRadius: '4px', marginLeft: '5px', fontWeight: 'bold', cursor: 'pointer'}}>
              {t('發送')}
            </button>
          </form>
        </div>
      </Draggable>

      {showPm && pmTarget && (
        <Draggable handle=".pm-header">
          <div style={{
            position: 'absolute', bottom: '130px', right: '20px', width: '320px', height: '350px',
            background: 'var(--panel-bg)', border: '1px solid var(--accent-color)', borderRadius: '8px',
            display: 'flex', flexDirection: 'column', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}>
            <div className="pm-header" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 15px',
              borderBottom: '1px solid var(--border-color)', cursor: 'move',
              color: 'var(--accent-color)', fontWeight: 'bold', fontSize: '0.9rem'
            }}>
              <span>💬 {pmTarget}</span>
              <button onClick={onClosePm} style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {(pmLog?.[pmTarget] || []).map((msg, i) => (
                <div key={i} style={{
                  alignSelf: msg.incoming ? 'flex-start' : 'flex-end',
                  background: msg.incoming ? 'rgba(255,255,255,0.08)' : 'rgba(37,99,235,0.08)',
                  color: msg.incoming ? 'var(--text-color)' : 'var(--accent-color)',
                  padding: '6px 12px', borderRadius: '8px', maxWidth: '80%', fontSize: '0.85rem',
                  wordBreak: 'break-word'
                }}>
                  <div style={{ fontSize: '0.7rem', opacity: 0.6, marginBottom: '2px' }}>{msg.from} [{msg.time}]</div>
                  {msg.text}
                </div>
              ))}
            </div>
            <form onSubmit={handleSendPm} style={{ display: 'flex', borderTop: '1px solid var(--border-color)', padding: '8px' }}>
              <input type="text" value={pmInput} onChange={e => setPmInput(e.target.value)}
                placeholder={t('輸入私訊...')} maxLength={500}
                style={{ flex: 1, background: 'var(--bg-light)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '6px 10px', borderRadius: '4px', outline: 'none', fontSize: '0.85rem' }} />
              <button type="submit" style={{ background: 'var(--accent-color)', color: '#000', border: 'none', padding: '6px 12px', borderRadius: '4px', marginLeft: '5px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.85rem' }}>
                {t('送出')}
              </button>
            </form>
          </div>
        </Draggable>
      )}
    </>
  );
}
