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

    const streams = Array.from({ length: 40 }, (_, i) => ({
      x: (i / 40) * canvas.width + (Math.random() - 0.5) * 20,
      y: Math.random() * canvas.height,
      speed: 1 + Math.random() * 2,
      length: 30 + Math.random() * 80,
      width: 1 + Math.random() * 2,
      hue: 120 + Math.random() * 60,
      alpha: 0.1 + Math.random() * 0.3,
    }));

    const glows = Array.from({ length: 15 }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: 30 + Math.random() * 80,
      hue: 140 + Math.random() * 80,
      pulse: Math.random() * 3000,
    }));

    const pulseBubbles = Array.from({ length: 12 }, (_, i) => ({
      x: Math.random() * canvas.width,
      y: canvas.height + 20 + Math.random() * 50,
      radius: 4 + Math.random() * 12,
      speed: 0.2 + Math.random() * 0.4,
      hue: 150 + Math.random() * 60,
      wobble: Math.random() * 1000,
    }));

    const draw = (t) => {
      const grad = ctx.createRadialGradient(
        canvas.width * 0.5, canvas.height * 0.5, 0,
        canvas.width * 0.5, canvas.height * 0.5, canvas.width * 0.8
      );
      grad.addColorStop(0, '#0a1a0e');
      grad.addColorStop(0.5, '#06120a');
      grad.addColorStop(1, '#020804');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const g of glows) {
        const pulse = 0.6 + 0.4 * Math.sin((t + g.pulse) / 2000);
        const radGrad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.radius * pulse);
        radGrad.addColorStop(0, `hsla(${g.hue}, 60%, 50%, 0.04)`);
        radGrad.addColorStop(1, `hsla(${g.hue}, 60%, 50%, 0)`);
        ctx.fillStyle = radGrad;
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.radius * pulse, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const s of streams) {
        s.y += s.speed;
        if (s.y - s.length > canvas.height) {
          s.y = -s.length;
          s.x = (Math.random() * canvas.width);
        }
        const gradStream = ctx.createLinearGradient(0, s.y - s.length, 0, s.y);
        gradStream.addColorStop(0, `hsla(${s.hue}, 70%, 60%, 0)`);
        gradStream.addColorStop(0.5, `hsla(${s.hue}, 70%, 60%, ${s.alpha})`);
        gradStream.addColorStop(1, `hsla(${s.hue}, 70%, 60%, 0)`);
        ctx.fillStyle = gradStream;
        ctx.fillRect(s.x - s.width / 2, s.y - s.length, s.width, s.length);
      }

      for (const b of pulseBubbles) {
        b.y -= b.speed;
        if (b.y + b.radius < 0) {
          b.y = canvas.height + 20 + Math.random() * 30;
          b.x = Math.random() * canvas.width;
        }
        const wobbleX = Math.sin((t + b.wobble) / 1500) * 8;
        const alpha = Math.max(0, Math.min(1, (b.y / canvas.height) * 1.5));
        if (alpha <= 0) continue;

        ctx.shadowColor = `hsla(${b.hue}, 60%, 70%, 0.3)`;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(b.x + wobbleX, b.y, b.radius * alpha, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${b.hue}, 60%, 70%, ${0.08 * alpha})`;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = `hsla(${b.hue}, 60%, 70%, ${0.15 * alpha})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(b.x + wobbleX, b.y, b.radius * alpha, 0, Math.PI * 2);
        ctx.stroke();
      }

      const dataDots = (nodes || []).slice(0, 40);
      for (let i = 0; i < dataDots.length; i++) {
        const n = dataDots[i];
        const nx = ((n.lon + 180) / 360) * canvas.width;
        const ny = ((90 - n.lat) / 180) * canvas.height;
        const glow = 0.3 + 0.7 * Math.sin((t + i * 300) / 1500);

        ctx.shadowColor = `hsla(${(i * 37 + 140) % 360}, 60%, 60%, 0.4)`;
        ctx.shadowBlur = 12 * glow;
        ctx.beginPath();
        ctx.arc(nx, ny, 2 + glow, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${(i * 37 + 140) % 360}, 70%, 70%, ${0.4 + 0.4 * glow})`;
        ctx.fill();
        ctx.shadowBlur = 0;

        if (i % 3 === 0 && i + 1 < dataDots.length) {
          const n2 = dataDots[i + 1];
          const nx2 = ((n2.lon + 180) / 360) * canvas.width;
          const ny2 = ((90 - n2.lat) / 180) * canvas.height;
          ctx.strokeStyle = `hsla(${(i * 37 + 140) % 360}, 50%, 60%, ${0.05 + 0.05 * glow})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(nx, ny);
          ctx.lineTo(nx2, ny2);
          ctx.stroke();
        }
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
