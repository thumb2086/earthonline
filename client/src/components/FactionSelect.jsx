import React from 'react';
import PixelWordArt from './PixelWordArt';

const FACTIONS = [
  {
    id: '矢量化矩陣',
    name: '矢量化矩陣',
    color: '#00ff41',
    icon: '◆',
    desc: '追求純粹的資訊流，將意識上傳至全球光纖網絡。信奉效率至上，數據即生命。',
    bonus: '+15% PT 產出',
  },
  {
    id: '紅石共合體',
    name: '紅石共合體',
    color: '#ff4444',
    icon: '⬥',
    desc: '反叛的硬體駭客集團，以實體礦機對抗純數位化。信仰電路板的溫度與共鳴。',
    bonus: '+20% 健康度上限',
  },
  {
    id: '幽靈協議',
    name: '幽靈協議',
    color: '#a78bfa',
    icon: '◇',
    desc: '隱匿於暗網的資訊仲介，掌握全球節點的機密與弱點。只為最高出價者服務。',
    bonus: '+10% 全域事件獎勵',
  },
];

export default function FactionSelect({ onSelect, onSkip, existingFaction }) {
  if (existingFaction) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <PixelWordArt text={existingFaction} size={24} color="#f59e0b" depth={2} />
        <p style={{ color: '#64748b', marginTop: '12px', fontSize: '0.9rem' }}>你已選擇陣營，無法更改</p>
      </div>
    );
  }

  return (
    <div style={{ zIndex: 9999 }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <PixelWordArt text="選擇陣營" size={22} color="#00ff41" depth={3} />
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '8px' }}>你的選擇將影響未來的遊戲走向</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {FACTIONS.map(f => (
          <button
            key={f.id}
            onClick={() => onSelect(f.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '16px', padding: '16px',
              background: 'rgba(0,0,0,0.3)', border: `2px solid ${f.color}44`,
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              fontFamily: 'monospace', color: '#e2e8f0',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = f.color}
            onMouseLeave={e => e.currentTarget.style.borderColor = f.color + '44'}
          >
            <div style={{
              fontSize: '28px', color: f.color, width: '40px', textAlign: 'center',
              textShadow: `0 0 12px ${f.color}`,
            }}>
              {f.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', fontSize: '1rem', color: f.color }}>{f.name}</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>{f.desc}</div>
              <div style={{ fontSize: '0.78rem', color: f.color, marginTop: '4px' }}>{f.bonus}</div>
            </div>
          </button>
        ))}
      </div>

      {onSkip && (
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            onClick={onSkip}
            style={{
              background: 'transparent', border: 'none', color: '#64748b',
              cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'monospace',
              textDecoration: 'underline',
            }}
          >
            稍後再選擇
          </button>
        </div>
      )}
    </div>
  );
}
