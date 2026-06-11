import React, { useEffect, useRef } from 'react';

export default function ServerRoom({ onlineCount, region, activeEvent, multiplier, nodes }) {
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

    const serverCount = Math.max(4, Math.min(24, Math.floor((onlineCount || 0) / 5) + 4));
    const servers = [];
    for (let i = 0; i < serverCount; i++) {
      servers.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.6 + canvas.height * 0.2,
        w: 30 + Math.random() * 20,
        h: 8 + Math.random() * 4,
        blink: Math.random() * 2000,
        color: `hsl(${120 + Math.random() * 60}, 80%, ${40 + Math.random() * 40}%)`,
        label: `NODE-${String.fromCharCode(65 + i)}`
      });
    }

    const leds = [];
    for (let i = 0; i < 20; i++) {
      leds.push({
        x: Math.random() * canvas.width,
        y: Math.random() * 20,
        speed: 0.5 + Math.random(),
        text: ['SYSTEM OK', 'NODES: ' + (onlineCount || 0), 'TEMP: ' + (20 + Math.random() * 10).toFixed(1) + '°C', 'HUM: ' + (40 + Math.random() * 20).toFixed(0) + '%'][Math.floor(Math.random() * 4)]
      });
    }

    const draw = (t) => {
      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const rack of [[0, 0.3], [0.5, 0.5], [0.2, 0.7], [0.7, 0.8]]) {
        const rx = canvas.width * rack[0];
        const ry = canvas.height * rack[1];
        ctx.strokeStyle = '#1a2a3a';
        ctx.lineWidth = 1;
        ctx.strokeRect(rx, ry, 80, canvas.height * 0.25);
      }

      for (const s of servers) {
        const active = Math.sin((t + s.blink) / 500) > 0;
        ctx.fillStyle = active ? s.color : '#1a2a2a';
        ctx.fillRect(s.x, s.y, s.w, s.h);
        if (active) {
          ctx.fillStyle = 'rgba(0,255,170,0.05)';
          ctx.fillRect(s.x - 2, s.y - 2, s.w + 4, s.h + 4);
        }
        ctx.fillStyle = '#4a6a5a';
        ctx.font = '6px monospace';
        ctx.fillText(s.label, s.x, s.y - 2);
      }

      const temp = (20 + Math.sin(t / 10000) * 5).toFixed(1);
      ctx.fillStyle = '#2a4a3a';
      ctx.font = '10px monospace';
      ctx.fillText(`⚡ 機房環境  |  溫度 ${temp}°C  |  濕度 ${(45 + Math.sin(t / 8000) * 10).toFixed(0)}%  |  能耗 ${(300 + Math.sin(t / 5000) * 50).toFixed(0)} kW`, 10, canvas.height - 10);

      if (activeEvent) {
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`⚠ ${activeEvent}`, canvas.width / 2 - 50, 30);
      }

      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [onlineCount, activeEvent]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}
