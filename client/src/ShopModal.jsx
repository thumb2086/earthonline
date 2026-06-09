import React, { useState } from 'react';

const SHOP_ITEMS = [
  { id: 'liquid_nitrogen',  name: '液態氮冷卻瓶',    cost: 200,  type: 'health',   icon: 'liquid_nitrogen.png',  desc: '瞬間恢復 50% 伺服器健康度。' },
  { id: 'quantum_cooler',   name: '量子散熱塔',      cost: 500,  type: 'health',   icon: 'quantum_cooler.png',   desc: '恢復 100% 健康度。' },
  { id: 'overclock_chip',   name: '實驗性超頻晶片',  cost: 1500, type: 'buff',     icon: 'overclock_chip.png',   desc: '1 小時內，PT 獲取速度加倍。' },
  { id: 'firewall',         name: '實體防火牆模組',  cost: 1000, type: 'buff',     icon: 'firewall.png',         desc: '30 分鐘內，免疫因過熱造成的健康度衰減。' },
  { id: 'generator',        name: '備用柴油發電機',  cost: 800,  type: 'revive',   icon: 'generator.png',        desc: '若伺服器因 0% 健康度死機，可強制重啟並恢復 20% 健康度。' },
  { id: 'neon_strip',       name: 'RGB 霓虹燈管',    cost: 3000, type: 'cosmetic', icon: 'neon_strip.png',       desc: '純裝飾，解鎖隨機的賽博龐克背景燈光！' },
  { id: 'flash_drive',      name: '神祕的隨身碟',    cost: 500,  type: 'random',   icon: 'flash_drive.png',      desc: '抽獎盲盒！可能開出大量時間/PT，也可能開出電腦病毒！' }
];

