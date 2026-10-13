import { useState, useRef } from 'react';
import { useToast } from '../Toast.jsx';
import '../casino.css';

const EUROPEAN_LAYOUT = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const REDS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);

function getColor(n) {
  if (n === 0) return 'green';
  return REDS.has(n) ? 'red' : 'black';
}

const TABLE_ROWS = [
  [3,6,9,12,15,18,21,24,27,30,33,36],
  [2,5,8,11,14,17,20,23,26,29,32,35],
  [1,4,7,10,13,16,19,22,25,28,31,34],
];

const OUTSIDE_BETS = [
  { type:'color',  value:'red',    label:'🔴 紅', bg:'#b22424' },
  { type:'color',  value:'black',  label:'⚫ 黑', bg:'#2a2a2a' },
  { type:'parity', value:'odd',    label:'奇',    bg:'#334155' },
  { type:'parity', value:'even',   label:'偶',    bg:'#334155' },
  { type:'lowhigh',value:'low',    label:'1–18',  bg:'#334155' },
  { type:'lowhigh',value:'high',   label:'19–36', bg:'#334155' },
  { type:'dozen',  value:'dozen1', label:'1st 12',bg:'#1e293b' },
  { type:'dozen',  value:'dozen2', label:'2nd 12',bg:'#1e293b' },
  { type:'dozen',  value:'dozen3', label:'3rd 12',bg:'#1e293b' },
];

const QUICK_BETS = [100, 500, 1000, 5000, 10000];

