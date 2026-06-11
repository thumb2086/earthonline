import React, { useEffect, useRef } from 'react';
export default function CyberCity() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const buildings = Array.from({ length: 30 }, (_, i) => ({
      x: (i / 30) * canvas.width, w: 15 + Math.random() * 25, h: 50 + Math.random() * 200, color: ['#ff0080','#00ffff','#ff00ff','#00ff80'][Math.floor(Math.random()*4)]
    }));
    const rain = Array.from({ length: 80 }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, len: 10 + Math.random() * 20, speed: 4 + Math.random() * 4 }));
    let anim;
    function draw() {
      ctx.fillStyle = 'rgba(10, 14, 23, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      buildings.forEach(b => {
        ctx.fillStyle = b.color;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(b.x, canvas.height - b.h, b.w, b.h);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(b.x + 2, canvas.height - b.h + 5, b.w - 4, 3);
      });
      rain.forEach(r => {
        r.y += r.speed;
        if (r.y > canvas.height) { r.y = -r.len; r.x = Math.random() * canvas.width; }
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(r.x, r.y);
        ctx.lineTo(r.x - 2, r.y + r.len);
        ctx.stroke();
      });
      anim = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(anim);
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: '#0a0e17', zIndex: 0 }} />;
}
