import React, { useMemo, useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import { Server, Activity, Cpu, Network, Clock, ShieldCheck, Users, MapPin } from 'lucide-react';
import { useTheme } from './ThemeContext';
import './datacenter.css';

export default function DataCenterVisualizer({ lifespan, bonusPoints, ping, onlineCount, cpuUsage, region, onOpenSocial }) {
  const { themeData } = useTheme();
  
  const regionConfig = {
    asia: { name: 'Taiwan', flag: '🇹🇼' },
    us: { name: 'United States', flag: '🇺🇸' },
    eu: { name: 'Europe', flag: '🇪🇺' }
  };
  const currentRegion = regionConfig[region] || { name: 'Unknown Node', flag: '🌍' };

  const level = useMemo(() => {
    const hours = lifespan / 3600;
    const pt = bonusPoints || 0;
    if (hours >= 720 || pt >= 50000) return 5;
    if (hours >= 168 || pt >= 10000) return 4;
    if (hours >= 24 || pt >= 2000) return 3;
    if (hours >= 1 || pt >= 100) return 2;
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
      case 5: return { title: '無限矩陣資料中心', desc: '超大型可擴展叢集' };
      default: return { title: '未連線', desc: '等待初始化' };
    }
  }, [level]);

  const progressToNext = useMemo(() => {
    const hours = lifespan / 3600;
    const pt = bonusPoints || 0;
    if (level === 1) return Math.min(100, Math.max((hours/1)*100, (pt/100)*100));
    if (level === 2) return Math.min(100, Math.max((hours/24)*100, (pt/2000)*100));
    if (level === 3) return Math.min(100, Math.max((hours/168)*100, (pt/10000)*100));
    if (level === 4) return Math.min(100, Math.max((hours/720)*100, (pt/50000)*100));
    return (hours % 10) * 10;
  }, [level, lifespan, bonusPoints]);

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const cardRef = useRef(null);
  const badgeRef = useRef(null);

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
  };

  const rackCount = useMemo(() => {
    if (level < 3) return 0;
    const hours = lifespan / 3600;
    const pt = bonusPoints || 0;
    return Math.max(1, Math.floor(hours / 10) + Math.floor(pt / 500));
  }, [level, lifespan, bonusPoints]);

  return (
    <div className="dc-modern-container">
      <div className="dc-bg-grid"></div>
      
      {/* Pixel Art Decorative Elements */}
      <PixelDecorations level={level} accentColor={themeData.accent} />
      
      <div className="dc-layout">
        
        {/* Left Side: Solid Status Panel */}
        <Draggable nodeRef={cardRef} handle=".drag-handle">
          <div ref={cardRef} className="dc-status-card" style={{ position: 'absolute', top: '40px', left: '40px', zIndex: 100 }}>
            <div className="dc-card-header drag-handle" style={{ cursor: 'move' }}>
              <PixelServerIcon accentColor={themeData.accent} />
              <h2>我的雲端伺服器</h2>
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
              <Clock size={16} />
              <span>總生存時間</span>
              <strong className="data-value">{formatTime(lifespan || 0)}</strong>
            </div>
            <div className="metric-row">
              <ShieldCheck size={16} />
              <span>PT 信用積分</span>
              <strong className="data-value">{Number(bonusPoints || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} PT</strong>
            </div>
            <div className="metric-row">
              <Cpu size={16} />
              <span>伺服器負載</span>
              <strong className="data-value">{(cpuUsage || 0).toFixed(1)}%</strong>
            </div>
            <div className="metric-row">
              <Network size={16} />
              <span>全球在線節點</span>
              <strong className="data-value">{onlineCount || 0}</strong>
            </div>
            <div className="metric-row">
              <Activity size={16} />
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
              <div className="progress-fill" style={{ width: `${Math.min(100, progressToNext)}%` }}></div>
            </div>
            <p className="progress-hint">累積生存時間或積分以解鎖擴建</p>
          </div>

          <div className="dc-social-section" style={{ display: 'flex', gap: '25px', justifyContent: 'flex-start', alignItems: 'center', marginTop: '20px', padding: '0' }}>
            <a href="https://github.com/huchialun9-ctrl/earthonline.git" target="_blank" rel="noreferrer" style={{ transition: 'transform 0.2s', display: 'flex', alignItems: 'center', color: 'var(--text-color)', textDecoration: 'none', gap: '8px' }} onMouseOver={e => e.currentTarget.style.transform='scale(1.1) rotate(-2deg)'} onMouseOut={e => e.currentTarget.style.transform='scale(1) rotate(0)'}>
              <GithubIcon size={28} />
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'Arial, sans-serif' }}>GitHub</span>
            </a>
            <a href="https://www.threads.com/@earthonline6?xmt=AQG048ez1j6AMkcDGAG_U01pj1JoVoCFFMvWnZ5MZGYhgfk" target="_blank" rel="noreferrer" style={{ transition: 'transform 0.2s', display: 'flex', alignItems: 'center', color: 'var(--text-color)', textDecoration: 'none' }} onMouseOver={e => e.currentTarget.style.transform='scale(1.1) rotate(2deg)'} onMouseOut={e => e.currentTarget.style.transform='scale(1) rotate(0)'}>
              <ThreadsIcon size={28} />
            </a>
            <button onClick={onOpenSocial} title="社群討論" style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '1rem', padding: '0', fontWeight: 'bold', marginLeft: '10px' }} onMouseOver={e => { e.currentTarget.style.transform='scale(1.05)'; e.currentTarget.style.color='var(--text-color)'; e.currentTarget.style.textShadow='0 0 8px rgba(59, 130, 246, 0.8)'; }} onMouseOut={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.color='var(--text-dim)'; e.currentTarget.style.textShadow='none'; }}>
              <Users size={22} /> <span>討論區</span>
            </button>
          </div>

          <div className="dc-contribution-wall" style={{ marginTop: '10px', paddingTop: '15px', borderTop: '2px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'VT323', monospace" }}>
              <GithubIcon size={14} /> <span>開發者貢獻紀錄</span>
            </div>
            <img 
              src="https://ghchart.rshah.org/3b82f6/huchialun9-ctrl" 
              alt="huchialun9-ctrl's Github Chart" 
              style={{ width: '100%', opacity: 0.8, filter: 'hue-rotate(180deg) brightness(0.8) contrast(1.2)', imageRendering: 'pixelated' }} 
            />
          </div>
        </div>
        </Draggable>

        {/* Right Side: Visual Area */}
        <div 
          className="dc-visual-area infinite-canvas" 
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          style={{ cursor: isDragging ? 'grabbing' : 'grab', overflow: 'hidden', position: 'relative' }}
        >
          {/* Server Location Badge Sticker */}
          <Draggable nodeRef={badgeRef}>
            <div ref={badgeRef} className="dc-badge-sticker">
              <PixelMapIcon />
              <strong className="dc-badge-title">
                Node: {currentRegion.name} {currentRegion.flag}
              </strong>
              <span className="dc-badge-racks">
                Racks: <strong>{level < 3 ? 1 : rackCount}</strong>
              </span>
            </div>
          </Draggable>

          <div className="canvas-content" style={{ transform: `translate(${offset.x}px, ${offset.y}px)`, transition: isDragging ? 'none' : 'transform 0.1s ease-out', position: 'absolute', top: '50%', left: '50%', width: 0, height: 0 }}>
            {level === 1 && <div style={{ position: 'absolute', transform: 'translate(-100px, -100px)' }}><PixelLaptopSvg accentColor={themeData.accent} /></div>}
            {level === 2 && <div style={{ position: 'absolute', transform: 'translate(-100px, -100px)' }}><PixelTowerSvg accentColor={themeData.accent} /></div>}
            {level >= 3 && <InfiniteServerFarm rackCount={rackCount} progress={progressToNext} accentColor={themeData.accent} />}
          </div>
        </div>

      </div>
    </div>
  );
}

