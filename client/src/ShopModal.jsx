import React, { useState } from 'react';
import { useLanguage } from './LanguageContext';

// ─── Item Definitions ────────────────────────────────────────────────────────
const SHOP_ITEMS = [
  {
    id: 'liquid_nitrogen',
    name: '液態氮冷卻瓶', cost: 5000, type: 'buff',
    icon: 'liquid_nitrogen.png', tagLabel: 'COOLING',
    shortDesc: '40 分鐘內衰減 -50% + 免疫維護',
    effects: [
      { icon: '❄️', text: '40 分鐘內健康度衰減 -50%' },
      { icon: '🛡️', text: '免疫「系統維護」降頻懲罰' },
    ],
    tip: '搭配系統維護使用，存活率大幅提升。',
  },
  {
    id: 'quantum_cooler',
    name: '量子散熱塔', cost: 15000, type: 'health',
    icon: 'quantum_cooler.png', tagLabel: 'HEALTH',
    shortDesc: '恢復 60% HP + 30 分鐘衰減 -30%',
    effects: [
      { icon: '❤️', text: '立即恢復 +60% 健康度' },
      { icon: '⏳', text: '30 分鐘內健康度衰減 -30%' },
    ],
    tip: '緊急治療 + 緩衝，一次解決兩種問題。',
  },
  {
    id: 'overclock_chip',
    name: '超頻晶片', cost: 30000, type: 'buff',
    icon: 'overclock_chip.png', tagLabel: 'BUFF',
    shortDesc: '30 分鐘 PT 收益 ×2.0 倍',
    effects: [
      { icon: '💎', text: 'PT 獲取速率 ×2.0 倍，持續 30 分鐘' },
      { icon: '📈', text: '與全域事件倍率疊加計算' },
    ],
    tip: '配合全域事件「量子爆發」或「數據淘金潮」使用，效果驚人！',
  },
  {
    id: 'firewall',
    name: '防火牆', cost: 20000, type: 'buff',
    icon: 'firewall.png', tagLabel: 'BUFF',
    shortDesc: '45 分鐘免疫衰減 + 太陽風暴',
    effects: [
      { icon: '🛡️', text: '45 分鐘內健康度不再自然衰減' },
      { icon: '🌪️', text: '太陽風暴期間斷線不扣 PT' },
    ],
    tip: '全方位防護，太陽風暴期間必備。',
  },
  {
    id: 'generator',
    name: '備用發電機', cost: 10000, type: 'revive',
    icon: 'generator.png', tagLabel: 'REVIVE',
    shortDesc: '復活至 35% HP + 30 分額外 PT',
    effects: [
      { icon: '❤️', text: '死機後強制重啟，恢復 35% 健康度' },
      { icon: '⚡', text: '復活後 30 分鐘內每 tick 額外 +0.05 PT' },
    ],
    tip: '最經濟的復活方案，復活後還有產能加成。',
  },
  {
    id: 'neon_strip',
    name: '霓虹燈管', cost: 8000, type: 'cosmetic',
    icon: 'neon_strip.png', tagLabel: 'COSMETIC',
    shortDesc: '裝飾 + 好友上限 +5',
    effects: [
      { icon: '🌈', text: '解鎖賽博龐克霓虹發光特效' },
      { icon: '👥', text: '好友上限永久 +5' },
    ],
    tip: '好看又實用，擴展你的社交網絡。',
  },
  {
    id: 'flash_drive',
    name: '神秘隨身碟', cost: 5000, type: 'random',
    icon: 'flash_drive.png', tagLabel: 'LOCKED',
    shortDesc: '⚠️ 暫時封鎖中',
    locked: true,
    effects: [
      { icon: '🔒', text: '此道具因平衡問題暫時下架' },
      { icon: '📦', text: '已持有的節點仍可從背包使用' },
    ],
    tip: '神秘隨身碟因平衡問題已被管理員暫時封鎖。',
  },
  {
    id: 'speed_drive',
    name: '網路加速器', cost: 25000, type: 'buff',
    icon: 'flash_drive.png', tagLabel: 'SPEED',
    shortDesc: '60 分鐘每 tick PT +66%',
    effects: [
      { icon: '⚡', text: '每 tick PT 收益增加 +66%，持續 60 分鐘' },
      { icon: '⏱️', text: '與全域事件倍率、超頻晶片疊加計算' },
    ],
    tip: '讓你的收益比別人多 66%，掛機必備。',
  },
  {
    id: 'backup_node',
    name: '備份節點', cost: 50000, type: 'passive',
    icon: 'generator.png', tagLabel: 'PASSIVE',
    shortDesc: '死亡時自動消耗以 30% HP 復活',
    effects: [
      { icon: '🔄', text: '被動效果：健康度歸零時自動觸發' },
      { icon: '❤️', text: '以 30% 健康度立即復活，不使用背包次數' },
    ],
    tip: '買一個保心安，防止意外死機。',
  },
];

