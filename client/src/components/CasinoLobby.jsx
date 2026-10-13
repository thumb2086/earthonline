import { useState, useEffect } from 'react';
import './casino.css';

const GAMES = [
  {
    id: 'slots',
    icon: '🎰',
    name: '老虎機',
    desc: '3×3 轉輪 · 自動旋轉 · 累積頭獎',
    badge: '頭獎',
    accent: '#f59e0b',
    rtp: '96%',
    minBet: 100,
  },
  {
    id: 'sicbo',
    icon: '🎲',
    name: '骰寶',
    desc: '大 / 小 / 圍骰 · 三骰總和',
    accent: '#3b82f6',
    rtp: '97%',
    minBet: 100,
  },
  {
    id: 'roulette',
    icon: '🎡',
    name: '輪盤',
    desc: '歐式 37 格 · 數字 / 紅黑 / 奇偶',
    accent: '#ef4444',
    rtp: '97.3%',
    minBet: 100,
  },
  {
    id: 'blackjack',
    icon: '🃏',
    name: '21 點',
    desc: '天然 BJ 3.5x · 莊家 17 停',
    badge: '策略',
    accent: '#10b981',
    rtp: '99.5%',
    minBet: 500,
  },
];

export default function CasinoLobby({ onSelect, stats, user }) {
  return (
    <div className="casino-lobby">
      {/* Hero 標題區 */}
      <div className="casino-hero">
        <div className="casino-hero-title">🎰 Casino Floor</div>
        <div className="casino-hero-sub">選擇遊戲開始下注</div>
        {stats && (
          <div className="casino-stats-row">
            <div className="casino-stat">
              <span className="casino-stat-label">總投注</span>
              <span className="casino-stat-value">${(stats.wagered || 0).toLocaleString()}</span>
            </div>
            <div className="casino-stat">
              <span className="casino-stat-label">局數</span>
              <span className="casino-stat-value">{(stats.games || 0).toLocaleString()}</span>
            </div>
            <div className="casino-stat">
              <span className="casino-stat-label">淨損益</span>
              <span className="casino-stat-value"
                style={{ color: (stats.netProfit || 0) >= 0 ? 'var(--accent)' : 'var(--danger)' }}>
                {(stats.netProfit || 0) >= 0 ? '+' : ''}${(stats.netProfit || 0).toLocaleString()}
              </span>
            </div>
            <div className="casino-stat">
              <span className="casino-stat-label">當前餘額</span>
              <span className="casino-stat-value" style={{ color: 'var(--accent)' }}>
                ${(user?.cash || 0).toLocaleString()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 遊戲卡片 */}
      <div className="casino-games-grid">
        {GAMES.map(g => (
          <button
            key={g.id}
            className="casino-game-card"
            style={{ '--card-accent': g.accent, textAlign: 'left', width: '100%', cursor: 'pointer' }}
            onClick={() => onSelect(g.id)}
          >
            {g.badge && <span className="casino-game-badge">{g.badge}</span>}
            <span className="casino-game-icon">{g.icon}</span>
            <div className="casino-game-name">{g.name}</div>
            <div className="casino-game-desc">{g.desc}</div>
            <div style={{ marginTop: 12, display: 'flex', gap: 12, fontSize: 11 }}>
              <span style={{ color: 'var(--text3)' }}>
                RTP <span style={{ color: g.accent, fontWeight: 700 }}>{g.rtp}</span>
              </span>
              <span style={{ color: 'var(--text3)' }}>
                最低 <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--text2)' }}>
                  ${g.minBet.toLocaleString()}
                </span>
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* 最近紀錄（若後端有提供） */}
      <div className="card">
        <div className="card-title">🎲 遊戲規則速查</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
          {[
            ['老虎機 7️⃣7️⃣7️⃣', '25x'],
            ['骰寶 圍骰',        '30x'],
            ['輪盤 單號',        '35x'],
            ['21點 天然',        '3.5x'],
          ].map(([label, odd]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: 'var(--text2)' }}>{label}</span>
              <span style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontWeight: 700 }}>{odd}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
