import { useEffect, useRef } from 'react';

function FourPetalSpiral({ text }) {
  const groupRef = useRef(null);
  const pathRef = useRef(null);
  const particlesRef = useRef([]);

  useEffect(() => {
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const config = {
      rotate: true,
      particleCount: 84,
      trailSpan: 0.34,
      durationMs: 4600,
      rotationDurationMs: 28000,
      pulseDurationMs: 4200,
      strokeWidth: 4.4,
      spiralR: 4,
      spiralr: 1,
      spirald: 3,
      spiralScale: 2.2,
      spiralBreath: 0.45,
      point(progress, detailScale, cfg) {
        const t = progress * Math.PI * 2;
        const d = cfg.spirald + detailScale * 0.25;
        const baseX = (cfg.spiralR - cfg.spiralr) * Math.cos(t) + d * Math.cos(((cfg.spiralR - cfg.spiralr) / cfg.spiralr) * t);
        const baseY = (cfg.spiralR - cfg.spiralr) * Math.sin(t) - d * Math.sin(((cfg.spiralR - cfg.spiralr) / cfg.spiralr) * t);
        const scale = cfg.spiralScale + detailScale * cfg.spiralBreath;
        return { x: 50 + baseX * scale, y: 50 + baseY * scale };
      },
    };

    const group = groupRef.current;
    const pathEl = pathRef.current;
    if (!group) return;

    pathEl.setAttribute('stroke-width', String(config.strokeWidth));

    const circles = Array.from({ length: config.particleCount }, () => {
      const circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('fill', 'currentColor');
      group.appendChild(circle);
      return circle;
    });
    particlesRef.current = circles;

    function normalizeProgress(p) {
      return ((p % 1) + 1) % 1;
    }

    function getDetailScale(time) {
      const pulseProgress = (time % config.pulseDurationMs) / config.pulseDurationMs;
      const pulseAngle = pulseProgress * Math.PI * 2;
      return 0.52 + ((Math.sin(pulseAngle + 0.55) + 1) / 2) * 0.48;
    }

    function getRotation(time) {
      if (!config.rotate) return 0;
      return -((time % config.rotationDurationMs) / config.rotationDurationMs) * 360;
    }

    function buildPath(detailScale, steps = 480) {
      return Array.from({ length: steps + 1 }, (_, index) => {
        const pt = config.point(index / steps, detailScale, config);
        return `${index === 0 ? 'M' : 'L'} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`;
      }).join(' ');
    }

    function getParticle(index, progress, detailScale) {
      const tailOffset = index / (config.particleCount - 1);
      const pt = config.point(normalizeProgress(progress - tailOffset * config.trailSpan), detailScale, config);
      const fade = Math.pow(1 - tailOffset, 0.56);
      return { x: pt.x, y: pt.y, radius: 0.9 + fade * 2.7, opacity: 0.04 + fade * 0.96 };
    }

    const startedAt = performance.now();
    let animId;

    function render(now) {
      const time = now - startedAt;
      const progress = (time % config.durationMs) / config.durationMs;
      const detailScale = getDetailScale(time);
      group.setAttribute('transform', `rotate(${getRotation(time)} 50 50)`);
      pathEl.setAttribute('d', buildPath(detailScale));
      circles.forEach((node, index) => {
        const p = getParticle(index, progress, detailScale);
        node.setAttribute('cx', p.x.toFixed(2));
        node.setAttribute('cy', p.y.toFixed(2));
        node.setAttribute('r', p.radius.toFixed(2));
        node.setAttribute('opacity', p.opacity.toFixed(3));
      });
      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="loading-overlay">
      <div style={{ textAlign: 'center' }}>
        <div className="loading-spiral">
          <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
            <g ref={groupRef}>
              <path ref={pathRef} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" opacity="0.15" />
            </g>
          </svg>
        </div>
        {text && <div className="loading-text">{text}</div>}
      </div>
    </div>
  );
}

export default FourPetalSpiral;