// ─── Type Config ──────────────────────────────────────────────────────────────
const TYPE_CFG = {
  health:   { color: '#22c55e', bg: 'rgba(34,197,94,0.10)',   border: 'rgba(34,197,94,0.30)',   glow: '0 0 16px rgba(34,197,94,0.2)' },
  buff:     { color: '#a855f7', bg: 'rgba(168,85,247,0.10)',  border: 'rgba(168,85,247,0.30)',  glow: '0 0 16px rgba(168,85,247,0.2)' },
  revive:   { color: '#38bdf8', bg: 'rgba(56,189,248,0.10)',  border: 'rgba(56,189,248,0.30)',  glow: '0 0 16px rgba(56,189,248,0.2)' },
  cosmetic: { color: '#f472b6', bg: 'rgba(244,114,182,0.10)', border: 'rgba(244,114,182,0.30)', glow: '0 0 16px rgba(244,114,182,0.2)' },
  random:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.10)',  border: 'rgba(251,191,36,0.30)',  glow: '0 0 16px rgba(251,191,36,0.2)' },
  speed:    { color: '#8b5cf6', bg: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.30)',  glow: '0 0 16px rgba(139,92,246,0.2)' },
  passive:  { color: '#38bdf8', bg: 'rgba(56,189,248,0.10)',  border: 'rgba(56,189,248,0.30)',  glow: '0 0 16px rgba(56,189,248,0.2)' },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ShopModal({ onClose, pts, onBuy, onAdRevive, adReviveRemaining }) {
  const { t } = useLanguage();
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
              <div style={css.headerTitle}>{t('黑市商城')}</div>
              <div style={css.headerSub}>BLACK_MARKET_TERMINAL</div>
            </div>
          </div>
          <div style={css.walletBadge}>
            <span style={css.walletLabel}>{t('餘額')}</span>
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
                    border: `1px solid ${item.locked ? 'rgba(255,65,100,0.3)' : (isSelected ? tc.border : 'rgba(255,255,255,0.08)')}`,
                    boxShadow: isSelected ? tc.glow : 'none',
                    opacity: item.locked ? 0.6 : (canAfford ? 1 : 0.5),
                    animation: isFlash ? 'shop-flash 0.6s ease' : 'none',
                    cursor: 'pointer',
                    transform: isSelected ? 'translateY(-2px)' : 'none',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                  }}
                  onClick={() => setSelected(isSelected ? null : item.id)}
                >
                  {/* Icon image + type badge */}
                  <div style={css.cardTop}>
                    <img
                      src={`/assets/items/${item.icon}`}
                      alt={t(item.name)}
                      style={css.itemImg(tc)}
                      onError={e => { e.target.style.opacity = '0.3'; }}
                    />
                    <span style={{ ...css.typeBadge, color: tc.color, border: `1px solid ${tc.border}`, background: tc.bg }}>
                      {item.tagLabel}
                    </span>
                  </div>

                  <div style={css.cardName}>{t(item.name)}</div>
                  <div style={css.cardShort}>{t(item.shortDesc)}</div>

                  {/* Cost row */}
                  <div style={css.cardBottom}>
                    <span style={{ ...css.cardCost, color: canAfford ? tc.color : '#64748b' }}>
                      {item.cost.toLocaleString()} PT
                    </span>
                    <button
                      style={{
                        ...css.buyBtn,
                        background: item.locked ? '#3d1f1f' : (buying === item.id ? '#1e293b' : canAfford ? tc.color : '#1e293b'),
                        color: item.locked ? '#ff416c' : (buying === item.id ? tc.color : canAfford ? '#000' : '#475569'),
                        border: `1px solid ${item.locked ? '#ff416c' : (canAfford ? tc.color : '#334155')}`,
                        cursor: item.locked ? 'not-allowed' : (canAfford && !buying ? 'pointer' : 'not-allowed'),
                      }}
                      disabled={item.locked || !canAfford || !!buying}
                      onClick={e => { e.stopPropagation(); if (!item.locked) handleBuy(item); }}
                    >
                      {item.locked ? t('🔒 封鎖中') : (buying === item.id ? t('處理中…') : t('購買'))}
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
                    alt={t(selectedItem.name)}
                    style={css.detailImg(tc)}
                    onError={e => { e.target.style.opacity = '0.3'; }}
                  />
                  <div>
                    <div style={css.detailName}>{t(selectedItem.name)}</div>
                    <span style={{ ...css.typeBadge, color: tc.color, border: `1px solid ${tc.border}`, background: tc.bg }}>
                      {selectedItem.tagLabel}
                    </span>
                  </div>
                </div>

                <div style={css.detailSection}>{t('效果說明')}</div>
                <div style={css.effectList}>
                  {selectedItem.effects.map((ef, i) => (
                    <div key={i} style={css.effectRow}>
                      <span style={css.effectIcon}>{ef.icon}</span>
                      <span style={css.effectText}>{t(ef.text)}</span>
                    </div>
                  ))}
                </div>

                <div style={css.detailSection}>{selectedItem.locked ? t('🚫 管理員公告') : t('💡 使用建議')}</div>
                <div style={{ ...css.tipBox, borderLeft: selectedItem.locked ? '3px solid #ff416c' : '3px solid rgba(251,191,36,0.5)' }}>
                  {t(selectedItem.tip)}
                </div>

                <div style={css.detailFooter}>
                  <div style={css.detailCost}>
                    <span style={css.detailCostLabel}>{t('費用')}</span>
                    <span style={{ color: canAfford ? tc.color : '#ef4444', fontWeight: 'bold', fontSize: '1.3rem' }}>
                      {selectedItem.cost.toLocaleString()} PT
                    </span>
                    {!canAfford && (
                      <span style={css.shortage}>
                         {t('差')} {(selectedItem.cost - currentPts).toLocaleString()} PT
                      </span>
                    )}
                  </div>
                  <button
                    style={{
                      ...css.detailBuyBtn,
                      background: selectedItem.locked ? '#3d1f1f' : (canAfford ? tc.color : '#1e293b'),
                      color: selectedItem.locked ? '#ff416c' : (canAfford ? '#000' : '#475569'),
                      cursor: selectedItem.locked ? 'not-allowed' : (canAfford && !buying ? 'pointer' : 'not-allowed'),
                      opacity: selectedItem.locked ? 1 : (canAfford ? 1 : 0.6),
                    }}
                    disabled={selectedItem.locked || !canAfford || !!buying}
                    onClick={() => { if (!selectedItem.locked) handleBuy(selectedItem); }}
                  >
                    {selectedItem.locked ? t('🔒 暫時封鎖') : (buying === selectedItem.id ? t('⏳ 處理中…') : t('購買'))}
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
                  <div style={css.adTitle}>{t('免費廣告復活')}</div>
                  <div style={css.adDesc}>
                     {t('觀看 15 秒廣告，可免費復活已死機的伺服器')}
                    <span style={css.adRemain}>{t('（今日剩餘')} {adReviveRemaining} {t('次）')}</span>
                  </div>
                </div>
              </div>
              <button
                style={css.adBtn}
                onClick={() => { onAdRevive(); onClose(); }}
              >
                {t('▶ 觀看廣告')}
              </button>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div style={css.footer}>
          <span style={css.footerNote}>{t('掛機收益：約 3 pt/min（100% 血量）｜點擊道具卡片查看詳情')}</span>
          <span style={css.footerClose} onClick={onClose}>{t('[ESC] 關閉')}</span>
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
    background: 'var(--bg-light)',
    borderLeft: '1px solid var(--border-color)',
    display: 'flex', flexDirection: 'column',
    height: '100vh',
    boxShadow: '-4px 0 12px rgba(0,0,0,0.06)',
    animation: 'slideIn 0.25s ease',
  },
  // Header
  header: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '18px 20px',
    borderBottom: '1px solid var(--border-color)',
    background: 'var(--bg-color)',
    flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1 },
  headerIcon: { fontSize: '1.8rem' },
  headerTitle: { color: 'var(--text-color)', fontWeight: '700', fontSize: '1.1rem' },
  headerSub: { color: 'var(--text-secondary)', fontSize: '0.7rem', marginTop: '2px' },
  walletBadge: {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
    background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.15)',
    borderRadius: '8px', padding: '6px 12px',
    flexShrink: 0,
  },
  walletLabel: { color: 'var(--text-secondary)', fontSize: '0.65rem', fontWeight: 600 },
  walletValue: { color: 'var(--accent-color)', fontWeight: '700', fontSize: '1rem', fontFamily: 'var(--font-sans)' },
  ptUnit: { fontSize: '0.7rem', color: 'var(--accent-color)' },
  closeBtn: {
    background: 'var(--bg-color)', border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)', cursor: 'pointer', borderRadius: '6px',
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
    background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.12)',
    borderRadius: '12px', padding: '14px 16px',
  },
  adLeft: { display: 'flex', alignItems: 'center', gap: '12px', flex: 1 },
  adTitle: { color: 'var(--text-color)', fontWeight: '600', fontSize: '0.9rem', marginBottom: '3px' },
  adDesc: { color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.4 },
  adRemain: { color: 'var(--accent-color)', marginLeft: '4px' },
  adBtn: {
    background: 'var(--accent-color)', color: '#fff',
    border: 'none', borderRadius: '8px',
    padding: '8px 16px', fontWeight: '700', fontSize: '0.82rem',
    cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s',
  },
  // Footer
  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 20px',
    borderTop: '1px solid var(--border-color)',
    flexShrink: 0,
  },
  footerNote: { color: 'var(--text-dim)', fontSize: '0.68rem', lineHeight: 1.4 },
  footerClose: { color: 'var(--text-secondary)', fontSize: '0.72rem', cursor: 'pointer', transition: 'color 0.15s' },
};
