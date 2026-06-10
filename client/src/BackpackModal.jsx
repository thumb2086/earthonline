import React, { useState, useEffect } from 'react';

const ITEM_INFO = {
  liquid_nitrogen: {
    name: '液態氮冷卻瓶',
    icon: 'liquid_nitrogen.png',
    tagLabel: 'COOLING',
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.10)',
    border: 'rgba(168,85,247,0.30)',
    shortDesc: '30 分鐘免疫系統維護降頻',
    effects: [
      { text: '「系統維護模式」期間免疫 0.5x 降頻懲罰' },
      { text: '維護期間健康度不衰減，並獲得額外 PT' },
    ],
  },
  quantum_cooler: {
    name: '量子散熱塔',
    icon: 'quantum_cooler.png',
    tagLabel: 'HEALTH',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.10)',
    border: 'rgba(34,197,94,0.30)',
    shortDesc: '滿血回復，伺服器滿載救星',
    effects: [
      { text: '立即恢復 +100% 健康度（滿血）' },
    ],
  },
  overclock_chip: {
    name: '實驗性超頻晶片',
    icon: 'overclock_chip.png',
    tagLabel: 'BUFF',
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.10)',
    border: 'rgba(168,85,247,0.30)',
    shortDesc: '1 小時 PT 收益翻倍',
    effects: [
      { text: 'PT 獲取速率 ×2.0 倍，持續 60 分鐘' },
    ],
  },
  firewall: {
    name: '實體防火牆模組',
    icon: 'firewall.png',
    tagLabel: 'BUFF',
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.10)',
    border: 'rgba(168,85,247,0.30)',
    shortDesc: '30 分鐘免疫健康度衰減',
    effects: [
      { text: '30 分鐘內健康度不再自然衰減' },
    ],
  },
  generator: {
    name: '備用柴油發電機',
    icon: 'generator.png',
    tagLabel: 'REVIVE',
    color: '#38bdf8',
    bg: 'rgba(56,189,248,0.10)',
    border: 'rgba(56,189,248,0.30)',
    shortDesc: '死機後強制復活，恢復 20% 血量',
    effects: [
      { text: '僅限伺服器健康度 = 0% 時使用' },
      { text: '強制重啟，恢復 20% 健康度' },
    ],
  },
  neon_strip: {
    name: 'RGB 霓虹燈管',
    icon: 'neon_strip.png',
    tagLabel: 'COSMETIC',
    color: '#f472b6',
    bg: 'rgba(244,114,182,0.10)',
    border: 'rgba(244,114,182,0.30)',
    shortDesc: '解鎖賽博龐克背景燈光效果',
    effects: [
      { text: '解鎖隨機賽博龐克背景燈光主題' },
    ],
  },
  flash_drive: {
    name: '神祕的隨身碟',
    icon: 'flash_drive.png',
    tagLabel: 'RANDOM',
    color: '#fbbf24',
    bg: 'rgba(251,191,36,0.10)',
    border: 'rgba(251,191,36,0.30)',
    shortDesc: '抽獎盲盒，驚喜與風險並存',
    effects: [
      { text: '30% 獲得 1 天生存時間' },
      { text: '30% 獲得 2000 PT' },
      { text: '30% 獲得 500 PT' },
      { text: '10% 健康度 -50%（大凶）' },
    ],
  },
};

