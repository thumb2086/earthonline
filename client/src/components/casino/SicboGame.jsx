import { useState, useEffect, useRef } from 'react';
import { useToast } from '../Toast.jsx';
import '../casino.css';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const QUICK_BETS = [100, 500, 1000, 5000, 10000];

const BET_OPTIONS = [
  { type: 'big',   label: '大',   range: '11–17', odds: 'x2.0', color: '#ef4444' },
  { type: 'small', label: '小',   range: '4–10',  odds: 'x2.0', color: '#3b82f6' },
  { type: 'odd',   label: '奇',   range: '奇數',  odds: 'x2.0', color: '#8b5cf6' },
  { type: 'even',  label: '偶',   range: '偶數',  odds: 'x2.0', color: '#10b981' },
  { type: 'triple',label: '圍骰', range: '豹子',  odds: 'x30',  color: '#f59e0b' },
];

export default function SicboGame({ api }) {
  const { toast } = useToast();
  const [betAmount, setBetAmount] = useState(1000);
  const [selectedBet, setSelectedBet] = useState('big');
  const [dice, setDice] = useState([1, 2, 3]);
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('選擇大/小/圍骰，押注開骰');
  const [statusColor, setStatusColor] = useState('var(--text2)');
  const rollIvRef = useRef(null);

  const clearRollIv = () => { if (rollIvRef.current) { clearInterval(rollIvRef.current); rollIvRef.current = null; } };

  const handleBet = async () => {
    if (rolling) return;
    setRolling(true);
    setResult(null);
    setStatus('骰骰中...');
    setStatusColor('var(--text2)');

    // 骰子滾動動畫
    rollIvRef.current = setInterval(() => {
      setDice([
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
        Math.floor(Math.random() * 6) + 1,
      ]);
    }, 100);

    const r = await api('/api/casino/play', { game: 'sicbo', amount: betAmount, betType: selectedBet });
    clearRollIv();

    if (r.error) {
      setRolling(false);
      setStatus(r.error);
      setStatusColor('var(--danger)');
      toast(r.error, 'error');
      return;
    }

    // 停止在結果骰面
    setDice(r.dice || [1, 1, 1]);
    setResult(r);
    const won = r.win;
    setStatus(won
      ? `🎉 ${r.dice.join(' ')} = ${r.total}，贏 +$${(r.profit || 0).toLocaleString()}`
      : `${r.dice.join(' ')} = ${r.total}，輸 -$${Math.abs(r.profit || 0).toLocaleString()}`);
    setStatusColor(won ? 'var(--accent)' : 'var(--danger)');
    if (won) toast(`骰寶贏 +$${(r.profit || 0).toLocaleString()}`, 'success');
    setRolling(false);
  };

  useEffect(() => () => clearRollIv(), []);

  const betOpt = BET_OPTIONS.find(b => b.type === selectedBet);

  return (
    <div className="sicbo-container">
      {/* 骰子區 */}
      <div className="dice-area">
        {dice.map((d, i) => (
          <div key={i} className={`die ${rolling ? 'rolling' : ''}`}
            style={result && !rolling ? {
              boxShadow: result.win
                ? '0 6px 20px rgba(0,255,65,0.4), 0 0 0 2px var(--accent)'
                : '0 6px 20px rgba(239,68,68,0.3), 0 0 0 2px var(--danger)',
            } : {}}>
            {DICE_FACES[d - 1]}
          </div>
        ))}
      </div>

      {/* 總點數顯示 */}
      {result && !rolling && (
        <div className="sicbo-total-display">
          <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            總點數
          </span>
          <div style={{ fontSize: 28, fontWeight: 900, fontFamily: 'var(--mono)', color: result.win ? 'var(--accent)' : 'var(--danger)' }}>
            {result.total}
            <span style={{ fontSize: 13, marginLeft: 8, color: 'var(--text3)' }}>
              {result.total >= 11 && !result.isTriple ? '（大）' : result.total <= 10 && !result.isTriple ? '（小）' : '（豹子）'}
            </span>
          </div>
        </div>
      )}

      {/* 押注選項 */}
      <div className="sicbo-bets-grid">
        {BET_OPTIONS.map(opt => (
          <div key={opt.type}
            className={`bet-option ${selectedBet === opt.type ? 'active' : ''}`}
            style={{ '--card-accent': opt.color }}
            onClick={() => !rolling && setSelectedBet(opt.type)}>
            <span className="bet-label" style={{ color: selectedBet === opt.type ? 'var(--text)' : 'var(--text2)' }}>
              {opt.label}
            </span>
            <span className="bet-range">{opt.range}</span>
            <span className="bet-odds" style={{ color: opt.color }}>{opt.odds}</span>
          </div>
        ))}
      </div>

      {/* 控制區 */}
      <div className="sicbo-controls">
        <div className="quick-bet-row">
          {QUICK_BETS.map(v => (
            <button key={v}
              className={`quick-bet-btn ${betAmount === v ? 'active' : ''}`}
              onClick={() => setBetAmount(v)}
              disabled={rolling}>
              ${v >= 1000 ? (v / 1000) + 'K' : v}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input type="number" value={betAmount}
            onChange={e => setBetAmount(Math.max(1, parseInt(e.target.value) || 0))}
            disabled={rolling}
            style={{ flex: 1 }} />
          <button className="btn-spin" style={{ flex: 2 }} onClick={handleBet} disabled={rolling}>
            {rolling ? '骰骰中...' : `🎲 押 ${betOpt?.label} 開骰`}
          </button>
        </div>
      </div>

      {/* 狀態 */}
      <div className="sicbo-status" style={{ color: statusColor }}>{status}</div>

      {/* 歷史紀錄最後一局 */}
      {result && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="card-title">上局結果</div>
          <div className="stat">
            <span className="stat-label">押注</span>
            <span className="stat-value">{betOpt?.label}（{betOpt?.range}）</span>
          </div>
          <div className="stat">
            <span className="stat-label">骰面</span>
            <span className="stat-value">{result.dice?.map(d => DICE_FACES[d - 1]).join(' ')} = {result.total}</span>
          </div>
          <div className="stat">
            <span className="stat-label">結果</span>
            <span className="stat-value" style={{ color: result.win ? 'var(--accent)' : 'var(--danger)' }}>
              {result.win ? `+$${(result.profit || 0).toLocaleString()}` : `-$${Math.abs(result.profit || 0).toLocaleString()}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
