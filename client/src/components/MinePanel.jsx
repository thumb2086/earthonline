import React, { useState } from 'react';

const MINE_LEVELS = [
  { level: 1, name: '碎石層',    cost: 0,    output: 1,   icon: '🪨' },
  { level: 2, name: '鐵礦層',    cost: 500,  output: 3,   icon: '⛏️' },
  { level: 3, name: '銀脈層',    cost: 2000, output: 8,   icon: '🪙' },
  { level: 4, name: '金脈層',    cost: 8000, output: 25,  icon: '💎' },
  { level: 5, name: '星核層',    cost: 30000,output: 80,  icon: '⭐' },
];

export default function MinePanel({ mines = [], pt, onUpgrade, onClose }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [showStats, setShowStats] = useState(false);
  if (mines.length === 0) return null;
  const mine = mines[activeIdx] || mines[0];
  const current = MINE_LEVELS.find(m => m.level === mine.level) || MINE_LEVELS[0];
  const next = MINE_LEVELS.find(m => m.level === mine.level + 1);

  const totalOutputPerTick = mines.reduce((sum, m) => {
    const lvl = MINE_LEVELS.find(l => l.level === m.level) || MINE_LEVELS[0];
    return sum + lvl.output;
  }, 0);
  const totalMinedAll = mines.reduce((sum, m) => sum + (m.totalMined || 0), 0);
  const ptPerHour = totalOutputPerTick * 12 * 60; // 12 ticks/min * 60 min

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1a1a2e', border: '2px solid #00ff41', padding: '24px',
        maxWidth: '420px', width: '90%', color: '#e2e8f0',
        boxShadow: '0 0 30px rgba(0,255,65,0.1)',
      }}>
        <h3 style={{ margin: '0 0 12px', color: '#f59e0b', fontSize: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>⛏️ 礦場管理</span>
          <button onClick={() => setShowStats(!showStats)} style={{
            background: 'none', border: '1px solid #64748b', color: '#94a3b8',
            cursor: 'pointer', fontSize: '0.7rem', padding: '2px 8px',
            fontFamily: 'monospace',
          }}>
            {showStats ? '返回' : '統計'}
          </button>
        </h3>

        {showStats ? (
          <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            <div style={{ color: '#00ff41', fontSize: '0.95rem', fontWeight: 'bold', marginBottom: '12px' }}>
              📊 礦場統計
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                <span>⚡ 總產出/tick</span>
                <span style={{ color: '#00ff41', fontWeight: 'bold' }}>+{totalOutputPerTick} PT</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                <span>⏱️ 每小時產出</span>
                <span style={{ color: '#00ff41', fontWeight: 'bold' }}>~{ptPerHour.toLocaleString()} PT</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                <span>📦 總開採量</span>
                <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{totalMinedAll.toLocaleString()} PT</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                <span>🏗️ 礦場數量</span>
                <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>{mines.length}</span>
              </div>
            </div>
            {mines.map((m, i) => {
              const lvl = MINE_LEVELS.find(l => l.level === m.level) || MINE_LEVELS[0];
              return (
                <div key={m.id || i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 6px', fontSize: '0.78rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span>{m.country}</span>
                  <span style={{ color: lvl.color }}>Lv.{m.level} {lvl.icon} +{lvl.output}/tick</span>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            {/* Mine tabs */}
            {mines.length > 1 && (
              <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {mines.map((m, i) => (
                  <button key={m.id || i} onClick={() => setActiveIdx(i)} style={{
                    padding: '4px 10px', fontSize: '0.72rem', cursor: 'pointer',
                    background: i === activeIdx ? 'rgba(0,255,65,0.2)' : 'rgba(255,255,255,0.05)',
                    border: i === activeIdx ? '1px solid #00ff41' : '1px solid #334155',
                    color: i === activeIdx ? '#00ff41' : '#64748b',
                    fontFamily: 'monospace',
                  }}>
                    {m.country}
                  </button>
                ))}
              </div>
            )}

            <div style={{ marginBottom: '4px', fontSize: '0.85rem', color: '#94a3b8' }}>
              {mine.country} — {current.icon} {current.name}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '12px' }}>
              <div>礦層等級：Lv.{mine.level}</div>
              <div>每 tick 產出：+{current.output} PT</div>
              <div>已開採總計：{(mine.totalMined || 0).toLocaleString()} PT</div>
              <div>剩餘 PT：{pt?.toLocaleString() || 0}</div>
            </div>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
              {MINE_LEVELS.map(m => (
                <div key={m.level} style={{
                  padding: '4px 10px', fontSize: '0.75rem',
                  background: m.level === mine.level ? 'rgba(0,255,65,0.2)' : 'rgba(255,255,255,0.05)',
                  border: m.level === mine.level ? '1px solid #00ff41' : '1px solid #334155',
                  color: m.level === mine.level ? '#00ff41' : '#64748b',
                }}>
                  {m.icon} Lv.{m.level}
                </div>
              ))}
            </div>

            {next ? (
              <button onClick={() => onUpgrade(mine.id)} style={{
                width: '100%', padding: '10px',
                background: (pt || 0) >= next.cost ? 'rgba(0,255,65,0.15)' : 'rgba(255,50,50,0.1)',
                border: `1px solid ${(pt || 0) >= next.cost ? '#00ff41' : '#ef4444'}`,
                color: (pt || 0) >= next.cost ? '#00ff41' : '#ef4444',
                cursor: (pt || 0) >= next.cost ? 'pointer' : 'not-allowed',
                fontFamily: 'monospace', fontWeight: 'bold',
              }}>
                升級至 {next.name}（{next.cost.toLocaleString()} PT）
              </button>
            ) : (
              <div style={{ textAlign: 'center', color: '#f59e0b', fontSize: '0.85rem' }}>已達最高礦層</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
