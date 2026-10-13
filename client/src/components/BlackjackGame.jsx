import { useState } from 'react';
import { useToast } from './Toast.jsx';
import './casino.css';

const QUICK_BETS = [500, 1000, 5000, 10000, 50000];
const SUITS = ['♠', '♥', '♦', '♣'];
const RED_SUITS = new Set(['♥', '♦']);

function calcHandValue(cards) {
  let total = 0, aces = 0;
  for (const c of cards) {
    if (c.hidden) continue;
    if (c.rank === 'A') { total += 11; aces++; }
    else if (['J', 'Q', 'K'].includes(c.rank)) total += 10;
    else total += parseInt(c.rank);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function cardFromValue(v) {
  if (v === 11) return { rank: 'A', suit: SUITS[0] };
  if (v === 10) return { rank: ['10', 'J', 'Q', 'K'][Math.floor(Math.random() * 4)], suit: SUITS[Math.floor(Math.random() * 4)] };
  return { rank: String(v), suit: SUITS[Math.floor(Math.random() * 4)] };
}

function BjCard({ rank, suit, hidden }) {
  if (hidden) return <div className="bj-card hidden" />;
  const isRed = RED_SUITS.has(suit);
  return (
    <div className={`bj-card ${isRed ? 'red' : ''}`}>
      <span className="bj-card-rank">{rank}</span>
      <span className="bj-card-suit">{suit}</span>
    </div>
  );
}

export default function BlackjackGame({ api }) {
  const { toast } = useToast();
  const [betAmount, setBetAmount] = useState(1000);
  const [phase, setPhase] = useState('idle'); // idle | playing | settled
  const [playerCards, setPlayerCards] = useState([]);
  const [dealerCards, setDealerCards] = useState([]);
  const [playerTotal, setPlayerTotal] = useState(0);
  const [dealerTotal, setDealerTotal] = useState(0);
  const [outcome, setOutcome] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toCards = (arr) => (arr || []).map(v =>
    (typeof v === 'object' && v !== null) ? v : cardFromValue(v)
  );

  const settle = (r, _pc, _dc) => {
    const isWin = r.win;
    const isPush = !isWin && r.payout === betAmount;
    setOutcome({ isWin, isPush, profit: r.profit, multiplier: r.multiplier || 0 });
    setPhase('settled');
    if (isWin) toast(`21點贏 +$${(r.profit || 0).toLocaleString()}`, 'success');
  };

  const handleDeal = async () => {
    if (busy) return;
    setBusy(true); setError(''); setOutcome(null);
    const r = await api('/api/casino/play', { game: 'blackjack', amount: betAmount });
    if (r.error) { setBusy(false); setError(r.error); toast(r.error, 'error'); return; }
    const pc = toCards(r.player); const dc = toCards(r.dealer);
    setPlayerCards(pc); setDealerCards(dc);
    setPlayerTotal(r.playerValue ?? calcHandValue(pc));
    setDealerTotal(r.dealerValue ?? calcHandValue(dc));
    if (r.payout !== undefined) { settle(r, pc, dc); } else { setPhase('playing'); }
    setBusy(false);
  };

  const handleHit = async () => {
    if (busy || phase !== 'playing') return;
    setBusy(true);
    const r = await api('/api/casino/play', { game: 'blackjack', amount: betAmount, action: 'hit' });
    if (r.error) { setError(r.error); setBusy(false); return; }
    const pc = toCards(r.player); const dc = toCards(r.dealer);
    setPlayerCards(pc); setDealerCards(dc);
    const pv = r.playerValue ?? calcHandValue(pc);
    setPlayerTotal(pv); setDealerTotal(r.dealerValue ?? calcHandValue(dc));
    if (r.payout !== undefined || pv > 21) settle(r, pc, dc);
    setBusy(false);
  };

  const handleStand = async () => {
    if (busy || phase !== 'playing') return;
    setBusy(true);
    const r = await api('/api/casino/play', { game: 'blackjack', amount: betAmount, action: 'stand' });
    if (r.error) { setError(r.error); setBusy(false); return; }
    const finalDc = toCards(r.dealer);
    for (let i = 1; i <= finalDc.length; i++) {
      await new Promise(res => setTimeout(res, 200));
      setDealerCards(finalDc.slice(0, i));
    }
    const pc = toCards(r.player);
    setPlayerCards(pc); setDealerCards(finalDc);
    setPlayerTotal(r.playerValue ?? calcHandValue(pc));
    setDealerTotal(r.dealerValue ?? calcHandValue(finalDc));
    settle(r, pc, finalDc);
    setBusy(false);
  };

  const handleReset = () => {
    setPhase('idle'); setPlayerCards([]); setDealerCards([]);
    setOutcome(null); setError('');
  };

  return (
    <div className="blackjack-container">
      {/* 莊家 */}
      <div className="blackjack-area">
        <div className="blackjack-area-title">
          莊家 {phase === 'playing' ? '?' : dealerTotal > 0 ? dealerTotal : ''}
        </div>
        <div className="bj-hand">
          {dealerCards.length > 0
            ? dealerCards.map((c, i) => <BjCard key={i} rank={c.rank} suit={c.suit} hidden={!!c.hidden} />)
            : <div style={{ color: 'var(--text3)', fontSize: 13 }}>等待發牌</div>}
        </div>
      </div>

      <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.06)' }} />

      {/* 玩家 */}
      <div className="blackjack-area">
        <div className="blackjack-area-title">
          玩家 {playerTotal > 0 ? playerTotal : ''}
          {playerTotal > 21 && <span style={{ color: 'var(--danger)', marginLeft: 6 }}>爆牌！</span>}
        </div>
        <div className="bj-hand">
          {playerCards.length > 0
            ? playerCards.map((c, i) => <BjCard key={i} rank={c.rank} suit={c.suit} hidden={false} />)
            : <div style={{ color: 'var(--text3)', fontSize: 13 }}>等待發牌</div>}
        </div>
      </div>

      {/* 下注 / 操作 */}
      {(phase === 'idle' || phase === 'settled') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 420 }}>
          <div className="quick-bet-row">
            {QUICK_BETS.map(v => (
              <button key={v} className={`quick-bet-btn ${betAmount === v ? 'active' : ''}`}
                onClick={() => setBetAmount(v)}>
                ${v >= 1000 ? (v / 1000) + 'K' : v}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="number" value={betAmount}
              onChange={e => setBetAmount(Math.max(1, parseInt(e.target.value) || 0))}
              style={{ flex: 1 }} />
            <button className="bj-btn bj-btn-deal" onClick={handleDeal} disabled={busy}>
              {busy ? '發牌中...' : phase === 'settled' ? '再玩一局' : '🃏 發牌'}
            </button>
          </div>
        </div>
      )}

      {phase === 'playing' && (
        <div className="bj-controls">
          <button className="bj-btn bj-btn-hit" onClick={handleHit} disabled={busy}>要牌</button>
          <button className="bj-btn bj-btn-stand" onClick={handleStand} disabled={busy}>停牌</button>
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* 結果 overlay */}
      {outcome && phase === 'settled' && (
        <div className={`bj-result-overlay ${outcome.isWin ? 'bj-result-win' : outcome.isPush ? 'bj-result-push' : 'bj-result-lose'}`}>
          <div className="bj-result-title">
            {outcome.isWin ? '🎉 贏了！' : outcome.isPush ? '🤝 平手' : '💀 輸了'}
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, fontFamily: 'var(--mono)',
            color: outcome.isWin ? 'var(--accent)' : outcome.isPush ? 'var(--text3)' : 'var(--danger)' }}>
            {outcome.isWin ? `+$${(outcome.profit || 0).toLocaleString()}` :
             outcome.isPush ? '注金退回' :
             `-$${Math.abs(outcome.profit || betAmount).toLocaleString()}`}
          </div>
          <button onClick={handleReset}
            style={{ marginTop: 14, padding: '8px 20px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text2)', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
            繼續
          </button>
        </div>
      )}

      {phase === 'idle' && (
        <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center' }}>
          天然 21 點 3.5x · 莊家 17 停 · 最低 $500
        </div>
      )}
    </div>
  );
}
