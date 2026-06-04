import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Rectangle, CircleMarker, Popup } from 'react-leaflet';
import { io } from 'socket.io-client';
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
        <div style={{textAlign: 'center', marginBottom: '20px'}}>
          <img src="/logo.png" alt="logo" style={{width: '64px', height: '64px'}} />
          <h2 style={{fontFamily: 'var(--font-sans)', color: 'var(--accent-color)'}}>地球在線登入閘道</h2>
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

function Dashboard({ token, onLogout }) {
  const [socket, setSocket] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [myNode, setMyNode] = useState(null);
  const [globalStats, setGlobalStats] = useState({ activeUsers: 0, totalPopulation: 0, globalProduction: 0, socialCompression: '1.000' });
  const [lifespan, setLifespan] = useState(0);
  const [logs, setLogs] = useState(['[SYS] 地球在線終端連線建立中...', '[SYS] 正在載入全球節點矩陣...']);
  const [ping, setPing] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

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

  const calculateVitalSigns = (seconds) => {
    const blocks = 10;
    const decreaseRate = 3600; // 1 block per hour
    const filled = Math.max(1, blocks - Math.floor(seconds / decreaseRate));
    const empty = blocks - filled;
    return '●'.repeat(filled) + '○'.repeat(empty); // softer circles instead of squares
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
          <div className={`status-indicator ${isConnected ? 'online' : 'offline'}`}></div>
          <span style={{color: 'var(--accent-color)'}}>🌐</span> 地球在線 // 觀測節點 [TW-X1]
        </div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div className="system-stats" style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(0,255,204,0.1)', padding: '5px 15px', borderRadius: '20px', border: '1px solid rgba(0,255,204,0.3)'}}>
              <span className="blink" style={{color: 'var(--accent-color)'}}>●</span>
              <span>實時連線人數: <strong style={{color: 'var(--accent-color)', fontSize: '1.2rem'}}>{globalStats.activeUsers}</strong></span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', padding: '5px 10px'}}>
              <span style={{color: 'var(--text-secondary)'}}>地球總人口: <strong style={{color: 'var(--text-main)'}}>{globalStats.totalPopulation}</strong></span>
            </div>
            {!isConnected && <span style={{color: 'var(--danger-color)', fontWeight: 'bold'}}>[中斷連線]</span>}
          </div>
          <button onClick={onLogout} className="logout-btn" style={{padding: '5px 15px', borderRadius: '8px', background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.3)', color: 'var(--danger-color)', cursor: 'pointer'}}>中斷連線</button>
        </div>
      </header>

      <div className="main-content">
        {/* Left Metrics Terminal */}
        <aside className="metrics-terminal floating-panel">
          <div className="metric-group">
            <div className="metric-title">使用者帳號 (User ID)</div>
            <div style={{color: 'var(--accent-color)', fontSize: '1.2rem', fontWeight: 'bold'}}>{myNode?.username}</div>
            <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '5px'}}>
              NODE ID: {myNode?.userId}<br/>
              IP: {myNode?.ip}<br/>
              REGION: {myNode?.country}
            </div>
          </div>
          
          <div className="metric-group">
            <div className="metric-title">本次上線時間 (Online Time)</div>
            <div style={{color: 'var(--accent-color)', fontSize: '1.5rem', fontWeight: 'bold'}}>
              {formatTime(lifespan)}
            </div>
          </div>

          <div className="metric-group">
            <div className="metric-title">健康狀態 (Health Status)</div>
            <div className="vital-signs">
              {calculateVitalSigns(lifespan)}
            </div>
          </div>
          
          <div className="metric-group" style={{marginTop: '40px'}}>
            <div className="metric-title">網路連線狀態 (Network)</div>
            <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
              上傳 (Uplink): {Math.floor(Math.random()*500 + 100)} KB/s<br/>
              下載 (Downlink): {Math.floor(Math.random()*1500 + 500)} KB/s<br/>
              封包遺失 (Loss): 0.00%
            </div>
          </div>
        </aside>

        {/* Right Geographic Matrix */}
        <main className="geographic-matrix">
          <div className="map-overlays">
            <div className="overlay-box floating-panel">
              <div className="overlay-title">全球總掛機時間</div>
              <div className="overlay-value">{formatTime(globalStats.globalProduction)}</div>
            </div>
            <div className="overlay-box floating-panel">
              <div className="overlay-title">伺服器即時負載</div>
              <div className="overlay-value" style={{color: 'var(--danger-color)'}}>
                {globalStats.totalPopulation > 0 ? ((globalStats.activeUsers / globalStats.totalPopulation) * 100).toFixed(1) : 0}%
              </div>
            </div>
            <div className="overlay-box floating-panel">
              <div className="overlay-title">連線延遲 (Ping)</div>
              <div className="overlay-value" style={{fontSize: '1.2rem'}}>{ping} ms</div>
            </div>
          </div>

          <MapContainer 
            center={[20, 0]} 
            zoom={2} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            {/* Earth Satellite Base Map (Colorful) */}
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            />
            
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
            <div className="log-header">
              系統即時通知 (System Event Log)
            </div>
            <div className="log-content">
              {logs.map((log, i) => (
                <div key={i} style={{ color: log.includes('警告') ? 'var(--danger-color)' : 'var(--accent-color)' }}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
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