/* ============================================
   Pixel Art Decorative Components
   ============================================ */
function PixelDecorations({ level, accentColor }) {
  return (
    <>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none', overflow: 'hidden', zIndex: 1
      }}>
        {/* Pixel Moon */}
        <div className="dc-pixel-moon" style={{
          boxShadow: `0 0 30px ${accentColor}40, inset -8px -8px 0 ${accentColor}80`
        }}>
          <div style={{
            position: 'absolute', top: '8px', right: '8px',
            width: '16px', height: '16px',
            background: `${accentColor}90`,
            borderRadius: 0
          }}/>
        </div>
        
        {/* Pixel Clouds */}
        <PixelCloud x="10%" y="20%" delay={0} />
        <PixelCloud x="70%" y="60%" delay={2} />
        <PixelCloud x="40%" y="80%" delay={4} />
      </div>
      
      <style>{`
        @keyframes floatPixelCloud {
          0% { transform: translateX(-120px); }
          100% { transform: translateX(calc(100vw + 120px)); }
        }
      `}</style>
    </>
  );
}

function PixelCloud({ x, y, delay }) {
  return (
    <div style={{
      position: 'absolute', left: x, top: y,
      width: '64px', height: '24px',
      background: 'var(--text-dim)',
      borderRadius: 0,
      imageRendering: 'pixelated',
      opacity: 0.15,
      boxShadow: '16px -8px 0 var(--text-dim), 32px 0 0 var(--text-dim), 48px -4px 0 var(--text-dim)',
      animation: `floatPixelCloud ${20 + delay * 3}s linear infinite`,
      animationDelay: `${delay}s`
    }}/>
  );
}

