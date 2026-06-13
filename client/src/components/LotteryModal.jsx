import React, { useState } from 'react';

const RARITIES = [
  { name: '普通', weight: 55, color: '#94a3b8', icon: '▫' },
  { name: '稀有', weight: 30, color: '#3b82f6', icon: '◇' },
  { name: '獨特', weight: 12, color: '#a855f7', icon: '◆' },
  { name: '神話', weight: 3,  color: '#f59e0b', icon: '★' },
];

export default function LotteryModal({ pt, artifacts = [], onDraw, onSmelt, onClose }) {
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [showInventory, setShowInventory] = useState(false);

  const handleDraw = async () => {
    setRolling(true);
    setResult(null);
    setTimeout(() => {
      onDraw();
      setRolling(false);
    }, 1500);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1a1a2e', border: '2px solid #f59e0b', padding: '24px',
        maxWidth: '400px', width: '90%', color: '#e2e8f0',
        boxShadow: '0 0 40px rgba(245,158,11,0.15)',
      }}>
        <h3 style={{ margin: '0 0 8px', textAlign: 'center', color: '#f59e0b' }}>🎰 秘寶抽獎</h3>
        <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#64748b', marginBottom: '16px' }}>
          每次 2,000 PT · 有機會獲得永久加成遺物
        </p>

        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '16px' }}>
          {RARITIES.map(r => (
            <div key={r.name} style={{
              padding: '4px 8px', fontSize: '0.72rem', borderRadius: '0',
              background: `${r.color}15`, border: `1px solid ${r.color}44`, color: r.color,
            }}>
              {r.icon} {r.name} {r.weight}%
            </div>
          ))}
        </div>

        {rolling ? (
          <div style={{ textAlign: 'center', padding: '30px', fontSize: '2rem', animation: 'pulse 0.5s ease infinite' }}>
            {['🎰', '✨', '💫', '🌟'][Math.floor(Date.now() / 300) % 4]}
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '8px' }}>抽獎中...</div>
          </div>
        ) : (
          <button onClick={handleDraw} disabled={pt < 2000} style={{
            width: '100%', padding: '12px', marginBottom: '12px',
            background: pt >= 2000 ? 'rgba(245,158,11,0.15)' : 'rgba(255,50,50,0.1)',
            border: `1px solid ${pt >= 2000 ? '#f59e0b' : '#ef4444'}`,
            color: pt >= 2000 ? '#f59e0b' : '#ef4444',
            cursor: pt >= 2000 ? 'pointer' : 'not-allowed',
            fontFamily: 'monospace', fontWeight: 'bold', fontSize: '1rem',
          }}>
            🎲 抽獎（2,000 PT）
          </button>
        )}

        <button onClick={() => setShowInventory(!showInventory)} style={{
          width: '100%', padding: '8px', marginBottom: '8px',
          background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)',
          color: '#a855f7', cursor: 'pointer', fontFamily: 'monospace',
        }}>
          📦 遺物庫存（{artifacts.length}）
        </button>

        {showInventory && artifacts.length > 0 && (
          <div style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: '8px' }}>
            {artifacts.map(a => (
              <div key={a.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '6px 8px', marginBottom: '4px',
                background: `${a.color}10`, borderLeft: `3px solid ${a.color}`,
                fontSize: '0.82rem',
              }}>
                <span>{a.icon} {a.name} <span style={{ color: a.color }}>×{a.multiplier}</span></span>
                <button onClick={() => onSmelt(a.id)} style={{
                  background: 'transparent', border: '1px solid #ef444444', color: '#ef4444',
                  cursor: 'pointer', fontSize: '0.72rem', padding: '2px 8px', fontFamily: 'monospace',
                }}>
                  熔煉
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>
          餘額：{pt?.toLocaleString() || 0} PT
        </div>
      </div>
    </div>
  );
}
