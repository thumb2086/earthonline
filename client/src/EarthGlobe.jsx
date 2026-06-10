import React, { useEffect, useRef, useState, useCallback } from 'react';

const NASA_EARTH_TEXTURE = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg';
const NASA_EPIC_API = 'https://epic.gsfc.nasa.gov/api/natural';

const REGION_POSITIONS = {
  asia: { lat: 25.0, lng: 121.5, name: 'Asia', color: '#00ffaa' },
  us: { lat: 37.8, lng: -122.4, name: 'US West', color: '#3b82f6' },
  eu: { lat: 50.1, lng: 8.7, name: 'Europe', color: '#a855f7' },
};

const LEVEL_NAMES = ['', 'T1 個人測試節點', 'T2 塔式運算伺服器', 'T3 標準伺服器機櫃', 'T4 區域級數據群集', 'T5 無限矩陣資料中心'];

const formatAccTime = (ms) => {
  const totalSeconds = Math.floor((ms || 0) / 1000);
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${d > 0 ? d + 'd ' : ''}${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m`;
};

const regionColors = { asia: '#00ffaa', us: '#3b82f6', eu: '#a855f7', other: '#666' };

export default function EarthGlobe({ onlineCount = 0, region = 'asia', activeEvent, multiplier, nodes = [], myNodeId }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const mouseRef = useRef({ down: false, x: 0, y: 0, moved: false });
  const rotationRef = useRef({ x: 0.3, y: 0 });
  const targetRef = useRef(null);
  const animatingRef = useRef(false);
  const lastTimeRef = useRef(0);
  const animRef = useRef(null);
  const scaleRef = useRef(1);
  const projectedRef = useRef([]);
  const [nasaInfo, setNasaInfo] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [scaleDisplay, setScaleDisplay] = useState(1);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = NASA_EARTH_TEXTURE;
    img.onload = () => { imageRef.current = img; };
  }, []);

  useEffect(() => {
    fetch(NASA_EPIC_API)
      .then(r => r.json())
      .then(data => {
        if (data && data.length > 0) {
          const latest = data[0];
          setNasaInfo({ date: latest.date, caption: latest.caption });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedNode || !nodes) return;
    if (!nodes.find(n => n.id === selectedNode.id)) {
      setSelectedNode(null);
    }
  }, [nodes, selectedNode]);

  const project = (lat, lng, radius) => {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = lng * Math.PI / 180;
    return {
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.cos(phi),
      z: radius * Math.sin(phi) * Math.sin(theta),
    };
  };

  const rotatePoint = (p, rotX, rotY, focalLength, cx, cy) => {
    const rx = p.x;
    const ry = p.y * Math.cos(rotX) - p.z * Math.sin(rotX);
    const rz = p.y * Math.sin(rotX) + p.z * Math.cos(rotX);
    const rrx = rx * Math.cos(rotY) - rz * Math.sin(rotY);
    const rrz = rx * Math.sin(rotY) + rz * Math.cos(rotY);
    const scale = focalLength / (focalLength + rrz);
    return { sx: rrx * scale + cx, sy: -ry * scale + cy, z: rrz };
  };

  const calcTargetRotation = (lat, lon) => {
    const p = project(lat, lon, 1);
    const rotX = Math.atan2(p.y, p.z || 0.0001);
    const clampedRotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX));
    const rz = p.y * Math.sin(clampedRotX) + p.z * Math.cos(clampedRotX);
    const rotY = Math.atan2(p.x, rz || 0.0001);
    return { x: clampedRotX, y: rotY };
  };

  const locateMe = () => {
    if (!myNodeId || !nodes) return;
    const myNode = nodes.find(n => n.id === myNodeId);
    if (!myNode || !myNode.lat || !myNode.lon) return;
    const target = calcTargetRotation(myNode.lat, myNode.lon);
    targetRef.current = target;
    animatingRef.current = true;
    setLocating(true);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      dpr = window.devicePixelRatio || 1;
      canvas.width = parent.clientWidth * dpr;
      canvas.height = parent.clientHeight * dpr;
      canvas.style.width = parent.clientWidth + 'px';
      canvas.style.height = parent.clientHeight + 'px';
    };
    resize();
    window.addEventListener('resize', resize);

    const render = (time) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = Math.min(time - lastTimeRef.current, 50);
      lastTimeRef.current = time;

      if (animatingRef.current && targetRef.current) {
        const t = 1 - Math.pow(0.0005, dt / 1000);
        const prevX = rotationRef.current.x;
        const prevY = rotationRef.current.y;
        rotationRef.current.x += (targetRef.current.x - rotationRef.current.x) * t;
        rotationRef.current.y += (targetRef.current.y - rotationRef.current.y) * t;
        if (Math.abs(prevX - targetRef.current.x) < 0.0001 &&
            Math.abs(rotationRef.current.x - targetRef.current.x) < 0.0001 &&
            Math.abs(rotationRef.current.y - targetRef.current.y) < 0.0001) {
          rotationRef.current.x = targetRef.current.x;
          rotationRef.current.y = targetRef.current.y;
          animatingRef.current = false;
          setLocating(false);
        }
      }

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cx = w / 2;
      const cy = h / 2;
      const scale = scaleRef.current;
      const radius = Math.min(w, h) * 0.38 * scale;
      const focalLength = radius * 3;
      const rotX = rotationRef.current.x;
      const rotY = rotationRef.current.y;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const img = imageRef.current;
      if (!img) {
        ctx.fillStyle = '#0a0e1a';
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a2a4a';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('Loading Earth texture...', cx, cy);
        animRef.current = requestAnimationFrame(render);
        return;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.clip();

      const imgSize = img.width / 2 * scale;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-rotY + Math.PI);
      ctx.drawImage(img, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
      ctx.restore();

      const grad = ctx.createRadialGradient(
        cx - radius * 0.3, cy - radius * 0.3, 0,
        cx, cy, radius
      );
      grad.addColorStop(0, 'rgba(255,255,255,0.05)');
      grad.addColorStop(0.4, 'rgba(0,0,0,0)');
      grad.addColorStop(0.8, 'rgba(0,0,0,0.25)');
      grad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.restore();

      const atmosphereGrad = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, radius * 1.15);
      atmosphereGrad.addColorStop(0, 'rgba(100, 180, 255, 0)');
      atmosphereGrad.addColorStop(0.7, 'rgba(100, 180, 255, 0.03)');
      atmosphereGrad.addColorStop(1, 'rgba(100, 180, 255, 0.08)');
      ctx.fillStyle = atmosphereGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
      ctx.fill();

      Object.entries(REGION_POSITIONS).forEach(([key, r]) => {
        const p = project(r.lat, r.lng, radius);
        const rp = rotatePoint(p, rotX, rotY, focalLength, cx, cy);
        if (rp.z < 0) return;

        const pulse = 1 + 0.3 * Math.sin(time * 0.002 + (key === 'asia' ? 0 : key === 'us' ? 2 : 4));
        const isActive = key === region;
        const color = regionColors[key];
        const baseRadius = isActive ? 6 : 4;

        ctx.shadowColor = color;
        ctx.shadowBlur = isActive ? 20 : 10;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(rp.sx, rp.sy, baseRadius * 2 * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(rp.sx, rp.sy, baseRadius * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(r.name, rp.sx, rp.sy - baseRadius * pulse - 8);
      });

      const projected = [];
      if (nodes && nodes.length > 0) {
        nodes.forEach(node => {
          if (!node.lat || !node.lon) return;
          const p = project(node.lat, node.lon, radius);
          const rp = rotatePoint(p, rotX, rotY, focalLength, cx, cy);
          projected.push({ sx: rp.sx, sy: rp.sy, z: rp.z, node });
          if (rp.z < 0) return;

          const isMe = node.id === myNodeId;
          const isSelected = selectedNode && selectedNode.id === node.id;
          const dotRadius = isMe ? 5 : isSelected ? 5 : 3;
          const color = regionColors[node.region] || '#666';

          ctx.shadowColor = color;
          ctx.shadowBlur = isMe ? 15 : isSelected ? 15 : 4;
          ctx.fillStyle = color;
          ctx.globalAlpha = isMe ? 1 : 0.6;
          ctx.beginPath();
          ctx.arc(rp.sx, rp.sy, dotRadius, 0, Math.PI * 2);
          ctx.fill();

          if (isMe || isSelected) {
            ctx.globalAlpha = 0.2;
            ctx.beginPath();
            ctx.arc(rp.sx, rp.sy, 16, 0, Math.PI * 2);
            ctx.fill();
          }

          if (isSelected) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(rp.sx, rp.sy, 20, 0, Math.PI * 2);
            ctx.stroke();
          }

          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        });
      }
      projectedRef.current = projected;

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [nodes, myNodeId, region, selectedNode]);

  const handleMouseDown = (e) => {
    mouseRef.current.down = true;
    mouseRef.current.x = e.clientX;
    mouseRef.current.y = e.clientY;
    mouseRef.current.moved = false;
  };

  const handleMouseMove = (e) => {
    if (!mouseRef.current.down) return;
    if (animatingRef.current) return;
    const dx = e.clientX - mouseRef.current.x;
    const dy = e.clientY - mouseRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      mouseRef.current.moved = true;
    }
    rotationRef.current.y += dx * 0.005;
    rotationRef.current.x += dy * 0.005;
    rotationRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationRef.current.x));
    mouseRef.current.x = e.clientX;
    mouseRef.current.y = e.clientY;
  };

  const handleMouseUp = (e) => {
    const wasDown = mouseRef.current.down;
    const wasMoved = mouseRef.current.moved;
    mouseRef.current.down = false;
    if (wasDown && !wasMoved) {
      handleClick(e.clientX, e.clientY);
    }
  };

  const handleClick = (clientX, clientY) => {
    if (animatingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;
    const my = clientY - rect.top;

    const projected = projectedRef.current;
    let closest = null;
    let closestDist = 12;
    projected.forEach(({ sx, sy, z, node }) => {
      if (z < 0) return;
      const dx = sx - mx;
      const dy = sy - my;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < closestDist) {
        closestDist = dist;
        closest = node;
      }
    });

    if (closest) {
      setSelectedNode(closest);
    } else {
      setSelectedNode(null);
    }
  };

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    scaleRef.current = Math.max(0.4, Math.min(5, scaleRef.current + delta));
    setScaleDisplay(Math.round(scaleRef.current * 100));
  }, []);

  const zoomIn = () => {
    scaleRef.current = Math.min(5, scaleRef.current + 0.3);
    setScaleDisplay(Math.round(scaleRef.current * 100));
  };

  const zoomOut = () => {
    scaleRef.current = Math.max(0.4, scaleRef.current - 0.3);
    setScaleDisplay(Math.round(scaleRef.current * 100));
  };

  const regionCounts = {};
  if (nodes && nodes.length > 0) {
    nodes.forEach(n => {
      const r = n.region || 'other';
      regionCounts[r] = (regionCounts[r] || 0) + 1;
    });
  }

  const closeInfoCard = () => setSelectedNode(null);

  const myNodeExists = myNodeId && nodes && nodes.some(n => n.id === myNodeId);

  return (
    <div className="earth-globe-wrapper"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <div className="globe-scanlines"></div>
      <canvas ref={canvasRef} className="earth-globe-canvas" />

      <div className="globe-top-left">
        <div className="globe-stat">
          <span className="globe-stat-label">ONLINE NODES</span>
          <span className="globe-stat-value">{onlineCount}</span>
        </div>
        <div className="globe-stat">
          <span className="globe-stat-label">MULTIPLIER</span>
          <span className="globe-stat-value" style={{ color: multiplier > 1 ? '#ffd700' : '#00ffaa' }}>
            {multiplier?.toFixed(1) || '1.0'}x
          </span>
        </div>
        {activeEvent && (
          <div className="globe-event-badge">
            &#9889; {activeEvent}
          </div>
        )}
      </div>

      <div className="globe-controls-panel">
        <div className="globe-controls-group">
          <button className="globe-ctrl-btn" onClick={zoomIn} title="ZOOM IN">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
          <div className="globe-zoom-indicator">
            <div className="globe-zoom-track">
              <div className="globe-zoom-fill" style={{ height: `${Math.min(100, ((scaleRef.current - 0.4) / 4.6) * 100)}%` }}></div>
            </div>
          </div>
          <button className="globe-ctrl-btn" onClick={zoomOut} title="ZOOM OUT">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
        </div>
        <div className="globe-controls-divider"></div>
        <div className="globe-controls-group">
          <button
            className={`globe-ctrl-btn globe-locate-btn ${locating ? 'locating' : ''}`}
            onClick={locateMe}
            disabled={!myNodeExists}
            title="LOCATE MY NODE"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.3"/>
              <line x1="7" y1="1" x2="7" y2="3.5" stroke="currentColor" strokeWidth="1.3"/>
              <line x1="7" y1="10.5" x2="7" y2="13" stroke="currentColor" strokeWidth="1.3"/>
              <line x1="1" y1="7" x2="3.5" y2="7" stroke="currentColor" strokeWidth="1.3"/>
              <line x1="10.5" y1="7" x2="13" y2="7" stroke="currentColor" strokeWidth="1.3"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="globe-scale-label">{scaleDisplay}%</div>

      <div className="globe-bottom-right">
        <div className="globe-nasa-badge">
          <span className="globe-nasa-label">NASA EARTH OBSERVATORY</span>
          {nasaInfo ? (
            <span className="globe-nasa-date">
              {new Date(nasaInfo.date).toLocaleDateString()}
            </span>
          ) : (
            <span className="globe-nasa-date" style={{ opacity: 0.5 }}>receiving telemetry...</span>
          )}
        </div>
      </div>

      <div className="globe-legend">
        {Object.entries(REGION_POSITIONS).map(([key, r]) => (
          <div key={key} className={`globe-legend-item ${key === region ? 'active' : ''}`}>
            <span className="globe-region-dot" style={{ borderColor: r.color }}></span>
            <span className="globe-region-name">{r.name}</span>
            <span className="globe-region-count">{String(regionCounts[key] || 0).padStart(2, '0')}</span>
          </div>
        ))}
      </div>

      {selectedNode && (
        <div className="globe-info-card" onClick={(e) => e.stopPropagation()}>
          <button className="globe-info-close" onClick={closeInfoCard}>x</button>
          <div className="globe-info-header">
            <span className="globe-info-username">{selectedNode.username || 'Unknown'}</span>
            <span className={`globe-info-level level-${selectedNode.level || 1}`}>Lv{selectedNode.level || 1}</span>
          </div>
          <div className="globe-info-body">
            <div className="globe-info-row">
              <span className="globe-info-label">REGION</span>
              <span className="globe-info-val" style={{ color: regionColors[selectedNode.region] || '#666' }}>
                {(selectedNode.region || 'other').toUpperCase()}
              </span>
            </div>
            <div className="globe-info-row">
              <span className="globe-info-label">COORDS</span>
              <span className="globe-info-val">{selectedNode.lat?.toFixed(2)}, {selectedNode.lon?.toFixed(2)}</span>
            </div>
            <div className="globe-info-row">
              <span className="globe-info-label">CLASS</span>
              <span className="globe-info-val">{LEVEL_NAMES[selectedNode.level] || '—'}</span>
            </div>
            <div className="globe-info-row">
              <span className="globe-info-label">CREDITS</span>
              <span className="globe-info-val pt-value">{(selectedNode.accumulatedBonusPoints || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} PT</span>
            </div>
            <div className="globe-info-row">
              <span className="globe-info-label">UPTIME</span>
              <span className="globe-info-val">{formatAccTime(selectedNode.accumulatedTime)}</span>
            </div>
            <div className="globe-info-row">
              <span className="globe-info-label">HEALTH</span>
              <span className={`globe-info-val ${(selectedNode.health || 0) > 50 ? 'health-ok' : 'health-warn'}`}>
                {selectedNode.health ?? 100}%
              </span>
            </div>
            {selectedNode.id === myNodeId && (
              <div className="globe-info-self">&#60;&#60; YOU</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
