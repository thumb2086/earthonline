import React, { useEffect, useRef, useState } from 'react';

const NASA_EARTH_TEXTURE = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg';
const NASA_EPIC_API = 'https://epic.gsfc.nasa.gov/api/natural';

const REGION_POSITIONS = {
  asia: { lat: 25.0, lng: 121.5, name: 'Asia', color: '#00ffaa' },
  us: { lat: 37.8, lng: -122.4, name: 'US West', color: '#3b82f6' },
  eu: { lat: 50.1, lng: 8.7, name: 'Europe', color: '#a855f7' },
};

const REGION_COUNTRY_MAP = {
  TW: 'asia', CN: 'asia', JP: 'asia', KR: 'asia', HK: 'asia', SG: 'asia', IN: 'asia',
  US: 'us', CA: 'us', MX: 'us',
  GB: 'eu', DE: 'eu', FR: 'eu', IT: 'eu', ES: 'eu', NL: 'eu', SE: 'eu', NO: 'eu', DK: 'eu', FI: 'eu', PL: 'eu', PT: 'eu', BE: 'eu', AT: 'eu', CH: 'eu', IE: 'eu', CZ: 'eu',
};

const countryToRegion = (country) => REGION_COUNTRY_MAP[country] || 'other';

export default function EarthGlobe({ onlineCount = 0, region = 'asia', playerCounts = {}, activeEvent, multiplier, nodes = [], myNodeId }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const mouseRef = useRef({ down: false, x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.3, y: 0 });
  const lastTimeRef = useRef(0);
  const animRef = useRef(null);
  const [nasaInfo, setNasaInfo] = useState(null);

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

      rotationRef.current.y += dt * 0.00012;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const cx = w / 2;
      const cy = h / 2;
      const radius = Math.min(w, h) * 0.38;
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

      const imgSize = img.width / 2;
      const ox = cx - imgSize / 2;
      const oy = cy - imgSize / 2;
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

      const regionColors = { asia: '#00ffaa', us: '#3b82f6', eu: '#a855f7', other: '#666' };

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

      if (nodes && nodes.length > 0) {
        nodes.forEach(node => {
          if (!node.lat || !node.lon) return;
          const p = project(node.lat, node.lon, radius);
          const rp = rotatePoint(p, rotX, rotY, focalLength, cx, cy);
          if (rp.z < 0) return;

          const isMe = node.id === myNodeId;
          const dotRadius = isMe ? 4 : 2;
          const color = regionColors[node.region] || '#666';

          ctx.shadowColor = color;
          ctx.shadowBlur = isMe ? 15 : 4;
          ctx.fillStyle = color;
          ctx.globalAlpha = isMe ? 1 : 0.6;
          ctx.beginPath();
          ctx.arc(rp.sx, rp.sy, dotRadius, 0, Math.PI * 2);
          ctx.fill();

          if (isMe) {
            ctx.globalAlpha = 0.2;
            ctx.beginPath();
            ctx.arc(rp.sx, rp.sy, 12, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        });
      }

      const arcs = [
        ['asia', 'us', '#00ffaa'],
        ['us', 'eu', '#3b82f6'],
        ['eu', 'asia', '#a855f7'],
      ];

      arcs.forEach(([from, to, color], idx) => {
        const f = REGION_POSITIONS[from];
        const t = REGION_POSITIONS[to];
        if (!f || !t) return;

        const p1 = rotatePoint(project(f.lat, f.lng, radius), rotX, rotY, focalLength, cx, cy);
        const p2 = rotatePoint(project(t.lat, t.lng, radius), rotX, rotY, focalLength, cx, cy);
        if (p1.z < 0 || p2.z < 0) return;

        const midX = (p1.sx + p2.sx) / 2;
        const midY = (p1.sy + p2.sy) / 2 - radius * 0.4;

        ctx.globalAlpha = 0.4 + 0.2 * Math.sin(time * 0.001 + idx);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.quadraticCurveTo(midX, midY, p2.sx, p2.sy);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        const dotProgress = ((time * 0.0003 + idx * 0.33) % 1);
        const dotT = dotProgress;
        const dotX = (1 - dotT) * (1 - dotT) * p1.sx + 2 * (1 - dotT) * dotT * midX + dotT * dotT * p2.sx;
        const dotY = (1 - dotT) * (1 - dotT) * p1.sy + 2 * (1 - dotT) * dotT * midY + dotT * dotT * p2.sy;

        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.9;
        ctx.shadowColor = color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      });

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [nodes, myNodeId, region]);

  const handleMouseDown = (e) => {
    mouseRef.current.down = true;
    mouseRef.current.x = e.clientX;
    mouseRef.current.y = e.clientY;
  };

  const handleMouseMove = (e) => {
    if (!mouseRef.current.down) return;
    const dx = e.clientX - mouseRef.current.x;
    const dy = e.clientY - mouseRef.current.y;
    rotationRef.current.y += dx * 0.005;
    rotationRef.current.x += dy * 0.005;
    rotationRef.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationRef.current.x));
    mouseRef.current.x = e.clientX;
    mouseRef.current.y = e.clientY;
  };

  const handleMouseUp = () => { mouseRef.current.down = false; };

  const regionCounts = {};
  if (nodes && nodes.length > 0) {
    nodes.forEach(n => {
      const r = n.region || 'other';
      regionCounts[r] = (regionCounts[r] || 0) + 1;
    });
  }

  return (
    <div className="earth-globe-wrapper"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
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
            ⚡ {activeEvent}
          </div>
        )}
      </div>

      <div className="globe-bottom-right">
        <div className="globe-nasa-badge">
          <span style={{ fontSize: '0.65rem', opacity: 0.4 }}>NASA EARTH OBSERVATORY</span>
          {nasaInfo ? (
            <span style={{ fontSize: '0.7rem' }}>
              {new Date(nasaInfo.date).toLocaleDateString()}
            </span>
          ) : (
            <span style={{ fontSize: '0.65rem', opacity: 0.5 }}>receiving telemetry...</span>
          )}
        </div>
      </div>

      <div className="globe-legend">
        {Object.entries(REGION_POSITIONS).map(([key, r]) => (
          <div key={key} className={`globe-legend-item ${key === region ? 'active' : ''}`}>
            <span className="globe-dot" style={{ background: r.color }}></span>
            <span>{r.name}</span>
            <span className="globe-count">{regionCounts[key] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
