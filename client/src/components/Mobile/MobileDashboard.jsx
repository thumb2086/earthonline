import { ShoppingCart, Backpack, Trophy, Zap, Globe2, Activity, Info } from 'lucide-react';

function formatTime(seconds) {
  if (!seconds || seconds < 0) return '00:00:00';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600).toString().padStart(2, '0');
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return d > 0 ? `${d}d ${h}:${m}:${s}` : `${h}:${m}:${s}`;
}

export default function MobileDashboard({
  myNode, lifespan, isOfflineMode, offlineState, globalStats,
  onOpenShop, onOpenBackpack, onOpenAchievements, onOpenTalent,
  onOpenLeaderboard, onOpenWar, onOpenAbout, t
}) {
  const state = isOfflineMode && offlineState ? offlineState : myNode || {};
  const health = state.health ?? 100;
  const pts = state.accumulatedBonusPoints ?? 0;
  const level = state.level ?? 1;
  const time = state.accumulatedTime ?? 0;
  const healthPct = Math.floor(health);
  const healthColor = healthPct > 50 ? 'var(--success-color)' : healthPct > 20 ? 'var(--warning-color)' : 'var(--danger-color)';

  return (
    <div className="mobile-dashboard">
      <div className="mobile-dash-cards">
        <div className="mobile-card health-card" style={{ borderColor: healthColor }}>
          <div className="mobile-card-label">{t('生命')}</div>
          <div className="mobile-card-value" style={{ color: healthColor }}>{healthPct}%</div>
          <div className="mobile-card-bar">
            <div className="mobile-card-bar-fill" style={{ width: `${healthPct}%`, background: healthColor }} />
          </div>
        </div>
        <div className="mobile-card">
          <div className="mobile-card-label">PT</div>
          <div className="mobile-card-value" style={{ color: 'var(--accent-color)' }}>
            {Math.floor(pts).toLocaleString()}
          </div>
        </div>
        <div className="mobile-card">
          <div className="mobile-card-label">{t('等級')}</div>
          <div className="mobile-card-value">Lv.{level}</div>
        </div>
        <div className="mobile-card">
          <div className="mobile-card-label">{t('存活')}</div>
          <div className="mobile-card-value" style={{ fontSize: '0.8rem' }}>{formatTime(Math.floor(time / 1000))}</div>
        </div>
      </div>

      <div className="mobile-dash-stats">
        <div className="mobile-dash-stat">
          <span className="mobile-dash-stat-label">{t('上線人數')}</span>
          <span className="mobile-dash-stat-value" style={{ color: 'var(--success-color)' }}>{globalStats.activeUsers ?? 0}</span>
        </div>
        <div className="mobile-dash-stat">
          <span className="mobile-dash-stat-label">{t('總人口')}</span>
          <span className="mobile-dash-stat-value">{globalStats.totalPopulation ?? 0}</span>
        </div>
        <div className="mobile-dash-stat">
          <span className="mobile-dash-stat-label">倍率</span>
          <span className="mobile-dash-stat-value" style={{ color: 'var(--accent-color)' }}>{(globalStats.multiplier || 1).toFixed(1)}x</span>
        </div>
      </div>

      <div className="mobile-dash-actions">
        <button className="mobile-action-btn" onClick={onOpenShop} style={{ color: '#38bdf8', borderColor: 'rgba(56,189,248,0.3)' }}>
          <ShoppingCart size={20} /> {t('商城')}
        </button>
        <button className="mobile-action-btn" onClick={onOpenBackpack} style={{ color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' }}>
          <Backpack size={20} /> {t('背包')}
        </button>
        <button className="mobile-action-btn" onClick={onOpenAchievements} style={{ color: '#FFD700', borderColor: 'rgba(255,215,0,0.3)' }}>
          <Trophy size={20} /> {t('成就')}
        </button>
        {(level >= 10) && (
          <button className="mobile-action-btn" onClick={onOpenTalent} style={{ color: '#9333EA', borderColor: 'rgba(147,51,234,0.3)' }}>
            <Zap size={20} /> {t('天賦')}
          </button>
        )}
        <button className="mobile-action-btn" onClick={onOpenLeaderboard} style={{ color: '#FFD700', borderColor: 'rgba(255,215,0,0.3)' }}>
          <Activity size={20} /> {t('排行')}
        </button>
        <button className="mobile-action-btn" onClick={onOpenWar} style={{ color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}>
          <Globe2 size={20} /> {t('區域')}
        </button>
        <button className="mobile-action-btn" onClick={onOpenAbout} style={{ color: '#888', borderColor: 'rgba(136,136,136,0.3)' }}>
          <Info size={20} /> {t('關於')}
        </button>
      </div>
    </div>
  );
}
