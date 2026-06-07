import React, { useMemo } from 'react';
import { Server, Activity, Cpu, Network, Clock, ShieldCheck, Globe, Share2, MessageSquare, Users } from 'lucide-react';
import './datacenter.css';

export default function DataCenterVisualizer({ lifespan, bonusPoints, ping, onlineCount, cpuUsage, onOpenSocial }) {
  // Level Calculation
  const level = useMemo(() => {
    const hours = lifespan / 3600;
    const pt = bonusPoints || 0;
    if (hours >= 100 || pt >= 5000) return 5;
    if (hours >= 24 || pt >= 1000) return 4;
    if (hours >= 5 || pt >= 200) return 3;
    if (hours >= 1 || pt >= 50) return 2;
    return 1;
  }, [lifespan, bonusPoints]);

  const formatTime = (totalSeconds) => {
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    return `${d > 0 ? d + 'd ' : ''}${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
  };

  const stats = useMemo(() => {
    switch(level) {
      case 1: return { title: '個人測試節點', desc: '基礎網路連線環境' };
      case 2: return { title: '塔式運算伺服器', desc: '雙向熱備援工作站' };
      case 3: return { title: '標準伺服器機櫃', desc: '企業級 42U 實體機房' };
      case 4: return { title: '區域級數據群集', desc: '高可用性叢集運算架構' };
      case 5: return { title: '國家級數據中心', desc: '具備量子加密之終極設施' };
      default: return { title: '未連線', desc: '等待初始化' };
    }
  }, [level]);

  const progressToNext = useMemo(() => {
    const hours = lifespan / 3600;
    const pt = bonusPoints || 0;
    if (level === 1) return Math.min(100, Math.max((hours/1)*100, (pt/50)*100));
    if (level === 2) return Math.min(100, Math.max((hours/5)*100, (pt/200)*100));
    if (level === 3) return Math.min(100, Math.max((hours/24)*100, (pt/1000)*100));
    if (level === 4) return Math.min(100, Math.max((hours/100)*100, (pt/5000)*100));
    return 100;
  }, [level, lifespan, bonusPoints]);

  return (
    <div className="dc-modern-container">
      <div className="dc-bg-grid"></div>
      
      <div className="dc-layout">
        
        {/* Left Side: Solid Status Panel */}
        <div className="dc-status-card">
          <div className="dc-card-header">
            <Activity size={18} color="#94a3b8" />
            <h2>機房營運監視器</h2>
          </div>
          
          <div className="dc-level-badge">
            <div className="level-number">LV {level}</div>
            <div className="level-info">
              <h3>{stats.title}</h3>
              <p>{stats.desc}</p>
            </div>
          </div>

          <div className="dc-metrics">
            <div className="metric-row">
              <Clock size={16} color="#64748b" />
              <span>總生存時間</span>
              <strong className="data-value">{formatTime(lifespan || 0)}</strong>
            </div>
            <div className="metric-row">
              <ShieldCheck size={16} color="#64748b" />
              <span>PT 信用積分</span>
              <strong className="data-value">{bonusPoints || 0} PT</strong>
            </div>
            <div className="metric-row">
              <Cpu size={16} color="#64748b" />
              <span>伺服器即時負載</span>
              <strong className="data-value">{cpuUsage ? cpuUsage.toFixed(1) : '0.0'}%</strong>
            </div>
            <div className="metric-row">
              <Network size={16} color="#64748b" />
              <span>全球在線節點</span>
              <strong className="data-value">{onlineCount || 0}</strong>
            </div>
            <div className="metric-row">
              <Activity size={16} color="#64748b" />
              <span>連線延遲 (Ping)</span>
              <strong className="data-value">{ping || 0} ms</strong>
            </div>
          </div>

          <div className="dc-progress-section">
            <div className="progress-labels">
              <span>設施擴建進度</span>
              <span>{Math.floor(progressToNext)}%</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progressToNext}%` }}></div>
            </div>
            <p className="progress-hint">累積生存時間或積分以解鎖擴建</p>
          </div>

          {/* Social Links & Github Badge */}
          <div className="dc-social-section">
            <a href="https://github.com/huchialun9-ctrl/earthonline.git" target="_blank" rel="noreferrer" className="social-btn github-badge">
              <Globe size={16} /> <span>Star on GitHub</span>
            </a>
            <div className="social-icons">
              <button onClick={onOpenSocial} className="social-btn" title="社群討論" style={{ cursor: 'pointer' }}>
                <Users size={16} /> <span>社群討論</span>
              </button>
              <a href="https://www.threads.com/@earthonline6?xmt=AQG048ez1j6AMkcDGAG_U01pj1JoVoCFFMvWnZ5MZGYhgfk" target="_blank" rel="noreferrer" className="social-btn icon-only" title="Threads">
                <Share2 size={16} />
              </a>
            </div>
          </div>
        </div>

        {/* Right Side: Visual Area */}
        <div className="dc-visual-area">
          <div className="data-flow-grid">
            {level === 1 && <LaptopSvg />}
            {level === 2 && <TowerSvg />}
            {level >= 3 && <ServerRacksSvg level={level} />}
          </div>
        </div>

      </div>
    </div>
  );
}

