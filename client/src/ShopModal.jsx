import React, { useState } from 'react';
import { X, ShoppingCart, Info, AlertTriangle } from 'lucide-react';

const SHOP_ITEMS = [
  { id: 'liquid_nitrogen', name: '液態氮冷卻瓶', cost: 200, type: 'health', icon: 'liquid_nitrogen.png', desc: '瞬間恢復 50% 伺服器健康度。' },
  { id: 'quantum_cooler', name: '量子散熱塔', cost: 500, type: 'health', icon: 'quantum_cooler.png', desc: '恢復 100% 健康度。' },
  { id: 'overclock_chip', name: '實驗性超頻晶片', cost: 1500, type: 'buff', icon: 'overclock_chip.png', desc: '1 小時內，PT 獲取速度加倍。' },
  { id: 'firewall', name: '實體防火牆模組', cost: 1000, type: 'buff', icon: 'firewall.png', desc: '30 分鐘內，免疫因過熱造成的健康度衰減。' },
  { id: 'generator', name: '備用柴油發電機', cost: 800, type: 'revive', icon: 'generator.png', desc: '若伺服器因 0% 健康度死機，可強制重啟並恢復 20% 健康度。' },
  { id: 'neon_strip', name: 'RGB 霓虹燈管', cost: 3000, type: 'cosmetic', icon: 'neon_strip.png', desc: '純裝飾，解鎖隨機的賽博龐克背景燈光！' },
  { id: 'flash_drive', name: '神祕的隨身碟', cost: 500, type: 'random', icon: 'flash_drive.png', desc: '抽獎盲盒！可能開出大量時間/PT，也可能開出電腦病毒！' }
];

export default function ShopModal({ onClose, pts, onBuy }) {
  const [buying, setBuying] = useState(null);

  const handleBuy = async (item) => {
    setBuying(item.id);
    await onBuy(item.id);
    setTimeout(() => setBuying(null), 500); // UI feedback delay
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content shop-modal" style={{ maxWidth: '600px', backgroundColor: '#0f172a', border: '1px solid #334155' }}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#38bdf8', marginBottom: '20px' }}>
          <ShoppingCart size={24} /> 黑市終端商城
        </h2>
        
        <div style={{ padding: '15px', backgroundColor: 'rgba(56, 189, 248, 0.1)', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>目前可用信用點數</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {pts?.toLocaleString() || 0} PT
            </div>
          </div>
          <AlertTriangle size={24} color="#f59e0b" style={{ opacity: 0.5 }} />
        </div>

        <div className="shop-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', maxHeight: '50vh', overflowY: 'auto', paddingRight: '10px' }}>
          {SHOP_ITEMS.map(item => {
            const canAfford = (pts || 0) >= item.cost;
            return (
              <div key={item.id} style={{
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '12px',
                backgroundColor: 'rgba(30, 41, 59, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
              }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <img 
                    src={`/assets/items/${item.icon}`} 
                    alt={item.name}
                    style={{ width: '48px', height: '48px', imageRendering: 'pixelated', backgroundColor: '#020617', borderRadius: '4px', border: '1px solid #334155', padding: '4px' }}
                  />
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1rem', color: '#e2e8f0' }}>{item.name}</h3>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      padding: '2px 6px', 
                      borderRadius: '4px',
                      backgroundColor: item.type === 'health' ? '#14532d' : 
                                       item.type === 'buff' ? '#701a75' : 
                                       item.type === 'random' ? '#b45309' : '#1e3a8a',
                      color: item.type === 'health' ? '#86efac' : 
                             item.type === 'buff' ? '#f5d0fe' : 
                             item.type === 'random' ? '#fcd34d' : '#bfdbfe'
                    }}>
                      {item.type.toUpperCase()}
                    </span>
                  </div>
                </div>
                
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 12px 0', flexGrow: 1, display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                  <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                  {item.desc}
                </p>
                
                <button 
                  onClick={() => handleBuy(item)}
                  disabled={!canAfford || buying === item.id}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '6px',
                    border: 'none',
                    fontWeight: 'bold',
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    backgroundColor: buying === item.id ? '#10b981' : canAfford ? '#3b82f6' : '#334155',
                    color: canAfford ? '#ffffff' : '#94a3b8',
                    transition: 'all 0.2s'
                  }}
                >
                  {buying === item.id ? '購買中...' : `${item.cost} PT`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .shop-grid::-webkit-scrollbar { width: 6px; }
        .shop-grid::-webkit-scrollbar-track { background: #0f172a; }
        .shop-grid::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
      `}} />
    </div>
  );
}