function PixelServerIcon({ accentColor }) {
  return (
    <svg width="24" height="24" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
      <rect x="2" y="1" width="12" height="4" fill="var(--accent-color)"/>
      <rect x="2" y="6" width="12" height="4" fill="var(--accent-color)"/>
      <rect x="2" y="11" width="12" height="4" fill="var(--accent-color)"/>
      <rect x="4" y="2" width="2" height="2" fill="var(--success-color)"/>
      <rect x="4" y="7" width="2" height="2" fill="var(--warning-color)"/>
      <rect x="4" y="12" width="2" height="2" fill="var(--success-color)"/>
      <rect x="8" y="2" width="4" height="2" fill="var(--bg-color)"/>
      <rect x="8" y="7" width="4" height="2" fill="var(--bg-color)"/>
      <rect x="8" y="12" width="4" height="2" fill="var(--bg-color)"/>
    </svg>
  );
}

function PixelMapIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" style={{ imageRendering: 'pixelated' }}>
      <path d="M8 1 L14 4 L14 12 L8 15 L2 12 L2 4 Z" fill="var(--danger-color)"/>
      <circle cx="8" cy="7" r="2" fill="var(--text-color)"/>
      <rect x="7" y="9" width="2" height="4" fill="var(--text-color)"/>
    </svg>
  );
}

/* ============================================
   Pixel Art Server SVGs
   ============================================ */
function InfiniteServerFarm({ rackCount, progress, accentColor }) {
  const COLUMNS = 10;
  const RACK_WIDTH_OFFSET = 60;
  const RACK_HEIGHT_OFFSET = 180;
  
  return (
    <>
      {Array.from({ length: rackCount }).map((_, idx) => {
        const row = Math.floor(idx / COLUMNS);
        const col = idx % COLUMNS;
        const totalCols = Math.min(rackCount, COLUMNS);
        const totalRows = Math.ceil(rackCount / COLUMNS);
        const xPos = (col - totalCols / 2) * RACK_WIDTH_OFFSET + 30;
        const yPos = (row - totalRows / 2) * RACK_HEIGHT_OFFSET + 90;
        
        const isLastRack = idx === rackCount - 1;
        const currentProgress = isLastRack ? progress : 100;

        return (
          <div key={idx} style={{ position: 'absolute', transform: `translate(${xPos}px, ${yPos}px)` }}>
            <PixelSingleRackSvg progress={currentProgress} />
          </div>
        );
      })}
    </>
  );
}

