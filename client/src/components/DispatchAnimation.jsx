import React, { useEffect, useState, useRef } from 'react';

export default function DispatchAnimation({ country, onComplete }) {
  const [phase, setPhase] = useState(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    setPhase(0);
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => setPhase(3), 2000);
    const t4 = setTimeout(() => onCompleteRef.current?.(), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, []);

  const dirs = ['up', 'down', 'left', 'right', 'up-left', 'up-right', 'down-left', 'down-right'];
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    dir: dirs[i % dirs.length],
    delay: i * 0.08,
    size: 3 + (i % 3) * 2,
  }));

  return (
    <div className="dispatch-overlay">
      <div className="dispatch-box">
        <div className="dispatch-title">
          {phase === 0 && '📡 定位座標中...'}
          {phase === 1 && '🚀 派遣中继衛星...'}
          {phase === 2 && '⛏️ 開始建立礦場...'}
          {phase === 3 && '✅ 礦場建立完成'}
        </div>

        <div className="dispatch-animation-area">
          <div className={`dispatch-pickaxe ${phase >= 1 && phase < 3 ? 'swinging' : ''}`}>
            ⛏️
          </div>
          <div className="dispatch-target">{country}</div>
          {particles.map(p => (
            <div
              key={p.id}
              className={`dispatch-particle dir-${p.dir}`}
              style={{
                width: p.size,
                height: p.size,
                animationDelay: p.delay,
                opacity: phase >= 1 && phase < 3 ? 1 : 0,
              }}
            />
          ))}
        </div>

        <div className="dispatch-progress-track">
          <div
            className="dispatch-progress-fill"
            style={{
              width: phase === 0 ? '5%' : phase === 1 ? '35%' : phase === 2 ? '75%' : '100%',
              background: phase === 3 ? '#00ff41' : '#f59e0b',
            }}
          />
        </div>
        <div className="dispatch-progress-label">
          {phase === 0 && '0%'}
          {phase === 1 && '35%'}
          {phase === 2 && '75%'}
          {phase === 3 && '100%'}
        </div>
      </div>
    </div>
  );
}
