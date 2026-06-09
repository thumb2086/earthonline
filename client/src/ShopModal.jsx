import React, { useState } from 'react';

// ─── Item Definitions ────────────────────────────────────────────────────────
const SHOP_ITEMS = [
  {
    id: 'liquid_nitrogen',
    name: '液態氮冷卻瓶',
    cost: 200,
    type: 'health',
    icon: 'liquid_nitrogen.png',
    tagLabel: 'HEALTH',
    shortDesc: '瞬間恢復伺服器健康度',
    effects: [
      { icon: '❤️', text: '立即恢復 +50% 健康度' },
      { icon: '⚡', text: '使用後立即生效，無等待時間' },
      { icon: '⚠️', text: '死機狀態下無法使用（請用發電機）' },
    ],
    tip: '最便宜的回血道具，適合緊急補血。',
  },
  {
    id: 'quantum_cooler',
    name: '量子散熱塔',
    cost: 500,
    type: 'health',
    icon: 'quantum_cooler.png',
    tagLabel: 'HEALTH',
    shortDesc: '滿血回復，伺服器滿載救星',
    effects: [
      { icon: '❤️', text: '立即恢復 +100% 健康度（滿血）' },
      { icon: '⚡', text: '使用後立即生效' },
      { icon: '⚠️', text: '死機狀態下無法使用（請用發電機）' },
    ],
    tip: '一次滿血，省去連續購買的麻煩。',
  },
  {
    id: 'overclock_chip',
    name: '實驗性超頻晶片',
    cost: 1500,
    type: 'buff',
    icon: 'overclock_chip.png',
    tagLabel: 'BUFF',
    shortDesc: '1 小時 PT 收益翻倍',
    effects: [
      { icon: '💎', text: 'PT 獲取速率 ×2.0 倍，持續 60 分鐘' },
      { icon: '🕐', text: 'Buff 期間若下線，剩餘時間仍繼續計算' },
      { icon: '📈', text: '與全域事件倍率疊加計算' },
    ],
    tip: '配合全域事件「量子爆發」或「數據淘金潮」使用，效果加倍驚人！',
  },
  {
    id: 'firewall',
    name: '實體防火牆模組',
    cost: 1000,
    type: 'buff',
    icon: 'firewall.png',
    tagLabel: 'BUFF',
    shortDesc: '30 分鐘免疫健康度衰減',
    effects: [
      { icon: '🛡️', text: '30 分鐘內健康度不再自然衰減' },
      { icon: '⏱️', text: '持續 30 分鐘（1800 秒）' },
      { icon: '🔥', text: '搭配太陽風暴事件使用，可安全度過而不掉血' },
    ],
    tip: '「太陽風暴」期間的必備保命神器！',
  },
  {
    id: 'generator',
    name: '備用柴油發電機',
    cost: 800,
    type: 'revive',
    icon: 'generator.png',
    tagLabel: 'REVIVE',
    shortDesc: '死機後強制復活，恢復 20% 血量',
    effects: [
      { icon: '💀', text: '僅限伺服器健康度 = 0% 時使用' },
      { icon: '❤️', text: '強制重啟，恢復 20% 健康度' },
      { icon: '🚀', text: '復活後即可繼續累積 PT 與生存時間' },
    ],
    tip: '死機時的最後救命稻草，建議提前準備！',
  },
  {
    id: 'neon_strip',
    name: 'RGB 霓虹燈管',
    cost: 3000,
    type: 'cosmetic',
    icon: 'neon_strip.png',
    tagLabel: 'COSMETIC',
    shortDesc: '解鎖賽博龐克背景燈光效果',
    effects: [
      { icon: '🎨', text: '解鎖隨機賽博龐克背景燈光主題' },
      { icon: '🏆', text: '收藏道具，可累積持有數量' },
      { icon: '✨', text: '彰顯節點個性，純粹的視覺享受' },
    ],
    tip: '土豪的象徵，讓別人知道你不缺 PT。',
  },
  {
    id: 'flash_drive',
    name: '神祕的隨身碟',
    cost: 500,
    type: 'random',
    icon: 'flash_drive.png',
    tagLabel: 'RANDOM',
    shortDesc: '抽獎盲盒，驚喜與風險並存',
    effects: [
      { icon: '🏆', text: '30% 機率：獲得 1 天（86400 秒）生存時間' },
      { icon: '💰', text: '30% 機率：獲得 2000 PT' },
      { icon: '🎁', text: '30% 機率：獲得 500 PT（小回本）' },
      { icon: '💀', text: '10% 機率：電腦病毒！健康度 -50%（大凶）' },
    ],
    tip: '手氣好的節點可以一夜暴富，手氣差的... 祝您好運。',
  },
];

