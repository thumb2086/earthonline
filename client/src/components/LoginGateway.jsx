import { useState, useEffect } from 'react';
import { Globe2 } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import PixelWordArt from './PixelWordArt';
import '../index.css';

function LoginGateway({ onLogin }) {
  const { t, language, setLanguage } = useLanguage();
  const [isRegister, setIsRegister] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [region, setRegion] = useState('asia');
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('saved_username');
    if (saved) {
      setUsername(saved);
      setRememberMe(true);
    }
  }, []);
  
  const [isDaytime, setIsDaytime] = useState(() => {
    const h = new Date().getHours();
    return h >= 6 && h < 18;
  });

  useEffect(() => {
    const check = () => {
      const h = new Date().getHours();
      setIsDaytime(h >= 6 && h < 18);
    };
    const intv = setInterval(check, 60000);
    return () => clearInterval(intv);
  }, []);
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [covenantAccepted, setCovenantAccepted] = useState(() => {
    try { return localStorage.getItem('eo_covenant') === 'true'; } catch { return false; }
  });

  const getAudioCtx = () => {
    if (!window.__eoAudioCtx) window.__eoAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return window.__eoAudioCtx;
  };
  const playBeep = (freq = 800, duration = 100, type = 'sine') => {
    try {
      const ctx = getAudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration / 1000);
    } catch(e) {}
  };

  // Check for discord token in URL (query or hash fragment)
  useEffect(() => {
    let token = null;
    const params = new URLSearchParams(window.location.search);
    token = params.get('token');
    if (!token && window.location.hash.startsWith('#token=')) {
      token = window.location.hash.replace('#token=', '').split('&')[0];
    }
    if (token) {
      window.history.replaceState({}, document.title, window.location.pathname);
      onLogin(token, 'Discord User', region); 
    }
    const verifyToken = params.get('verifyToken');
    if (verifyToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
      const BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;
      fetch(`${BASE_URL}/api/${region}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verifyToken })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSuccessMsg('電子郵件驗證成功！');
          setTimeout(() => setSuccessMsg(''), 5000);
        } else {
          setError(data.error || '驗證失敗');
          setTimeout(() => setError(''), 5000);
        }
      })
      .catch(err => {
        console.error(err);
        setError('連線失敗');
      });
    }
  }, [onLogin, region]);

  const BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin;
  const API_URL = `${BASE_URL}/api/${region}`;

  const handleDiscordLogin = () => {
    const state = btoa(JSON.stringify({ action: 'login', returnTo: window.location.href.split('?')[0] }));
    window.location.href = `${BASE_URL}/api/auth/discord?state=${state}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    if (isForgot) {
      try {
        const res = await fetch(`${API_URL}/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, recoveryKey, newPassword: password })
        });
        const data = await res.json();
        if (!res.ok) return setError(data.error || '重置失敗');
        setSuccessMsg('密碼重置成功，請使用新密碼登入');
        setIsForgot(false);
        setPassword('');
      } catch (err) {
        setError('伺服器連線失敗');
      }
      return;
    }

    const endpoint = isRegister ? '/register' : '/login';
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Request failed');
        playBeep(300, 300, 'sawtooth');
        return;
      }
      
      if (isRegister) {
        alert(`註冊成功！\n【請務必保存您的恢復金鑰】\n${data.recoveryKey}\n\n如果您忘記密碼，這是唯一找回帳號的方式！`);
        onLogin(data.token, data.username, region);
      } else {
        onLogin(data.token, data.user.username, region);
      }
      playBeep(523, 150);
      setTimeout(() => playBeep(659, 150), 170);
      setTimeout(() => playBeep(784, 200), 370);
      if (rememberMe) {
        localStorage.setItem('saved_username', username);
      } else {
        localStorage.removeItem('saved_username');
      }
    } catch (err) {
      setError('伺服器連線失敗');
    }
  };

  return (
    <div className="login-gateway">
      <div className="login-bg">
        <div className="nasa-bg"></div>
        <div className="login-pixel-grid"></div>
        <div className="nasa-stars">
          {Array.from({ length: 80 }, (_, i) => (
            <div key={i} className="nasa-star" style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${1 + Math.random() * 2}px`,
              height: `${1 + Math.random() * 2}px`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${2 + Math.random() * 4}s`,
            }} />
          ))}
        </div>
        <div className="nasa-earth"></div>
        <div className="nasa-earth-night"></div>
        <div className="nasa-glow"></div>
      </div>

      <div className="login-pixel-bar"></div>

      <div className="login-box">
        <div style={{textAlign: 'center', marginBottom: '25px', zIndex: 10, position: 'relative'}}>
          <div className="login-earth"></div>
          <h2 style={{fontFamily: 'var(--font-sans)', color: 'var(--text-main)', fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
            <Globe2 className="icon-glow icon-spin" size={32} /> <PixelWordArt text={t('地球在線')} size={28} color="#00ff41" depth={3} />
          </h2>
          <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '5px'}}>{t('全球節點觀測與管理中心')}</p>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          {successMsg && <div style={{color: '#00ffaa', marginBottom: '10px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold'}}>{successMsg}</div>}
          
          <div className="form-group" style={{marginBottom: '15px'}}>
            <label style={{color: 'var(--accent-color)'}}>{t('GLOBAL REGION (伺服器分區)')}</label>
            <select value={region} onChange={e => setRegion(e.target.value)} className="terminal-input" style={{appearance: 'auto', background: 'var(--surface-color)', color: 'var(--accent-color)', fontWeight: 'bold'}}>
              <option value="asia">{t('[Asia-East] 亞洲樞紐')}</option>
              <option value="us">{t('[US-West] 美洲中樞')}</option>
              <option value="eu">{t('[EU-Central] 歐洲陣列')}</option>
            </select>
          </div>

          <div className="form-group" style={{marginBottom: '12px'}}>
            <label style={{color: 'var(--accent-color)'}}>{t('使用者名稱 USERNAME')}</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="terminal-input" placeholder={t('請輸入節點名稱')} style={{width: '100%', boxSizing: 'border-box'}} />
          </div>

          <div className="form-group" style={{marginBottom: '15px'}}>
            <label style={{color: 'var(--accent-color)'}}>{t('密碼 PASSWORD')}</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="terminal-input" placeholder={t('請輸入密碼')} style={{width: '100%', boxSizing: 'border-box'}} />
          </div>

          <div style={{display: 'flex', gap: '8px', marginBottom: '15px'}}>
            <button type="submit" className="terminal-btn" style={{flex: 1, background: 'rgba(0,255,65,0.15)', border: '1px solid #00ff41', color: '#00ff41', cursor: 'pointer', padding: '10px', fontWeight: 'bold'}}>{t('登入 LOGIN')}</button>
            <button type="button" onClick={() => { setIsRegister(p => !p); setError(''); setSuccessMsg(''); }} className="terminal-btn" style={{flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', cursor: 'pointer', padding: '10px', color: 'var(--text-secondary)'}}>{isRegister ? t('返回登入') : t('註冊 REGISTER')}</button>
          </div>

          <div style={{textAlign: 'center', marginBottom: '15px', padding: '10px', background: 'rgba(0,255,170,0.08)', borderRadius: '6px', border: '1px solid rgba(0,255,170,0.2)'}}>
            <span style={{color: '#00ffaa', fontSize: '0.85rem'}}>{t('或使用 Discord 快速登入')}</span>
          </div>

          <label style={{display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', cursor: 'pointer', padding: '8px 12px', background: 'rgba(0,255,65,0.05)', border: '1px solid rgba(0,255,65,0.15)', borderRadius: '4px', fontSize: '0.82rem', color: 'var(--text-secondary)'}}>
            <input
              type="checkbox"
              checked={covenantAccepted}
              onChange={e => {
                setCovenantAccepted(e.target.checked);
                localStorage.setItem('eo_covenant', e.target.checked);
              }}
              style={{accentColor: 'var(--accent-color)', width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0}}
            />
            {t('我已閱讀並同意《地球在線服務條款》')}
          </label>

          <button 
            type="button" 
            onClick={() => {
              if (!covenantAccepted) { setError(t('請先同意服務條款')); return; }
              handleDiscordLogin();
            }}
            style={{
              width: '100%', padding: '14px', background: '#5865F2', color: '#fff',
              border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer',
              marginTop: '5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              fontFamily: 'monospace', transition: 'all 0.15s',
              boxShadow: '0 4px 15px rgba(88,101,242,0.4)',
            }}
            onMouseOver={e => e.target.style.background = '#4752C4'}
            onMouseOut={e => e.target.style.background = '#5865F2'}
          >
            <svg width="22" height="22" viewBox="0 0 127.14 96.36" fill="#fff"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a67.59,67.59,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.12,53,91.08,65.69,84.69,65.69Z"/></svg>
            {t('使用 Discord 快速登入')}
          </button>
          <div style={{textAlign: 'center', marginTop: '12px'}}>
            <button type="button" onClick={() => { setIsForgot(p => !p); setError(''); setSuccessMsg(''); }} style={{background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline'}}>{t('忘記密碼？')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginGateway;
