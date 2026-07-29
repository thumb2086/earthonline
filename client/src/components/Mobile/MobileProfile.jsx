import { User, Link, Palette, Volume2, VolumeX, Globe, Bell, BellOff, Monitor, Coffee, LogOut } from 'lucide-react';

const BG_STYLES = [
  { id: 'globe', label: '3D 地球' },
  { id: 'server', label: '伺服器機房' },
  { id: 'nebula', label: '星雲' },
  { id: 'radar', label: '雷達終端' },
  { id: 'cyber', label: '賽博城市' },
];

export default function MobileProfile({
  myNode, myRole, boundDiscord, theme, themes, setTheme,
  bgStyle, setBgStyle, bgmEnabled, toggleBgm,
  notificationEnabled, setNotificationEnabled,
  isOfflineMode, offlineState, onLogout,
  onOpenAccountInfo, onOpenDiscordBind,
  t, language, setLanguage
}) {
  const state = isOfflineMode && offlineState ? offlineState : myNode || {};
  const pts = Math.floor(state.accumulatedBonusPoints ?? 0);
  const honor = state.honor ?? 0;
  const level = state.level ?? 1;

  return (
    <div className="mobile-profile">
      <div className="mobile-profile-header" onClick={onOpenAccountInfo}>
        <div className="mobile-profile-avatar">
          {boundDiscord ? (
            <img src={boundDiscord.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'}
              onError={e => { e.target.onerror = null; e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'; }}
              alt="" />
          ) : (
            <User size={28} />
          )}
        </div>
        <div className="mobile-profile-info">
          <div className="mobile-profile-name">{myNode?.username || t('連線中...')}</div>
          <div className="mobile-profile-role">
            Lv.{level} | {pts.toLocaleString()} PT | 榮譽 {honor}
          </div>
        </div>
      </div>

      <div className="mobile-profile-section">
        <div className="mobile-profile-section-title">{t('帳號')}</div>
        <button className="mobile-profile-btn" onClick={onOpenAccountInfo}>
          <User size={18} /> {t('帳號設定與安全')}
        </button>
        <button className="mobile-profile-btn" onClick={onOpenDiscordBind}>
          <Link size={18} /> {boundDiscord ? t('已連結 Discord') : t('連結 Discord')}
        </button>
      </div>

      <div className="mobile-profile-section">
        <div className="mobile-profile-section-title">{t('設定')}</div>

        <div className="mobile-profile-toggle">
          <span><Volume2 size={18} /> {t('背景音樂')}</span>
          <button className={`mobile-toggle ${bgmEnabled ? 'on' : ''}`} onClick={toggleBgm}>
            <span>{bgmEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        <div className="mobile-profile-toggle">
          <span><Bell size={18} /> {t('通知音效')}</span>
          <button className={`mobile-toggle ${notificationEnabled ? 'on' : ''}`}
            onClick={() => { setNotificationEnabled(!notificationEnabled); localStorage.setItem('eo_notifications', String(!notificationEnabled)); }}>
            <span>{notificationEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        <div className="mobile-profile-toggle">
          <span><Globe size={18} /> {t('語言')}</span>
          <select value={language} onChange={e => setLanguage(e.target.value)}
            style={{ background: 'var(--bg-light)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '4px 8px', borderRadius: '6px' }}>
            <option value="zh">中文</option>
            <option value="en">English</option>
          </select>
        </div>

        <div className="mobile-profile-toggle">
          <span><Palette size={18} /> {t('主題')}</span>
          <select value={theme} onChange={e => setTheme(e.target.value)}
            style={{ background: 'var(--bg-light)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '4px 8px', borderRadius: '6px' }}>
            {Object.keys(themes || {}).map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </div>

        <div className="mobile-profile-toggle">
          <span><Monitor size={18} /> {t('背景')}</span>
          <select value={bgStyle} onChange={e => { setBgStyle(e.target.value); localStorage.setItem('eo_bg_style', e.target.value); }}
            style={{ background: 'var(--bg-light)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '4px 8px', borderRadius: '6px' }}>
            {BG_STYLES.map(s => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="mobile-profile-section">
        <div className="mobile-profile-section-title">{t('連結')}</div>
        <a className="mobile-profile-btn" href="https://discord.gg/6P6NG49Mus" target="_blank" rel="noreferrer" style={{ color: 'var(--info-color)' }}>
          <svg width="18" height="18" viewBox="0 0 127.14 96.36" fill="currentColor"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a67.58,67.58,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.12,53,91.08,65.69,84.69,65.69Z"/></svg>
          Discord
        </a>
        <a className="mobile-profile-btn" href="https://buymeacoffee.com/lucas1126" target="_blank" rel="noreferrer" style={{ color: '#FFDD00' }}>
          <Coffee size={18} /> {t('贊助')}
        </a>
      </div>

      <button className="mobile-profile-logout" onClick={onLogout}>
        <LogOut size={18} /> {t('登出 / 切換帳號')}
      </button>
    </div>
  );
}