function PixelSingleRackSvg({ progress }) {
  const activeBladesCount = Math.max(1, Math.floor((progress / 100) * 12));
  return (
    <svg viewBox="0 0 45 160" width="45" height="160" style={{ imageRendering: 'pixelated' }}>
      {/* Outer Rack */}
      <rect x="0" y="0" width="45" height="160" fill="var(--bg-color)" stroke="var(--border-color)" strokeWidth="2"/>
      {/* Server Blades */}
      {Array.from({ length: 12 }).map((_, bIdx) => {
        const globalBladeIndex = 11 - bIdx;
        const isActive = globalBladeIndex < activeBladesCount;

        return (
          <g key={bIdx} transform={`translate(4, ${10 + bIdx * 12})`}>
            <rect x="0" y="0" width="37" height="9" fill={isActive ? "var(--surface-color)" : "var(--bg-light)"} stroke={isActive ? "var(--border-color)" : "var(--bg-color)"} strokeWidth="1"/>
            <rect x="2" y="2" width="12" height="5" fill="var(--bg-color)"/>
            {isActive && (
              <>
                <rect x="22" y="3" width="3" height="3" fill="var(--success-color)" className={`led-blink-${bIdx%3 === 0 ? 'fast' : 'slow'}`}/>
                <rect x="27" y="3" width="3" height="3" fill="var(--info-color)" className={`led-blink-${bIdx%2 === 0 ? 'fast' : 'slow'}`}/>
                <rect x="32" y="3" width="3" height="3" fill="var(--warning-color)" className={`led-blink-${bIdx%4 === 0 ? 'fast' : 'slow'}`}/>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function PixelLaptopSvg({ accentColor }) {
  return (
    <svg viewBox="0 0 200 200" width="200" height="200" style={{ imageRendering: 'pixelated' }}>
      {/* Laptop body */}
      <rect x="40" y="55" width="120" height="70" fill="var(--surface-color)" stroke="var(--border-color)" strokeWidth="3"/>
      <rect x="45" y="60" width="110" height="60" fill="var(--bg-color)"/>
      {/* Screen content */}
      <rect x="55" y="70" width="40" height="3" fill="var(--accent-color)" className="type-anim-1"/>
      <rect x="55" y="80" width="60" height="3" fill="var(--info-color)" className="type-anim-2"/>
      <rect x="55" y="90" width="30" height="3" fill="var(--warning-color)" className="type-anim-3"/>
      {/* Keyboard */}
      <path d="M 30 130 L 170 130 L 180 145 L 20 145 Z" fill="var(--border-color)" stroke="var(--text-dim)" strokeWidth="1"/>
      {/* LED */}
      <rect x="95" y="135" width="10" height="3" fill="var(--success-color)" className="led-blink-slow"/>
    </svg>
  );
}

function PixelTowerSvg({ accentColor }) {
  return (
    <svg viewBox="0 0 200 200" width="200" height="200" style={{ imageRendering: 'pixelated' }}>
      {/* Tower body */}
      <rect x="65" y="30" width="70" height="140" fill="var(--surface-color)" stroke="var(--border-color)" strokeWidth="3"/>
      {/* Drive bays */}
      <rect x="75" y="45" width="50" height="15" fill="var(--bg-light)"/>
      <rect x="75" y="65" width="50" height="15" fill="var(--bg-light)"/>
      {/* Fan */}
      <circle cx="100" cy="120" r="20" fill="var(--bg-color)" stroke="var(--border-color)" strokeWidth="2"/>
      <circle cx="100" cy="120" r="12" fill="var(--surface-color)" stroke="var(--border-color)" strokeWidth="1"/>
      {/* LEDs */}
      <rect x="82" y="155" width="5" height="5" fill="var(--success-color)" className="led-blink-fast"/>
      <rect x="92" y="155" width="5" height="5" fill="var(--info-color)" className="led-blink-slow"/>
      <rect x="110" y="155" width="8" height="5" fill="var(--danger-color)"/>
    </svg>
  );
}

/* Social Icons SVGs */
function GithubIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function ThreadsIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 192 192" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4484 44.7443 97.3355 44.7443 97.222 44.7443C82.2364 44.7443 69.773 51.1409 62.102 62.7807L75.881 72.2328C81.6116 63.5383 90.6052 61.6848 97.2286 61.6848C97.3051 61.6848 97.3819 61.6848 97.4576 61.6855C105.707 61.7381 111.932 64.1366 115.961 68.814C118.893 72.2193 120.854 76.925 121.825 82.8638C114.511 81.6207 106.601 81.2385 98.145 81.7233C74.3247 83.0954 59.0111 96.9879 60.0396 116.292C60.5615 126.084 65.4397 134.508 73.775 140.011C80.8224 144.663 89.899 146.938 99.3323 146.423C111.79 145.74 121.563 140.987 128.381 132.296C133.559 125.696 136.834 117.143 138.28 106.366C144.217 109.949 148.617 114.664 151.047 120.332C155.179 129.967 155.42 145.8 142.501 158.708C131.182 170.016 117.561 174.9 97.1 174.9C74.248 174.9 58.1804 169.507 46.5937 157.818C33.0939 144.212 27.5 123.858 27.5 97.045C27.5 70.2505 33.1257 49.9248 46.6851 36.3789C58.3371 24.7431 74.4533 19.3305 97.351 19.3305C118.665 19.3305 133.882 24.4754 145.474 34.6111C154.215 42.2573 159.297 53.0371 161.409 66.0827L178.118 63.3644C175.297 45.9621 168.324 31.478 156.634 21.2335C141.77 8.35821 122.378 1.99997 97.351 1.99997C70.1652 1.99997 51.0662 8.52844 37.0504 22.518C21.4646 38.0747 14.8333 62.0628 14.8333 97.045C14.8333 132.067 21.4116 156.096 36.9663 171.717C50.9234 185.748 70.0766 192.261 97.1 192.261C122.569 192.261 140.081 185.703 154.512 171.282C171.396 154.408 172.936 131.623 166.757 117.406C162.247 107.031 154.062 97.9406 141.537 88.9883ZM98.4405 129.507C88.0005 130.095 77.1544 125.409 76.6196 115.372C76.2232 107.93 81.9158 99.626 99.0812 98.6368C101.047 98.5234 102.976 98.468 104.871 98.468C111.106 98.468 116.939 99.0737 122.242 100.233C120.264 124.935 108.662 128.946 98.4405 129.507Z"/>
    </svg>
  );
}
