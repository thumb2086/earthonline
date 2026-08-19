import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from './Toast.jsx';

export default function Gaming({ api, user }) {
  const [tab, setTab] = useState('scratch');
  return (
    <>
      <div style={{display:'flex', gap:6, marginBottom:12}}>
        {[['scratch', '🎰 刮刮樂'], ['lottery', '🎱 樂透']].map(([k, v]) => (
          <button key={k} className={`btn btn-sm ${tab === k ? 'btn btn-primary' : ''}`} onClick={() => setTab(k)}>{v}</button>
        ))}
      </div>
      {tab === 'scratch' ? <ScratchCard api={api} user={user} /> : <Lottery api={api} user={user} />}
    </>
  );
}

function ScratchCard({ api, user }) {
  const { toast } = useToast();
  const [status, setStatus] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scratchState, setScratchState] = useState('idle');

  const load = useCallback(() => api('/api/scratch/status').then(setStatus).catch(() => []), []);
  useEffect(() => { load(); }, []);

  const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '💎', '🔔', '⭐', '7️⃣'];

  const buy = async (tier, free) => {
    setLoading(true); setScratchState('rolling');
    const r = await api('/api/scratch/buy', { tier, free });
    setLoading(false);
    if (r.error) { toast(r.error, 'error'); setScratchState('idle'); return; }

    const cost = r.cost || 0;
    const reward = r.reward;
    const symbols = [];
    if (reward === 0) {
      for (let i = 0; i < 3; i++) symbols.push(SYMBOLS[Math.floor(Math.random() * 4)]);
    } else {
      const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      if (r.multiplier >= 3) { symbols.push(sym, sym, sym); }
      else if (r.multiplier >= 1) { symbols.push(sym, sym, SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]); }
      else { symbols.push(sym, SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)], SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]); }
    }

    setTicket({ ...r, symbols });
    setScratchState('ready');
    load();
  };

  const revealAll = () => setScratchState('revealed');

  const resetScratch = () => { setTicket(null); setScratchState('idle'); };

  if (!status) return <div className="text-dim">載入中...</div>;

  return (
    <>
      <div className="grid-3 mb-12">
        {status.tiers.map(t => (
          <div className="card" key={t.type} style={{borderLeft:`3px solid ${t.type === 'gold' ? '#f59e0b' : t.type === 'silver' ? '#94a3b8' : '#cd7f32'}`, opacity: loading ? 0.5 : 1}}>
            <div style={{fontWeight:700, fontSize:16}}>{t.icon} {t.label}</div>
            <div className="text-dim text-sm" style={{marginTop:4}}>花費 ${t.cost.toLocaleString()}</div>
            <div className="text-dim text-sm">最高回報 10x</div>
            <button className="btn btn-primary btn-sm" style={{marginTop:8, width:'100%'}} disabled={loading} onClick={() => buy(t.type, false)}>購買</button>
          </div>
        ))}
      </div>

      {status.freeUsed < 5 && <div className="card mb-12" style={{borderLeft:'3px solid var(--accent)', background:'rgba(0,255,65,0.05)'}}>
        <div className="flex justify-between items-center">
          <div>
            <div style={{fontWeight:600}}>🎁 今日免費刮刮樂</div>
            <div className="text-dim text-sm">每日 5 次免費（剩餘 {5 - status.freeUsed} 次）</div>
          </div>
          <button className="btn btn-primary btn-sm" disabled={loading} onClick={() => buy('bronze', true)}>免費刮</button>
        </div>
      </div>}

      {scratchState === 'rolling' && <div className="card mb-12" style={{textAlign:'center', padding:24}}>
        <div style={{fontSize:48, animation:'spin 0.5s linear infinite'}}>🎰</div>
        <div className="text-dim" style={{marginTop:8}}>產生中...</div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>}

      {ticket && scratchState === 'ready' && (
        <div className="card mb-12" style={{borderLeft:'3px solid #f59e0b'}}>
          <div style={{textAlign:'center', marginBottom:12}}>
            <div style={{fontWeight:700, fontSize:16}}>{ticket.icon} {ticket.tier}</div>
            <div className="text-dim text-sm">點擊格子刮開，或按「全部刮開」</div>
          </div>
          <ScratchGrid symbols={ticket.symbols} onComplete={() => setScratchState('revealed')} />
        </div>
      )}

      {ticket && scratchState === 'revealed' && (
        <ScratchReveal ticket={ticket} onReset={resetScratch} />
      )}

      <div className="card">
        <div className="card-title">📊 預期回報率</div>
        <div className="text-dim text-sm">
          銅級: 平均回報 75%（虧損機率 30%）<br/>
          銀級: 平均回報 95%（虧損機率 20%）<br/>
          金級: 平均回報 125%（虧損機率 10%）
        </div>
      </div>
    </>
  );
}

