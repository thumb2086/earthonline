import { useState } from 'react';
import { useToast } from './Toast.jsx';

const DICE = ['⚀','⚁','⚂','⚃','⚄','⚅'];

export function Sicbo({ api, refresh }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState(1000);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const play = async (type) => {
    setLoading(true);
    const r = await api('/api/casino/play', { game: 'sicbo', amount, betType: type });
    setLoading(false);
    if (r.error) return toast(r.error, 'error');
    setResult(r);
    toast(r.win ? `🎉 ${r.dice.join(' ')} = ${r.total}，+$${r.profit}` : `${r.dice.join(' ')} = ${r.total}，-$${Math.abs(r.profit)}`, r.win ? 'success' : 'info');
    refresh();
  };
  const bets = [['big','📈 大 11-17'],['small','📉 小 4-10'],['odd','🔢 奇'],['even','🔢 偶'],['triple','🎯 圍骰 30x']];
  return (<div className="card">
    <div className="card-title">🎲 骰寶</div>
    <div className="text-dim text-sm" style={{marginBottom:8}}>猜大小、圍骰、奇偶</div>
    <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
      {bets.map(([t,l])=><button key={t} className="btn btn-sm" style={{flex:1,minWidth:70}} disabled={loading} onClick={()=>play(t)}>{l}</button>)}
    </div>
    <div style={{display:'flex',gap:6,alignItems:'center'}}>
      <span className="text-dim text-sm">投注</span>
      {[100,500,1000,5000,10000].map(v=><button key={v} className={`btn btn-sm ${amount===v?'btn-primary':''}`} onClick={()=>setAmount(v)}>${v>=1000?(v/1000)+'K':v}</button>)}
    </div>
    {result&&<div style={{marginTop:10,textAlign:'center'}}>
      <div style={{fontSize:28}}>{result.dice?.map(d=>DICE[d-1]).join(' ')}</div>
      <div style={{fontWeight:700,color:result.win?'var(--accent)':'var(--danger)',marginTop:4}}>
        {result.win?`+$${result.profit.toLocaleString()}`:`-$${Math.abs(result.profit).toLocaleString()}`}
      </div>
    </div>}
  </div>);
}

export function Blackjack({ api, refresh }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState(1000);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const cardChar = v => v===11?'A':v===10?'X':String(v);
  const play = async () => {
    setLoading(true);
    const r = await api('/api/casino/play', { game: 'blackjack', amount });
    setLoading(false);
    if (r.error) return toast(r.error, 'error');
    setResult(r);
    const msg = r.payout===amount?'平手':r.win?`贏 +$${r.profit}`:`輸 -$${Math.abs(r.profit)}`;
    toast(msg, r.win?'success':'info');
    refresh();
  };
  return (<div className="card">
    <div className="card-title">🃏 21點</div>
    <div className="text-dim text-sm" style={{marginBottom:8}}>跟莊家比大小，天然 21 點 3.5 倍</div>
    <div style={{display:'flex',gap:6,marginBottom:8}}>
      {[100,500,1000,5000,10000].map(v=><button key={v} className={`btn btn-sm ${amount===v?'btn-primary':''}`} onClick={()=>setAmount(v)}>${v>=1000?(v/1000)+'K':v}</button>)}
      <button className="btn btn-primary btn-sm" onClick={play} disabled={loading} style={{marginLeft:'auto'}}>打牌</button>
    </div>
    {result&&<div style={{display:'flex',gap:24,justifyContent:'center',marginTop:8}}>
      <div style={{textAlign:'center'}}>
        <div className="text-dim text-sm">玩家 {result.playerValue}</div>
        <div style={{display:'flex',gap:4}}>{result.player?.map((c,i)=><div key={i} style={{width:36,height:50,borderRadius:6,background:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:18}}>{cardChar(c)}</div>)}</div>
      </div>
      <div style={{textAlign:'center'}}>
        <div className="text-dim text-sm">莊家 {result.dealerValue}</div>
        <div style={{display:'flex',gap:4}}>{result.dealer?.map((c,i)=><div key={i} style={{width:36,height:50,borderRadius:6,background:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:18}}>{cardChar(c)}</div>)}</div>
      </div>
    </div>}
  </div>);
}

