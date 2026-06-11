import React, { useEffect, useRef } from 'react';

export default function CyberCity({ onlineCount, nodes }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const buildings = [];
    const bCount = 30 + Math.floor(Math.random() * 20);
    for (let i = 0; i < bCount; i++) {
      buildings.push({
        x: (i / bCount) * canvas.width + Math.random() * 20 - 10,
        w: 15 + Math.random() * 30,
        h: 50 + Math.random() * 150,
        color: `hsl(${220 + Math.random() * 40}, 30%, ${10 + Math.random() * 15}%)`,
        windows: Math.floor(3 + Math.random() * 6),
      });
    }
    buildings.sort((a, b) => a.x - b.x);

    const drops = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: 2 + Math.random() * 4,
      len: 10 + Math.random() * 20,
    }));

    const draw = (t) => {
      ctx.fillStyle = '#080810';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      grad.addColorStop(0, '#0a0a20');
      grad.addColorStop(0.5, '#101028');
      grad.addColorStop(1, '#050510');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const b of buildings) {
        const by = canvas.height - b.h;
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, by, b.w, b.h);

        ctx.strokeStyle = 'rgba(255,100,200,0.1)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(b.x, by, b.w, b.h);

        const windowRows = Math.floor(b.h / 20);
        for (let r = 0; r < windowRows && r < 8; r++) {
          for (let c = 0; c < 3; c++) {
            const lit = Math.sin(t / 1000 + b.x + r * 3 + c) > 0.2;
            if (lit) {
              const hue = (b.x * 0.5 + r * 30 + t * 0.01) % 360;
              ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.4 + 0.3 * Math.sin(t / 2000 + b.x + r + c)})`;
              ctx.fillRect(b.x + 4 + c * 7, by + 6 + r * 18, 4, 8);
            }
          }
        }
      }

      const groundY = canvas.height - 5;
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, groundY, canvas.width, 5);

      for (let i = 0; i < (nodes || []).length && i < 20; i++) {
        const nx = ((nodes[i].lon + 180) / 360) * canvas.width;
        const ny = canvas.height - 5;
        ctx.fillStyle = '#ff4488';
        ctx.shadowColor = '#ff4488';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(nx, ny, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = 'rgba(255,68,136,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(nx, ny - 30 - Math.sin(i) * 20);
        ctx.stroke();
      }

      for (const d of drops) {
        d.y += d.speed;
        if (d.y > canvas.height) { d.y = -d.len; d.x = Math.random() * canvas.width; }
        ctx.strokeStyle = `rgba(150,200,255,${0.1 + 0.1 * Math.sin(d.x)})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + 1, d.y + d.len);
        ctx.stroke();
      }

      const neonSigns = [
        { text: '地球在線', x: canvas.width / 4, y: 40, hue: 180 },
        { text: 'NODES: ' + (onlineCount || 0), x: canvas.width * 0.7, y: 60, hue: 300 },
      ];
      for (const ns of neonSigns) {
        ctx.fillStyle = `hsla(${ns.hue + Math.sin(t / 2000) * 20}, 100%, 60%, ${0.5 + 0.3 * Math.sin(t / 1500)})`;
        ctx.font = 'bold 20px monospace';
        ctx.shadowColor = `hsla(${ns.hue}, 100%, 60%, 0.5)`;
        ctx.shadowBlur = 20;
        ctx.fillText(ns.text, ns.x, ns.y);
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [onlineCount, nodes]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}
