import { useState, useEffect } from 'react';
import { useToast } from './Toast.jsx';

export default function LaunchPage({ api, user, onNavigate }) {
  const { toast } = useToast();
  const [btc, setBtc] = useState(null);
  const [launch, setLaunch] = useState(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    api('/api/launch/btc/status').then(setBtc).catch(() => {});
    api('/api/launch/status').then(setLaunch).catch(() => {});
  }, []);

  const claimBtc = async () => {
    setClaiming(true);
    const r = await api('/api/launch/btc/claim', {});
    setClaiming(false);
    if (r.error) { toast(r.error, 'error'); return; }
    toast(`🎉 成功領取 ${r.amount} BTC！`, 'success');
    api('/api/launch/btc/status').then(setBtc);
  };

  const formatTime = (ms) => {
    if (ms <= 0) return '已結束';
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h} 小時 ${m} 分`;
  };

  return (
    <div style={{maxWidth:600, margin:'0 auto'}}>
      {/* Hero */}
      <div className="card mb-12" style={{
        background:'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(0,255,65,0.08))',
        borderLeft:'3px solid #f59e0b',
        textAlign:'center', padding:'24px 16px',
      }}>
        <div style={{fontSize:48, marginBottom:8}}>🌍</div>
        <div style={{fontSize:22, fontWeight:800, color:'#f59e0b', marginBottom:4}}>地球在線 正式開服</div>
        <div className="text-dim text-sm">Welcome to Earth Online</div>
        {launch?.active && (
          <div style={{marginTop:12, padding:'8px 16px', borderRadius:8, background:'rgba(0,255,65,0.1)', display:'inline-block'}}>
            <span style={{color:'var(--accent)', fontWeight:600}}>🎉 開服慶典進行中</span>
            <span className="text-dim" style={{marginLeft:8}}>剩餘 {formatTime(launch.remainingMs)}</span>
          </div>
        )}
      </div>

      {/* Bitcoin - 活動結束且未領取則不顯示 */}
      {(launch?.active || btc?.claimed) && (
      <div className="card mb-12" style={{
        borderLeft:'3px solid #f7931a',
        background: btc?.claimed ? 'rgba(247,147,26,0.05)' : 'linear-gradient(135deg, rgba(247,147,26,0.12), rgba(247,147,26,0.03))',
      }}>
        <div style={{display:'flex', alignItems:'center', gap:16}}>
          <div style={{fontSize:48}}>₿</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700, fontSize:18, color:'#f7931a'}}>開服限定比特幣</div>
            <div className="text-dim text-sm" style={{marginTop:4}}>
              {btc?.claimed
                ? `已領取 ${btc.amount} BTC（用途即將揭曉）`
                : '每位玩家限領 1 顆比特幣，用途日後公布'
              }
            </div>
          </div>
          {!btc?.claimed && launch?.active ? (
            <button className="btn btn-primary" onClick={claimBtc} disabled={claiming}
              style={{background:'#f7931a', borderColor:'#f7931a', fontWeight:700}}>
              {claiming ? '領取中...' : '領取 1 BTC'}
            </button>
          ) : btc?.claimed ? (
            <div style={{padding:'6px 12px', borderRadius:8, background:'rgba(247,147,26,0.15)', color:'#f7931a', fontWeight:600, fontSize:13}}>
              ✓ 已領取
            </div>
          ) : null}
        </div>
      </div>
      )}

      {/* Launch Benefits */}
      <div className="card mb-12">
        <div className="card-title">🎁 開服慶典活動</div>
        <div style={{display:'flex', flexDirection:'column', gap:10, marginTop:8}}>
          {[
            { icon: '💰', title: '雙倍收入', desc: '所有玩家收入 x2', active: launch?.doubleActive, time: '72 小時', link: 'dashboard' },
            { icon: '📅', title: '每日登入獎勵', desc: '7 天循環制，連續登入額外獎勵', active: true, time: '常駐', link: 'dashboard' },
            { icon: '🎰', title: '刮刮樂', desc: '銅/銀/金三種等級，每日免費 1 次', active: true, time: '每日重置', link: 'gaming' },
            { icon: '🎱', title: '樂透', desc: '選 6 個號碼，每天開獎', active: true, time: '每天 08:00 開獎', link: 'gaming' },
            { icon: '🏆', title: '排行榜獎勵', desc: '每日自動發放 Top 10 獎金', active: launch?.active, time: '活動期間', link: 'leaderboard' },
          ].map((item, i) => (
            <div key={i} onClick={() => onNavigate && onNavigate(item.link)} style={{display:'flex', gap:12, alignItems:'center', padding:'10px 12px', borderRadius:8, background:'rgba(255,255,255,0.02)', border:'1px solid var(--border)', cursor: onNavigate ? 'pointer' : 'default', transition:'background 0.15s'}}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'}>
              <div style={{fontSize:28, minWidth:36, textAlign:'center'}}>{item.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:600, fontSize:14}}>{item.title}</div>
                <div className="text-dim text-sm">{item.desc}</div>
              </div>
              <div style={{textAlign:'right', display:'flex', alignItems:'center', gap:6}}>
                {item.active !== undefined && (
                  <div style={{fontSize:10, padding:'2px 8px', borderRadius:4, background: item.active ? 'rgba(0,255,65,0.15)' : 'rgba(255,255,255,0.05)', color: item.active ? 'var(--accent)' : 'var(--text-dim)', fontWeight:600}}>
                    {item.active ? '進行中' : item.time}
                  </div>
                )}
                <span className="text-dim" style={{fontSize:12}}>→</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard Preview */}
      <div className="card">
        <div className="card-title">🏆 排行榜獎勵（每日自動發放）</div>
        <div style={{display:'flex', flexDirection:'column', gap:6, marginTop:8}}>
          {[['🥇 第 1 名', '$50,000'], ['🥈 第 2-3 名', '$20,000'], ['🥉 第 4-10 名', '$5,000']].map(([rank, reward]) => (
            <div key={rank} style={{display:'flex', justifyContent:'space-between', padding:'6px 0', borderTop:'1px solid var(--border)', fontSize:13}}>
              <span>{rank}</span>
              <span style={{fontWeight:600, color:'var(--accent)'}}>{reward}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