export default function RouletteGame({ api }) {
  const { toast } = useToast();
  const [betAmount, setBetAmount] = useState(1000);
  const [bets, setBets] = useState([]);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const rotRef = useRef(0);

  const totalBet = bets.reduce((s, b) => s + b.amount, 0);

  const addBet = (type, value, label) => {
    if (spinning) return;
    const amt = Math.max(1, betAmount || 100);
    setBets(prev => {
      const ex = prev.find(b => b.type === type && b.value === value);
      if (ex) return prev.map(b => b === ex ? { ...b, amount: b.amount + amt } : b);
      return [...prev, { type, value, label, amount: amt }];
    });
  };

  const removeBet = idx => setBets(prev => prev.filter((_, i) => i !== idx));
  const clearBets = () => setBets([]);
  const reBet = () => setBets(prev => prev.map(b => ({ ...b, amount: b.amount * 2 })));

  const handleSpin = async () => {
    if (spinning || bets.length === 0) return;
    setError('');
    setResult(null);
    setSpinning(true);

    const r = await api('/api/casino/play', {
      game: 'roulette',
      amount: totalBet,
      betType: bets[0].value,   // compat: earthonline casino.js 單押注
      bets: bets.map(b => ({ type: b.type, value: b.value, amount: b.amount })),
    });

    if (r.error) {
      setSpinning(false);
      setError(r.error);
      toast(r.error, 'error');
      return;
    }

    // 輪盤動畫
    const winNum = typeof r.result === 'number' ? r.result : (r.winningNumber ?? 0);
    const idx = EUROPEAN_LAYOUT.indexOf(winNum);
    const anglePerSlot = 360 / EUROPEAN_LAYOUT.length;
    const target = 360 - idx * anglePerSlot;
    const newRot = rotRef.current + 2520 + ((target - (rotRef.current % 360) + 360) % 360);
    rotRef.current = newRot;
    setRotation(newRot);

    setTimeout(() => {
      setSpinning(false);
      const color = getColor(winNum);
      setResult({ number: winNum, color, win: r.win, profit: r.profit });
      if (r.win) toast(`🎉 ${winNum}（${color}）贏 +$${(r.profit || 0).toLocaleString()}`, 'success');
      else toast(`${winNum}（${color}）未中`, 'info');
    }, 5300);
  };

  const renderWheelLabels = () => {
    const step = 360 / EUROPEAN_LAYOUT.length;
    return EUROPEAN_LAYOUT.map((n, i) => {
      const angle = i * step;
      const color = getColor(n);
      return (
        <span key={i} className={`wheel-label wheel-label-${color}`}
          style={{ transform: `translate(-50%,-50%) rotate(${angle}deg) translateY(-96px) rotate(${-angle}deg)` }}>
          {n}
        </span>
      );
    });
  };

  return (
    <div className="roulette-container">
      <div className="roulette-stage">
        {/* 輪盤 */}
        <div className="wheel-container" style={{ marginBottom: 20 }}>
          <div className="wheel-pointer" />
          <div className={`wheel-outer ${spinning ? 'is-spinning' : ''}`}
            style={{ transform: `rotate(${rotation}deg)` }}>
            {renderWheelLabels()}
          </div>
          <div className={`wheel-inner ${result ? `win-${result.color}` : ''}`}>
            {result ? result.number : spinning ? '…' : '?'}
          </div>
        </div>

        {/* 下注桌 */}
        <div className="roulette-table" style={{ marginBottom: 16 }}>
          {/* 零 */}
          <div style={{ marginBottom: 2 }}>
            <button className="roulette-num-btn num-green" style={{ width: 40, height: 36 }}
              onClick={() => addBet('number', 0, '0')}>0</button>
          </div>
          {/* 數字列 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 8 }}>
            {TABLE_ROWS.map((row, ri) => (
              <div key={ri} style={{ display: 'flex', gap: 2 }}>
                {row.map(n => {
                  const color = getColor(n);
                  const sel = bets.some(b => b.type === 'number' && b.value === n);
                  return (
                    <button key={n}
                      className={`roulette-num-btn num-${color} ${sel ? 'selected' : ''}`}
                      style={{ flex: 1, height: 32, position: 'relative' }}
                      onClick={() => addBet('number', n, String(n))}>
                      {n}
                      {sel && <span style={{ position: 'absolute', top: -3, right: -3, width: 8, height: 8, borderRadius: '50%', background: '#d4af37' }} />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          {/* 外側押注 */}
          <div className="roulette-outside-grid">
            {OUTSIDE_BETS.map(ob => {
              const sel = bets.some(b => b.type === ob.type && b.value === ob.value);
              return (
                <button key={ob.value}
                  className={`roulette-outside-btn ${sel ? 'selected' : ''}`}
                  style={{ background: ob.bg }}
                  onClick={() => addBet(ob.type, ob.value, ob.label)}>
                  {ob.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 已下注清單 */}
        {bets.length > 0 && (
          <div className="roulette-bets-summary">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#d4af37' }}>
                已押 {bets.length} 注 · 合計 ${totalBet.toLocaleString()}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={reBet} style={{ fontSize: 11, color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer' }}>翻倍</button>
                <button onClick={clearBets} style={{ fontSize: 11, color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}>清除</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {bets.map((b, i) => (
                <span key={i} onClick={() => removeBet(i)}
                  style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, background: 'var(--surface2)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text2)' }}>
                  {b.label}: {b.amount.toLocaleString()} ✕
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 快速金額 + 旋轉 */}
        <div className="roulette-controls">
          <div className="quick-bet-row">
            {QUICK_BETS.map(v => (
              <button key={v}
                className={`quick-bet-btn ${betAmount === v ? 'active' : ''}`}
                onClick={() => setBetAmount(v)} disabled={spinning}>
                ${v >= 1000 ? (v / 1000) + 'K' : v}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <input type="number" value={betAmount}
              onChange={e => setBetAmount(Math.max(1, parseInt(e.target.value) || 0))}
              disabled={spinning} style={{ flex: 1 }} />
            <button className="btn-spin" style={{ flex: 2 }}
              onClick={handleSpin} disabled={spinning || bets.length === 0}>
              {spinning ? '旋轉中...' : bets.length === 0 ? '先選下注' : '🎡 旋轉'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 13 }}>
            {error}
          </div>
        )}

        {result && !spinning && (
          <div className={`card ${result.win ? 'card-accent casino-win-glow' : ''}`} style={{ marginTop: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'var(--mono)',
              color: result.color === 'red' ? '#ef4444' : result.color === 'green' ? 'var(--accent)' : 'var(--text)' }}>
              {result.number}
              <span style={{ fontSize: 14, marginLeft: 8, color: 'var(--text3)' }}>
                {result.color === 'red' ? '🔴 紅' : result.color === 'black' ? '⚫ 黑' : '🟢 0'}
              </span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 8,
              color: result.win ? 'var(--accent)' : 'var(--danger)' }}>
              {result.win ? `+$${(result.profit || 0).toLocaleString()}` : `-$${Math.abs(result.profit || 0).toLocaleString()}`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
