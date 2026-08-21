import { useState, useEffect } from 'react';
import { useToast } from './Toast.jsx';
import { Sicbo, Blackjack, Roulette, Slots } from './CasinoGames.jsx';

export default function Casino({ api, user }) {
  const [game, setGame] = useState('sicbo');
  const [stats, setStats] = useState(null);
  const refresh = () => api('/api/casino/stats').then(setStats).catch(() => {});
  useEffect(() => { refresh(); }, []);
  const games = [['sicbo','🎲','骰寶'],['blackjack','🃏','21點'],['roulette','🎡','輪盤'],['slots','🎰','老虎機']];
  return (<>
    <div style={{display:'flex',gap:6,marginBottom:12}}>
      {games.map(([id,icon,label])=><button key={id} className={`btn btn-sm ${game===id?'btn-primary':''}`} onClick={()=>setGame(id)}>{icon} {label}</button>)}
    </div>
    {stats&&<div className="card mb-12" style={{borderLeft:'3px solid #f59e0b'}}><div className="flex justify-between" style={{fontSize:12}}>
      <span className="text-dim">總投注 ${stats.wagered.toLocaleString()}</span>
      <span className="text-dim">{stats.games} 局</span>
      <span>餘額 ${(user?.cash||0).toLocaleString()}</span>
    </div></div>}
    {game==='sicbo'&&<Sicbo api={api} refresh={refresh}/>}
    {game==='blackjack'&&<Blackjack api={api} refresh={refresh}/>}
    {game==='roulette'&&<Roulette api={api} refresh={refresh}/>}
    {game==='slots'&&<Slots api={api} refresh={refresh}/>}
  </>);
}
