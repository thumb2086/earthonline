import React, { useEffect, useRef } from 'react';

export default function RadarTerminal({ onlineCount, nodes, myNodeId }) {
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

    const scanLines = [];
    for (let i = 0; i < 60; i++) {
      scanLines.push({ y: (i / 60) * canvas.height, alpha: 0.03 + Math.random() * 0.04 });
    }

    const draw = (t) => {
      ctx.fillStyle = '#0a0f0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const sl of scanLines) {
        ctx.fillStyle = `rgba(0,255,100,${sl.alpha})`;
        ctx.fillRect(0, sl.y, canvas.width, 1);
      }

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const maxR = Math.min(cx, cy) * 0.8;

      for (let r = maxR * 0.25; r <= maxR; r += maxR * 0.25) {
        ctx.strokeStyle = `rgba(0,255,100,${0.1 + r / maxR * 0.1})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (let a = 0; a < 360; a += 30) {
        const rad = (a * Math.PI) / 180;
        ctx.strokeStyle = 'rgba(0,255,100,0.08)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(rad) * maxR, cy + Math.sin(rad) * maxR);
        ctx.stroke();
      }

      const angle = (t / 2000) * Math.PI * 2;
      ctx.strokeStyle = 'rgba(0,255,100,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR);
      ctx.stroke();

      ctx.fillStyle = 'rgba(0,255,100,0.15)';
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * maxR * 0.3, cy + Math.sin(angle) * maxR * 0.3, 4, 0, Math.PI * 2);
      ctx.fill();

      const nodePositions = (nodes || []).slice(0, 30).map((n, i) => {
        const dist = Math.random() * maxR * 0.8 + maxR * 0.1;
        const ang = Math.random() * Math.PI * 2;
        return { x: cx + Math.cos(ang) * dist, y: cy + Math.sin(ang) * dist, id: n.id || i, isMe: n.id === myNodeId };
      });

      for (const np of nodePositions) {
        const blink = Math.sin(t / 300 + np.id * 1.5) > 0;
        if (blink) {
          ctx.fillStyle = np.isMe ? '#00ffaa' : '#00cc66';
          ctx.shadowColor = np.isMe ? '#00ffaa' : '#00cc66';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(np.x, np.y, np.isMe ? 4 : 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }

      ctx.fillStyle = 'rgba(0,255,100,0.6)';
      ctx.font = '11px monospace';
      ctx.fillText(`NODES: ${onlineCount || 0}  |  SCAN: ${(t / 1000 % 60).toFixed(1)}s`, 10, 20);
      ctx.fillText(`SYS: ONLINE  |  MEM: ${(30 + Math.sin(t / 5000) * 10).toFixed(0)}%`, 10, 35);

      if (myNodeId) {
        ctx.fillStyle = '#00ffaa';
        ctx.font = 'bold 10px monospace';
        ctx.fillText('◉ SIGNAL LOCKED', 10, canvas.height - 10);
      }

      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [onlineCount, nodes, myNodeId]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}