// Solid & Realistic SVGs

function LaptopSvg() {
  return (
    <svg viewBox="0 0 200 200" className="svg-equipment">
      <rect x="40" y="55" width="120" height="70" rx="4" fill="#292929" stroke="#4a4a4a" strokeWidth="2" />
      <rect x="45" y="60" width="110" height="60" rx="2" fill="#141414" />
      <path d="M 30 130 L 170 130 L 180 145 L 20 145 Z" fill="#3b3b3b" stroke="#4a4a4a" strokeWidth="1" />
      {/* Code scroll */}
      <rect x="55" y="70" width="40" height="2" fill="#d1d5db" className="type-anim-1" />
      <rect x="55" y="80" width="60" height="2" fill="#d1d5db" className="type-anim-2" />
      <rect x="55" y="90" width="30" height="2" fill="#d1d5db" className="type-anim-3" />
    </svg>
  );
}

function TowerSvg() {
  return (
    <svg viewBox="0 0 200 200" className="svg-equipment">
      <rect x="65" y="30" width="70" height="140" rx="2" fill="#1c1c1e" stroke="#3a3a3c" strokeWidth="3" />
      <rect x="75" y="45" width="50" height="15" fill="#2c2c2e" />
      <rect x="75" y="65" width="50" height="15" fill="#2c2c2e" />
      <circle cx="100" cy="120" r="20" fill="#000" stroke="#3a3a3c" strokeWidth="2" />
      <circle cx="85" cy="155" r="3" fill="#34c759" className="led-blink-fast" />
      <circle cx="95" cy="155" r="3" fill="#007aff" className="led-blink-slow" />
      <rect x="110" y="153" width="10" height="4" fill="#ff3b30" />
    </svg>
  );
}

function ServerRacksSvg({ level }) {
  const rackCount = level === 3 ? 1 : level === 4 ? 3 : 5;
  
  return (
    <svg viewBox="0 0 400 200" className="svg-equipment-wide">
      {Array.from({ length: rackCount }).map((_, idx) => {
        const xPos = 200 - (rackCount * 30) + (idx * 60);
        return (
          <g key={idx} transform={`translate(${xPos}, 20)`}>
            {/* Outer Rack */}
            <rect x="0" y="0" width="45" height="160" rx="1" fill="#111" stroke="#333" strokeWidth="2" />
            {/* Server Blades */}
            {Array.from({ length: 12 }).map((_, bIdx) => (
              <g key={bIdx} transform={`translate(4, ${10 + bIdx * 12})`}>
                <rect x="0" y="0" width="37" height="9" fill="#1a1a1a" stroke="#262626" strokeWidth="1" />
                <rect x="2" y="2" width="12" height="5" fill="#0a0a0a" />
                <circle cx="22" cy="4.5" r="1.5" fill="#34c759" className={`led-blink-${(idx+bIdx)%3 === 0 ? 'fast' : 'slow'}`} />
                <circle cx="27" cy="4.5" r="1.5" fill="#007aff" className={`led-blink-${(idx+bIdx)%2 === 0 ? 'fast' : 'slow'}`} />
                <circle cx="32" cy="4.5" r="1.5" fill="#ffcc00" className={`led-blink-${(idx+bIdx)%4 === 0 ? 'fast' : 'slow'}`} />
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}
