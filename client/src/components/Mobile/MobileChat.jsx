import { useRef, useEffect } from 'react';

export default function MobileChat({ logs, chatInput, setChatInput, socket, addLog, t }) {
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket?.connected) return;
    socket.emit('send_chat', { message: chatInput.trim() });
    setChatInput('');
  };

  return (
    <div className="mobile-chat">
      <div className="mobile-chat-messages">
        {logs.filter(l => l.isChat || l.isDiscordChat).length === 0 ? (
          <div className="mobile-chat-empty">{t('尚無聊天訊息')}</div>
        ) : (
          logs.slice(-50).filter(l => l.isChat || l.isDiscordChat).map((log, i) => (
            <div key={i} className={`mobile-chat-msg ${log.isDiscordChat ? 'discord' : ''}`}>
              <span className="mobile-chat-time">[{log.time}]</span>{' '}
              <span className="mobile-chat-text">{log.text}</span>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      <form className="mobile-chat-input" onSubmit={handleSend}>
        <input
          type="text"
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          placeholder={t('輸入訊息...')}
          maxLength={200}
          disabled={!socket?.connected}
        />
        <button type="submit" disabled={!chatInput.trim() || !socket?.connected}>
          {t('發送')}
        </button>
      </form>
    </div>
  );
}
