import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Rectangle, CircleMarker, Popup } from 'react-leaflet';
import { io } from 'socket.io-client';
import { Globe2, Server, Activity, User, Network, Link as LinkIcon, ShieldCheck, Info, BookOpen, FileText, Database, Code, X } from 'lucide-react';
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

function DocumentationOverlay({ onClose }) {
  return (
    <div className="doc-overlay">
      <div className="doc-header">
        <h2 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '15px', color: 'var(--text-main)'}}>
          <BookOpen className="icon-glow" color="var(--accent-color)" size={28} />
          EARTH ONLINE 系統文獻與參考資料
        </h2>
        <button onClick={onClose} className="terminal-btn" style={{padding: '8px 20px', width: 'auto', display: 'flex', alignItems: 'center', gap: '8px'}}>
          <X size={18} /> 關閉檔案
        </button>
      </div>

      <div className="doc-content">
        
        <div className="doc-section">
          <h2><FileText size={24} /> 文獻說明 (Literature & Concept)</h2>
          <p>
            「地球在線 (EARTH ONLINE)」是一個基於《三體》概念與賽博龐克美學啟發的實驗性全球網路觀測專案。其核心理念在於將全球四散的網路節點（使用者）具象化為實體地理座標上的「觀測站」，並透過即時的雙向 WebSocket 通訊，建構出一個去中心化且具備高度同步性的虛擬拓樸網路。
          </p>
          <p>
            本系統嘗試探討在高度資訊化的未來，人類個體如何作為巨型系統架構中的微小神經元運作。每一個登入的帳號，皆代表著為全球伺服器矩陣貢獻運算能力與觀測數據的終端節點。
          </p>
        </div>

        <div className="doc-section">
          <h2><Database size={24} /> 資料檔案與技術架構 (Data Files & Architecture)</h2>
          <ul>
            <li><strong>前端框架 (Client):</strong> React 18, Vite, React-Leaflet (GIS 地理資訊系統渲染)</li>
            <li><strong>後端核心 (Server):</strong> Node.js, Express, Socket.IO (處理全雙工即時通訊與封包廣播)</li>
            <li><strong>部署架構 (Infrastructure):</strong> Render 雲端運算節點、Cloudflare CDN 全球邊緣加速</li>
            <li><strong>狀態機制 (State Mechanics):</strong> 全局掛機時間 (Global Production)、社會總壓迫常數 (Social Compression)</li>
          </ul>
        </div>

        <div className="doc-section">
          <h2><LinkIcon size={24} /> 參考來源 (Reference Sources)</h2>
          <ul>
            <li><strong>GIS 圖資來源:</strong> Esri World Imagery, OpenStreetMap, CartoDB Dark Matter</li>
            <li><strong>3D 地球紋理貼圖:</strong> ThreeGlobe / Blue Marble (NASA)</li>
            <li><strong>UI 介面圖示集:</strong> Lucide React Icons</li>
            <li><strong>Discord API 代理:</strong> dcdn.dstn.to (用於免驗證即時抓取使用者公開資訊)</li>
          </ul>
        </div>

        <div className="doc-section">
          <h2><Code size={24} /> 開發者資訊 (Developer Info)</h2>
          <p>本系統由獨立開發者進行架構設計、UI/UX 規劃與全端程式撰寫。</p>
          <ul>
            <li><strong>開發者 (Developer):</strong> 胡家綸</li>
            <li><strong>聯絡信箱 (Contact Email):</strong> <a href="mailto:huchialun97@gmail.com" style={{color: 'var(--accent-color)', textDecoration: 'underline'}}>huchialun97@gmail.com</a></li>
          </ul>
        </div>

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
  const [discordId, setDiscordId] = useState('');
  const [mapTheme, setMapTheme] = useState('satellite');
  
  // Fake bound Discord data for UI demo (since backend DB isn't fully updated yet)
  const [boundDiscord, setBoundDiscord] = useState(null);

  const handleBindDiscord = async (e) => {
    e.preventDefault();
    if (!discordId) return;
    
    // Check if it's a snowflake ID (numbers only)
    if (!/^\d{17,20}$/.test(discordId)) {
      alert('請輸入您的 Discord「使用者 ID」(17~20碼數字)，而非使用者名稱！\n如果您不知道如何取得，請在 Discord 設定 > 進階 中開啟「開發者模式」，然後對著您的頭像點右鍵選擇「複製使用者 ID」。');
      return;
    }

    try {
      addLog(`[SYS] 正在透過中繼伺服器驗證 Discord ID: ${discordId}...`);
      const res = await fetch(`https://dcdn.dstn.to/profile/${discordId}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      
      const avatarUrl = data.user.avatar 
        ? `https://cdn.discordapp.com/avatars/${data.user.id}/${data.user.avatar}.png?size=128`
        : `https://cdn.discordapp.com/embed/avatars/${(BigInt(data.user.id) >> 22n) % 6n}.png`;
        
      setBoundDiscord({
        username: data.user.global_name || data.user.username,
        avatar: avatarUrl
      });
      setShowDiscordModal(false);
      addLog(`系統通知：成功綁定 Discord 帳號 [${data.user.global_name || data.user.username}]`);
    } catch (err) {
      alert('找不到該 Discord 使用者，請確認 ID 是否正確，或稍後再試。');
      addLog(`[ERROR] Discord 驗證失敗: 查無此 ID 或 API 限流`);
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

    s.on('init_data', (data) => {
      setMyNode(data);
      addLog(`身分確認：節點 [${data.username}] 成功接入全球網路`);
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
    if (!myNode) return;
    
    const interval = setInterval(() => {
      setLifespan(Math.floor((Date.now() - myNode.connectedAt) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [myNode]);

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

          <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
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
            zoom={2} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <div style={{position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000, display: 'flex', gap: '10px'}}>
              <button className="terminal-btn" style={{padding: '8px 12px', fontSize: '0.8rem', background: mapTheme === 'satellite' ? 'var(--accent-color)' : 'rgba(0,0,0,0.6)', color: mapTheme === 'satellite' ? '#000' : 'var(--text-primary)'}} onClick={() => setMapTheme('satellite')}>衛星</button>
              <button className="terminal-btn" style={{padding: '8px 12px', fontSize: '0.8rem', background: mapTheme === 'dark' ? 'var(--accent-color)' : 'rgba(0,0,0,0.6)', color: mapTheme === 'dark' ? '#000' : 'var(--text-primary)'}} onClick={() => setMapTheme('dark')}>暗黑</button>
              <button className="terminal-btn" style={{padding: '8px 12px', fontSize: '0.8rem', background: mapTheme === 'street' ? 'var(--accent-color)' : 'rgba(0,0,0,0.6)', color: mapTheme === 'street' ? '#000' : 'var(--text-primary)'}} onClick={() => setMapTheme('street')}>街道</button>
            </div>

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

      {/* Discord Binding Modal */}
      {showDiscordModal && (
        <div className="modal-overlay">
          <div className="modal-box floating-panel">
            <h3 style={{display: 'flex', alignItems: 'center', gap: '10px', marginTop: 0}}>
              <LinkIcon size={20} /> 連結您的 Discord
            </h3>
            <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '10px'}}>
              為了抓取您的真實大頭貼，請輸入您的 <strong style={{color: 'var(--accent-color)'}}>Discord 使用者 ID</strong> (一串數字，非名稱)。
            </p>
            <p style={{color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '20px', background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '4px'}}>
              👉 <strong style={{color: '#fff'}}>如何取得？</strong> 請先在 Discord 的「設定 &gt; 進階」開啟「開發者模式」，然後對著您自己的頭像點右鍵選擇「複製使用者 ID」。
            </p>
            <form onSubmit={handleBindDiscord}>
              <input 
                type="text" 
                placeholder="貼上您的使用者 ID (例如: 123456789012345678)..." 
                value={discordId}
                onChange={e => setDiscordId(e.target.value)}
                className="terminal-input"
                style={{marginBottom: '15px'}}
                required
              />
              <div style={{display: 'flex', gap: '10px'}}>
                <button type="submit" className="terminal-btn" style={{flex: 1}}>確認綁定</button>
                <button type="button" className="terminal-btn" style={{flex: 1, background: 'rgba(255,255,255,0.1)'}} onClick={() => setShowDiscordModal(false)}>取消</button>
              </div>
            </form>
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