function ScratchGrid({ symbols, onComplete }) {
  const [revealed, setRevealed] = useState([false, false, false]);

  const reveal = (i) => {
    if (revealed[i]) return;
    const next = [...revealed]; next[i] = true; setRevealed(next);
    if (next.every(Boolean)) setTimeout(onComplete, 500);
  };

  const revealAll = () => { setRevealed([true, true, true]); setTimeout(onComplete, 500); };

  return (
    <>
      <div style={{display:'flex', justifyContent:'center', gap:12, marginBottom:16}}>
        {symbols.map((sym, i) => (
          <div key={i} onClick={() => reveal(i)}
            style={{width:80, height:80, borderRadius:12, position:'relative', overflow:'hidden', cursor: revealed[i] ? 'default' : 'pointer', userSelect:'none'}}>
            <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, background:'rgba(255,255,255,0.03)', borderRadius:12}}>
              {sym}
            </div>
            {!revealed[i] && <div style={{position:'absolute', inset:0, background:'#374151', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center',
              transition:'opacity 0.4s', opacity: revealed[i] ? 0 : 1, pointerEvents:'none', zIndex:2, fontSize:13, color:'#9ca3af'}}>
              <span style={{pointerEvents:'auto'}} onClick={(e) => { e.stopPropagation(); reveal(i); }}>💰 點我刮</span>
            </div>}
          </div>
        ))}
      </div>
      {!revealed.every(Boolean) && <div style={{textAlign:'center'}}>
        <button className="btn btn-sm" onClick={revealAll}>🔨 全部刮開</button>
      </div>}
    </>
  );
}