export default function BackpackModal({ onClose, inventory, socket, addLog }) {
  const [usingId, setUsingId] = useState(null);

  const inventoryItems = inventory
    ? Object.entries(inventory)
        .filter(([, count]) => count > 0)
        .map(([id, count]) => ({ id, count, info: ITEM_INFO[id] }))
        .filter(item => item.info)
    : [];

  // Reset "使用中…" state when server responds
  useEffect(() => {
    if (!socket) return;
    const onResult = () => setUsingId(null);
    socket.on('use_item_result', onResult);
    return () => socket.off('use_item_result', onResult);
  }, [socket]);

  const handleUse = (itemId) => {
    if (usingId || !socket?.connected) return;
    setUsingId(itemId);
    socket.emit('use_item', itemId);
  };

  return (
    <div style={css.backdrop} onClick={onClose}>
      <div style={css.drawer} onClick={e => e.stopPropagation()}>

        <div style={css.header}>
          <div style={css.headerLeft}>
            <span style={css.headerIcon}>🎒</span>
            <div>
              <div style={css.headerTitle}>裝備背包</div>
              <div style={css.headerSub}>INVENTORY_TERMINAL</div>
            </div>
          </div>
          <div style={css.itemCount}>
            道具 {inventoryItems.length} 種
          </div>
          <button style={css.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div style={css.body}>
          {inventoryItems.length === 0 ? (
            <div style={css.empty}>
              <span style={{ fontSize: '3rem', marginBottom: '12px' }}>📦</span>
              <div style={css.emptyText}>背包空空如也</div>
              <div style={css.emptySub}>前往黑市商城購買道具</div>
            </div>
          ) : (
            <div style={css.list}>
              {inventoryItems.map(({ id, count, info }) => (
                <div key={id} style={{ ...css.itemCard, borderColor: info.border, background: info.bg }}>
                  <div style={css.itemLeft}>
                    <img
                      src={`/assets/items/${info.icon}`}
                      alt={info.name}
                      style={css.itemImg(info)}
                      onError={e => { e.target.style.opacity = '0.3'; }}
                    />
                    <div style={css.itemInfo}>
                      <div style={css.itemName}>
                        {info.name}
                        <span style={{ ...css.countBadge, color: info.color, borderColor: info.border }}>
                          x{count}
                        </span>
                      </div>
                      <div style={css.itemShort}>{info.shortDesc}</div>
                      <div style={css.effects}>
                        {info.effects.map((ef, i) => (
                          <span key={i} style={css.effectText}>{ef.text}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    style={{
                      ...css.useBtn,
                      background: usingId === id ? '#1e293b' : info.color,
                      color: usingId === id ? info.color : '#000',
                      borderColor: info.color,
                      cursor: usingId && 'not-allowed',
                    }}
                    disabled={!!usingId}
                    onClick={() => handleUse(id)}
                  >
                    {usingId === id ? '使用中…' : '使用'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={css.footer}>
          <span style={css.footerNote}>點擊「使用」立即套用道具效果</span>
          <span style={css.footerClose} onClick={onClose}>[ESC] 關閉</span>
        </div>
      </div>
    </div>
  );
}

const css = {
  backdrop: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(3px)',
    zIndex: 9999,
    display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end',
    fontFamily: '"Inter", "Segoe UI", sans-serif',
  },
  drawer: {
    width: '480px',
    maxWidth: '95vw',
    background: '#0a0e17',
    borderLeft: '1px solid rgba(255,255,255,0.1)',
    display: 'flex', flexDirection: 'column',
    height: '100vh',
    boxShadow: '-20px 0 60px rgba(0,0,0,0.6)',
    animation: 'slideIn 0.25s ease',
  },
  header: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '18px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.03)',
    flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1 },
  headerIcon: { fontSize: '1.8rem' },
  headerTitle: { color: '#e2e8f0', fontWeight: '700', fontSize: '1.1rem' },
  headerSub: { color: '#475569', fontSize: '0.7rem', letterSpacing: '1px', marginTop: '2px', fontFamily: '"Courier New", monospace' },
  itemCount: {
    color: '#64748b', fontSize: '0.8rem', fontWeight: '600',
    background: 'rgba(255,255,255,0.05)', borderRadius: '6px',
    padding: '4px 10px', flexShrink: 0,
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#64748b', cursor: 'pointer', borderRadius: '6px',
    width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px', flexShrink: 0,
  },
  body: {
    flex: 1, overflowY: 'auto', padding: '16px',
  },
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    height: '100%', color: '#64748b',
  },
  emptyText: { fontSize: '1.2rem', fontWeight: '600', color: '#94a3b8' },
  emptySub: { fontSize: '0.85rem', color: '#475569', marginTop: '6px' },
  list: {
    display: 'flex', flexDirection: 'column', gap: '10px',
  },
  itemCard: {
    display: 'flex', alignItems: 'center', gap: '12px',
    borderRadius: '12px', border: '1px solid',
    padding: '14px',
  },
  itemLeft: {
    display: 'flex', alignItems: 'center', gap: '12px', flex: 1,
    minWidth: 0,
  },
  itemImg: (info) => ({
    width: 44, height: 44,
    objectFit: 'contain',
    imageRendering: 'pixelated',
    background: '#050a12',
    border: `1px solid ${info.border}`,
    padding: '4px',
    borderRadius: '6px',
    flexShrink: 0,
  }),
  itemInfo: {
    display: 'flex', flexDirection: 'column', gap: '3px',
    minWidth: 0,
  },
  itemName: {
    color: '#e2e8f0', fontWeight: '700', fontSize: '0.9rem',
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  countBadge: {
    fontSize: '0.7rem', fontWeight: '700', border: '1px solid',
    borderRadius: '4px', padding: '1px 6px', lineHeight: '1.4',
  },
  itemShort: { color: '#64748b', fontSize: '0.72rem' },
  effects: {
    display: 'flex', flexDirection: 'column', gap: '1px',
    marginTop: '2px',
  },
  effectText: {
    color: '#94a3b8', fontSize: '0.7rem',
    lineHeight: 1.4,
  },
  useBtn: {
    borderRadius: '8px', padding: '8px 16px',
    fontWeight: '700', fontSize: '0.82rem',
    border: '1px solid',
    cursor: 'pointer', flexShrink: 0,
    transition: 'all 0.15s',
  },
  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 20px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    flexShrink: 0,
  },
  footerNote: { color: '#334155', fontSize: '0.68rem' },
  footerClose: { color: '#475569', fontSize: '0.72rem', cursor: 'pointer', fontFamily: '"Courier New", monospace' },
};
