import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '../Toast.jsx';
import '../casino.css';

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '💎', '7️⃣'];
const REEL_CELLS = [[0, 3, 6], [1, 4, 7], [2, 5, 8]]; // 3 reels × 3 rows
const randomSymbol = () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
const QUICK_BETS = [100, 500, 1000, 5000, 10000];
const AUTO_OPTIONS = [5, 10, 25, 50];

export default function SlotsGame({ api, user }) {
  const { toast } = useToast();
  const [betAmount, setBetAmount] = useState(1000);
  const [grid, setGrid] = useState(['🍒', '🍋', '🍊', '⭐', '🔔', '💎', '7️⃣', '🍒', '🍋']);
  const [reelState, setReelState] = useState(['idle', 'idle', 'idle']);
  const [winCells, setWinCells] = useState([]);
  const [status, setStatus] = useState('選擇金額，按旋轉開始');
  const [statusColor, setStatusColor] = useState('var(--text2)');
  const [jackpot, setJackpot] = useState(0);
  const [autoCount, setAutoCount] = useState(10);
  const [autoRemaining, setAutoRemaining] = useState(0);

  const spinningRef = useRef(false);
  const autoRunning = useRef(false);
  const intervalRefs = useRef([]);
  const timersRef = useRef([]);
  const skipRef = useRef(false);
  const skipVisible = useRef(false);
  const [skipShow, setSkipShow] = useState(false);
  const pendingResult = useRef(null);
  const summaryRef = useRef({ spins: 0, wins: 0 });

  // 載入 jackpot 池
  useEffect(() => {
    api('/api/casino/slots/jackpot').then(d => { if (d?.pool) setJackpot(d.pool); }).catch(() => {});
  }, []);

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    intervalRefs.current.forEach(clearInterval);
    intervalRefs.current = [];
  };

  const startReelSpin = useCallback((reelIdx) => {
    setReelState(prev => { const n = [...prev]; n[reelIdx] = 'spinning'; return n; });
    const iv = setInterval(() => {
      setGrid(g => {
        const next = [...g];
        for (const ci of REEL_CELLS[reelIdx]) next[ci] = randomSymbol();
        return next;
      });
    }, 80);
    intervalRefs.current[reelIdx] = iv;
  }, []);

  const stopReel = useCallback((reelIdx, finalSymbols) => {
    clearInterval(intervalRefs.current[reelIdx]);
    setGrid(g => {
      const next = [...g];
      for (let i = 0; i < 3; i++) next[REEL_CELLS[reelIdx][i]] = finalSymbols[reelIdx * 3 + i];
      return next;
    });
    setReelState(prev => { const n = [...prev]; n[reelIdx] = 'stopped'; return n; });
  }, []);

  const skipAnimation = useCallback(() => {
    skipRef.current = true;
    setSkipShow(false);
    clearTimers();
    setReelState(['stopped', 'stopped', 'stopped']);
    if (pendingResult.current) {
      const r = pendingResult.current;
      setGrid(r.symbols);
      const won = r.win;
      setWinCells(r.winLines?.flat() || []);
      setStatus(won
        ? `🎉 中獎！${r.symbols.join('')} +$${(r.profit || 0).toLocaleString()}`
        : `${r.symbols.join('')} 未中獎 -$${Math.abs(r.profit || 0).toLocaleString()}`);
      setStatusColor(won ? 'var(--accent)' : 'var(--danger)');
      if (r.jackpotWon > 0) toast(`🏆 累積頭獎！+$${r.jackpotWon.toLocaleString()}`, 'success');
    }
  }, [toast]);

  const doSpin = useCallback(async () => {
    skipRef.current = false;
    pendingResult.current = null;
    setWinCells([]);
    setSkipShow(true);
    setStatus('旋轉中...');
    setStatusColor('var(--text2)');

    // 啟動 3 個轉輪動畫
    startReelSpin(0);
    const t1 = setTimeout(() => startReelSpin(1), 80);
    const t2 = setTimeout(() => startReelSpin(2), 160);
    timersRef.current = [t1, t2];

    const r = await api('/api/casino/play', { game: 'slots', amount: betAmount });
    if (r.error) {
      clearTimers();
      setReelState(['idle', 'idle', 'idle']);
      setSkipShow(false);
      setStatus(r.error);
      setStatusColor('var(--danger)');
      toast(r.error, 'error');
      return;
    }

    // 更新 jackpot
    api('/api/casino/slots/jackpot').then(d => { if (d?.pool) setJackpot(d.pool); }).catch(() => {});
    pendingResult.current = r;

    if (skipRef.current) {
      // 已跳過，直接顯示
      skipAnimation();
      return;
    }

    const STOP = 200;
    const t3 = setTimeout(() => stopReel(0, r.symbols), STOP);
    const t4 = setTimeout(() => stopReel(1, r.symbols), STOP + 150);
    const t5 = setTimeout(() => stopReel(2, r.symbols), STOP + 300);
    timersRef.current = [t3, t4, t5];

    setTimeout(() => {
      setSkipShow(false);
      const won = r.win;
      setWinCells(r.winLines?.flat() || []);
      setStatus(won
        ? `🎉 ${r.symbols.join('')} +$${(r.profit || 0).toLocaleString()}`
        : `${r.symbols.join('')} 未中獎`);
      setStatusColor(won ? 'var(--accent)' : 'var(--danger)');
      if (r.jackpotWon > 0) toast(`🏆 累積頭獎！+$${r.jackpotWon.toLocaleString()}`, 'success');
    }, STOP + 500);
  }, [betAmount, api, startReelSpin, stopReel, skipAnimation, toast]);

  const handleSpin = async () => {
    if (spinningRef.current) return;
    spinningRef.current = true;
    try { await doSpin(); } catch {}
    spinningRef.current = false;
  };

  const handleAutoSpin = async () => {
    if (spinningRef.current) return;
    spinningRef.current = true;
    autoRunning.current = true;
    summaryRef.current = { spins: 0, wins: 0 };
    setAutoRemaining(autoCount);

    for (let i = 0; i < autoCount; i++) {
      if (!autoRunning.current) break;
      setAutoRemaining(autoCount - i - 1);
      try {
        const r = await api('/api/casino/play', { game: 'slots', amount: betAmount });
        if (!r.error) {
          summaryRef.current.spins++;
          if (r.win) summaryRef.current.wins += r.profit || 0;
          setGrid(r.symbols || grid);
          setWinCells(r.win ? (r.winLines?.flat() || []) : []);
        }
      } catch {}
      await new Promise(res => setTimeout(res, 300));
    }

    autoRunning.current = false;
    spinningRef.current = false;
    setAutoRemaining(0);
    const s = summaryRef.current;
    setStatus(`自動完成：${s.spins} 局，淨利 $${s.wins.toLocaleString()}`);
    setStatusColor('var(--text2)');
    setWinCells([]);
  };

  const cancelAuto = () => {
    autoRunning.current = false;
    spinningRef.current = false;
    setAutoRemaining(0);
  };

  useEffect(() => () => clearTimers(), []);

  return (
    <div className="slots-container">
      {/* Jackpot 池 */}
      {jackpot > 0 && (
        <div className="slots-jackpot">
          <div className="slots-jackpot-label">🏆 累積頭獎</div>
          <div className="slots-jackpot-value">${jackpot.toLocaleString()}</div>
        </div>
      )}

      {/* 轉輪盤面 */}
      <div className="slots-board">
        <div className="slots-grid">
          {grid.map((sym, i) => {
            const reelIdx = REEL_CELLS.findIndex(c => c.includes(i));
            const isSpinning = reelState[reelIdx] === 'spinning';
            const isWin = winCells.includes(i);
            return (
              <div key={i} className={`slot-cell ${isSpinning ? 'spinning' : ''} ${isWin ? 'win' : ''}`}>
                {sym}
              </div>
            );
          })}
        </div>
      </div>

      {/* 控制區 */}
      <div className="slots-controls">
        {/* 快速金額 */}
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

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="number"
            value={betAmount}
            onChange={e => setBetAmount(Math.max(1, parseInt(e.target.value) || 0))}
            disabled={spinningRef.current}
            style={{ flex: 1 }}
          />
          {autoRemaining > 0 ? (
            <button className="btn-spin" style={{ background: 'var(--danger)', color: '#fff', minWidth: 120 }} onClick={cancelAuto}>
              停止（剩 {autoRemaining}）
            </button>
          ) : (
            <>
              <button className="btn-spin" style={{ flex: 2 }} onClick={handleSpin} disabled={spinningRef.current}>
                {spinningRef.current && autoRemaining === 0 ? '旋轉中...' : '🎰 旋轉'}
              </button>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {AUTO_OPTIONS.map(n => (
                  <button key={n}
                    className={`quick-bet-btn ${autoCount === n ? 'active' : ''}`}
                    style={{ minWidth: 36 }}
                    onClick={() => setAutoCount(n)}>
                    {n}
                  </button>
                ))}
                <button className="btn-spin" style={{ fontSize: 11, padding: '6px 10px', minWidth: 56 }}
                  onClick={handleAutoSpin} disabled={spinningRef.current}>
                  自動×{autoCount}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 狀態 */}
      <div className="slots-status" style={{ color: statusColor }}>{status}</div>

      {/* 跳過動畫按鈕 */}
      {skipShow && (
        <button
          onClick={skipAnimation}
          style={{
            position: 'fixed', top: 16, right: 16, zIndex: 9999,
            background: 'var(--accent)', color: '#000',
            fontWeight: 800, padding: '8px 16px', borderRadius: 12,
            fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em',
            boxShadow: '0 4px 20px rgba(0,255,65,0.4)', border: 'none', cursor: 'pointer',
          }}>
          跳過 ⏭
        </button>
      )}

      {/* 賠率說明 */}
      <div className="card" style={{ marginTop: 16, fontSize: 11, color: 'var(--text3)' }}>
        <div className="card-title">賠率表</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
          {[['7️⃣7️⃣7️⃣', '25x'], ['💎💎💎', '12x'], ['其他三連', '8x'], ['任意兩連', '2x']].map(([s, m]) => (
            <div key={s} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{s}</span><span style={{ color: 'var(--accent)', fontFamily: 'var(--mono)' }}>{m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