function ScratchCell({ onReveal, revealed, hidden }) {
  const [scratching, setScratching] = useState(false);
  const [revealedLocal, setRevealedLocal] = useState(revealed);
  const cellRef = useRef(null);

  useEffect(() => { setRevealedLocal(revealed); }, [revealed]);

  if (!hidden) {
    return (
      <div style={{width:80, height:80, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, background:'rgba(0,255,65,0.08)', border:'2px solid var(--accent)'}}>
        {revealedLocal ? '❓' : '?'}
      </div>
    );
  }

  return (
    <div ref={cellRef}
      onClick={() => { if (!revealedLocal && onReveal) { setScratching(true); setTimeout(() => { setRevealedLocal(true); setScratching(false); onReveal(); }, 400); } }}
      style={{width:80, height:80, borderRadius:12, position:'relative', overflow:'hidden', cursor: revealedLocal ? 'default' : 'pointer', userSelect:'none'}}>
      <div style={{position:'absolute', inset:0, background: scratching ? 'rgba(245,158,11,0.3)' : '#374151', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', transition:'opacity 0.4s', opacity: scratching ? 0 : 1, zIndex:2, fontSize:16, color:'#9ca3af'}}>
        {scratching ? '' : '❓ 點擊刮開'}
      </div>
      <div style={{width:80, height:80, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:36, background:'rgba(255,255,255,0.03)'}}>
        {ticket?.symbols?.['❓'] || '🎰'}
      </div>
    </div>
  );
}

function ScratchReveal({ ticket, onReset }) {
  const won = ticket.reward > ticket.cost;
  return (
    <div className="card mb-12" style={{borderLeft:`3px solid ${won ? 'var(--accent)' : 'var(--danger)'}`, textAlign:'center', padding:24}}>
      <div style={{display:'flex', justifyContent:'center', gap:16, marginBottom:16}}>
        {ticket.symbols.map((sym, i) => (
          <div key={i} style={{width:80, height:80, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:40, background: won ? 'rgba(0,255,65,0.1)' : 'rgba(255,255,255,0.03)', border:`2px solid ${won ? 'var(--accent)' : 'var(--border)'}`,
            animation: `popIn 0.3s ease ${i * 0.15}s both`}}>
            {sym}
          </div>
        ))}
      </div>
      <div style={{fontSize:28, fontWeight:800, color: won ? 'var(--accent)' : 'var(--danger)', marginBottom:4}}>
        {won ? `🎉 中獎！${ticket.multiplier}x` : '😢 沒中'}
      </div>
      <div style={{fontSize:18, fontWeight:700, color: won ? 'var(--accent)' : 'var(--danger)', marginBottom:4}}>
        {won ? `+$${ticket.profit.toLocaleString()}` : `-$${ticket.cost.toLocaleString()}`}
      </div>
      <div className="text-dim text-sm" style={{marginBottom:12}}>花費 ${ticket.cost.toLocaleString()} → 獎金 ${ticket.reward.toLocaleString()}</div>
      <button className="btn btn-primary" onClick={onReset}>繼續刮</button>
      <style>{`@keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
}

function Lottery({ api, user }) {
  const { toast } = useToast();
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => api('/api/lottery/status').then(setStatus).catch(() => {}), []);
  useEffect(() => { load(); api('/api/lottery/history').then(d => setHistory(Array.isArray(d?.results) ? d.results : [])).catch(() => {}); }, []);

  const toggleNum = (n) => {
    setSelected(prev => prev.includes(n) ? prev.filter(x => x !== n) : prev.length < 6 ? [...prev, n].sort((a, b) => a - b) : prev);
  };

  const randomPick = () => {
    const nums = new Set();
    while (nums.size < 6) nums.add(Math.floor(Math.random() * 39) + 1);
    setSelected([...nums].sort((a, b) => a - b));
  };

  const buy = async (free) => {
    const nums = selected.length === 6 ? selected : null;
    if (!free && selected.length < 6) return toast('請選擇 6 個號碼', 'error');
    setLoading(true);
    const r = await api('/api/lottery/buy', { numbers: nums, free });
    setLoading(false);
    if (r.error) { toast(r.error, 'error'); return; }
    toast(`🎰 購票成功！號碼：${r.numbers.join(' ')}`, 'success');
    setSelected([]);
    load();
  };

  if (!status) return <div className="text-dim">載入中...</div>;

  return (
    <>
      <div className="card mb-12" style={{borderLeft:'3px solid var(--accent)'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
          <div style={{fontWeight:700, fontSize:16}}>🎱 第 {status.drawNumber} 期</div>
          <div className="text-dim text-sm">每天 08:00 開獎</div>
        </div>
        <div className="grid-2">
          <div><div className="text-dim text-sm">獎池</div><div style={{fontSize:20, fontWeight:700, color:'var(--accent)'}}>${status.totalPool.toLocaleString()}<span className="text-dim" style={{fontSize:11, marginLeft:4}}>含系統底池 $10,000</span></div></div>
          <div><div className="text-dim text-sm">我的投注</div><div style={{fontSize:20, fontWeight:700}}>{status.myTickets} 注</div></div>
        </div>
      </div>

      {status.freeUsed < 5 && <div className="card mb-12" style={{borderLeft:'3px solid var(--accent)', background:'rgba(0,255,65,0.05)'}}>
        <div className="flex justify-between items-center">
          <div>
            <div style={{fontWeight:600}}>🎁 今日免費投注</div>
            <div className="text-dim text-sm">每日 5 次免費（剩餘 {5 - status.freeUsed} 次）</div>
          </div>
          <button className="btn btn-primary btn-sm" disabled={loading} onClick={() => buy(true)}>免費投</button>
        </div>
      </div>}

      <div className="card mb-12">
        <div className="card-title">選號（{selected.length}/6）</div>
        <div style={{display:'flex', flexWrap:'wrap', gap:6, marginTop:8}}>
          {Array.from({length: 39}, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => toggleNum(n)}
              style={{width:36, height:36, borderRadius:'50%', border: selected.includes(n) ? '2px solid var(--accent)' : '1px solid var(--border)',
                background: selected.includes(n) ? 'rgba(0,255,65,0.15)' : 'transparent',
                color: selected.includes(n) ? 'var(--accent)' : 'var(--text)', fontWeight:600, cursor:'pointer', fontSize:12}}>
              {n}
            </button>
          ))}
        </div>
        <div style={{display:'flex', gap:6, marginTop:10}}>
          <button className="btn btn-sm" onClick={randomPick}>🎲 隨機</button>
          <button className="btn btn-sm" onClick={() => setSelected([])}>清除</button>
          <button className="btn btn-primary btn-sm" onClick={() => buy(false)} disabled={loading || selected.length < 6}>
            投注 ${status.cost}
          </button>
        </div>
      </div>

      {status.myTicketsList && status.myTicketsList.length > 0 && <div className="card mb-12">
        <div className="card-title">📋 我的投注號碼</div>
        {status.myTicketsList.map((t, i) => (
          <div key={i} style={{display:'flex', justifyContent:'space-between', padding:'6px 0', borderTop:'1px solid var(--border)', fontSize:13}}>
            <span style={{fontWeight:600, color:'var(--accent)'}}>{t.numbers}</span>
            <span className="text-dim">{t.matches > 0 ? `中 ${t.matches} 號` : t.prize > 0 ? `+$${t.prize.toLocaleString()}` : '待開獎'}</span>
          </div>
        ))}
      </div>}

      <div className="card mb-12">
        <div className="card-title">💰 獎金分配</div>
        <div className="text-dim text-sm">
          中 6 號: 獎池 50%<br/>
          中 5 號: 獎池 20%（同中獎者平分）<br/>
          中 4 號: 獎池 15%（同中獎者平分）<br/>
          中 3 號: 獎池 10%（同中獎者平分）
        </div>
      </div>

      {history.length > 0 && <div className="card">
        <div className="card-title">📜 歷史開獎</div>
        {history.map(h => (
          <div key={h.id} style={{padding:'6px 0', borderTop:'1px solid var(--border)', fontSize:12}}>
            <span className="text-dim">第 {h.draw_number} 期</span>
            <span style={{marginLeft:8, fontWeight:600, color:'var(--accent)'}}>{h.winning_numbers}</span>
            <span className="text-dim" style={{marginLeft:8}}>${h.total_pool.toLocaleString()} / {h.total_tickets} 注</span>
          </div>
        ))}
      </div>}
    </>
  );
}