const TYPE_COLOR = {
  health:   { border: '#00ff41', label: '#00ff41', bg: 'rgba(0,255,65,0.08)' },
  buff:     { border: '#a855f7', label: '#a855f7', bg: 'rgba(168,85,247,0.08)' },
  revive:   { border: '#38bdf8', label: '#38bdf8', bg: 'rgba(56,189,248,0.08)' },
  cosmetic: { border: '#f472b6', label: '#f472b6', bg: 'rgba(244,114,182,0.08)' },
  random:   { border: '#fbbf24', label: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
};

export default function ShopModal({ onClose, pts, onBuy, onAdRevive, adReviveRemaining }) {
  const [buying, setBuying] = useState(null);

  const handleBuy = (item) => {
    if (buying) return;
    setBuying(item.id);
    onBuy(item.id);
    setTimeout(() => setBuying(null), 900);
  };

  const formattedPts = Number(pts || 0).toLocaleString(undefined, { maximumFractionDigits: 1 });

  return (
    <div style={S.overlay}>
      <div style={S.window}>
        {/* Title bar */}
        <div style={S.titleBar}>
          <span style={S.dot('#ff5f57')} />
          <span style={S.dot('#febc2e')} />
          <span style={S.dot('#28c840')} />
          <span style={S.titleText}>black_market_terminal — bash</span>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Prompt header */}
        <div style={S.promptBox}>
          <div style={S.promptLine}>
            <span style={{color:'#64748b'}}>root@earth-online</span>
            <span style={{color:'#64748b'}}>:</span>
            <span style={{color:'#3b82f6'}}>~/market</span>
            <span style={{color:'#64748b'}}>$ </span>
            <span style={{color:'#e2e8f0'}}>ls --items --wallet</span>
          </div>
          <div style={S.walletLine}>
            <span style={{color:'#64748b'}}>// WALLET: </span>
            <span style={{color:'#00ff41', fontWeight:'bold', textShadow:'0 0 8px rgba(0,255,65,0.5)'}}>{formattedPts} PT</span>
            <span style={{color:'#64748b', marginLeft:'auto', fontSize:'11px'}}>
              掛機收益：約 3 pt/min（100% 血量）
            </span>
          </div>
        </div>

        {/* Item list */}
        <div style={S.itemList}>
          {SHOP_ITEMS.map((item, i) => {
            const canAfford = (pts || 0) >= item.cost;
            const isActive = buying === item.id;
            const tc = TYPE_COLOR[item.type] || TYPE_COLOR.random;
            return (
              <div key={item.id} style={S.itemRow(canAfford, tc)}>
                {/* Index + icon */}
                <span style={S.idx}>{String(i + 1).padStart(2, '0')}</span>
                <img
                  src={`/assets/items/${item.icon}`}
                  alt={item.name}
                  style={S.icon(tc)}
                />
                {/* Info */}
                <div style={S.info}>
                  <div style={S.itemName(canAfford)}>{item.name}</div>
                  <div style={S.itemDesc}>{item.desc}</div>
                </div>
                {/* Type badge */}
                <span style={S.badge(tc)}>[{item.type}]</span>
                {/* Cost + buy */}
                <div style={S.buyBox}>
                  <span style={S.cost(canAfford)}>{item.cost} pt</span>
                  <button
                    style={S.buyBtn(canAfford, isActive)}
                    disabled={!canAfford || !!buying}
                    onClick={() => handleBuy(item)}
                  >
                    {isActive ? 'EXEC...' : 'BUY'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Ad revive section */}
        {adReviveRemaining > 0 && (
          <div style={{padding: '12px 20px', borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(0,255,65,0.03)'}}>
            <span style={{fontSize: '20px'}}>📺</span>
            <div style={{flex: 1}}>
              <div style={{color: '#e2e8f0', fontWeight: 'bold', fontSize: '13px'}}>免費廣告復活</div>
              <div style={{color: '#64748b', fontSize: '11px'}}>觀看 15 秒廣告即可免費復活伺服器（今日剩餘 {adReviveRemaining} 次）</div>
            </div>
            <button onClick={() => { onAdRevive(); onClose(); }} style={{
              background: '#00ff41', color: '#000', border: 'none', padding: '8px 16px',
              borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer',
              fontFamily: '"Courier New", Courier, monospace',
            }}>觀看廣告</button>
          </div>
        )}

        {/* Footer */}
        <div style={S.footer}>
          <span style={{color:'#64748b'}}>─────────────────────────────────────────────────────</span>
          <span style={{color:'#64748b', fontSize:'11px'}}>按 [ESC] 或點擊右上角關閉</span>
        </div>
      </div>
    </div>
  );
}

const S = {
  overlay: {
    position: 'fixed', inset: 0,
    background: '#0a0e17',
    backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
    fontFamily: '"Courier New", Courier, monospace',
  },
  window: {
    width: '90%', maxWidth: '780px',
    background: '#0a0e17',
    border: '1px solid #1e293b',
    boxShadow: '0 0 0 1px #0f172a, 0 25px 60px rgba(0,0,0,0.8)',
    display: 'flex', flexDirection: 'column',
    maxHeight: '90vh',
  },
  titleBar: {
    background: '#161d2e',
    borderBottom: '1px solid #1e293b',
    padding: '10px 16px',
    display: 'flex', alignItems: 'center', gap: '8px',
    userSelect: 'none',
  },
  dot: (color) => ({
    width: 12, height: 12, borderRadius: '50%', background: color, display: 'inline-block',
  }),
  titleText: {
    flex: 1, textAlign: 'center', fontSize: '12px', color: '#64748b', letterSpacing: '0.5px',
  },
  closeBtn: {
    background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
    fontSize: '14px', padding: '0 4px', lineHeight: 1,
    transition: 'color 0.15s',
  },
  promptBox: {
    padding: '12px 20px',
    borderBottom: '1px solid #1e293b',
    fontSize: '13px',
  },
  promptLine: {
    display: 'flex', gap: '2px', marginBottom: '6px',
  },
  walletLine: {
    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px',
  },
  itemList: {
    overflowY: 'auto',
    padding: '8px 0',
    flex: 1,
  },
  itemRow: (canAfford, tc) => ({
    display: 'flex', alignItems: 'center', gap: '14px',
    padding: '10px 20px',
    borderLeft: `3px solid ${canAfford ? tc.border : '#1e293b'}`,
    background: canAfford ? tc.bg : 'transparent',
    transition: 'background 0.15s',
    cursor: canAfford ? 'default' : 'not-allowed',
    opacity: canAfford ? 1 : 0.45,
  }),
  idx: {
    color: '#64748b', fontSize: '11px', minWidth: '22px', letterSpacing: '1px',
  },
  icon: (tc) => ({
    width: 40, height: 40,
    imageRendering: 'pixelated',
    background: '#050a12',
    border: `1px solid ${tc.border}`,
    padding: '4px',
    boxSizing: 'border-box',
    flexShrink: 0,
  }),
  info: {
    flex: 1, minWidth: 0,
  },
  itemName: (canAfford) => ({
    color: canAfford ? '#e2e8f0' : '#64748b',
    fontWeight: 'bold', fontSize: '14px',
    marginBottom: '2px',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  }),
  itemDesc: {
    color: '#64748b', fontSize: '11px', lineHeight: '1.4',
  },
  badge: (tc) => ({
    color: tc.label, fontSize: '10px', letterSpacing: '1px',
    border: `1px solid ${tc.border}`,
    padding: '2px 6px', flexShrink: 0,
    background: tc.bg,
  }),
  buyBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px',
    flexShrink: 0,
  },
  cost: (canAfford) => ({
    color: canAfford ? '#64748b' : '#64748b', fontSize: '12px',
  }),
  buyBtn: (canAfford, isActive) => ({
    background: isActive ? '#1e293b' : canAfford ? '#00ff41' : '#1e293b',
    color: isActive ? '#00ff41' : canAfford ? '#000' : '#64748b',
    border: `1px solid ${canAfford ? '#00ff41' : '#1e293b'}`,
    padding: '4px 14px',
    fontFamily: '"Courier New", Courier, monospace',
    fontWeight: 'bold', fontSize: '12px',
    cursor: canAfford && !isActive ? 'pointer' : 'not-allowed',
    letterSpacing: '1px',
    transition: 'all 0.15s',
  }),
  footer: {
    padding: '10px 20px',
    borderTop: '1px solid #1e293b',
    display: 'flex', flexDirection: 'column', gap: '4px',
    fontSize: '11px',
  },
};
