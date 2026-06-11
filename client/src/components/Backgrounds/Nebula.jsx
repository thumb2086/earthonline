import React, { useEffect, useRef } from 'react';

export default function Nebula({ onlineCount, nodes }) {
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

    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 0.5 + Math.random() * 2,
      speed: 0.02 + Math.random() * 0.05,
      twinkle: Math.random() * 1000,
    }));

    const nodesMap = (nodes || []).slice(0, 50);

    const nebulaColors = [
      { x: canvas.width * 0.3, y: canvas.height * 0.4, r: 200, color: 'rgba(100,0,255,' },
      { x: canvas.width * 0.7, y: canvas.height * 0.6, r: 250, color: 'rgba(255,50,100,' },
      { x: canvas.width * 0.5, y: canvas.height * 0.3, r: 180, color: 'rgba(0,150,255,' },
    ];

    const draw = (t) => {
      ctx.fillStyle = '#05050a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const nb of nebulaColors) {
        const grad = ctx.createRadialGradient(nb.x, nb.y, 0, nb.x, nb.y, nb.r);
        grad.addColorStop(0, nb.color + '0.15)');
        grad.addColorStop(0.5, nb.color + '0.06)');
        grad.addColorStop(1, nb.color + '0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      for (const s of stars) {
        const alpha = 0.3 + 0.7 * Math.abs(Math.sin((t + s.twinkle) / 1000));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * alpha, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.8})`;
        ctx.fill();
      }

      for (let i = 0; i < nodesMap.length; i++) {
        const nx = (nodesMap[i].lon + 180) / 360 * canvas.width;
        const ny = (90 - nodesMap[i].lat) / 180 * canvas.height;
        const pulse = 1 + 0.3 * Math.sin((t + i * 100) / 800);

        ctx.beginPath();
        ctx.arc(nx, ny, 3 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${(i * 137 + 180) % 360}, 80%, 70%)`;
        ctx.fill();

        ctx.shadowColor = `hsl(${(i * 137 + 180) % 360}, 80%, 70%)`;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(nx, ny, 1.5 * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      const fiberCtx = ctx;
      for (let i = 0; i < nodesMap.length - 1; i += 2) {
        const a = nodesMap[i];
        const b = nodesMap[i + 1];
        if (!b) continue;
        const ax = (a.lon + 180) / 360 * canvas.width;
        const ay = (90 - a.lat) / 180 * canvas.height;
        const bx = (b.lon + 180) / 360 * canvas.width;
        const by = (90 - b.lat) / 180 * canvas.height;
        const alpha = 0.05 + 0.05 * Math.sin((t + i * 50) / 1000);
        fiberCtx.strokeStyle = `rgba(100,150,255,${alpha})`;
        fiberCtx.lineWidth = 0.5;
        fiberCtx.beginPath();
        fiberCtx.moveTo(ax, ay);
        fiberCtx.quadraticCurveTo((ax + bx) / 2 + Math.sin(t / 2000 + i) * 50, (ay + by) / 2, bx, by);
        fiberCtx.stroke();
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
