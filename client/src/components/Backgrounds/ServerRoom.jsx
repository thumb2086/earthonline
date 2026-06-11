import React, { useMemo } from 'react';
export default function ServerRoom({ stats }) {
  const servers = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
    id: i, blinking: Math.random() > 0.5, temp: 35 + Math.random() * 20
  })), []);
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: '#0a0e17', overflow: 'hidden', zIndex: 0 }}>
      <div style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', color: '#00ffaa', fontFamily: 'monospace', fontSize: '0.8rem', opacity: 0.6 }}>
        SERVER FARM  ●  TEMP: {Math.round(35 + Math.random() * 10)}°C  ●  HUM: {Math.round(40 + Math.random() * 20)}%
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', padding: '60px 20px 20px' }}>
        {servers.map(s => (
          <div key={s.id} style={{
            height: '60px', borderRadius: '4px', background: '#1a1e2e',
            border: '1px solid #2d313b', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.3s',
            boxShadow: s.blinking ? 'inset 0 0 10px rgba(0,255,170,0.1)' : 'none'
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: s.blinking ? '#00ffaa' : '#2d313b',
              animation: s.blinking ? 'pulse 2s infinite' : 'none'
            }} />
          </div>
        ))}
      </div>
    </div>
  );
}
