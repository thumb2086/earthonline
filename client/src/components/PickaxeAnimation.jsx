import React, { useEffect, useState } from 'react';

export default function PickaxeAnimation({ active, country }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (!active) { setFrame(0); return; }
    const interval = setInterval(() => {
      setFrame(f => (f + 1) % 4);
    }, 300);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  const frames = ['⛏️', '🪓', '⛏️', '🪓'];

  return (
    <div style={{
      position: 'absolute', top: -20, right: -10,
      fontSize: '20px', animation: 'none',
      transform: `rotate(${frame % 2 === 0 ? -20 : 20}deg)`,
      transition: 'transform 0.15s',
      pointerEvents: 'none',
    }}>
      {frames[frame]}
    </div>
  );
}
