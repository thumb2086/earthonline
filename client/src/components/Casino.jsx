import { useState, useEffect } from 'react';
import CasinoLobby from './CasinoLobby.jsx';
import SlotsGame from './SlotsGame.jsx';
import SicboGame from './SicboGame.jsx';
import RouletteGame from './RouletteGame.jsx';
import BlackjackGame from './BlackjackGame.jsx';
import './casino.css';

const GAME_META = {
  slots:     { icon: '🎰', name: '老虎機' },
  sicbo:     { icon: '🎲', name: '骰寶' },
  roulette:  { icon: '🎡', name: '輪盤' },
  blackjack: { icon: '🃏', name: '21 點' },
};

export default function Casino({ api, user }) {
  const [game, setGame] = useState(null); // null = 大廳
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api('/api/casino/stats').then(setStats).catch(() => {});
  }, [game]); // 每次切換遊戲時刷新統計

  const goLobby = () => setGame(null);
  const meta = game ? GAME_META[game] : null;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* ── 頂部導覽列 ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        marginBottom: 20, paddingBottom: 16,
        borderBottom: '1px solid var(--border)',
      }}>
        {game ? (
          <>
            <button
              className="btn btn-sm"
              onClick={goLobby}
              style={{ flexShrink: 0 }}
            >
              ← 大廳
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <span style={{ fontSize: 20 }}>{meta?.icon}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                {meta?.name}
              </span>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <span style={{ fontSize: 18 }}>🎰</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Casino Floor
            </span>
          </div>
        )}

        {/* 快速切換遊戲（遊戲內才顯示） */}
        {game && (
          <div style={{ display: 'flex', gap: 4 }}>
            {Object.entries(GAME_META).map(([id, m]) => (
              <button key={id}
                className={`btn btn-sm ${game === id ? 'btn-primary' : ''}`}
                onClick={() => setGame(id)}
                title={m.name}
              >
                {m.icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 主內容 ── */}
      {!game && (
        <CasinoLobby
          onSelect={setGame}
          stats={stats}
          user={user}
        />
      )}
      {game === 'slots'     && <SlotsGame     api={api} user={user} />}
      {game === 'sicbo'     && <SicboGame     api={api} user={user} />}
      {game === 'roulette'  && <RouletteGame  api={api} user={user} />}
      {game === 'blackjack' && <BlackjackGame api={api} user={user} />}
    </div>
  );
}
