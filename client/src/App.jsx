import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Rectangle, Popup } from 'react-leaflet';
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

  useEffect(() => {
    const s = io(SOCKET_URL);
    setSocket(s);

    s.on('connect', () => {
      s.emit('authenticate', { token });
    });

    s.on('auth_error', () => {
      alert('授權已過期，請重新登入');
      onLogout();
    });

    s.on('init_data', (data) => {
      setMyNode(data);
    });

    s.on('all_nodes', (data) => {
      setNodes(data);
    });

    s.on('node_connected', (node) => {
      setNodes(prev => {
        if (!prev.find(n => n.id === node.id)) {
          return [...prev, node];
        }
        return prev;
      });
    });

    s.on('node_disconnected', ({ id }) => {
      setNodes(prev => prev.filter(n => n.id !== id));
    });

    s.on('global_stats', (stats) => {
      setGlobalStats(stats);
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
    return '■'.repeat(filled) + '□'.repeat(empty);
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
        users: []
      };
    }
    gridBlocks[gridId].count += 1;
    gridBlocks[gridId].users.push(node.username);
  });

  return (
    <div className="app-container">
      {/* System Header */}
      <header className="system-header">
        <div className="header-left">
          <div className="status-indicator"></div>
          <img src="/logo.png" alt="logo" style={{width: '24px', height: '24px'}} />
          <span>地球在線 // 觀測節點 [TW-X1]</span>
        </div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            實時連線人數: {globalStats.activeUsers} / 
            <img src="/logo.png" alt="logo" style={{width: '16px', height: '16px', background: 'transparent'}} />
            地球總人口: {globalStats.totalPopulation}
          </span>
          <button onClick={onLogout} className="logout-btn">[ 中斷連線 ]</button>
        </div>
      </header>

      <div className="main-content">
        {/* Left Metrics Terminal */}
        <aside className="metrics-terminal">
          <div className="metric-group">
            <div className="metric-title">帳號識別資訊 (SUBJECT ID)</div>
            <div className="metric-value">{myNode ? myNode.username : 'LOADING...'}</div>
            <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px'}}>
              NODE ID: {myNode?.userId.substring(0, 13) || '...'}<br/>
              IP: {myNode?.ip || '...'} <br/>
              REGION: {myNode?.country || '...'}
            </div>
          </div>

          <div className="metric-group">
            <div className="metric-title">系統生命週期 (LIFESPAN)</div>
            <div className="metric-value" style={{fontFamily: 'var(--font-mono)'}}>
              {formatTime(lifespan)}
            </div>
          </div>

          <div className="metric-group">
            <div className="metric-title">生物能耗值 (VITAL SIGNS)</div>
            <div className="vital-signs">
              [{calculateVitalSigns(lifespan)}]
            </div>
          </div>
        </aside>

        {/* Right Geographic Matrix */}
        <main className="geographic-matrix">
          <div className="map-overlays">
            <div className="overlay-box">
              <div className="overlay-title">世界總產出指標</div>
              <div className="overlay-value">{globalStats.globalProduction.toLocaleString()} 單位</div>
            </div>
            <div className="overlay-box" style={{borderColor: 'var(--danger-color)'}}>
              <div className="overlay-title" style={{color: 'var(--danger-color)'}}>社會總壓迫常數</div>
              <div className="overlay-value" style={{color: 'var(--danger-color)'}}>{globalStats.socialCompression} Ω</div>
            </div>
          </div>

          <MapContainer 
            center={[20, 0]} 
            zoom={2} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            {/* Dark Matter Base Map */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            
            {/* Grid Pixel Blocks */}
            {Object.values(gridBlocks).map(block => {
              const intensity = Math.min(0.2 + (block.count * 0.15), 0.95);
              return (
                <Rectangle
                  key={`${block.lat}-${block.lon}`}
                  bounds={[
                    [block.lat, block.lon],
                    [block.lat + gridSize, block.lon + gridSize]
                  ]}
                  pathOptions={{ 
                    color: 'var(--accent-color)', 
                    fillColor: 'var(--accent-color)', 
                    fillOpacity: intensity,
                    weight: 1
                  }}
                >
                  <Popup>
                    <div style={{ fontFamily: 'var(--font-mono)' }}>
                      <div style={{ color: 'var(--text-secondary)' }}>區域座標 [{block.lat}, {block.lon}]</div>
                      <div style={{ color: 'var(--accent-color)', fontWeight: 'bold', margin: '5px 0' }}>
                        活躍節點數: {block.count}
                      </div>
                      <div style={{ fontSize: '0.8rem' }}>
                        ID: {block.users.slice(0, 5).join(', ')}
                        {block.count > 5 ? ' ...等' : ''}
                      </div>
                    </div>
                  </Popup>
                </Rectangle>
              );
            })}
          </MapContainer>
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
