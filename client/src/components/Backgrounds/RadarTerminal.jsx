import React, { useEffect, useRef } from 'react';
export default function RadarTerminal() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = 400; canvas.height = 400;
    let angle = 0;
    let anim;
    function draw() {
      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2, cy = canvas.height / 2;
      for (let r = 40; r <= 180; r += 35) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = '#00ffaa';
        ctx.globalAlpha = 0.2;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 180, angle - 0.5, angle);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 255, 170, 0.08)';
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * 180, cy + Math.sin(angle) * 180);
      ctx.strokeStyle = '#00ffaa';
      ctx.lineWidth = 2;
      ctx.stroke();
      angle += 0.02;
      ctx.fillStyle = '#00ffaa';
      ctx.font = '12px monospace';
      ctx.fillText('SCANNING...', 10, 20);
      ctx.fillText(`NODES: ${Math.floor(Math.random() * 50)}`, 10, 40);
      anim = requestAnimationFrame(draw);
    }
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);
    draw();
    return () => { cancelAnimationFrame(anim); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: '#0a0e17', zIndex: 0 }} />;
}