export function Roulette({ api, refresh }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState(1000);
  const [betType, setBetType] = useState('red');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const play = async (type) => {
    setBetType(type);
    setLoading(true);
    const r = await api('/api/casino/play', { game: 'roulette', amount, betType: type });
    setLoading(false);
    if (r.error) return toast(r.error, 'error');
    setResult(r);
    toast(`${r.result===0?'🟢 0':r.isRed?'🔴':'⚫'} ${r.result} → ${r.win?`+$${r.profit}`:`-$${Math.abs(r.profit)}`}`, r.win?'success':'info');
    refresh();
  };
  return (<div className="card">
    <div className="card-title">🎡 輪盤</div>
    <div className="text-dim text-sm" style={{marginBottom:8}}>歐式 37 格（0-36），紅黑奇偶</div>
    <div style={{display:'flex',gap:6,marginBottom:8,flexWrap:'wrap'}}>
      {[['red','🔴 紅'],['black','⚫ 黑'],['odd','🔢 奇'],['even','🔢 偶'],['low','📉 1-18'],['high','📈 19-36']].map(([t,l])=><button key={t} className="btn btn-sm" style={{flex:1,minWidth:60}} disabled={loading} onClick={()=>play(t)}>{l}</button>)}
    </div>
    <div style={{display:'flex',gap:6,alignItems:'center'}}>
      <span className="text-dim text-sm">投注</span>
      {[100,500,1000,5000,10000].map(v=><button key={v} className={`btn btn-sm ${amount===v?'btn-primary':''}`} onClick={()=>setAmount(v)}>${v>=1000?(v/1000)+'K':v}</button>)}
    </div>
    {result&&<div style={{marginTop:10,textAlign:'center'}}>
      <div style={{fontSize:32}}>{result.result===0?'🟢':result.isRed?'🔴':'⚫'} {result.result}</div>
      <div style={{fontWeight:700,color:result.win?'var(--accent)':'var(--danger)',marginTop:4}}>
        {result.win?`+$${result.profit.toLocaleString()}`:`-$${Math.abs(result.profit).toLocaleString()}`}
      </div>
    </div>}
  </div>);
}

export function Slots({ api, refresh }) {
  const { toast } = useToast();
  const [amount, setAmount] = useState(1000);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [display, setDisplay] = useState(['🍒','🍋','🍊']);
  const play = async () => {
    setLoading(true); setSpinning(true);
    // 動畫效果: 快速切換符號 1 秒
    let count = 0;
    const iv = setInterval(() => {
      setDisplay([['🍒','🍋','🍊','🍇','💎','🔔','⭐','7️⃣'][Math.floor(Math.random()*8)],['🍒','🍋','🍊','🍇','💎','🔔','⭐','7️⃣'][Math.floor(Math.random()*8)],['🍒','🍋','🍊','🍇','💎','🔔','⭐','7️⃣'][Math.floor(Math.random()*8)]]);
      if (++count > 20) { clearInterval(iv); setSpinning(false); }
    }, 50);
    const r = await api('/api/casino/play', { game: 'slots', amount });
    setLoading(false);
    if (r.error) { toast(r.error, 'error'); return; }
    setTimeout(() => { setDisplay(r.symbols); }, 800);
    setTimeout(() => { setResult(r); toast(r.win?`🎰 中獎！${r.symbols.join('')} +$${r.profit}`:`🎰 ${r.symbols.join('')} -$${Math.abs(r.profit)}`, r.win?'success':'info'); refresh(); }, 1200);
  };
  return (<div className="card">
    <div className="card-title">🎰 老虎機</div>
    <div className="text-dim text-sm" style={{marginBottom:8}}>7️⃣7️⃣7️⃣ = 50x · 💎💎💎 = 20x · 其他三連 = 10x · 兩連 = 3x</div>
    <div style={{display:'flex',justifyContent:'center',gap:12,margin:16}}>
      {display.map((s,i)=><div key={i} style={{width:64,height:64,borderRadius:12,background:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:36,transition:'all 0.1s',transform:spinning?'scale(1.1)':'scale(1)'}}>{s}</div>)}
    </div>
    <div style={{display:'flex',gap:6,justifyContent:'center',alignItems:'center'}}>
      {[100,500,1000,5000,10000].map(v=><button key={v} className={`btn btn-sm ${amount===v?'btn-primary':''}`} onClick={()=>setAmount(v)}>${v>=1000?(v/1000)+'K':v}</button>)}
      <button className="btn btn-primary btn-sm" onClick={play} disabled={loading} style={{marginLeft:8,minWidth:80}}>
        {spinning?'轉動中...':'旋轉'}
      </button>
    </div>
    {result&&result.win&&!spinning&&<div style={{marginTop:8,textAlign:'center',fontWeight:700,color:'var(--accent)',fontSize:18}}>🎉 +${result.profit.toLocaleString()}</div>}
  </div>);
}
