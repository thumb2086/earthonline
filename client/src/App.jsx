import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Rectangle, CircleMarker, Popup, useMap } from 'react-leaflet';
import { io } from 'socket.io-client';
import { Globe2, Server, Activity, User, Network, Link as LinkIcon, ShieldCheck, Info, BookOpen, FileText, Database, Code, X, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import './index.css';

const API_URL = 'https://earthonline.onrender.com';
const SOCKET_URL = 'https://earthonline.onrender.com';

function LoginGateway({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isRegister ? '/api/register' : '/api/login';
    
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
        alert('註冊成功，請登入');
        setIsRegister(false);
      } else {
        onLogin(data.token, data.user.username);
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
          <div className="form-group">
            <label>SUBJECT ID (帳號)</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
              className="terminal-input"
            />
          </div>
          <div className="form-group">
            <label>ACCESS CODE (密碼)</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              className="terminal-input"
            />
          </div>
          <button type="submit" className="terminal-btn">
            {isRegister ? '建立節點連線 (註冊)' : '驗證並接入 (登入)'}
          </button>
        </form>
        
        <div style={{textAlign: 'center', marginTop: '15px'}}>
          <span 
            className="toggle-link" 
            onClick={() => setIsRegister(!isRegister)}
          >
            {isRegister ? '>> 返回登入程序' : '>> 申請新節點授權'}
          </span>
        </div>
      </div>
    </div>
  );
}

function MapController({ myNode, mapTheme, setMapTheme }) {
  const map = useMap();
  
  const handleLocate = () => {
    if (myNode && myNode.lat && myNode.lon) {
      map.flyTo([myNode.lat, myNode.lon], 5, { animate: true, duration: 1.5 });
    }
  };

  return (
    <div style={{position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000, display: 'flex', gap: '10px'}}>
      <button className="terminal-btn" style={{padding: '8px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.8)', border: '1px solid var(--accent-color)'}} onClick={handleLocate}>
        <Navigation size={14} /> 定位我的節點
      </button>
      <div style={{width: '1px', background: 'rgba(255,255,255,0.2)', margin: '0 5px'}}></div>
      <button className="terminal-btn" style={{padding: '8px 12px', fontSize: '0.8rem', background: mapTheme === 'satellite' ? 'var(--accent-color)' : 'rgba(0,0,0,0.6)', color: mapTheme === 'satellite' ? '#000' : 'var(--text-primary)'}} onClick={() => setMapTheme('satellite')}>衛星</button>
      <button className="terminal-btn" style={{padding: '8px 12px', fontSize: '0.8rem', background: mapTheme === 'dark' ? 'var(--accent-color)' : 'rgba(0,0,0,0.6)', color: mapTheme === 'dark' ? '#000' : 'var(--text-primary)'}} onClick={() => setMapTheme('dark')}>暗黑</button>
      <button className="terminal-btn" style={{padding: '8px 12px', fontSize: '0.8rem', background: mapTheme === 'street' ? 'var(--accent-color)' : 'rgba(0,0,0,0.6)', color: mapTheme === 'street' ? '#000' : 'var(--text-primary)'}} onClick={() => setMapTheme('street')}>街道</button>
    </div>
  );
}

function DocumentationOverlay({ onClose }) {
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
            <div className="doc-tag">TUTORIAL</div>
            <h1 className="doc-title">Discord Status Integration (Discord 狀態連動教學)</h1>
            <div className="doc-text">
              由於 Discord 官方的資安限制，網頁遊戲無法自動更改您的 Discord 狀態為「正在玩 地球在線」。若您希望在自己的 Discord 個人資料上炫耀您正在遊玩本系統，請依照以下步驟手動設定：
            </div>
            <div className="doc-text" style={{backgroundColor: 'rgba(255,255,255,0.05)', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #5865F2'}}>
              <ol style={{margin: 0, paddingLeft: '20px', lineHeight: '1.8'}}>
                <li>開啟您電腦上的 <strong>Discord 桌面版軟體</strong>。</li>
                <li>點擊左下角齒輪圖示進入 <strong>使用者設定 (User Settings)</strong>。</li>
                <li>在左側選單往下滑，找到 <strong>「已註冊的遊戲」 (Registered Games)</strong>。</li>
                <li>點擊畫面上方的 <strong>「加入它！」 (Add it!)</strong> 藍色按鈕。</li>
                <li>在下拉選單中選擇您目前正在用來玩地球在線的瀏覽器（例如：Google Chrome、Edge）。</li>
                <li>點擊「新增遊戲」後，它會出現在清單中。</li>
                <li>點擊清單中的瀏覽器名稱，將它<strong>重新命名為「地球在線」</strong>。</li>
              </ol>
            </div>
            <div className="doc-text" style={{marginTop: '15px'}}>
              設定完成後，只要您開著瀏覽器，所有 Discord 好友都會看到您華麗的狀態：<strong>「正在玩 地球在線」</strong>！
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

function Dashboard({ token, onLogout }) {
  const [socket, setSocket] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [myNode, setMyNode] = useState(null);
  const [globalStats, setGlobalStats] = useState({ activeUsers: 0, totalPopulation: 0, globalProduction: 0, socialCompression: '1.000' });
  const [lifespan, setLifespan] = useState(0);
  const [logs, setLogs] = useState(['[SYS] 地球在線終端連線建立中...', '[SYS] 正在載入全球節點矩陣...']);
  const [ping, setPing] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [showDiscordModal, setShowDiscordModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [mapTheme, setMapTheme] = useState('satellite');
  const [showManualBind, setShowManualBind] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  
  // Fetch leaderboard data
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/leaderboard`);
        if (res.ok) setLeaderboard(await res.json());
      } catch(err) {}
    };
    fetchLeaderboard();
    const intv = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(intv);
  }, []);

  // Fake bound Discord data for UI demo (since backend DB isn't fully updated yet)
  const [boundDiscord, setBoundDiscord] = useState(null);

  const handleBindDiscord = (e) => {
    e.preventDefault();
    const statePayload = btoa(JSON.stringify({ token, returnTo: window.location.origin }));
    const discordOAuthUrl = `${API_URL}/api/auth/discord?state=${statePayload}`;
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
      const res = await fetch(`${API_URL}/api/bind-discord-manual`, {
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

  const addLog = (msg) => {
    setLogs(prev => {
      const time = new Date().toISOString().substring(11, 19);
      return [...prev, `[${time}] ${msg}`].slice(-8); // Keep last 8 lines
    });
  };

  useEffect(() => {
    const s = io(SOCKET_URL);
    setSocket(s);

    s.on('connect', () => {
      s.emit('authenticate', { token });
      addLog('驗證金鑰已發送，等待授權...');
      setIsConnected(true);
    });

    s.on('auth_error', () => {
      alert('授權已過期，請重新登入');
      setIsConnected(false);
      onLogout();
    });

    s.on('init_data', async (data) => {
      setMyNode(data);
      addLog(`身分確認：節點 [${data.username}] 成功接入全球網路`);
      
      // Auto-load Discord avatar if it's bound in database
      if (data.discordProfile) {
        setBoundDiscord({
          username: data.discordProfile.username,
          avatar: data.discordProfile.avatar
        });
      }
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
      setPing(Math.floor(Math.random() * 15) + 10); // Fake small ping variation for immersion
    });

    return () => {
      s.disconnect();
    };
  }, [token, onLogout]);

  // Lifespan timer
  useEffect(() => {
    if (!myNode || !myNode.createdAt) return;
    
    // Check if we are currently boosted
    const isBoosted = globalStats.multiplier && globalStats.multiplier > 1.0;
    const rate = isBoosted ? 1.2 : 1.0;
    
    let currentLocalLifespan = Math.floor((Date.now() - myNode.createdAt) / 1000) + (myNode.accumulatedBonusPoints || 0);

    const interval = setInterval(() => {
      currentLocalLifespan += rate;
      setLifespan(Math.floor(currentLocalLifespan));
    }, 1000);

    // Run once immediately
    setLifespan(Math.floor(currentLocalLifespan));

    return () => clearInterval(interval);
  }, [myNode, globalStats.multiplier]);

  // Format time HH:MM:SS
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const calculateHealthPercentage = (seconds) => {
    const totalLifespan = 36000; // 10 hours max
    const remaining = Math.max(0, totalLifespan - seconds);
    return (remaining / totalLifespan) * 100;
  };

  // Group nodes into a global pixel grid
  const gridSize = 3; // 3x3 degrees per pixel block
  const gridBlocks = {};

  nodes.forEach(node => {
    const gridLat = Math.floor(node.lat / gridSize) * gridSize;
    const gridLon = Math.floor(node.lon / gridSize) * gridSize;
    const gridId = `${gridLat},${gridLon}`;
    
    if (!gridBlocks[gridId]) {
      gridBlocks[gridId] = {
        lat: gridLat,
        lon: gridLon,
        count: 0,
        users: [],
        rawNodes: []
      };
    }
    gridBlocks[gridId].count += 1;
    gridBlocks[gridId].users.push(node.username);
    gridBlocks[gridId].rawNodes.push(node);
  });

  return (
    <div className="app-container">
      {/* Header Panel */}
      <header className="system-header">
        <div className="system-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Globe2 className="icon-spin" color="var(--accent-color)" size={24} /> 
          <span style={{fontWeight: 'bold', fontSize: '1.2rem'}}>地球在線</span> 
          <span style={{color: 'var(--text-secondary)'}}>// 所在伺服器地區 [{myNode?.country || '連線中...'}]</span>
        </div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="system-stats" style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            <div style={{display: 'flex', alignItems: 'center'}}>
              <span style={{color: 'var(--text-secondary)'}}>實時連線人數: <strong style={{color: 'var(--accent-color)'}}>{globalStats.activeUsers}</strong></span>
            </div>
            <div style={{display: 'flex', alignItems: 'center'}}>
              <span style={{color: 'var(--text-secondary)'}}>地球總人口: <strong style={{color: 'var(--text-primary)'}}>{globalStats.totalPopulation}</strong></span>
            </div>
            {!isConnected && <span style={{color: 'var(--danger-color)', fontWeight: 'bold'}}>[中斷連線]</span>}
          </div>
          <button onClick={onLogout} className="logout-btn" style={{padding: '5px 15px', borderRadius: '8px', background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)', color: 'var(--danger-color)', cursor: 'pointer'}}>中斷連線</button>
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

          <div className="metric-group profile-card">
            <div className="metric-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <User size={16} /> 使用者帳號 (User ID)
            </div>
            
            {boundDiscord ? (
              <div style={{display: 'flex', alignItems: 'center', gap: '15px', marginTop: '10px'}}>
                <img src={boundDiscord.avatar} alt="discord-avatar" style={{width: '48px', height: '48px', borderRadius: '50%', border: '2px solid var(--accent-color)'}} />
                <div>
                  <div style={{color: 'var(--text-main)', fontSize: '1.1rem', fontWeight: 'bold'}}>{boundDiscord.username}</div>
                  <div style={{color: 'var(--accent-color)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px'}}>
                    <ShieldCheck size={14} /> 已認證節點
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{color: 'var(--text-main)', fontSize: '1.2rem', fontWeight: 'bold'}}>{myNode?.username}</div>
                <div style={{marginTop: '10px'}}>
                  <a href="#" onClick={(e) => { e.preventDefault(); setShowDiscordModal(true); }} className="discord-link">
                    <LinkIcon size={14} /> 連結 Discord 帳號
                  </a>
                </div>
              </div>
            )}
            
            <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '15px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px'}}>
              NODE ID: {myNode?.userId}<br/>
              IP: {myNode?.ip}<br/>
              REGION: {myNode?.country}
            </div>
          </div>
          
          <div className="metric-group">
            <div className="metric-title" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Activity size={16} /> 本次上線時間 (Online Time)
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
              上傳 (Uplink): {Math.floor(Math.random()*500 + 100)} KB/s<br/>
              下載 (Downlink): {Math.floor(Math.random()*1500 + 500)} KB/s<br/>
              封包遺失 (Loss): 0.00%
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
          </div>
        </aside>

        {/* Right Geographic Matrix */}
        <main className="geographic-matrix">
          <div className="map-overlays">
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

          <MapContainer 
            center={[20, 0]} 
            zoom={2.5} 
            minZoom={2.5}
            maxBounds={[[-90, -180], [90, 180]]}
            maxBoundsViscosity={1.0}
            worldCopyJump={false}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <MapController myNode={myNode} mapTheme={mapTheme} setMapTheme={setMapTheme} />

            {mapTheme === 'satellite' && (
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              />
            )}
            {mapTheme === 'dark' && (
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              />
            )}
            {mapTheme === 'street' && (
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap contributors'
              />
            )}
            
            {/* Grid Pixel Blocks or Individual Points */}
            {Object.values(gridBlocks).map(block => {
              if (block.count >= 3) {
                // High density: Colored Block
                const intensity = Math.min(0.3 + (block.count * 0.1), 0.95);
                const blockColor = block.count >= 10 ? '#ff4444' : (block.count >= 5 ? '#ffaa00' : 'var(--accent-color)');
                return (
                  <Rectangle
                    key={`rect-${block.lat}-${block.lon}`}
                    bounds={[
                      [block.lat, block.lon],
                      [block.lat + gridSize, block.lon + gridSize]
                    ]}
                    pathOptions={{ 
                      color: blockColor, 
                      fillColor: blockColor, 
                      fillOpacity: intensity,
                      weight: 1
                    }}
                  >
                    <Popup>
                      <div style={{ fontFamily: 'var(--font-sans)' }}>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>熱區座標 [{block.lat}, {block.lon}]</div>
                        <div style={{ color: blockColor, fontWeight: 'bold', margin: '5px 0' }}>
                          高密度聚集: {block.count} 個節點
                        </div>
                        <div style={{ fontSize: '0.8rem' }}>
                          包含: {block.users.slice(0, 5).join(', ')}
                          {block.count > 5 ? ' ...等' : ''}
                        </div>
                      </div>
                    </Popup>
                  </Rectangle>
                );
              } else {
                // Low density: Individual Points
                return block.rawNodes.map(node => (
                  <CircleMarker
                    key={`node-${node.id}`}
                    center={[node.lat, node.lon]}
                    radius={5}
                    pathOptions={{ 
                      color: 'var(--accent-color)', 
                      fillColor: 'var(--accent-color)', 
                      fillOpacity: 0.9,
                      weight: 2
                    }}
                  >
                    <Popup>
                      <div style={{ fontFamily: 'var(--font-sans)' }}>
                        使用者: {node.username}
                      </div>
                    </Popup>
                  </CircleMarker>
                ));
              }
            })}
          </MapContainer>

          {/* Bottom Console Log Module */}
          <div className="bottom-log-console floating-panel">
            <div className="log-header" style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-color)'}}>
              <Activity size={16} /> 系統即時通知 (System Event Log)
            </div>
            <div className="log-content">
              {logs.map((log, i) => (
                <div key={i} style={{ color: log.includes('警告') ? 'var(--danger-color)' : 'var(--text-main)', marginTop: '4px' }}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="modal-overlay" onClick={() => setShowLeaderboard(false)}>
          <div className="modal-content" style={{maxWidth: '800px', width: '90%', maxHeight: '80vh', overflowY: 'auto'}} onClick={e => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px'}}>
              <h2 style={{margin: 0, color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '10px'}}>
                <Globe2 size={24} className="icon-spin" /> 全球節點排行榜 (Global Leaderboard)
              </h2>
              <button className="terminal-btn" style={{padding: '5px 10px'}} onClick={() => setShowLeaderboard(false)}>關閉 (Close)</button>
            </div>
            
            <table style={{width: '100%', fontSize: '0.9rem', color: 'var(--text-secondary)', borderCollapse: 'collapse', textAlign: 'left'}}>
              <thead>
                <tr style={{borderBottom: '1px solid rgba(255,255,255,0.2)'}}>
                  <th style={{padding: '12px 8px', color: 'var(--text-primary)'}}>排名</th>
                  <th style={{padding: '12px 8px', color: 'var(--text-primary)'}}>頭像</th>
                  <th style={{padding: '12px 8px', color: 'var(--text-primary)'}}>使用者 ID</th>
                  <th style={{padding: '12px 8px', color: 'var(--text-primary)'}}>累積在線時間</th>
                  <th style={{padding: '12px 8px', color: 'var(--text-primary)'}}>累積點數</th>
                  <th style={{padding: '12px 8px', color: 'var(--text-primary)'}}>目前 Discord 實際身分組</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan="6" style={{padding: '20px', textAlign: 'center'}}>載入中或尚無資料...</td>
                  </tr>
                )}
                {leaderboard.map((user, idx) => (
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
                    <td style={{padding: '12px 8px'}}>{formatTime(user.idleTime)}</td>
                    <td style={{padding: '12px 8px', fontFamily: 'monospace', fontSize: '1.1rem'}}>{Number(user.points).toFixed(1)}</td>
                    <td style={{
                      padding: '12px 8px', 
                      fontWeight: 'bold',
                      color: user.role.includes('無業遊民') ? '#F1C40F' : 
                             user.role.includes('財務自由') ? '#2ECC71' : 
                             user.role.includes('月光族') ? '#E67E22' : 'var(--text-secondary)'
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
            <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#5865F2'}}>
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
                  <button onClick={handleBindDiscord} className="terminal-btn" style={{padding: '10px 20px', background: '#5865F2', color: '#fff', border: 'none', fontWeight: 'bold'}}>
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
    </div>
  );
}

function App() {
  const [token, setToken] = useState(localStorage.getItem('eo_token'));
  
  const handleLogin = (newToken, username) => {
    localStorage.setItem('eo_token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('eo_token');
    setToken(null);
  };

  if (!token) {
    return <LoginGateway onLogin={handleLogin} />;
  }

  return <Dashboard token={token} onLogout={handleLogout} />;
}

export default App;
