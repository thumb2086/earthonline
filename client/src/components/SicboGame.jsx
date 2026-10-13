import { useState, useEffect, useRef } from 'react';
import { useToast } from './Toast.jsx';
import './casino.css';

const DICE_FACES = ['⚀','⚁','⚂','⚃','⚄','⚅'];
const QUICK_BETS = [100, 500, 1000, 5000, 10000];

const BET_OPTS = [
  { type:'big',    label:'大',   range:'11–17', odds:'x2.0', color:'#ef4444' },
  { type:'small',  label:'小',   range:'4–10',  odds:'x2.0', color:'#3b82f6' },
  { type:'odd',    label:'奇',   range:'奇數',  odds:'x2.0', color:'#8b5cf6' },
  { type:'even',   label:'偶',   range:'偶數',  odds:'x2.0', color:'#10b981' },
  { type:'triple', label:'圍骰', range:'豹子',  odds:'x30',  color:'#f59e0b' },
];

export default function SicboGame({ api }) {
  const { toast } = useToast();
  const [betAmount, setBetAmount] = useState(1000);
  const [sel, setSel] = useState('big');
  const [dice, setDice] = useState([1, 2, 3]);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('選擇大/小/圍骰，押注開骰');
  const [statusColor, setStatusColor] = useState('var(--text2)');
  const ivRef = useRef(null);

  const clearIv = () => { if (ivRef.current) { clearInterval(ivRef.current); ivRef.current = null; } };

  const handleBet = async () => {
    if (rolling) return;
    setRolling(true); setResult(null);
    setStatus('骰骰中...'); setStatusColor('var(--text2)');
    ivRef.current = setInterval(() => {
      setDice([Math.floor(Math.random()*6)+1, Math.floor(Math.random()*6)+1, Math.floor(Math.random()*6)+1]);
    }, 100);

    const r = await api('/api/casino/play', { game: 'sicbo', amount: betAmount, betType: sel });
    clearIv();

    if (r.error) {
      setRolling(false); setStatus(r.error); setStatusColor('var(--danger)');
      toast(r.error, 'error'); return;
    }

    setDice(r.dice || [1,1,1]);
    setResult(r);
    const won = r.win;
    setStatus(won
      ? `🎉 ${r.dice.join(' ')} = ${r.total}，贏 +$${(r.profit||0).toLocaleString()}`
      : `${r.dice.join(' ')} = ${r.total}，輸 -$${Math.abs(r.profit||0).toLocaleString()}`);
    setStatusColor(won ? 'var(--accent)' : 'var(--danger)');
    if (won) toast(`骰寶贏 +$${(r.profit||0).toLocaleString()}`, 'success');
    setRolling(false);
  };

  useEffect(() => () => clearIv(), []);

  const betOpt = BET_OPTS.find(b => b.type === sel);

  return (
    <div className="sicbo-container">
      {/* 骰子區 */}
      <div className="dice-area">
        {dice.map((d, i) => (
          <div key={i} className={`die ${rolling ? 'rolling' : ''}`}
            style={result && !rolling ? {
              boxShadow: result.win
                ? '0 6px 20px rgba(0,255,65,0.4), 0 0 0 3px var(--accent)'
                : '0 6px 20px rgba(239,68,68,0.3), 0 0 0 3px var(--danger)',
            } : {}}>
            {DICE_FACES[d - 1]}
          </div>
        ))}
      </div>

      {/* 點數結果 */}
      {result && !rolling && (
        <div className="sicbo-total-display">
          <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            總點數
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, fontFamily: 'var(--mono)',
            color: result.win ? 'var(--accent)' : 'var(--danger)' }}>
            {result.total}
            <span style={{ fontSize: 13, marginLeft: 8, color: 'var(--text3)' }}>
              {result.total >= 11 && !result.isTriple ? '（大）' : result.total <= 10 && !result.isTriple ? '（小）' : '（豹子）'}
            </span>
          </div>
        </div>
      )}

      {/* 押注選項 */}
      <div className="sicbo-bets-grid">
        {BET_OPTS.map(opt => (
          <div key={opt.type}
            className={`bet-option ${sel === opt.type ? 'active' : ''}`}
            onClick={() => !rolling && setSel(opt.type)}>
            <span className="bet-label" style={{ color: sel === opt.type ? 'var(--text)' : 'var(--text2)' }}>
              {opt.label}
            </span>
            <span className="bet-range">{opt.range}</span>
            <span className="bet-odds" style={{ color: opt.color }}>{opt.odds}</span>
          </div>
        ))}
      </div>

      {/* 快速下注 + 旋轉 */}
      <div className="sicbo-controls">
        <div className="quick-bet-row">
          {QUICK_BETS.map(v => (
            <button key={v}
              className={`quick-bet-btn ${betAmount === v ? 'active' : ''}`}
              onClick={() => setBetAmount(v)} disabled={rolling}>
              ${v >= 1000 ? (v/1000)+'K' : v}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input type="number" value={betAmount}
            onChange={e => setBetAmount(Math.max(1, parseInt(e.target.value)||0))}
            disabled={rolling} style={{ flex: 1 }} />
          <button className="btn-spin" style={{ flex: 2 }}
            onClick={handleBet} disabled={rolling}>
            {rolling ? '骰骰中...' : `🎲 押${betOpt?.label} 開骰`}
          </button>
        </div>
      </div>

      <div className="sicbo-status" style={{ color: statusColor }}>{status}</div>

      {/* 上局回顧 */}
      {result && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-title">上局結果</div>
          <div className="stat">
            <span className="stat-label">押注</span>
            <span className="stat-value">{betOpt?.label}（{betOpt?.range}）</span>
          </div>
          <div className="stat">
            <span className="stat-label">骰面</span>
            <span className="stat-value">{result.dice?.map(d => DICE_FACES[d-1]).join(' ')} = {result.total}</span>
          </div>
          <div className="stat">
            <span className="stat-label">損益</span>
            <span className="stat-value" style={{ color: result.win ? 'var(--accent)' : 'var(--danger)' }}>
              {result.win ? `+$${(result.profit||0).toLocaleString()}` : `-$${Math.abs(result.profit||0).toLocaleString()}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
