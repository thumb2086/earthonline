import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { Globe2, Server, Activity, User, Network, Link as LinkIcon, ShieldCheck, Info, BookOpen, FileText, Database, Code, X, Navigation, Star, Clock, Volume2, VolumeX, Coffee, Users, ChevronDown, Zap, Tornado, Coins, Satellite, AlertTriangle, CheckCircle, MapPin, Monitor, ShoppingCart, Palette } from 'lucide-react';
import { useLanguage } from './LanguageContext';
import { useTheme } from './ThemeContext';
import Draggable from 'react-draggable';
import DataCenterVisualizer from './DataCenterVisualizer';
import ShopModal from './ShopModal';
import './index.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://earthonline.onrender.com';
const SOCKET_URL = import.meta.env.VITE_API_URL || 'https://earthonline.onrender.com';


function LoginGateway({ onLogin }) {
  const { t, language, setLanguage } = useLanguage();
  const [isRegister, setIsRegister] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [region, setRegion] = useState('asia');
  
  
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Check for discord token in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      window.history.replaceState({}, document.title, window.location.pathname);
      onLogin(token, 'Discord User', region); 
    }
    const verifyToken = params.get('verifyToken');
    if (verifyToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
      const BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://earthonline.onrender.com';
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

  const BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://earthonline.onrender.com';
  const API_URL = `${BASE_URL}/api/${region}`;

  const handleDiscordLogin = () => {
    const state = btoa(JSON.stringify({ action: 'login', returnTo: window.location.href.split('?')[0] }));
    const BACKEND_DOMAIN = import.meta.env.VITE_API_URL ? new URL(import.meta.env.VITE_API_URL).origin : 'https://earthonline.onrender.com';
    window.location.href = `${BACKEND_DOMAIN}/api/auth/discord?state=${state}`;
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
        return;
      }
      
      if (isRegister) {
        alert(`註冊成功！\n【請務必保存您的恢復金鑰】\n${data.recoveryKey}\n\n如果您忘記密碼，這是唯一找回帳號的方式！`);
        onLogin(data.token, data.username, region);
      } else {
        onLogin(data.token, data.user.username, region);
      }
    } catch (err) {
      setError('伺服器連線失敗');
    }
  };

  return (
    <div className="login-gateway">
      <div className="login-box">
        {/* Animated Rotating Earth */}
        <div className="earth-container">
          <div className="earth-sphere"></div>
        </div>

        <div style={{textAlign: 'center', marginBottom: '25px', zIndex: 10, position: 'relative'}}>
          <h2 style={{fontFamily: 'var(--font-sans)', color: 'var(--text-main)', fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'}}>
            <Globe2 className="icon-glow icon-spin" size={32} /> 地球在線
          </h2>
          <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '5px'}}>全球節點觀測與管理中心</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          {successMsg && <div style={{color: '#00ffaa', marginBottom: '10px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold'}}>{successMsg}</div>}
          
          <div className="form-group" style={{marginBottom: '15px'}}>
            <label style={{color: 'var(--accent-color)'}}>GLOBAL REGION (伺服器分區)</label>
            <select value={region} onChange={e => setRegion(e.target.value)} className="terminal-input" style={{appearance: 'auto', background: 'var(--surface-color)', color: 'var(--accent-color)', fontWeight: 'bold'}}>
              <option value="asia">[Asia-East] 亞洲樞紐</option>
              <option value="us">[US-West] 美洲中樞</option>
              <option value="eu">[EU-Central] 歐洲陣列</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>SUBJECT ID (帳號 / 信箱)</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
              className="terminal-input"
            />
          </div>

          {isForgot && (
            <div className="form-group">
              <label>RECOVERY KEY (恢復金鑰)</label>
              <input 
                type="text" 
                value={recoveryKey} 
                onChange={e => setRecoveryKey(e.target.value)} 
                required 
                className="terminal-input"
                placeholder="EO-XXXX-XXXX"
              />
            </div>
          )}

          <div className="form-group">
            <label>{isForgot ? 'NEW ACCESS CODE (新密碼)' : 'ACCESS CODE (密碼)'}</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              className="terminal-input"
            />
          </div>

          <button type="submit" className="terminal-btn">
            {isForgot ? '重置安全授權 (RESET)' : isRegister ? '建立節點連線 (註冊)' : '驗證並接入 (登入)'}
          </button>

          {!isForgot && (
            <button 
              type="button" 
              onClick={handleDiscordLogin}
              style={{
                width: '100%', padding: '12px', background: 'var(--info-color)', color: '#fff',
                border: 'none', borderRadius: '4px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer',
                marginTop: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                fontFamily: 'monospace'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 127.14 96.36" fill="#fff"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a67.59,67.59,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.12,53,91.08,65.69,84.69,65.69Z"/></svg>
              使用 Discord 快速登入
            </button>
          )}
        </form>
        
        <div style={{textAlign: 'center', marginTop: '15px', display: 'flex', flexDirection: 'column', gap: '10px'}}>
          {!isForgot && (
            <span className="toggle-link" onClick={() => setIsRegister(!isRegister)}>
              {isRegister ? '>> 返回登入程序' : '>> 申請新節點授權'}
            </span>
          )}
          <span 
            className="toggle-link" 
            style={{color: 'var(--danger-color)'}} 
            onClick={() => {
              setIsForgot(!isForgot); 
              if(!isForgot) setIsRegister(false); 
              setError(''); 
              setSuccessMsg('');
            }}
          >
            {isForgot ? '>> 返回登入程序' : '>> 遺失安全授權 (忘記密碼)'}
          </span>
        </div>
      </div>
    </div>
  );
}

function DocumentationOverlay({ onClose }) {
  const { t, language, setLanguage } = useLanguage();
  const [activeSection, setActiveSection] = useState('overview');

  const scrollTo = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="pro-doc-overlay">
      <div className="pro-doc-header">
        <div className="pro-doc-logo">
          <Database size={16} color="var(--accent-color)" /> EARTH_ONLINE // MANIFEST_V1.0
        </div>
        <button onClick={onClose} className="pro-doc-close">
          ESC_CLOSE <X size={14} />
        </button>
      </div>

      <div className="pro-doc-body">
        
        <aside className="pro-doc-sidebar">
          <ul>
            <li className={activeSection === 'overview' ? 'active' : ''} onClick={() => scrollTo('overview')}>01. OVERVIEW</li>
            <li className={activeSection === 'architecture' ? 'active' : ''} onClick={() => scrollTo('architecture')}>02. ARCHITECTURE</li>
            <li className={activeSection === 'references' ? 'active' : ''} onClick={() => scrollTo('references')}>03. REFERENCES</li>
            <li className={activeSection === 'discord' ? 'active' : ''} onClick={() => scrollTo('discord')}>04. DISCORD RPC</li>
            <li className={activeSection === 'author' ? 'active' : ''} onClick={() => scrollTo('author')}>05. AUTHOR</li>
            <li className={activeSection === 'events' ? 'active' : ''} onClick={() => scrollTo('events')}>06. GLOBAL EVENTS</li>
          </ul>
        </aside>

        <main className="pro-doc-content">
          <section id="overview">
            <div className="doc-tag">CONCEPT_DOCUMENT</div>
            <h1 className="doc-title">Project Overview</h1>
            <p className="doc-lead">
              「地球在線 (EARTH ONLINE)」是一個基於《三體》概念與賽博龐克美學啟發的實驗性全球網路觀測專案。
            </p>
            <div className="doc-text">
              其核心理念在於將全球四散的網路節點（使用者）具象化為實體地理座標上的「觀測站」，並透過即時的雙向 WebSocket 通訊，建構出一個去中心化且具備高度同步性的虛擬拓樸網路。
            </div>
            <div className="doc-text">
              本系統嘗試探討在高度資訊化的未來，人類個體如何作為巨型系統架構中的微小神經元運作。每一個登入的帳號，皆代表著為全球伺服器矩陣貢獻運算能力與觀測數據的終端節點。
            </div>
          </section>

          <section id="architecture">
            <div className="doc-tag">SYS_ARCHITECTURE</div>
            <h1 className="doc-title">Architecture & Data Files</h1>
            <div className="doc-grid">
              <div className="doc-grid-label">Client (前端)</div>
              <div className="doc-grid-value">React 18, Vite, React-Leaflet (GIS即時渲染)</div>
            </div>
            <div className="doc-grid">
              <div className="doc-grid-label">Server (後端)</div>
              <div className="doc-grid-value">Node.js, Express, Socket.IO (全雙工通訊廣播)</div>
            </div>
            <div className="doc-grid">
              <div className="doc-grid-label">Infrastructure</div>
              <div className="doc-grid-value">Render 雲端運算節點、Cloudflare CDN 全球邊緣加速</div>
            </div>
            <div className="doc-grid">
              <div className="doc-grid-label">Mechanics</div>
              <div className="doc-grid-value">全局掛機時間 (Global Production)、社會總壓迫常數 (Social Compression)</div>
            </div>
          </section>

          <section id="references">
            <div className="doc-tag">SOURCES</div>
            <h1 className="doc-title">Reference Sources</h1>
            <div className="doc-grid">
              <div className="doc-grid-label">GIS 圖資</div>
              <div className="doc-grid-value">
                <a href="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer" target="_blank" rel="noreferrer">Esri World Imagery</a>,{' '}
                <a href="https://www.openstreetmap.org/" target="_blank" rel="noreferrer">OpenStreetMap</a>,{' '}
                <a href="https://carto.com/basemaps/" target="_blank" rel="noreferrer">CartoDB Dark Matter</a>
              </div>
            </div>
            <div className="doc-grid">
              <div className="doc-grid-label">3D 貼圖</div>
              <div className="doc-grid-value">
                <a href="https://globe.gl/" target="_blank" rel="noreferrer">ThreeGlobe</a> / NASA Blue Marble
              </div>
            </div>
            <div className="doc-grid">
              <div className="doc-grid-label">API 代理</div>
              <div className="doc-grid-value">dcdn.dstn.to (無認證 Discord 資料抓取)</div>
            </div>
            <div className="doc-grid">
              <div className="doc-grid-label">介面圖示</div>
              <div className="doc-grid-value">Lucide React</div>
            </div>
          </section>

          <section id="discord">
            <div className="doc-tag">FEATURE UPDATE</div>
            <h1 className="doc-title">地球在線 - 桌面版客戶端 (Desktop App)</h1>
            <div className="doc-text">
              為了突破網頁瀏覽器的安全限制，讓玩家能自動在 Discord 上秀出「正在玩 地球在線」並顯示掛機生存時間，我們正式推出了<strong>「地球在線專屬桌面版」</strong>！<br/><br/>
              只要下載並開啟桌面版，系統就會在背景自動與您的 Discord 連動，無需任何手動設定！
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #5865F2' }}>
              <h3 style={{ color: 'var(--info-color)', marginTop: 0, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                桌面版專屬功能
              </h3>
              <ul style={{ color: 'var(--text-secondary)', lineHeight: '1.8', margin: 0, paddingLeft: '20px' }}>
                <li>✅ <strong>全自動 RPC 連動</strong>：自動更改 Discord 狀態為「正在玩 地球在線」。</li>
                <li>✅ <strong>生存時間計時器</strong>：Discord 狀態內建顯示您掛機了多久。</li>
                <li>✅ <strong>沉浸式全螢幕體驗</strong>：無邊框、無瀏覽器網址列干擾。</li>
                <li>✅ <strong>雙端資料互通</strong>：桌面版與網頁版資料完全同步，隨時切換無縫接軌。</li>
              </ul>
              
              <div style={{ marginTop: '25px' }}>
                <a 
                  href="https://github.com/huchialun9-ctrl/earthonline" 
                  target="_blank" 
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: 'var(--info-color)',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 'bold',
                    boxShadow: '0 4px 15px rgba(88, 101, 242, 0.4)',
                    transition: 'all 0.3s'
                  }}
                >
                  前往 GitHub 下載桌面版
                </a>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '10px' }}>
                  開發者請在專案根目錄下執行 <code>cd desktop-client && npm start</code> 啟動。
                </div>
              </div>
            </div>
          </section>

                    <section id="events">
            <div className="doc-tag">MECHANICS</div>
            <h1 className="doc-title">Global Events (全域事件指南)</h1>
            <div className="doc-text">
              《地球在線》系統會隨機觸發全域事件，影響全體在線節點的生存點數結算。請隨時注意頂部橫幅的警告與提示。
            </div>
            
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #00d2ff' }}>
              <h3 style={{ color: '#00d2ff', marginTop: 0, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><Zap size={20} /> 量子爆發 (QUANTUM_BURST)</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}><strong>持續時間：</strong>2 小時<br/><strong>影響效果：</strong>網路傳輸效能達到極致，所有節點的生存時間與點數累積速度大幅提升為 <strong>3.0 倍</strong>！這是快速累積資源的最佳時機。</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #ff416c' }}>
              <h3 style={{ color: '#ff416c', marginTop: 0, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><Tornado size={20} /> 太陽風暴 (SOLAR_STORM)</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}><strong>持續時間：</strong>1 小時<br/><strong>影響效果：</strong>嚴重的干擾事件。在此期間內斷線的節點將被懲罰扣除 <strong>100 點</strong>生存點數。若能成功維持連線直到風暴結束，所有倖存節點將一次性獲得 <strong>200 點</strong>的生存獎勵金。</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #f8b500' }}>
              <h3 style={{ color: '#f8b500', marginTop: 0, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><Coins size={20} /> 數據淘金潮 (DATA_GOLD_RUSH)</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}><strong>持續時間：</strong>15 分鐘<br/><strong>影響效果：</strong>極其罕見的短暫爆發期！在此期間，全伺服器點數累積速度將狂飆至 <strong>5.0 倍</strong>！把握這黃金的 15 分鐘！</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #38ef7d' }}>
              <h3 style={{ color: '#38ef7d', marginTop: 0, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><Satellite size={20} /> 衛星連線最佳化 (SATELLITE_ALIGNMENT)</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}><strong>持續時間：</strong>2 小時<br/><strong>影響效果：</strong>系統開啟動態負載倍率。基礎倍率為 1.0x，伺服器中<strong>每多 1 位玩家在線，倍率就會額外增加 0.1x</strong>！也就是說，如果有 20 人同時在線，倍率將達到 3.0 倍！號召您的朋友一起上線吧！</p>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px', marginTop: '20px', borderLeft: '4px solid #8e9eab' }}>
              <h3 style={{ color: '#8e9eab', marginTop: 0, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}><AlertTriangle size={20} /> 系統維護模式 (SYSTEM_MAINTENANCE)</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}><strong>持續時間：</strong>30 分鐘<br/><strong>影響效果：</strong>主控台進行冷卻降頻，點數累積速度降為 <strong>0.5 倍</strong>。這是一場耐力賽，如果您選擇不下線並陪伴伺服器度過維護期，結束時系統將發放高達 <strong>500 點</strong>的補償獎勵！</p>
            </div>
          </section>

          <section id="author">
            <div className="doc-tag">CREDITS</div>
            <h1 className="doc-title">Developer Info</h1>
            <div className="doc-text">
              本系統由獨立開發者進行架構設計、UI/UX 規劃與全端程式撰寫。
            </div>
            <div className="doc-grid">
              <div className="doc-grid-label">Author</div>
              <div className="doc-grid-value">胡家綸</div>
            </div>
            <div className="doc-grid">
              <div className="doc-grid-label">Contact</div>
              <div className="doc-grid-value">
                <a href="mailto:huchialun97@gmail.com">huchialun97@gmail.com</a>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function CountdownBanner() {
  const { t, language, setLanguage } = useLanguage();
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const calcTime = () => {
      const now = new Date();
      const currentDayUTC = now.getUTCDay();
      const currentHourUTC = now.getUTCHours();
      
      // We are looking for Sunday (0) 16:00:00 UTC (Which is Monday 00:00:00 Asia/Taipei)
      let daysUntilTarget = (0 - currentDayUTC + 7) % 7;
      if (daysUntilTarget === 0 && currentHourUTC >= 16) {
         daysUntilTarget = 7;
      }
      
      const nextTarget = new Date(now);
      nextTarget.setUTCDate(now.getUTCDate() + daysUntilTarget);
      nextTarget.setUTCHours(16, 0, 0, 0);
      
      const diff = nextTarget.getTime() - now.getTime();
      if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0 };

      return {
        d: Math.floor(diff / (1000 * 60 * 60 * 24)),
        h: Math.floor((diff / (1000 * 60 * 60)) % 24),
        m: Math.floor((diff / 1000 / 60) % 60),
        s: Math.floor((diff / 1000) % 60)
      };
    };

    setTimeLeft(calcTime());
    const intv = setInterval(() => {
      setTimeLeft(calcTime());
    }, 1000);
    return () => clearInterval(intv);
  }, []);

  const format = (num) => num.toString().padStart(2, '0');

  return (
    <div style={{
      width: '100%',
      background: 'linear-gradient(90deg, #1B2845, #274060, #335C81)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '10px 20px',
      fontFamily: '"Inter", "Segoe UI", sans-serif',
      boxSizing: 'border-box',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      gap: '15px',
      flexWrap: 'wrap',
      flexShrink: 0
    }}>
      <div style={{display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem', fontWeight: '600'}}>
        <span style={{color: '#ffcc00'}}>✧</span> 
        每週任務結算 — 獲取 <span style={{background: '#ed4245', padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold'}}>{t('專屬身分組')}</span> | 距離結算剩餘:
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', fontSize: '1rem'}}>
        <div style={{background: '#f2f3f5', color: '#23272a', padding: '4px 8px', borderRadius: '6px', minWidth: '28px', textAlign: 'center'}}>{format(timeLeft.d)}</div>
        <span>:</span>
        <div style={{background: '#f2f3f5', color: '#23272a', padding: '4px 8px', borderRadius: '6px', minWidth: '28px', textAlign: 'center'}}>{format(timeLeft.h)}</div>
        <span>:</span>
        <div style={{background: '#f2f3f5', color: '#23272a', padding: '4px 8px', borderRadius: '6px', minWidth: '28px', textAlign: 'center'}}>{format(timeLeft.m)}</div>
        <span>:</span>
        <div style={{background: '#f2f3f5', color: '#23272a', padding: '4px 8px', borderRadius: '6px', minWidth: '28px', textAlign: 'center'}}>{format(timeLeft.s)}</div>
      </div>
    </div>
  );
}


const DonateBanner = () => {
  const { t, language, setLanguage } = useLanguage();
  return (
    <div className="floating-panel" style={{ padding: '15px 20px', background: 'rgba(255, 65, 108, 0.1)', border: '1px solid #ff416c', width: '100%', marginTop: '15px' }}>
      <div style={{ fontSize: '0.9rem', color: '#ff416c', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
        <Database size={16} /> 伺服器微服務升級募資計畫
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: '15px', lineHeight: '1.6' }}>
        為了打造真正的全球無上限微服務架構，我們計畫在 Render 上建立硬體分流叢集（包含獨立的 Redis 與三大洲 Web Service）。<br/>
        <span style={{color: '#38ef7d'}}>優點：</span>{t('真實硬體分流，乘載量無上限。')}<br/>
        <span style={{color: '#ff416c'}}>缺點：</span>設定較複雜，且 Render 的 Redis 與多台伺服器將產生高昂月費。
      </div>
      <a 
        href="https://buymeacoffee.com/lucas1126" 
        target="_blank" 
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: '#ff416c', color: '#fff', padding: '8px 15px',
          borderRadius: '4px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 'bold',
          transition: 'all 0.3s ease'
        }}
      >
        <Coffee size={14} /> 贊助伺服器升級 (Buy Me a Coffee)
      </a>
    </div>
  );
};

function Dashboard({ token, onLogout, region }) {
  const { t, language, setLanguage } = useLanguage();
  const BASE_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : 'https://earthonline.onrender.com';
  const API_URL = `${BASE_URL}/api/${region}`;
  const SOCKET_URL = BASE_URL;
  const [socket, setSocket] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [myNode, setMyNode] = useState(null);
  const [globalStats, setGlobalStats] = useState({ activeUsers: 0, totalPopulation: 0, globalProduction: 0, socialCompression: '1.000' });
  const [hubStats, setHubStats] = useState(null);

  useEffect(() => {
    const fetchHub = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/global/stats`);
        if(res.ok) setHubStats(await res.json());
      } catch(e) {}
    };
    fetchHub();
    const inv = setInterval(fetchHub, 5000);
    return () => clearInterval(inv);
  }, [BASE_URL]);

  const [lifespan, setLifespan] = useState(0);
  const [sessionTime, setSessionTime] = useState(0);
  const sessionStartRef = useRef(null);
  const [show100Celebration, setShow100Celebration] = useState(false);
  const [logs, setLogs] = useState([
    { text: '[SYS] 地球在線連線建立中...', time: new Date().toISOString().substring(11, 19) },
    { text: '[SYS] 進入全球節點網路...', time: new Date().toISOString().substring(11, 19) }
  ]);
  const [ping, setPing] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [showDiscordModal, setShowDiscordModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [mapTheme, setMapTheme] = useState('satellite');
  // Remove showMapModal
  const [showManualBind, setShowManualBind] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showAccountInfo, setShowAccountInfo] = useState(false);
  const [locateTrigger, setLocateTrigger] = useState(0);
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [showShopModal, setShowShopModal] = useState(false);
  const [discordId, setDiscordId] = useState('');
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const { theme, setTheme, themeData: currentThemeData, themes } = useTheme();
  
  const pingStartRef = useRef(0);
  const [socialTab, setSocialTab] = useState('friends'); // 'friends', 'all', 'requests'
  const [socialData, setSocialData] = useState({ allPlayers: [], friends: [], friendRequests: [] });
  const [leaderboard, setLeaderboard] = useState([]);
  const [sortMode, setSortMode] = useState('points');
  const [currentEvent, setCurrentEvent] = useState(null);

  const [logEndVisible, setLogEndVisible] = useState(true);

  // Ref for react-draggable
  const logRef = useRef(null);

  const [bgmEnabled, setBgmEnabled] = useState(true);
  const audioRef = useRef(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.2;
      if (bgmEnabled) {
        audioRef.current.play().catch(e => {
          console.log('BGM Autoplay prevented:', e);
          setBgmEnabled(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [bgmEnabled]);

  // Terminal State
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [terminalHistory, setTerminalHistory] = useState(['Earth Online Terminal v1.0.1', 'Type "help" for a list of available commands.']);
  const [terminalInput, setTerminalInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const terminalEndRef = useRef(null);
  const logEndRef = useRef(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global keydown listener for Terminal
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === '`' || e.key === '~') {
        e.preventDefault();
        setIsTerminalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Scroll terminal to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalHistory, isTerminalOpen]);

  // Scroll chat/log to bottom
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Fetch social data when modal opens
  useEffect(() => {
    if (showSocialModal && socket) {
      socket.emit('get_social_data');
    }
  }, [showSocialModal, socket]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${API_URL}/leaderboard`, { cache: 'no-store' });
        if (res.ok) setLeaderboard(await res.json());
      } catch(err) {}
    };
    fetchLeaderboard();
    const intv = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(intv);
  }, []);

  const [boundDiscord, setBoundDiscord] = useState(null);

  const handleBindDiscord = (e) => {
    e.preventDefault();
    const statePayload = btoa(JSON.stringify({ token, returnTo: window.location.origin }));
    const BACKEND_DOMAIN = import.meta.env.VITE_API_URL ? new URL(import.meta.env.VITE_API_URL).origin : 'https://earthonline.onrender.com';
    const discordOAuthUrl = `${BACKEND_DOMAIN}/api/auth/discord?state=${statePayload}`;
    window.location.href = discordOAuthUrl;
  };

  const handleBindDiscordManual = async (e) => {
    e.preventDefault();
    if (!discordId) return;
    
    if (!/^\d{17,20}$/.test(discordId)) {
      alert('請輸入您的 Discord「使用者 ID」(17~20碼數字)！');
      return;
    }

    try {
      addLog(`[SYS] 嘗試手動綁定 Discord ID: ${discordId}...`);
      const res = await fetch(`${API_URL}/bind-discord-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, discordId })
      });
      if (res.ok) {
        setBoundDiscord({
          username: discordId,
          avatar: `https://cdn.discordapp.com/embed/avatars/${(BigInt(discordId) >> 22n) % 6n}.png`
        });
        setShowDiscordModal(false);
        addLog(`系統通知：手動綁定成功！`);
      }
    } catch (err) {
      alert('綁定失敗');
    }
  };

  const addLog = (msg, extra = {}) => {
    setLogs(prev => {
      const time = new Date().toISOString().substring(11, 19);
      let logObj = { time, text: typeof msg === 'string' ? msg : msg.text, ...extra };
      if (typeof msg === 'string') {
        logObj.isChat = msg.includes('[CHAT]');
        logObj.isDiscordChat = msg.includes('[DC_CHAT]');
        logObj.isWarning = msg.includes('警告');
      }
      return [...prev, logObj].slice(-150);
    });
  };

  useEffect(() => {
    const s = io(`${SOCKET_URL}/${region}`);
    setSocket(s);

    s.on('connect', () => {
      s.emit('authenticate', { token });
      addLog('驗證金鑰已發送，等待授權...');
      setIsConnected(true);
    });

    s.on('auth_error', (data) => {
      alert(data?.message || '授權已過期，請重新登入');
      setIsConnected(false);
      onLogout();
    });

    s.on('init_data', async (data) => {
      setMyNode(data);
      addLog(`身分確認：節點 [${data.username}] 成功接入全球網路`);
      
      if (data.discordProfile) {
        setBoundDiscord({
          username: data.discordProfile.username,
          avatar: data.discordProfile.avatar
        });
      }
      if (data.currentGlobalEvent) {
        setCurrentEvent(data.currentGlobalEvent);
      }
    });

    s.on('global_event_started', (eventData) => {
      setCurrentEvent(eventData);
    });

    s.on('global_event_ended', () => {
      setCurrentEvent(null);
    });

    s.on('terminal_response', (msg) => {
      setTerminalHistory(prev => [...prev, msg]);
    });

    s.on('global_broadcast', (data) => {
      setTerminalHistory(prev => [...prev, `[BROADCAST] ${data.username}: ${data.message}`]);
      addLog(`[CHAT] ${data.username}: ${data.message}`);
    });

    s.on('chat_message', (data) => {
      const adminBadge = data.isAdmin ? ' [管理員]' : '';
      if (data.isDiscord) {
        addLog(`[DC_CHAT] ${data.username}: ${data.message}`);
      } else {
        addLog(`[CHAT]${adminBadge} ${data.username}: ${data.message}`);
      }
    });

    s.on('social_data', (data) => {
      setSocialData(data);
    });

    s.on('social_data_updated', () => {
      s.emit('get_social_data');
    });

    s.on('friend_request_received', (data) => {
      addLog(`[SYSTEM] 收到來自 ${data.from} 的好友邀請！`);
      s.emit('get_social_data');
    });

    s.on('all_nodes', (data) => {
      setNodes(data);
      addLog(`成功同步 ${data.length} 個物理座標節點資料`);
    });

    s.on('node_connected', (node) => {
      setNodes(prev => {
        if (!prev.find(n => n.id === node.id)) {
          return [...prev, node];
        }
        return prev;
      });
      addLog(`警告：偵測到新物理節點活動於座標 [${node.lat.toFixed(2)}, ${node.lon.toFixed(2)}]`);
    });

    s.on('node_disconnected', ({ id }) => {
      setNodes(prev => prev.filter(n => n.id !== id));
      addLog(`通知：節點連線中斷，正在重新計算社會總壓迫常數`);
    });
    
    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('global_stats', (stats) => {
      setGlobalStats(stats);
    });

    s.on('user_state_update', (data) => {
      setMyNode(prev => prev ? {...prev, ...data} : data);
    });
    
    s.on('buy_result', (data) => {
      if (data.success) {
        alert('購買成功！' + data.message);
        addLog(`[SYSTEM] ${data.message}`);
      } else {
        alert('購買失敗: ' + data.message);
      }
    });

    s.on('chat_muted', (data) => {
      addLog(`[SYSTEM] ${data.message}`);
      alert(data.message);
    });

    s.on('chat_banned', (data) => {
      addLog(`[SYSTEM] ${data.message}`);
      alert(data.message);
    });

    s.on('chat_message_deleted', (data) => {
      addLog(`[MOD] 管理員 ${data.modUsername} 刪除了一則訊息`);
    });

    s.on('chat_system_message', (data) => {
      addLog(data.message);
    });

    s.on('chat_verification_required', (data) => {
      addLog(`[SYSTEM] ⚠️ ${data.message}`);
      alert('⚠️ ' + data.message);
    });

    s.on('pong', () => {
      setPing(Date.now() - pingStartRef.current);
    });

    const pingInterval = setInterval(() => {
      if (s.connected) {
        pingStartRef.current = Date.now();
        s.emit('ping');
      }
    }, 2000);
    
    const syncInterval = setInterval(() => {
      if (s.connected) {
        s.emit('sync_user');
      }
    }, 10000);

    setSocket(s);

    return () => {
      clearInterval(pingInterval);
      clearInterval(syncInterval);
      s.removeAllListeners();
      s.disconnect();
    };
  }, [token, onLogout]);

  // Lifespan timer
  useEffect(() => {
    if (!myNode || myNode.accumulatedTime === undefined) return;
    
    // Check if we are currently boosted
    const isBoosted = globalStats.multiplier && globalStats.multiplier > 1.0;
    const rate = isBoosted ? 1.2 : 1.0;
    
    // Avoid using Date.now() - connectedAt because server time might be different from client time, causing negative values.
    const baseAccumulatedSeconds = (myNode.accumulatedTime || 0) / 1000;
    
    let currentLocalLifespan = baseAccumulatedSeconds;

    const interval = setInterval(() => {
      currentLocalLifespan += rate;
      setLifespan(Math.floor(currentLocalLifespan));
      
      // Update Electron Desktop App Presence if available
      if (window.electronAPI) {
        window.electronAPI.updatePresence({
          details: `生存時間: ${formatTime(Math.floor(currentLocalLifespan))}`,
          state: `區域: ${region === 'asia' ? 'Asia' : region === 'us' ? 'US' : 'EU'} | 積分: ${Math.floor(currentLocalLifespan)} PT`,
          username: myNode.username
        });
      }
    }, 1000);

    // Run once immediately
    setLifespan(Math.floor(currentLocalLifespan));

    return () => clearInterval(interval);
  }, [myNode, globalStats.multiplier]);

  // Session timer — counts from the moment user connects
  useEffect(() => {
    if (!myNode) return;
    if (!sessionStartRef.current) {
      sessionStartRef.current = Date.now();
    }
    const interval = setInterval(() => {
      setSessionTime(Math.floor((Date.now() - sessionStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [myNode]);

  // Format time HH:MM:SS
  const formatTime = (seconds) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return d > 0 ? `${d}d ${h}:${m}:${s}` : `${h}:${m}:${s}`;
  };

  const calculateHealthPercentage = (seconds) => {
    return myNode?.health !== undefined ? myNode.health : 100;
  };

  // Render nodes directly as dots without clustering


  // Global Event Banner Component
  const GlobalEventBanner = () => {
  const { t, language, setLanguage } = useLanguage();
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
      if (!currentEvent || !currentEvent.endTime) return;
      
      const updateTimer = () => {
        const now = Date.now();
        const diff = currentEvent.endTime - now;
        if (diff <= 0) {
          setTimeLeft('即將結束...');
          return;
        }
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        if (hours > 0) {
          setTimeLeft(`(結束倒數: ${hours}小時 ${minutes}分 ${seconds}秒)`);
        } else {
          setTimeLeft(`(結束倒數: ${minutes}分 ${seconds}秒)`);
        }
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }, [currentEvent]);

    if (!currentEvent) return null;
    
    let bgColor = '';
    let icon = '';
    let text = '';

    switch(currentEvent.type) {
      case 'QUANTUM_BURST':
        bgColor = 'linear-gradient(90deg, #00d2ff, #3a7bd5)';
        icon = <Zap size={18} />;
        text = '【量子爆發】全伺服器點數累積速度 x 3.0 倍！';
        break;
      case 'SOLAR_STORM':
        bgColor = 'linear-gradient(90deg, #ff416c, #ff4b2b)';
        icon = <Tornado size={18} />;
        text = '【太陽風暴】網路劇烈波動！期間斷線將扣除 100 點，撐過去可獲 200 點！';
        break;
      case 'DATA_GOLD_RUSH':
        bgColor = 'linear-gradient(90deg, #fceabb, #f8b500)';
        icon = <Coins size={18} />;
        text = '【數據淘金潮】短期爆發！全伺服器點數累積速度飆升至 5.0 倍！';
        break;
      case 'SATELLITE_ALIGNMENT':
        bgColor = 'linear-gradient(90deg, #11998e, #38ef7d)';
        icon = <Satellite size={18} />;
        text = '【衛星連線最佳化】動態倍率啟動，在線人數越多產出越高！';
        break;
      case 'SYSTEM_MAINTENANCE':
        bgColor = 'linear-gradient(90deg, #8e9eab, #eef2f3)';
        icon = <AlertTriangle size={18} />;
        text = '【系統維護模式】算力降頻(0.5倍)，維持連線不斷線可獲補償獎勵！';
        break;
    }
      
    return (
      <div style={{
        width: '100%',
        background: bgColor,
        color: currentEvent.type === 'SYSTEM_MAINTENANCE' || currentEvent.type === 'DATA_GOLD_RUSH' ? '#000' : '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 20px',
        fontFamily: '"Inter", "Segoe UI", sans-serif',
        boxSizing: 'border-box',
        borderBottom: '1px solid rgba(255,255,255,0.2)',
        fontWeight: 'bold',
        fontSize: '1rem',
        textShadow: currentEvent.type === 'SYSTEM_MAINTENANCE' || currentEvent.type === 'DATA_GOLD_RUSH' ? 'none' : '0 1px 2px rgba(0,0,0,0.5)',
        animation: 'pulse 2s infinite',
        flexShrink: 0
      }}>
        <span style={{ marginRight: '10px', fontSize: '1.2rem' }}>{icon}</span> {text} 
        <span style={{ marginLeft: '10px', background: 'var(--bg-light)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.9rem', color: currentEvent.type === 'SYSTEM_MAINTENANCE' || currentEvent.type === 'DATA_GOLD_RUSH' ? '#000' : '#fff' }}>{timeLeft}</span>
      </div>
    );
  };

  const getEventGlow = () => {
    if (!currentEvent) return 'none';
    switch(currentEvent.type) {
      case 'QUANTUM_BURST': return 'inset 0 0 80px rgba(0, 210, 255, 0.4)';
      case 'SOLAR_STORM': return 'inset 0 0 80px rgba(255, 65, 108, 0.4)';
      case 'DATA_GOLD_RUSH': return 'inset 0 0 80px rgba(248, 181, 0, 0.4)';
      case 'SATELLITE_ALIGNMENT': return 'inset 0 0 80px rgba(56, 239, 125, 0.4)';
      case 'SYSTEM_MAINTENANCE': return 'inset 0 0 80px rgba(142, 158, 171, 0.4)';
      default: return 'none';
    }
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;
    socket.emit('send_chat', { message: chatInput });
    setChatInput('');
  };

  const handleTerminalSubmit = (e) => {
    e.preventDefault();
    if (!terminalInput.trim()) return;
    
    const cmd = terminalInput.trim();
    setTerminalHistory(prev => [...prev, `> ${cmd}`]);
    setTerminalInput('');

    const lowerCmd = cmd.toLowerCase();
    if (lowerCmd === 'help') {
      setTerminalHistory(prev => [...prev, 'Available commands: help, ping, whoami, clear, sysinfo, broadcast <msg>']);
    } else if (lowerCmd === 'ping') {
      setTerminalHistory(prev => [...prev, 'Pong! Latency: 12ms']);
    } else if (lowerCmd === 'whoami') {
      setTerminalHistory(prev => [...prev, `Node Identity: ${myNode?.username || 'UNKNOWN'}`]);
    } else if (lowerCmd === 'clear') {
      setTerminalHistory([]);
    } else if (lowerCmd === 'sysinfo') {
      setTerminalHistory(prev => [...prev, 'Earth Online Core - 256TB Quantum RAM, Geo-Distributed Matrix Active.']);
    } else {
      // Forward to backend for secret codes
      if (socket) {
        socket.emit('terminal_command', { command: cmd });
      } else {
        setTerminalHistory(prev => [...prev, '[ERROR] NOT CONNECTED TO CORE.']);
      }
    }
  };

  return (
    <div className="app-container" style={{ boxShadow: getEventGlow(), transition: 'box-shadow 1s ease-in-out' }}>
      {show100Celebration && (
        <div className="celebration-overlay">
          <div className="celebration-emoji">🎉</div>
          <div className="celebration-text">伺服器達成 100 人里程碑！</div>
        </div>
      )}
      {/* Terminal Overlay */}
      {isTerminalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '50vh',
          background: 'rgba(0, 0, 0, 0.9)', borderBottom: '2px solid #0f0',
          color: '#0f0', fontFamily: 'monospace', padding: '20px', zIndex: 9999,
          display: 'flex', flexDirection: 'column', boxSizing: 'border-box'
        }}>
          <div style={{ flex: 1, overflowY: 'auto', marginBottom: '10px' }}>
            {terminalHistory.map((line, i) => (
              <div key={i} style={{ wordBreak: 'break-all', marginBottom: '4px' }}>{line}</div>
            ))}
            <div ref={terminalEndRef} />
          </div>
          <form onSubmit={handleTerminalSubmit} style={{ display: 'flex', gap: '10px' }}>
            <span>&gt;</span>
            <input 
              type="text" 
              value={terminalInput}
              onChange={e => setTerminalInput(e.target.value)}
              autoFocus
              style={{
                flex: 1, background: 'transparent', border: 'none', color: '#0f0', 
                fontFamily: 'monospace', outline: 'none', fontSize: '1rem'
              }}
            />
          </form>
        </div>
      )}


      <CountdownBanner />
      <GlobalEventBanner />
      {/* Header Panel */}
      <header className="system-header">
        <div className="system-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Globe2 color="#3b82f6" size={24} /> 
          <span style={{fontWeight: '900', fontSize: '1.3rem', letterSpacing: '0'}}>{t('地球在線')}</span> 
          <span style={{color: '#64748b', fontSize: '0.9rem', marginLeft: '10px'}}>伺服器: {region.toUpperCase()} | 你的位置: {myNode?.country || '連線中..'}</span>
        </div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {!window.electronAPI && (
            <a href="https://drive.google.com/uc?export=download&id=1Xji_z7dB5Q16FfSyRvnm2mXqn3n0cAQ2" target="_blank" rel="noopener noreferrer" style={{display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px', background: 'var(--success-color)', color: 'white', border: 'none', borderRadius: '6px', textDecoration: 'none', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)', fontSize: '0.9rem'}}>
              <Monitor size={16} /> 下載專屬電腦版
            </a>
          )}
          <div className="system-stats" style={{display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
              <span style={{color: '#64748b'}}>上線人數:</span> <strong style={{color: 'var(--success-color)'}}>{globalStats.activeUsers}</strong>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
              <span style={{color: 'var(--text-dim)'}}>{t('總人口')}:</span> <strong style={{color: 'var(--text-color)'}}>{globalStats.totalPopulation}</strong>
            </div>
            {!isConnected && <span style={{color: 'var(--danger-color)', fontWeight: 'bold'}}>[已斷線]</span>}
          </div>

          <div className={`header-dropdown${dropdownOpen ? ' open' : ''}`} ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(prev => !prev)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 15px', borderRadius: '8px',
                background: dropdownOpen ? 'var(--bg-light)' : 'var(--surface-color)',
                border: '1px solid var(--border-color)', color: 'var(--text-color)',
                cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', fontFamily: 'var(--font-sans)'
              }}
            >
              選單 (Menu) <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
            </button>
            <div className="header-dropdown-content">

              <div style={{width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '5px 0'}}></div>
              <button onClick={() => { setShowSocialModal(true); setDropdownOpen(false); }} className="dropdown-item">
                <Users size={16} /> 社交網路 (Social)
              </button>
              <button onClick={() => { setShowShopModal(true); setDropdownOpen(false); }} className="dropdown-item" style={{color: '#38bdf8'}}>
                <ShoppingCart size={16} /> 黑市商城 (Shop)
              </button>
              <button className="dropdown-item" onClick={() => { setShowThemeMenu(!showThemeMenu); setDropdownOpen(false); }}>
                <Palette size={16} /> 主題配色 (Themes)
              </button>
              <a href="https://discord.gg/6P6NG49Mus" target="_blank" rel="noreferrer" className="dropdown-item" style={{color: 'var(--info-color)'}} onClick={() => setDropdownOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 127.14 96.36" fill="currentColor"><path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a67.58,67.58,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.31,60,73.31,53s5-12.74,11.43-12.74S96.2,46,96.12,53,91.08,65.69,84.69,65.69Z"/></svg>
                官方 Discord
              </a>
              <a href="https://buymeacoffee.com/lucas1126" target="_blank" rel="noreferrer" className="dropdown-item" style={{color: '#FFDD00'}} onClick={() => setDropdownOpen(false)}>
                <Coffee size={16} /> 贊助支持 (Donate)
              </a>
            </div>
          </div>

          <button onClick={onLogout} className="logout-btn" style={{padding: '5px 15px', borderRadius: '8px', background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)', color: 'var(--danger-color)', cursor: 'pointer'}}>{t('登出 / 切換帳號')}</button>
        </div>
      </header>

      <div className="main-content">
        {/* Left Metrics Terminal */}
        <aside className="metrics-terminal floating-panel">
          <div className="brand-banner" style={{ textAlign: 'center', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '15px' }}>
            <div style={{display: 'flex', justifyContent: 'center', marginBottom: '10px'}}>
              <Globe2 size={56} color="var(--accent-color)" className="icon-glow icon-spin" />
            </div>
            <h3 style={{margin: '0', color: 'var(--text-primary)', letterSpacing: '2px'}}>EARTH ONLINE</h3>
          </div>

          <DonateBanner />

          <div className="metric-group profile-card">
            <div className="metric-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <User size={16} /> 使用者帳號 (User ID)
            </div>
            
            {boundDiscord ? (
              <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px', cursor: 'pointer', padding: '5px', borderRadius: '8px', transition: 'background 0.2s'}} onClick={() => setShowAccountInfo(true)} className="hover-highlight">
                <img 
                  src={boundDiscord.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png'} 
                  alt="" 
                  onError={(e) => { e.target.onerror = null; e.target.src = "https://cdn.discordapp.com/embed/avatars/0.png"; }}
                  style={{width: '48px', height: '48px', minWidth: '48px', minHeight: '48px', borderRadius: '50%', border: '2px solid var(--accent-color)', objectFit: 'cover'}} 
                />
                <div style={{overflow: 'hidden'}}>
                  <div style={{color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{boundDiscord.username || myNode?.username}</div>
                  <div style={{color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <LinkIcon size={14} color="var(--accent-color)" /> 已連結 Discord
                  </div>
                </div>
              </div>
            ) : (
              <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px', cursor: 'pointer', padding: '5px', borderRadius: '8px', transition: 'background 0.2s'}} onClick={() => setShowAccountInfo(true)} className="hover-highlight">
                <div style={{width: '48px', height: '48px', minWidth: '48px', minHeight: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--border-color)'}}>
                  <User size={24} color="var(--text-secondary)" />
                </div>
                <div style={{overflow: 'hidden'}}>
                  <div style={{color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{myNode?.username}</div>
                  <div style={{marginTop: '5px'}}>
                    <a href="#" onClick={(e) => { e.preventDefault(); setShowDiscordModal(true); }} className="discord-link" style={{fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 8px', background: 'rgba(88, 101, 242, 0.2)', color: 'var(--info-color)', borderRadius: '4px', textDecoration: 'none', whiteSpace: 'nowrap'}}>
                      <LinkIcon size={14} /> 立即連結 Discord
                    </a>
                  </div>
                </div>
              </div>
            )}
            
            <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '15px', background: 'var(--bg-light)', padding: '10px', borderRadius: '8px', lineHeight: '1.8'}}>
              <div>node-id: {myNode?.userId}</div>
              <div>ip: {myNode?.ip}</div>
              <div>region: {myNode?.country?.toLowerCase()}</div>
              <div>延遲 (ping): {ping} ms</div>
              <div>伺服器狀態: {isConnected ? '連線穩定' : '中斷'}</div>
              <div style={{marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.08)'}}>
                <span style={{color: 'var(--text-secondary)'}}>所在伺服器: </span>
                <strong style={{color: 'var(--accent-color)'}}>
                  {region === 'asia' ? '🌏 亞洲伺服器 (Asia)' : region === 'us' ? '🌎 美洲伺服器 (US)' : '🌍 歐洲伺服器 (EU)'}
                </strong>
              </div>
              <div style={{marginTop: '4px'}}>
                <span style={{color: 'var(--text-secondary)'}}>本次上線: </span>
                <strong style={{color: '#00ffaa'}}>{formatTime(sessionTime)}</strong>
              </div>
            </div>
          </div>
          
          <div className="metric-group">
            <div className="metric-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Activity size={16} /> 總生存時間 (Total Lifespan)
            </div>
            <div style={{color: 'var(--accent-color)', fontSize: '1.5rem', fontWeight: 'bold'}}>
              {formatTime(lifespan)}
            </div>
          </div>

          <div className="metric-group" style={{ marginBottom: '20px' }}>
            <div className="metric-title" style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px'}}>
              <Activity size={16} /> 健康狀態 (Health Status)
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${calculateHealthPercentage(lifespan)}%`, 
                height: '100%', 
                background: calculateHealthPercentage(lifespan) > 30 ? 'var(--accent-color)' : 'var(--danger-color)',
                transition: 'width 1s linear'
              }}></div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px', textAlign: 'right' }}>
              {Math.floor(calculateHealthPercentage(lifespan))}%
            </div>
          </div>

          <div className="metric-group">
            <div className="metric-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Server size={16} /> 網路連線狀態 (Network)
            </div>
            <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
              連線延遲 (Ping): {ping} ms<br/>
              上傳 (Uplink): {globalStats.systemHardware?.uplink || 0} KB/s<br/>
              下載 (Downlink): {globalStats.systemHardware?.downlink || 0} KB/s<br/>
              封包遺失 (Loss): {(globalStats.systemHardware?.loss || 0).toFixed(2)}%
            </div>
          </div>

          <div className="metric-group" style={{ 
            border: globalStats.multiplier > 1.0 ? '1px solid var(--accent-color)' : '1px solid rgba(255,255,255,0.1)',
            transition: 'border 0.3s'
          }}>
            <div className="metric-title" style={{display: 'flex', alignItems: 'center', gap: '8px', color: globalStats.multiplier > 1.0 ? 'var(--accent-color)' : 'var(--text-primary)'}}>
              🔥 區間群聚超載系統
            </div>
            <div style={{fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '8px'}}>
              當前伺服器共同在線掛機人數：<strong style={{color: globalStats.activeUsers >= 5 ? 'var(--accent-color)' : 'inherit'}}>{globalStats.activeUsers} / 5 人</strong>
            </div>
            <div style={{fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '4px'}}>
              後台點數產出倍率：<strong style={{color: globalStats.multiplier > 1.0 ? 'var(--accent-color)' : 'inherit'}}>{globalStats.multiplier?.toFixed(1) || '1.0'}x</strong>
            </div>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="terminal-btn" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(255,215,0,0.1)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.3)'}} onClick={() => setShowLeaderboard(true)}>
              <Activity size={16} /> 全球節點排行榜 (Leaderboard)
            </button>
            <button className="terminal-btn" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'}} onClick={() => setShowAboutModal(true)}>
              <Info size={16} /> 檔案說明與系統資訊
            </button>
            {!window.electronAPI && (
              <a href="https://drive.google.com/uc?export=download&id=1Xji_z7dB5Q16FfSyRvnm2mXqn3n0cAQ2" target="_blank" rel="noopener noreferrer" className="terminal-btn" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(0, 255, 170, 0.1)', color: '#00ffaa', border: '1px solid rgba(0, 255, 170, 0.3)', textDecoration: 'none'}}>
                <Monitor size={16} /> 下載專屬電腦版 (Discord 連動)
              </a>
            )}
          </div>
        </aside>

        {/* Right Geographic Matrix */}
        <main className="geographic-matrix">
          <div className="map-overlays" style={{display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'flex-start'}}>
            <div className="floating-panel" style={{display: 'flex', gap: '30px', padding: '15px 25px'}}>
              <div className="overlay-item">
                <div className="overlay-title" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                  <Globe2 size={16} /> 全球總掛機時間
                </div>
                <div className="overlay-value">{formatTime(globalStats.globalProduction)}</div>
              </div>
              <div style={{width: '1px', background: 'var(--border-color)'}}></div>
              <div className="overlay-item">
                <div className="overlay-title" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                  <Server size={16} /> 伺服器即時負載
                </div>
                <div className="overlay-value" style={{color: 'var(--danger-color)'}}>
                  {globalStats.totalPopulation > 0 ? ((globalStats.activeUsers / globalStats.totalPopulation) * 100).toFixed(1) : 0}%
                </div>
              </div>
              <div style={{width: '1px', background: 'var(--border-color)'}}></div>
              <div className="overlay-item">
                <div className="overlay-title" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                  <Network size={16} /> 連線延遲 (Ping)
                </div>
                <div className="overlay-value" style={{fontSize: '1.2rem', marginTop: '4px'}}>{ping} ms</div>
              </div>
            </div>
          </div>
          <DataCenterVisualizer 
            lifespan={lifespan} 
            bonusPoints={myNode?.accumulatedBonusPoints || 0} 
            ping={ping}
            onlineCount={globalStats.activeUsers || 0}
            cpuUsage={globalStats.systemHardware?.cpu || 0}
            region={region}
            onOpenSocial={() => setShowSocialModal(true)}
          />

          {/* Bottom Console Log Module */}
          <Draggable nodeRef={logRef} handle=".log-header">
            <div ref={logRef} className="bottom-log-console" style={{display: 'flex', flexDirection: 'column', height: '250px'}}>
              <div className="log-header" style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-color)', cursor: 'move'}}>
              <Activity size={16} /> 世界頻道 / 系統日誌 (World Chat)
            </div>
            <div className="log-content" style={{flex: 1, overflowY: 'auto'}}>
              {logs.map((log, i) => {
                let logColor = 'inherit';
                if (log.isChat) logColor = '#FFF';
                if (log.isDiscordChat) logColor = 'var(--info-color)';
                if (log.isWarning) logColor = 'var(--danger-color)';
                
                return (
                  <div key={i} style={{ 
                    color: logColor, 
                    marginTop: '4px', 
                    display: 'flex', 
                    gap: '8px',
                    alignItems: 'flex-start'
                  }}>
                    <span style={{color: 'var(--accent-color)', opacity: 0.7}}>&gt;</span> 
                    {log.avatar && (
                      <img src={log.avatar} alt="avatar" style={{width: '20px', height: '20px', borderRadius: '50%'}} />
                    )}
                    <span style={{wordBreak: 'break-all', opacity: (log.isChat || log.isDiscordChat) ? 1 : 0.8}}>
                      <span style={{color: '#888', marginRight: '5px'}}>[{log.time}]</span>
                      {log.text}
                    </span>
                  </div>
                );
              })}
              <div ref={logEndRef} />
            </div>
            <form 
              onSubmit={handleChatSubmit} 
              onMouseDown={e => e.stopPropagation()} 
              style={{display: 'flex', borderTop: '1px solid rgba(255,255,255,0.1)', padding: '5px'}}
            >
              <input 
                type="text" 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder={t("輸入訊息，與全球節點交流...")}
                maxLength={200}
                style={{flex: 1, background: 'var(--bg-light)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '8px', borderRadius: '4px', outline: 'none', fontSize: '0.9rem'}}
              />
              <button type="submit" style={{background: 'var(--accent-color)', color: '#000', border: 'none', padding: '0 15px', borderRadius: '4px', marginLeft: '5px', fontWeight: 'bold', cursor: 'pointer'}}>
                發送
              </button>
            </form>
          </div>
          </Draggable>
        </main>
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="modal-overlay" onClick={() => setShowLeaderboard(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="modal-content" style={{
            maxWidth: '900px', width: '90%', maxHeight: '85vh', overflowY: 'auto',
            background: 'var(--surface-color)', borderRadius: '12px', padding: '30px',
            border: '1px solid var(--border-color)', boxShadow: '0 0 40px rgba(0,255,204,0.1)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px', flexWrap: 'wrap', gap: '15px'}}>
              <h2 style={{margin: 0, color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.5rem'}}>
                <Globe2 size={28} className="icon-spin" /> 全球節點排行榜 (GLOBAL LEADERBOARD)
              </h2>
              <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                <button className="terminal-btn" style={{
                  padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
                  width: 'auto', // Override .terminal-btn width: 100%
                  background: sortMode === 'points' ? 'var(--accent-color)' : 'transparent', 
                  color: sortMode === 'points' ? '#ffffff' : 'var(--text-secondary)',
                  border: sortMode === 'points' ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                  fontWeight: sortMode === 'points' ? 'bold' : 'normal',
                  boxShadow: 'none', borderRadius: '4px'
                }} onClick={() => setSortMode('points')}>
                  <Star size={16} /> 依點數排行
                </button>
                <button className="terminal-btn" style={{
                  padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
                  width: 'auto',
                  background: sortMode === 'time' ? 'var(--accent-color)' : 'transparent', 
                  color: sortMode === 'time' ? '#ffffff' : 'var(--text-secondary)',
                  border: sortMode === 'time' ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                  fontWeight: sortMode === 'time' ? 'bold' : 'normal',
                  boxShadow: 'none', borderRadius: '4px'
                }} onClick={() => setSortMode('time')}>
                  <Clock size={16} /> 依時間排行
                </button>
                <button className="terminal-btn" style={{
                  padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
                  width: 'auto',
                  background: 'transparent', color: 'var(--text-secondary)', 
                  border: '1px solid var(--border-color)', marginLeft: '10px',
                  boxShadow: 'none', borderRadius: '4px'
                }} onClick={() => setShowLeaderboard(false)}>
                  <X size={16} /> 關閉
                </button>
              </div>
            </div>
            
            <table style={{width: '100%', fontSize: '0.9rem', color: 'var(--text-secondary)', borderCollapse: 'collapse', textAlign: 'left'}}>
              <thead>
                <tr style={{borderBottom: '1px solid rgba(255,255,255,0.2)'}}>
                  <th style={{padding: '12px 8px', color: 'var(--text-primary)'}}>排名</th>
                  <th style={{padding: '12px 8px', color: 'var(--text-primary)'}}>頭像</th>
                  <th style={{padding: '12px 8px', color: 'var(--text-primary)'}}>使用者 ID</th>
                  <th style={{padding: '12px 8px', color: 'var(--text-primary)'}}>國家/地區</th>
                  <th style={{padding: '12px 8px', color: sortMode === 'time' ? '#00ffcc' : 'var(--text-primary)'}}>累積在線時間 {sortMode === 'time' && '▼'}</th>
                  <th style={{padding: '12px 8px', color: sortMode === 'points' ? 'var(--accent-color)' : 'var(--text-primary)'}}>累積點數 {sortMode === 'points' && '▼'}</th>
                  <th style={{padding: '12px 8px', color: 'var(--text-primary)'}}>目前 Discord 實際身分組</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{padding: '20px', textAlign: 'center'}}>載入中或尚無資料...</td>
                  </tr>
                )}
                {[...leaderboard].sort((a, b) => sortMode === 'points' ? b.points - a.points : b.idleTime - a.idleTime).map((user, idx) => (
                  <tr key={user.username} style={{
                    borderBottom: '1px solid rgba(255,255,255,0.05)', 
                    color: idx === 0 ? 'var(--accent-color)' : 'inherit',
                    backgroundColor: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'
                  }}>
                    <td style={{padding: '12px 8px', fontWeight: idx === 0 ? 'bold' : 'normal'}}>#{idx + 1}</td>
                    <td style={{padding: '12px 8px'}}>
                      {user.avatar ? <img src={user.avatar} alt="avatar" style={{width: '32px', height: '32px', borderRadius: '50%', border: idx === 0 ? '2px solid var(--accent-color)' : 'none'}} /> : '無'}
                    </td>
                    <td style={{padding: '12px 8px', fontWeight: 'bold', color: 'var(--text-main)'}}>{user.discordName !== '未綁定' ? user.discordName : user.username}</td>
                    <td style={{padding: '12px 8px'}}><div style={{display: 'flex', alignItems: 'center', gap: '5px'}}><MapPin size={16} /> {user.country || 'UNKNOWN'} 伺服器</div></td>
                    <td style={{padding: '12px 8px'}}>{formatTime(user.idleTime)}</td>
                    <td style={{padding: '12px 8px', fontFamily: 'monospace', fontSize: '1.1rem'}}>{Number(user.points).toFixed(1)}</td>
                    <td style={{
                      padding: '12px 8px', 
                      fontWeight: 'bold',
                      color: (user.role || '').includes('無業遊民') ? '#F1C40F' :
       (user.role || '').includes('財務自由') ? '#2ECC71' :
       (user.role || '').includes('月光族') ? '#E67E22' :
 'var(--text-secondary)'
                    }}>
                      {user.role || '平民'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showDiscordModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{maxWidth: '500px'}}>
            <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--info-color)'}}>
              <LinkIcon /> 連結 Discord 帳號
            </h3>
            
            {!showManualBind ? (
              <>
                <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '25px', lineHeight: '1.6'}}>
                  透過官方驗證安全登入，連結後將即時同步您最新的 Discord 大頭貼與暱稱。<br/>
                  <span style={{color: 'var(--accent-color)'}}>※ 我們僅會獲取您的公開基本資料，絕對安全。</span>
                </p>
                <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center'}}>
                  <a href="#" onClick={(e) => { e.preventDefault(); setShowManualBind(true); }} style={{color: '#888', fontSize: '0.85rem', marginRight: 'auto', textDecoration: 'underline'}}>無法使用授權？點此手動綁定</a>
                  <button type="button" onClick={() => setShowDiscordModal(false)} className="terminal-btn" style={{padding: '10px 15px', background: 'rgba(255,255,255,0.1)'}}>取消</button>
                  <button onClick={handleBindDiscord} className="terminal-btn" style={{padding: '10px 20px', background: 'var(--info-color)', color: '#fff', border: 'none', fontWeight: 'bold'}}>
                    🔗 前往 Discord 官方授權
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleBindDiscordManual}>
                <p style={{color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '15px', lineHeight: '1.6'}}>
                  手動輸入需開啟開發者模式，請依照下方圖示指示，對著您的頭像點擊右鍵複製。
                </p>
                <div className="discord-mock-menu">
                  <div className="discord-mock-item">編輯個人資料</div>
                  <div className="discord-mock-item" style={{color: '#ed4245'}}>請勿打擾</div>
                  <div className="discord-mock-item">切換帳號</div>
                  <div className="discord-mock-item discord-mock-highlight">複製使用者 ID</div>
                </div>
                <input 
                  type="text" 
                  placeholder="在此貼上您複製的 ID (例如: 123456789012345678)" 
                  value={discordId}
                  onChange={e => setDiscordId(e.target.value)}
                  className="terminal-input"
                  style={{marginBottom: '20px', marginTop: '15px', width: '100%', boxSizing: 'border-box'}}
                  required
                />
                <div style={{display: 'flex', gap: '10px'}}>
                  <button type="button" className="terminal-btn" style={{flex: 1, background: 'rgba(255,255,255,0.1)'}} onClick={() => setShowManualBind(false)}>返回</button>
                  <button type="submit" className="terminal-btn" style={{flex: 1}}>確認手動綁定</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Full Page About Documentation */}
      {showAboutModal && <DocumentationOverlay onClose={() => setShowAboutModal(false)} />}
      {showSocialModal && <SocialModal onClose={() => setShowSocialModal(false)} socialTab={socialTab} setSocialTab={setSocialTab} socialData={socialData} socket={socket} />}
      {showShopModal && <ShopModal onClose={() => setShowShopModal(false)} pts={myNode?.accumulatedBonusPoints} onBuy={(id) => { if (socket?.connected) { socket.emit('buy_item', id); } else { alert('連線未就緒，無法購買'); } }} />}

      {showAccountInfo && <AccountInfoModal token={token} apiUrl={API_URL} onClose={() => setShowAccountInfo(false)} onLogout={onLogout} />}

      {showThemeMenu && (
        <div className="modal-overlay" onClick={() => setShowThemeMenu(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--surface-color, #161d2e)',
            border: '1px solid var(--border-color, #1e293b)',
            borderRadius: '12px', padding: '30px', maxWidth: '500px', width: '90%',
            color: 'var(--text-color, #e2e8f0)',
          }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Palette size={20} /> 選擇主題配色
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {Object.entries(themes).map(([key, t]) => (
                <button key={key} onClick={() => { setTheme(key); setShowThemeMenu(false); }} style={{
                  padding: '16px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center',
                  background: theme === key ? t.accent : t.surface,
                  color: theme === key ? '#000' : t.text,
                  border: theme === key ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                  fontWeight: theme === key ? 'bold' : 'normal',
                  transition: 'all 0.2s',
                }}>
                  <div style={{ fontSize: '14px', marginBottom: '8px' }}>{t.name}</div>
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: t.accent, display: 'inline-block' }} />
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: t.bg, display: 'inline-block', border: '1px solid ' + t.border }} />
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: t.text, display: 'inline-block' }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <audio ref={audioRef} src="https://upload.wikimedia.org/wikipedia/commons/4/4b/Ambient_music_-_beautiful_piano.ogg" loop />
    </div>
  );
}

function AccountInfoModal({ token, apiUrl, onClose, onLogout }) {
  const { t, language, setLanguage } = useLanguage();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [isSendingVerify, setIsSendingVerify] = useState(false);

  useEffect(() => {
    fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setInfo(data);
      })
      .catch(() => setError('伺服器連線失敗'));
  }, [token]);

  const handleGenerateKey = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const res = await fetch(`${apiUrl}/auth/generate-recovery-key`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setInfo(prev => ({ ...prev, recoveryKey: data.recoveryKey }));
        setShowKey(true);
      } else {
        alert(data.error || '生成失敗');
      }
    } catch (err) {
      alert('連線失敗');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmText = prompt('警告：刪除帳號將會永久清除您的所有生存時間與榮譽點數，無法恢復！\n請輸入大寫的 DELETE 來確認刪除：');
    if (confirmText !== 'DELETE') return;

    try {
      const res = await fetch(`${apiUrl}/auth/delete-account`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert('您的帳號已經被永久刪除。');
        onClose();
        if (onLogout) onLogout();
      } else {
        alert(data.error || '刪除失敗');
      }
    } catch (err) {
      alert('連線失敗');
    } finally {
      setIsSendingVerify(false);
    }
  };

  const handleSendVerify = async () => {
    if (!info) return;
    const targetEmail = info.email || emailInput;
    if (!targetEmail) return alert('請輸入電子郵件');
    
    setIsSendingVerify(true);
    try {
      const res = await fetch(`${apiUrl}/auth/send-verification`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ token, email: targetEmail })
      });
      const data = await res.json();
      if (res.ok) {
        alert('驗證信已送出，請檢查您的信箱（包含垃圾信件匣）。');
        // Update local info state to reflect the email
        setInfo(prev => ({ ...prev, email: targetEmail, isEmailVerified: false }));
      } else {
        alert(data.error || '發送失敗');
      }
    } catch (err) {
      alert('連線失敗');
    }
    setIsSendingVerify(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
    }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{
        width: '480px', background: 'rgba(18, 20, 25, 0.95)', borderRadius: '16px', padding: '35px',
        border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(16px)',
        fontFamily: 'var(--font-sans)', color: 'var(--text-main)', position: 'relative'
      }}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px', paddingBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.06)'}}>
          <h2 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-color)', fontSize: '1.4rem', fontWeight: '700'}}>
            <User size={22} color="#3b82f6" /> 帳號設定與安全
          </h2>
          <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            {!window.electronAPI && (
              <a href="https://earthonline.onrender.com/downloads/EarthOnlineSetup.exe" style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--success-color)', textDecoration: 'none', background: 'rgba(16, 185, 129, 0.1)', padding: '6px 12px', borderRadius: '8px', fontWeight: '600'}}>
                📥 下載專屬電腦版
              </a>
            )}
            <X size={20} style={{cursor: 'pointer', color: 'var(--text-dim)', transition: 'color 0.2s'}} onClick={onClose} onMouseOver={e => e.currentTarget.style.color = '#fff'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-dim)'} />
          </div>
        </div>
        
        {error ? <div style={{color: 'var(--danger-color)', padding: '15px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px'}}>{error}</div> : !info ? <div style={{color: 'var(--text-dim)', textAlign: 'center', padding: '30px 0'}}>讀取帳戶資訊中...</div> : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)'}}>
              <span style={{color: 'var(--text-dim)'}}>代號 (Subject ID)</span>
              <strong style={{color: 'var(--text-color)'}}>{info.username}</strong>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)'}}>
              <span style={{color: 'var(--text-dim)'}}>連線建立日 (Joined)</span>
              <strong style={{color: 'var(--text-color)'}}>{new Date(info.createdAt).toLocaleDateString()}</strong>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)'}}>
              <span style={{color: 'var(--text-dim)'}}>累積生存時間</span>
              <strong style={{color: 'var(--text-color)'}}>{(info.accumulatedTime / 3600).toFixed(1)} 小時</strong>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)'}}>
              <span style={{color: 'var(--text-dim)'}}>榮譽點數 (PT)</span>
              <strong style={{color: 'var(--info-color)'}}>{Number(info.accumulatedBonusPoints || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}</strong>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', padding: '8px 0'}}>
              <span style={{color: 'var(--text-dim)'}}>Discord 通訊協定</span>
              <strong style={{color: info.discord && info.discord.username ? 'var(--info-color)' : 'var(--text-dim)'}}>
                {info.discord && info.discord.username ? info.discord.username : '未綁定'}
              </strong>
            </div>
            <div style={{marginTop: '25px', padding: '20px', background: 'rgba(239, 68, 68, 0.05)', borderLeft: '4px solid #ef4444', borderRadius: '0 8px 8px 0'}}>
              <div style={{color: 'var(--danger-color)', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <ShieldCheck size={18} /> 專屬恢復金鑰 (Recovery Key)
              </div>
              <p style={{fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '15px', lineHeight: '1.5'}}>
                如果您遺失密碼，這是【唯一】能找回帳號的憑證，請妥善保管並勿洩漏給他人。
              </p>
              <div style={{display: 'flex', gap: '10px'}}>
                {info.recoveryKey === '未產生' ? (
                  <button disabled={isGenerating} style={{flex: 1, padding: '10px', background: isGenerating ? 'var(--text-dim)' : 'var(--danger-color)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: isGenerating ? 'not-allowed' : 'pointer', transition: 'background 0.2s'}} onClick={handleGenerateKey} onMouseOver={e => { if(!isGenerating) e.currentTarget.style.background = 'var(--danger-color)'; }} onMouseOut={e => { if(!isGenerating) e.currentTarget.style.background = 'var(--danger-color)'; }}>
                    {isGenerating ? '生成中...' : '生成專屬金鑰'}
                  </button>
                ) : (
                  <>
                    <input 
                      type={showKey ? "text" : "password"} 
                      value={info.recoveryKey} 
                      readOnly 
                      style={{flex: 1, letterSpacing: showKey ? '1px' : '3px', background: 'var(--bg-light)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '10px', borderRadius: '6px', outline: 'none'}}
                    />
                    <button style={{padding: '0 15px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s'}} onClick={() => setShowKey(!showKey)} onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}>
                      {showKey ? '隱藏' : '顯示'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Email Binding Section */}
            <div style={{marginTop: '15px', padding: '20px', background: 'rgba(16, 185, 129, 0.05)', borderLeft: '4px solid #10b981', borderRadius: '0 8px 8px 0'}}>
              <div style={{color: 'var(--success-color)', fontWeight: '600', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                <ShieldCheck size={18} /> 安全信箱綁定
              </div>
              <p style={{fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '15px', lineHeight: '1.5'}}>
                綁定信箱可獲得額外的帳號保護，若遺失密碼可透過信箱快速找回。
              </p>
              {info.isEmailVerified ? (
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success-color)', background: 'rgba(16,185,129,0.1)', padding: '10px 15px', borderRadius: '6px'}}>
                  <CheckCircle size={16} /> <span style={{fontWeight: '500'}}>已綁定：{info.email}</span>
                </div>
              ) : info.email ? (
                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                  <span style={{color: 'var(--warning-color)', flex: 1, background: 'rgba(245,158,11,0.1)', padding: '10px', borderRadius: '6px'}}>⏳ 等待驗證：{info.email}</span>
                  <button style={{padding: '10px 15px', background: 'var(--success-color)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer'}} onClick={handleSendVerify} disabled={isSendingVerify}>
                    {isSendingVerify ? '發送中...' : '重發驗證信'}
                  </button>
                </div>
              ) : (
                <div style={{display: 'flex', gap: '10px'}}>
                  <input 
                    type="email" 
                    placeholder="輸入電子郵件..." 
                    value={emailInput} 
                    onChange={e => setEmailInput(e.target.value)} 
                    style={{flex: 1, background: 'var(--bg-light)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '10px 15px', borderRadius: '6px', outline: 'none'}}
                  />
                  <button style={{padding: '0 20px', background: 'var(--success-color)', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s'}} onClick={handleSendVerify} disabled={isSendingVerify} onMouseOver={e => e.currentTarget.style.background = 'var(--success-color)'} onMouseOut={e => e.currentTarget.style.background = 'var(--success-color)'}>
                    {isSendingVerify ? '發送中...' : '綁定'}
                  </button>
                </div>
              )}
            </div>

            <div style={{marginTop: '25px', textAlign: 'center'}}>
              <button 
                style={{background: 'transparent', color: 'var(--text-dim)', border: 'none', padding: '8px 16px', fontSize: '0.85rem', cursor: 'pointer', transition: 'color 0.2s'}} 
                onClick={handleDeleteAccount}
                onMouseOver={e => e.currentTarget.style.color = 'var(--danger-color)'}
                onMouseOut={e => e.currentTarget.style.color = 'var(--text-dim)'}
              >
                刪除帳號 (無法恢復)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const { t, language, setLanguage } = useLanguage();
  const [token, setToken] = useState(localStorage.getItem('eo_token'));
  const [region, setRegion] = useState(localStorage.getItem('eo_region') || 'asia');

  const handleLogin = (newToken, username, selectedRegion) => {
    localStorage.setItem('eo_token', newToken);
    if (selectedRegion) {
      localStorage.setItem('eo_region', selectedRegion);
      setRegion(selectedRegion);
    }
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('eo_token');
    localStorage.removeItem('eo_region');
    setToken(null);
  };

  if (!token) {
    return <LoginGateway onLogin={handleLogin} />;
  }

  return <Dashboard token={token} onLogout={handleLogout} region={region} />;
}

function SocialModal({ onClose, socialTab, setSocialTab, socialData, socket }) {
  const { t, language, setLanguage } = useLanguage();
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
          <Users size={24} /> 社交網路 (Social Matrix)
        </h2>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
          <button onClick={() => setSocialTab('all')} style={{ flex: 1, padding: '8px', background: socialTab === 'all' ? 'var(--accent-color)' : 'transparent', color: socialTab === 'all' ? '#000' : '#fff', border: '1px solid var(--accent-color)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>全服玩家</button>
          <button onClick={() => setSocialTab('friends')} style={{ flex: 1, padding: '8px', background: socialTab === 'friends' ? 'var(--accent-color)' : 'transparent', color: socialTab === 'friends' ? '#000' : '#fff', border: '1px solid var(--accent-color)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>好友列表</button>
          <button onClick={() => setSocialTab('requests')} style={{ flex: 1, padding: '8px', background: socialTab === 'requests' ? 'var(--accent-color)' : 'transparent', color: socialTab === 'requests' ? '#000' : '#fff', border: '1px solid var(--accent-color)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            交友邀請 {socialData.friendRequests?.length > 0 && <span style={{ background: 'var(--danger-color)', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontSize: '0.8rem', marginLeft: '5px' }}>{socialData.friendRequests.length}</span>}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {socialTab === 'all' && (
            socialData.allPlayers?.length === 0 ? <div style={{textAlign: 'center', color: '#888'}}>查無資料</div> :
            socialData.allPlayers?.map(p => (
              <div key={p.username} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: p.online ? '#0f0' : '#888', fontWeight: 'bold' }}>●</span>
                  <span>{p.username} [{p.country}]</span>
                </div>
                {!socialData.friends?.find(f => f.username === p.username) && (
                  <button 
                    onClick={(e) => {
                      socket.emit('send_friend_request', { targetUsername: p.username });
                      e.target.disabled = true;
                      e.target.innerText = '已發送';
                      e.target.style.background = 'rgba(255,255,255,0.1)';
                      e.target.style.color = '#888';
                      e.target.style.borderColor = '#888';
                    }} 
                    style={{ background: 'rgba(0,255,136,0.2)', border: '1px solid var(--accent-color)', color: 'var(--accent-color)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    加好友
                  </button>
                )}
              </div>
            ))
          )}

          {socialTab === 'friends' && (
            socialData.friends?.length === 0 ? <div style={{textAlign: 'center', color: '#888'}}>目前沒有好友</div> :
            socialData.friends?.map(f => (
              <div key={f.username} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: f.online ? '#0f0' : '#888', fontWeight: 'bold' }}>●</span>
                  <span>{f.username}</span>
                </div>
                <button onClick={() => {
                  if (window.confirm(`確定要刪除好友 ${f.username} 嗎？`)) {
                    socket.emit('remove_friend', { targetUsername: f.username });
                  }
                }} style={{ background: 'rgba(255,65,108,0.2)', border: '1px solid var(--danger-color)', color: 'var(--danger-color)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>刪除</button>
              </div>
            ))
          )}

          {socialTab === 'requests' && (
            socialData.friendRequests?.length === 0 ? <div style={{textAlign: 'center', color: '#888'}}>目前沒有邀請</div> :
            socialData.friendRequests?.map(req => (
              <div key={req} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '5px' }}>
                <span>{req} 想要加您為好友</span>
                <div style={{ display: 'flex', gap: '5px' }}>
                  <button onClick={() => socket.emit('accept_friend_request', { targetUsername: req })} style={{ background: 'var(--accent-color)', color: '#000', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>接受</button>
                  <button onClick={() => socket.emit('reject_friend_request', { targetUsername: req })} style={{ background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>拒絕</button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Footer / Open Source Badge */}
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

export default App;
