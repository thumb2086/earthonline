import React, { useEffect, useRef, useState, useCallback } from 'react';

const NASA_EARTH_TEXTURE = 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg';
const NASA_EPIC_API = 'https://epic.gsfc.nasa.gov/api/natural';

const REGION_POSITIONS = {
  asia: { lat: 25.0, lng: 121.5, name: 'Asia', color: '#00ffaa' },
  us: { lat: 37.8, lng: -122.4, name: 'US West', color: '#3b82f6' },
  eu: { lat: 50.1, lng: 8.7, name: 'Europe', color: '#a855f7' },
};

export default function EarthGlobe({ onlineCount = 0, region = 'asia', playerCounts = {}, activeEvent, multiplier }) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const mouseRef = useRef({ down: false, x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.3, y: 0 });
  const [nasaInfo, setNasaInfo] = useState(null);
  const animRef = useRef(null);

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
          const date = latest.date.split(' ')[0].replace(/-/g, '/');
          setNasaInfo({
            date: latest.date,
            caption: latest.caption,
            image: `https://epic.gsfc.nasa.gov/archive/natural/${date}/png/${latest.image}`,
          });
        }
      })
      .catch(() => {});
  }, []);

  const project = useCallback((lat, lng, radius) => {
    const phi = (90 - lat) * Math.PI / 180;
    const theta = lng * Math.PI / 180;
    return {
      x: radius * Math.sin(phi) * Math.cos(theta),
      y: radius * Math.cos(phi),
      z: radius * Math.sin(phi) * Math.sin(theta),
    };
  }, []);

  const renderGlobe = useCallback((ctx, w, h, rotX, rotY, time) => {
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;
    const radius = Math.min(w, h) * 0.38;
    const focalLength = radius * 3;

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
      return;
    }

    const verts = [];
    const cols = 48;
    const rows = 24;

    for (let i = 0; i <= rows; i++) {
      const lat = -90 + (180 * i) / rows;
      for (let j = 0; j <= cols; j++) {
        const lng = -180 + (360 * j) / cols;
        const p = project(lat, lng, radius);

        const rx = p.x;
        const ry = p.y * Math.cos(rotX) - p.z * Math.sin(rotX);
        const rz = p.y * Math.sin(rotX) + p.z * Math.cos(rotX);
        const rrx = rx * Math.cos(rotY) - rz * Math.sin(rotY);
        const rrz = rx * Math.sin(rotY) + rz * Math.cos(rotY);

        const scale = focalLength / (focalLength + rrz);
        const sx = rrx * scale + cx;
        const sy = -ry * scale + cy;
        const visible = rrz > -focalLength * 0.8;

        verts.push({
          sx, sy, z: rrz,
          u: j / cols, v: i / rows,
          visible,
        });
      }
    }

    verts.sort((a, b) => b.z - a.z);

    const idx = (i, j) => i * (cols + 1) + j;

    ctx.imageSmoothingEnabled = true;

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const a = verts[idx(i, j)];
        const b = verts[idx(i, j + 1)];
        const c = verts[idx(i + 1, j)];
        const d = verts[idx(i + 1, j + 1)];

        if (!a.visible || !b.visible || !c.visible || !d.visible) continue;

        const avgZ = (a.z + b.z + c.z + d.z) / 4;
        const shade = 0.5 + 0.5 * (avgZ / radius);
        ctx.globalAlpha = Math.min(1, shade + 0.2);

        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.lineTo(d.sx, d.sy);
        ctx.lineTo(c.sx, c.sy);
        ctx.closePath();

        const u1 = a.u, v1 = a.v;
        const u2 = b.u, v2 = b.v;
        const u3 = d.u, v3 = d.v;
        const u4 = c.u, v4 = c.v;

        try {
          ctx.save();
          ctx.clip();
          const sx = u1 * img.width;
          const sy = v1 * img.height;
          const sw = (u2 - u1) * img.width;
          const sh = (v4 - v1) * img.height;
          ctx.drawImage(img, sx, sy, sw, sh, a.sx, a.sy, d.sx - a.sx, d.sy - a.sy);
          ctx.restore();
        } catch (e) {
          ctx.fillStyle = '#1a3a6a';
          ctx.fill();
        }
      }
    }

    ctx.globalAlpha = 1;

    const atmosphereGrad = ctx.createRadialGradient(cx, cy, radius * 0.85, cx, cy, radius * 1.15);
    atmosphereGrad.addColorStop(0, 'rgba(100, 180, 255, 0)');
    atmosphereGrad.addColorStop(0.7, 'rgba(100, 180, 255, 0.03)');
    atmosphereGrad.addColorStop(1, 'rgba(100, 180, 255, 0.08)');
    ctx.fillStyle = atmosphereGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.15, 0, Math.PI * 2);
    ctx.fill();

    const regionColors = { asia: '#00ffaa', us: '#3b82f6', eu: '#a855f7' };
    Object.entries(REGION_POSITIONS).forEach(([key, r]) => {
      const p = project(r.lat, r.lng, radius);
      const rx = p.x;
      const ry = p.y * Math.cos(rotX) - p.z * Math.sin(rotX);
      const rz = p.y * Math.sin(rotX) + p.z * Math.cos(rotX);
      const rrx = rx * Math.cos(rotY) - rz * Math.sin(rotY);
      const rrz = rx * Math.sin(rotY) + rz * Math.cos(rotY);

      if (rrz < 0) return;

      const scale = focalLength / (focalLength + rrz);
      const sx = rrx * scale + cx;
      const sy = -ry * scale + cy;

      const pulse = 1 + 0.3 * Math.sin(time * 0.002 + (key === 'asia' ? 0 : key === 'us' ? 2 : 4));
      const isActive = key === region;
      const color = regionColors[key];
      const baseRadius = isActive ? 6 : 4;

      ctx.shadowColor = color;
      ctx.shadowBlur = isActive ? 20 : 10;
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(sx, sy, baseRadius * 2 * pulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.arc(sx, sy, baseRadius * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.globalAlpha = 1;
      ctx.fillStyle = color;
      ctx.font = '11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(r.name, sx, sy - baseRadius * pulse - 8);
    });

    const arcs = [
      ['asia', 'us', '#00ffaa'],
      ['us', 'eu', '#3b82f6'],
      ['eu', 'asia', '#a855f7'],
    ];

    arcs.forEach(([from, to, color], idx) => {
      const f = REGION_POSITIONS[from];
      const t = REGION_POSITIONS[to];
      if (!f || !t) return;

      const pf = project(f.lat, f.lng, radius);
      const pt = project(t.lat, t.lng, radius);

      const rotate = (p) => {
        const rx = p.x;
        const ry = p.y * Math.cos(rotX) - p.z * Math.sin(rotX);
        const rz = p.y * Math.sin(rotX) + p.z * Math.cos(rotX);
        const rrx = rx * Math.cos(rotY) - rz * Math.sin(rotY);
        const rrz = rx * Math.sin(rotY) + rz * Math.cos(rotY);
        const sc = focalLength / (focalLength + rrz);
        return { sx: rrx * sc + cx, sy: -ry * sc + cy, z: rrz };
      };

      const p1 = rotate(pf);
      const p2 = rotate(pt);
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
  }, [project, region]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      canvas.width = parent.clientWidth * (window.devicePixelRatio || 1);
      canvas.height = parent.clientHeight * (window.devicePixelRatio || 1);
      canvas.style.width = parent.clientWidth + 'px';
      canvas.style.height = parent.clientHeight + 'px';
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
    };
    resize();
    window.addEventListener('resize', resize);

    const animate = (time) => {
      rotationRef.current.y += 0.002;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      renderGlobe(ctx, canvas.clientWidth, canvas.clientHeight, rotationRef.current.x, rotationRef.current.y, time);
      ctx.restore();
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [renderGlobe]);

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
          <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>DATA: NASA EPIC</span>
          {nasaInfo ? (
            <span style={{ fontSize: '0.75rem' }}>
              {new Date(nasaInfo.date).toLocaleDateString()}
            </span>
          ) : (
            <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>syncing...</span>
          )}
        </div>
      </div>

      <div className="globe-legend">
        {Object.entries(REGION_POSITIONS).map(([key, r]) => (
          <div key={key} className={`globe-legend-item ${key === region ? 'active' : ''}`}>
            <span className="globe-dot" style={{ background: r.color }}></span>
            <span>{r.name}</span>
            <span className="globe-count">{playerCounts[key] || 0}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
