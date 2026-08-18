import { useState, useEffect, useCallback } from 'react';
import { useToast } from './Toast.jsx';

export default function Gaming({ api, user }) {
  const [tab, setTab] = useState('scratch');
  return (
    <>
      <div style={{display:'flex', gap:6, marginBottom:12}}>
        {[['scratch', '🎰 刮刮樂'], ['lottery', '🎱 樂透']].map(([k, v]) => (
          <button key={k} className={`btn btn-sm ${tab === k ? 'btn-primary' : ''}`} onClick={() => setTab(k)}>{v}</button>
        ))}
      </div>
      {tab === 'scratch' ? <ScratchCard api={api} user={user} /> : <Lottery api={api} user={user} />}
    </>
  );
}

function ScratchCard({ api, user }) {
  const { toast } = useToast();
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);

  const load = useCallback(() => api('/api/scratch/status').then(setStatus).catch(() => {}), []);
  useEffect(() => { load(); }, []);

  const buy = async (tier, free) => {
    setLoading(true); setAnimating(true);
    const r = await api('/api/scratch/buy', { tier, free });
    setLoading(false);
    if (r.error) { toast(r.error, 'error'); setAnimating(false); return; }

    await new Promise(res => setTimeout(res, 800));
    setResult(r);
    setAnimating(false);
    if (r.reward > 0) {
      toast(`🎉 中獎！${r.icon} ${r.multiplier}x → $${r.reward.toLocaleString()}`, 'success');
    } else {
      toast(`${r.icon} 沒中，下次運氣更好`, 'info');
    }
    load();
  };

  if (!status) return <div className="text-dim">載入中...</div>;

  return (
    <>
      {result && <ScratchResult result={result} onClose={() => setResult(null)} animating={animating} />}

      <div className="grid-3 mb-12">
        {status.tiers.map(t => (
          <div className="card" key={t.type} style={{borderLeft:`3px solid ${t.type === 'gold' ? '#f59e0b' : t.type === 'silver' ? '#94a3b8' : '#cd7f32'}`, cursor:'pointer', opacity: loading ? 0.5 : 1}}
            onClick={() => !loading && buy(t.type, false)}>
            <div style={{fontWeight:700, fontSize:16}}>{t.icon} {t.label}</div>
            <div className="text-dim text-sm" style={{marginTop:4}}>花費 ${t.cost.toLocaleString()}</div>
            <div className="text-dim text-sm">最高回報 10x</div>
            <button className="btn btn-primary btn-sm" style={{marginTop:8, width:'100%'}} disabled={loading}>購買</button>
          </div>
        ))}
      </div>

      {status.freeUsed < 1 && <div className="card mb-12" style={{borderLeft:'3px solid var(--accent)', background:'rgba(0,255,65,0.05)'}}>
        <div className="flex justify-between items-center">
          <div>
            <div style={{fontWeight:600}}>🎁 今日免費刮刮樂</div>
            <div className="text-dim text-sm">開服慶典每日 1 次免費</div>
          </div>
          <button className="btn btn-primary btn-sm" disabled={loading} onClick={() => !loading && buy('bronze', true)}>免費刮</button>
        </div>
      </div>}

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

function ScratchResult({ result, onClose, animating }) {
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!animating) { setTimeout(() => setRevealed(true), 300); }
  }, [animating]);

  const won = result.reward > result.cost;
  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:9999}} onClick={onClose}>
      <div style={{background:'var(--bg)', borderRadius:12, padding:24, minWidth:280, textAlign:'center', border:'2px solid var(--border)'}} onClick={e => e.stopPropagation()}>
        {animating ? (
          <div style={{fontSize:48, animation:'spin 1s linear infinite'}}>🎰</div>
        ) : revealed ? (
          <>
            <div style={{fontSize:40, marginBottom:8}}>{result.icon}</div>
            <div style={{fontSize:14, color:'var(--text-dim)', marginBottom:4}}>{result.tier}</div>
            <div style={{fontSize:32, fontWeight:700, color: won ? 'var(--accent)' : 'var(--danger)', marginBottom:4}}>
              {result.multiplier}x
            </div>
            <div style={{fontSize:20, fontWeight:700, color: won ? 'var(--accent)' : 'var(--danger)', marginBottom:8}}>
              {won ? '+' : ''}{result.profit.toLocaleString()} $
            </div>
            <div className="text-dim text-sm">花費 ${result.cost.toLocaleString()} → 獎金 ${result.reward.toLocaleString()}</div>
            <button className="btn btn-primary" style={{marginTop:12}} onClick={onClose}>確認</button>
          </>
        ) : null}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
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
    if (selected.length < 6) return toast('請選擇 6 個號碼', 'error');
    setLoading(true);
    const r = await api('/api/lottery/buy', { numbers: selected, free });
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
        <div className="grid-2 mb-12">
          <div><div className="text-dim text-sm">獎池</div><div style={{fontSize:20, fontWeight:700, color:'var(--accent)'}}>${status.totalPool.toLocaleString()}</div></div>
          <div><div className="text-dim text-sm">我的投注</div><div style={{fontSize:20, fontWeight:700}}>{status.myTickets} 注</div></div>
        </div>
      </div>

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

      {status.freeUsed < 1 && <div className="card mb-12" style={{borderLeft:'3px solid var(--accent)', background:'rgba(0,255,65,0.05)'}}>
        <div className="flex justify-between items-center">
          <div>
            <div style={{fontWeight:600}}>🎁 今日免費投注</div>
            <div className="text-dim text-sm">開服慶典每日 1 次免費</div>
          </div>
          <button className="btn btn-primary btn-sm" disabled={loading || selected.length < 6} onClick={() => buy(true)}>免費投</button>
        </div>
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
