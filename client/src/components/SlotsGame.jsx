import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from './Toast.jsx';
import './casino.css';

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '7️⃣'];
const REEL_CELLS = [[0, 3, 6], [1, 4, 7], [2, 5, 8]];
const randomSym = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
const QUICK_BETS = [100, 500, 1000, 5000, 10000];
const AUTO_OPTIONS = [5, 10, 25, 50];

export default function SlotsGame({ api }) {
  const { toast } = useToast();
  const [betAmount, setBetAmount] = useState(1000);
  const [grid, setGrid] = useState(['🍒','🍋','🍊','⭐','🔔','💎','7️⃣','🍒','🍋']);
  const [reelState, setReelState] = useState(['idle','idle','idle']);
  const [winCells, setWinCells] = useState([]);
  const [status, setStatus] = useState('選擇金額，按旋轉開始');
  const [statusColor, setStatusColor] = useState('var(--text2)');
  const [jackpot, setJackpot] = useState(0);
  const [autoCount, setAutoCount] = useState(10);
  const [autoRemaining, setAutoRemaining] = useState(0);
  const [skipShow, setSkipShow] = useState(false);

  const spinningRef = useRef(false);
  const autoRunRef = useRef(false);
  const ivRefs = useRef([null, null, null]);
  const timerRefs = useRef([]);
  const skipRef = useRef(false);
  const pendingRef = useRef(null);
  const summaryRef = useRef({ spins: 0, wins: 0 });

  useEffect(() => {
    api('/api/casino/slots/jackpot').then(d => { if (d?.pool) setJackpot(d.pool); }).catch(() => {});
  }, []);

  const clearAll = () => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
    ivRefs.current.forEach(iv => iv && clearInterval(iv));
    ivRefs.current = [null, null, null];
  };

  const startReel = useCallback((ri) => {
    setReelState(prev => { const n = [...prev]; n[ri] = 'spinning'; return n; });
    const iv = setInterval(() => {
      setGrid(g => {
        const next = [...g];
        for (const ci of REEL_CELLS[ri]) next[ci] = randomSym();
        return next;
      });
    }, 80);
    ivRefs.current[ri] = iv;
  }, []);

  const stopReel = useCallback((ri, syms) => {
    clearInterval(ivRefs.current[ri]);
    ivRefs.current[ri] = null;
    setGrid(g => {
      const next = [...g];
      for (let i = 0; i < 3; i++) next[REEL_CELLS[ri][i]] = syms[ri * 3 + i];
      return next;
    });
    setReelState(prev => { const n = [...prev]; n[ri] = 'stopped'; return n; });
  }, []);

  const showResult = useCallback((r) => {
    setSkipShow(false);
    const won = r.win;
    setWinCells(r.winLines?.flat() || []);
    if (won) {
      setStatus(`🎉 ${r.symbols.join('')} +$${(r.profit||0).toLocaleString()}`);
      setStatusColor('var(--accent)');
      if (r.jackpotWon > 0) toast(`🏆 累積頭獎！+$${r.jackpotWon.toLocaleString()}`, 'success');
    } else {
      setStatus(`${r.symbols.join('')} 未中獎`);
      setStatusColor('var(--text3)');
    }
    api('/api/casino/slots/jackpot').then(d => { if (d?.pool) setJackpot(d.pool); }).catch(() => {});
  }, [api, toast]);

  const skipAnimation = useCallback(() => {
    skipRef.current = true;
    setSkipShow(false);
    clearAll();
    setReelState(['stopped','stopped','stopped']);
    if (pendingRef.current) {
      setGrid(pendingRef.current.symbols || grid);
      showResult(pendingRef.current);
    }
  }, [showResult]);

  const doSpin = useCallback(async () => {
    skipRef.current = false;
    pendingRef.current = null;
    setWinCells([]);
    setSkipShow(true);
    setStatus('旋轉中...');
    setStatusColor('var(--text2)');

    startReel(0);
    const t1 = setTimeout(() => startReel(1), 80);
    const t2 = setTimeout(() => startReel(2), 160);
    timerRefs.current = [t1, t2];

    const r = await api('/api/casino/play', { game: 'slots', amount: betAmount });
    if (r.error) {
      clearAll(); setReelState(['idle','idle','idle']); setSkipShow(false);
      setStatus(r.error); setStatusColor('var(--danger)');
      toast(r.error, 'error');
      return;
    }

    pendingRef.current = r;
    if (skipRef.current) { showResult(r); return; }

    const t3 = setTimeout(() => stopReel(0, r.symbols), 200);
    const t4 = setTimeout(() => stopReel(1, r.symbols), 350);
    const t5 = setTimeout(() => stopReel(2, r.symbols), 500);
    timerRefs.current = [t3, t4, t5];
    setTimeout(() => showResult(r), 700);
  }, [betAmount, api, startReel, stopReel, showResult, toast]);

  const handleSpin = async () => {
    if (spinningRef.current) return;
    spinningRef.current = true;
    try { await doSpin(); } catch {}
    spinningRef.current = false;
  };

  const handleAutoSpin = async () => {
    if (spinningRef.current) return;
    spinningRef.current = true;
    autoRunRef.current = true;
    summaryRef.current = { spins: 0, wins: 0 };
    setAutoRemaining(autoCount);
    for (let i = 0; i < autoCount; i++) {
      if (!autoRunRef.current) break;
      setAutoRemaining(autoCount - i - 1);
      try {
        const r = await api('/api/casino/play', { game: 'slots', amount: betAmount });
        if (!r.error) {
          summaryRef.current.spins++;
          if (r.win) summaryRef.current.wins += r.profit || 0;
          setGrid(r.symbols || []);
          setWinCells(r.win ? (r.winLines?.flat() || []) : []);
        }
      } catch {}
      await new Promise(res => setTimeout(res, 280));
    }
    autoRunRef.current = false;
    spinningRef.current = false;
    setAutoRemaining(0);
    const s = summaryRef.current;
    setStatus(`自動完成：${s.spins} 局，淨利 $${s.wins.toLocaleString()}`);
    setStatusColor('var(--text2)');
    setWinCells([]);
    api('/api/casino/slots/jackpot').then(d => { if (d?.pool) setJackpot(d.pool); }).catch(() => {});
  };

  const cancelAuto = () => {
    autoRunRef.current = false;
    spinningRef.current = false;
    setAutoRemaining(0);
  };

  useEffect(() => () => clearAll(), []);

  return (
    <div className="slots-container">
      {/* Jackpot 池 */}
      {jackpot > 0 && (
        <div className="slots-jackpot">
          <div className="slots-jackpot-label">🏆 累積頭獎</div>
          <div className="slots-jackpot-value">${jackpot.toLocaleString()}</div>
        </div>
      )}

      {/* 3×3 轉輪盤面 */}
      <div className="slots-board">
        <div className="slots-grid">
          {grid.map((sym, i) => {
            const ri = REEL_CELLS.findIndex(c => c.includes(i));
            return (
              <div key={i}
                className={`slot-cell ${reelState[ri] === 'spinning' ? 'spinning' : ''} ${winCells.includes(i) ? 'win' : ''}`}>
                {sym}
              </div>
            );
          })}
        </div>
      </div>

      {/* 控制 */}
      <div className="slots-controls">
        <div className="quick-bet-row">
          {QUICK_BETS.map(v => (
            <button key={v}
              className={`quick-bet-btn ${betAmount === v ? 'active' : ''}`}
              onClick={() => setBetAmount(v)}
              disabled={spinningRef.current}>
              ${v >= 1000 ? (v / 1000) + 'K' : v}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="number" value={betAmount}
            onChange={e => setBetAmount(Math.max(1, parseInt(e.target.value) || 0))}
            disabled={spinningRef.current}
            style={{ flex: '1 1 80px', minWidth: 80 }} />

          {autoRemaining > 0 ? (
            <button className="btn-spin"
              style={{ flex: 2, background: 'var(--danger)', color: '#fff' }}
              onClick={cancelAuto}>
              停止（剩 {autoRemaining}）
            </button>
          ) : (
            <>
              <button className="btn-spin" style={{ flex: 2, minWidth: 100 }}
                onClick={handleSpin} disabled={spinningRef.current}>
                {spinningRef.current ? '旋轉中...' : '🎰 旋轉'}
              </button>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {AUTO_OPTIONS.map(n => (
                  <button key={n}
                    className={`quick-bet-btn ${autoCount === n ? 'active' : ''}`}
                    style={{ minWidth: 34, padding: '6px 4px' }}
                    onClick={() => setAutoCount(n)}>
                    {n}
                  </button>
                ))}
                <button className="btn-spin"
                  style={{ fontSize: 11, padding: '6px 10px', minWidth: 54 }}
                  onClick={handleAutoSpin} disabled={spinningRef.current}>
                  ×{autoCount}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="slots-status" style={{ color: statusColor }}>{status}</div>

      {/* 跳過按鈕（左下固定） */}
      {skipShow && (
        <button onClick={skipAnimation}
          style={{
            position: 'fixed', bottom: 80, right: 16, zIndex: 9999,
            background: 'var(--accent)', color: '#000', fontWeight: 800,
            padding: '8px 18px', borderRadius: 12, fontSize: 12,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            boxShadow: '0 4px 20px rgba(0,255,65,0.4)', border: 'none', cursor: 'pointer',
          }}>
          跳過 ⏭
        </button>
      )}

      {/* 賠率表 */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">賠率表</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px', fontSize: 12 }}>
          {[['7️⃣7️⃣7️⃣', '25x'], ['💎💎💎', '12x'], ['其他三連', '8x'], ['任意兩連', '2x']].map(([s, m]) => (
            <div key={s} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ color: 'var(--text2)' }}>{s}</span>
              <span style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontWeight: 700 }}>{m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