// ─── Type Config ──────────────────────────────────────────────────────────────
const TYPE_CFG = {
  health:   { color: '#22c55e', bg: 'rgba(34,197,94,0.10)',   border: 'rgba(34,197,94,0.30)',   glow: '0 0 16px rgba(34,197,94,0.2)' },
  buff:     { color: '#a855f7', bg: 'rgba(168,85,247,0.10)',  border: 'rgba(168,85,247,0.30)',  glow: '0 0 16px rgba(168,85,247,0.2)' },
  revive:   { color: '#38bdf8', bg: 'rgba(56,189,248,0.10)',  border: 'rgba(56,189,248,0.30)',  glow: '0 0 16px rgba(56,189,248,0.2)' },
  cosmetic: { color: '#f472b6', bg: 'rgba(244,114,182,0.10)', border: 'rgba(244,114,182,0.30)', glow: '0 0 16px rgba(244,114,182,0.2)' },
  random:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.30)',  glow: '0 0 16px rgba(251,191,36,0.2)' },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ShopModal({ onClose, pts, onBuy, onAdRevive, adReviveRemaining }) {
  const [buying, setBuying] = useState(null);
  const [selected, setSelected] = useState(null);
  const [flashId, setFlashId] = useState(null);

  const currentPts = Number(pts || 0);
  const formattedPts = currentPts.toLocaleString(undefined, { maximumFractionDigits: 1 });

  const handleBuy = (item) => {
    if (buying || currentPts < item.cost) return;
    setBuying(item.id);
    setFlashId(item.id);
    onBuy(item.id);
    setTimeout(() => { setBuying(null); setFlashId(null); }, 1200);
  };

  const selectedItem = SHOP_ITEMS.find(i => i.id === selected);

  return (
    // 側邊抽屜式：不遮擋左側面板
    <div style={css.backdrop} onClick={onClose}>
      <div style={css.drawer} onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div style={css.header}>
          <div style={css.headerLeft}>
            <span style={css.headerIcon}>🏪</span>
            <div>
              <div style={css.headerTitle}>黑市商城</div>
              <div style={css.headerSub}>BLACK_MARKET_TERMINAL</div>
            </div>
          </div>
          <div style={css.walletBadge}>
            <span style={css.walletLabel}>餘額</span>
            <span style={css.walletValue}>{formattedPts} <span style={css.ptUnit}>PT</span></span>
          </div>
          <button style={css.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* ── Item Grid ── */}
        <div style={css.body}>
          <div style={css.grid}>
            {SHOP_ITEMS.map(item => {
              const tc = TYPE_CFG[item.type];
              const canAfford = currentPts >= item.cost;
              const isSelected = selected === item.id;
              const isFlash = flashId === item.id;
              return (
                <div
                  key={item.id}
                  style={{
                    ...css.card,
                    background: isSelected ? tc.bg : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isSelected ? tc.border : 'rgba(255,255,255,0.08)'}`,
                    boxShadow: isSelected ? tc.glow : 'none',
                    opacity: canAfford ? 1 : 0.5,
                    animation: isFlash ? 'shop-flash 0.6s ease' : 'none',
                    cursor: 'pointer',
                    transform: isSelected ? 'translateY(-2px)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => setSelected(isSelected ? null : item.id)}
                >
                  {/* Icon image + type badge */}
                  <div style={css.cardTop}>
                    <img
                      src={`/assets/items/${item.icon}`}
                      alt={item.name}
                      style={css.itemImg(tc)}
                      onError={e => { e.target.style.opacity = '0.3'; }}
                    />
                    <span style={{ ...css.typeBadge, color: tc.color, border: `1px solid ${tc.border}`, background: tc.bg }}>
                      {item.tagLabel}
                    </span>
                  </div>

                  <div style={css.cardName}>{item.name}</div>
                  <div style={css.cardShort}>{item.shortDesc}</div>

                  {/* Cost row */}
                  <div style={css.cardBottom}>
                    <span style={{ ...css.cardCost, color: canAfford ? tc.color : '#64748b' }}>
                      {item.cost.toLocaleString()} PT
                    </span>
                    <button
                      style={{
                        ...css.buyBtn,
                        background: buying === item.id ? '#1e293b' : canAfford ? tc.color : '#1e293b',
                        color: buying === item.id ? tc.color : canAfford ? '#000' : '#475569',
                        border: `1px solid ${canAfford ? tc.color : '#334155'}`,
                        cursor: canAfford && !buying ? 'pointer' : 'not-allowed',
                      }}
                      disabled={!canAfford || !!buying}
                      onClick={e => { e.stopPropagation(); handleBuy(item); }}
                    >
                      {buying === item.id ? '處理中…' : '購買'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Detail Panel ── */}
          {selectedItem && (() => {
            const tc = TYPE_CFG[selectedItem.type];
            const canAfford = currentPts >= selectedItem.cost;
            return (
              <div style={{ ...css.detail, borderColor: tc.border, background: `linear-gradient(135deg, ${tc.bg}, rgba(10,14,23,0.9))` }}>
                <div style={css.detailHeader}>
                  <img
                    src={`/assets/items/${selectedItem.icon}`}
                    alt={selectedItem.name}
                    style={css.detailImg(tc)}
                    onError={e => { e.target.style.opacity = '0.3'; }}
                  />
                  <div>
                    <div style={css.detailName}>{selectedItem.name}</div>
                    <span style={{ ...css.typeBadge, color: tc.color, border: `1px solid ${tc.border}`, background: tc.bg }}>
                      {selectedItem.tagLabel}
                    </span>
                  </div>
                </div>

                <div style={css.detailSection}>效果說明</div>
                <div style={css.effectList}>
                  {selectedItem.effects.map((ef, i) => (
                    <div key={i} style={css.effectRow}>
                      <span style={css.effectIcon}>{ef.icon}</span>
                      <span style={css.effectText}>{ef.text}</span>
                    </div>
                  ))}
                </div>

                <div style={css.detailSection}>💡 使用建議</div>
                <div style={css.tipBox}>
                  {selectedItem.tip}
                </div>

                <div style={css.detailFooter}>
                  <div style={css.detailCost}>
                    <span style={css.detailCostLabel}>費用</span>
                    <span style={{ color: canAfford ? tc.color : '#ef4444', fontWeight: 'bold', fontSize: '1.3rem' }}>
                      {selectedItem.cost.toLocaleString()} PT
                    </span>
                    {!canAfford && (
                      <span style={css.shortage}>
                        差 {(selectedItem.cost - currentPts).toLocaleString()} PT
                      </span>
                    )}
                  </div>
                  <button
                    style={{
                      ...css.detailBuyBtn,
                      background: canAfford ? tc.color : '#1e293b',
                      color: canAfford ? '#000' : '#475569',
                      cursor: canAfford && !buying ? 'pointer' : 'not-allowed',
                      opacity: canAfford ? 1 : 0.6,
                    }}
                    disabled={!canAfford || !!buying}
                    onClick={() => handleBuy(selectedItem)}
                  >
                    {buying === selectedItem.id ? '⏳ 處理中…' : `購買 ${selectedItem.emoji}`}
                  </button>
                </div>
              </div>
            );
          })()}

          {/* ── Ad Revive Section ── */}
          {adReviveRemaining > 0 && (
            <div style={css.adSection}>
              <div style={css.adLeft}>
                <span style={{ fontSize: '1.5rem' }}>📺</span>
                <div>
                  <div style={css.adTitle}>免費廣告復活</div>
                  <div style={css.adDesc}>
                    觀看 15 秒廣告，可免費復活已死機的伺服器
                    <span style={css.adRemain}>（今日剩餘 {adReviveRemaining} 次）</span>
                  </div>
                </div>
              </div>
              <button
                style={css.adBtn}
                onClick={() => { onAdRevive(); onClose(); }}
              >
                ▶ 觀看廣告
              </button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={css.footer}>
          <span style={css.footerNote}>掛機收益：約 3 pt/min（100% 血量）｜點擊道具卡片查看詳情</span>
          <span style={css.footerClose} onClick={onClose}>[ESC] 關閉</span>
        </div>
      </div>

      <style>{`
        @keyframes shop-flash {
          0%   { filter: brightness(1); }
          30%  { filter: brightness(2.5); }
          100% { filter: brightness(1); }
        }
      `}</style>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
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
  // Header
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
  walletBadge: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
    background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.2)',
    borderRadius: '8px', padding: '6px 12px',
    flexShrink: 0,
  },
  walletLabel: { color: '#64748b', fontSize: '0.65rem', letterSpacing: '1px' },
  walletValue: { color: '#00ff41', fontWeight: '700', fontSize: '1rem', fontFamily: '"Courier New", monospace', textShadow: '0 0 8px rgba(0,255,65,0.5)' },
  ptUnit: { fontSize: '0.7rem', color: '#22c55e' },
  closeBtn: {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: '#64748b', cursor: 'pointer', borderRadius: '6px',
    width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '14px', flexShrink: 0, transition: 'all 0.15s',
  },
  // Body
  body: {
    flex: 1, overflowY: 'auto', padding: '16px',
    display: 'flex', flexDirection: 'column', gap: '12px',
  },
  // Item Grid
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
  },
  card: {
    borderRadius: '12px',
    padding: '14px',
    display: 'flex', flexDirection: 'column', gap: '8px',
    userSelect: 'none',
  },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  itemImg: (tc) => ({
    width: 40, height: 40,
    objectFit: 'contain',
    imageRendering: 'pixelated',
    background: '#050a12',
    border: `1px solid ${tc.border}`,
    padding: '4px',
    boxSizing: 'border-box',
    borderRadius: '6px',
    flexShrink: 0,
  }),
  detailImg: (tc) => ({
    width: 56, height: 56,
    objectFit: 'contain',
    imageRendering: 'pixelated',
    background: '#050a12',
    border: `1px solid ${tc.border}`,
    padding: '6px',
    boxSizing: 'border-box',
    borderRadius: '10px',
    flexShrink: 0,
    boxShadow: `0 0 12px ${tc.border}`,
  }),
  typeBadge: {
    fontSize: '0.6rem', letterSpacing: '1px', fontWeight: '700',
    padding: '2px 7px', borderRadius: '4px',
    fontFamily: '"Courier New", monospace',
  },
  cardName: { color: '#e2e8f0', fontWeight: '700', fontSize: '0.85rem', lineHeight: 1.3 },
  cardShort: { color: '#64748b', fontSize: '0.72rem', lineHeight: 1.4, flex: 1 },
  cardBottom: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' },
  cardCost: { fontWeight: '700', fontSize: '0.85rem', fontFamily: '"Courier New", monospace' },
  buyBtn: {
    borderRadius: '6px', padding: '5px 12px',
    fontWeight: '700', fontSize: '0.75rem',
    fontFamily: '"Inter", sans-serif',
    transition: 'all 0.15s',
  },
  // Detail panel
  detail: {
    borderRadius: '14px', border: '1px solid',
    padding: '18px',
    display: 'flex', flexDirection: 'column', gap: '12px',
  },
  detailHeader: { display: 'flex', alignItems: 'center', gap: '14px' },
  detailName: { color: '#e2e8f0', fontWeight: '700', fontSize: '1.05rem', marginBottom: '6px' },
  detailSection: { color: '#94a3b8', fontSize: '0.72rem', letterSpacing: '1px', fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px' },
  effectList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  effectRow: { display: 'flex', alignItems: 'flex-start', gap: '10px' },
  effectIcon: { fontSize: '0.9rem', flexShrink: 0, marginTop: '1px' },
  effectText: { color: '#cbd5e1', fontSize: '0.82rem', lineHeight: 1.5 },
  tipBox: {
    background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '10px 12px',
    color: '#94a3b8', fontSize: '0.8rem', lineHeight: 1.6,
    borderLeft: '3px solid rgba(251,191,36,0.5)',
  },
  detailFooter: { display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px' },
  detailCost: { flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' },
  detailCostLabel: { color: '#64748b', fontSize: '0.7rem', letterSpacing: '1px' },
  shortage: { color: '#ef4444', fontSize: '0.72rem', marginTop: '2px' },
  detailBuyBtn: {
    borderRadius: '8px', padding: '10px 20px',
    fontWeight: '700', fontSize: '0.9rem',
    border: 'none', transition: 'all 0.15s',
    flexShrink: 0,
  },
  // Ad section
  adSection: {
    display: 'flex', alignItems: 'center', gap: '14px',
    background: 'rgba(0,255,65,0.05)', border: '1px solid rgba(0,255,65,0.2)',
    borderRadius: '12px', padding: '14px 16px',
  },
  adLeft: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1 },
  adTitle: { color: '#e2e8f0', fontWeight: '700', fontSize: '0.9rem', marginBottom: '3px' },
  adDesc: { color: '#64748b', fontSize: '0.75rem', lineHeight: 1.4 },
  adRemain: { color: '#22c55e', marginLeft: '4px' },
  adBtn: {
    background: '#00ff41', color: '#000',
    border: 'none', borderRadius: '8px',
    padding: '8px 16px', fontWeight: '700', fontSize: '0.82rem',
    cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
  },
  // Footer
  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 20px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    flexShrink: 0,
  },
  footerNote: { color: '#334155', fontSize: '0.68rem', lineHeight: 1.4 },
  footerClose: { color: '#475569', fontSize: '0.72rem', cursor: 'pointer', fontFamily: '"Courier New", monospace', transition: 'color 0.15s' },
};
