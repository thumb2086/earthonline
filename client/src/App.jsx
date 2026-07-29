import { useState, useEffect } from 'react'
import LoginGateway from './components/LoginGateway'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('eo_token'))
  const [user, setUser] = useState(null)
  const [view, setView] = useState('dashboard')
  const [rev, setRev] = useState(0)

  useEffect(() => {
    if (!token) return
    fetch('/api/me', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => { if (!r.ok) throw new Error('unauth'); return r.json() })
      .then(d => setUser(d))
      .catch(() => { localStorage.removeItem('eo_token'); setToken(null) })
  }, [token, rev])

  useEffect(() => {
    if (!token) return
    const id = setInterval(() => setRev(r => r + 1), 15000)
    return () => clearInterval(id)
  }, [token])

  function api(path, body) {
    const opts = { headers: { Authorization: 'Bearer ' + token } }
    if (body) { opts.method = 'POST'; opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json' }
    return fetch(path, opts).then(r => {
      if (body) setTimeout(() => setRev(r => r + 1), 500)
      return r.json()
    })
  }

  const handleLogin = (t) => { localStorage.setItem('eo_token', t); setToken(t) }
  const logout = () => { localStorage.removeItem('eo_token'); setToken(null); setUser(null) }

  if (!token) return <LoginGateway onLogin={handleLogin} />

  const tabs = [
    { id: 'dashboard', label: '儀表板' },
    { id: 'income', label: '升級' },
    { id: 'bank', label: '銀行' },
    { id: 'invest', label: '投資' },
    { id: 'employee', label: '員工' },
    { id: 'company', label: '公司' },
    { id: 'stock', label: '股票' },
    { id: 'contract', label: '合約' },
    { id: 'leaderboard', label: '排行' },
  ]
  if (user?.role === 'admin') tabs.push({ id: 'admin', label: '管理' })

  const tabIcons = {
    dashboard: '◈',
    income: '▲',
    bank: '▣',
    invest: '◆',
    employee: '●',
    company: '■',
    stock: '⬆',
    contract: '◎',
    leaderboard: '★',
    admin: '⚙',
  }

  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-left">
          <span className="logo">earthonline</span>
          <span className="badge">💰 {(user?.cash ?? '...').toLocaleString()}</span>
          <span className="badge">🏦 {(user?.savings ?? '...').toLocaleString()}</span>
          <span className="badge badge-danger">📈 {(user?.total_earned ?? '...').toLocaleString()}</span>
        </div>
        <div className="topbar-right">
          <span className="text-dim font-bold">{user?.username ?? '載入中...'}{user?.role === 'admin' ? ' ⚙' : ''}</span>
          <button className="btn btn-sm btn-danger" onClick={logout}>exit</button>
        </div>
      </div>
      <div className="body">
        <div className="sidebar">
          {tabs.map(t => (
            <button key={t.id} className={`tab ${view === t.id ? 'active' : ''}`}
              onClick={() => setView(t.id)}>
              <span style={{ opacity: 0.5, fontSize: 12 }}>{tabIcons[t.id]}</span>
              {t.label}
            </button>
          ))}
        </div>
        <div className="content">
          {view === 'dashboard' && <Dashboard user={user} api={api} />}
          {view === 'income' && <Income api={api} />}
          {view === 'bank' && <Bank api={api} />}
          {view === 'invest' && <Invest api={api} />}
          {view === 'employee' && <Employee api={api} />}
          {view === 'company' && <Company api={api} />}
          {view === 'stock' && <Stock api={api} />}
          {view === 'contract' && <Contract api={api} />}
          {view === 'leaderboard' && <Leaderboard api={api} />}
          {view === 'admin' && <AdminPanel api={api} />}
        </div>
      </div>
    </div>
  )
}

function Dashboard({ user, api }) {
  const [data, setData] = useState({})
  useEffect(() => {
    api('/api/stock/quote').then(d => setData(p => ({ ...p, q: d }))).catch(()=>{})
    api('/api/stock/holdings').then(d => setData(p => ({ ...p, h: Array.isArray(d) ? d : [] }))).catch(()=>{})
  }, [])
  const sv = (data.h || []).reduce((s, h) => s + (data.q?.price || 100) * h.quantity, 0)
  const total = (user?.cash || 0) + (user?.savings || 0) + (user?.bank || 0) + sv

  return (
    <>
      <div className="grid-3 mb-12">
        <div className="stat-card animate-fade">
          <div className="card-title">可用現金</div>
          <div className="text-lg">${(user?.cash || 0).toLocaleString()}</div>
        </div>
        <div className="stat-card animate-fade" style={{animationDelay:'0.1s'}}>
          <div className="card-title">總資產</div>
          <div className="text-lg">${total.toLocaleString()}</div>
        </div>
        <div className="stat-card animate-fade" style={{animationDelay:'0.2s'}}>
          <div className="card-title">累計賺取</div>
          <div className="text-lg">${(user?.total_earned || 0).toLocaleString()}</div>
        </div>
      </div>
      <div className="grid-2">
        <div className="card card-accent">
          <div className="card-title">資產分布</div>
          <div className="stat"><span className="stat-label">活存</span><span className="stat-value">${(user?.savings || 0).toLocaleString()}</span></div>
          <div className="stat"><span className="stat-label">定存</span><span className="stat-value">${(user?.bank || 0).toLocaleString()}</span></div>
          <div className="stat"><span className="stat-label">股票</span><span className="stat-value">${sv.toLocaleString()}</span></div>
          {data.q && <div className="stat"><span className="stat-label">001 股價</span><span className="stat-value">${data.q.price}</span></div>}
        </div>
        <div className="card card-accent">
          <div className="card-title">升級</div>
          {user?.levels ? <>
            <div className="stat"><span className="stat-label">電腦</span><span className="stat-value">Lv.{user.levels.computer}</span></div>
            <div className="stat"><span className="stat-label">伺服器</span><span className="stat-value">Lv.{user.levels.server}</span></div>
            <div className="stat"><span className="stat-label">AI 助手</span><span className="stat-value">Lv.{user.levels.ai_assistant}</span></div>
          </> : <div className="text-dim">載入中...</div>}
        </div>
      </div>
    </>
  )
}

function Income({ api }) {
  const [info, setInfo] = useState(null)
  useEffect(() => { api('/api/income/info').then(setInfo) }, [])
  const up = async (item) => { const r = await api('/api/income/upgrade', { item }); if (r.success) api('/api/income/info').then(setInfo) }
  if (!info) return <div className="text-dim">載入中...</div>
  return (
    <>
      <div className="stat-card mb-12">
        <div className="card-title">收入/分</div>
        <div className="text-lg">${info.income || 0}</div>
      </div>
      <div className="grid-2">
        {Object.entries(info.upgrades || {}).map(([k, v]) => (
          <div className="card flex justify-between items-center" key={k}>
            <div>
              <div className="text-accent font-bold">{k}</div>
              <div className="text-dim text-sm" style={{marginTop:4}}>Lv.{v ? v.nextLevel-1 : '?'} → Lv.{v?.nextLevel||'MAX'}{v ? ` · $${v.cost}` : ''}</div>
            </div>
            {v && <button className="btn btn-primary btn-sm" onClick={() => up(k)}>升級</button>}
          </div>
        ))}
      </div>
    </>
  )
}

function Bank({ api }) {
  const act = async (e, path) => {
    e.preventDefault(); const fd = new FormData(e.target); const a = parseInt(fd.get('amount'))
    if (!a) return; const r = await api(path, { amount: a }); alert(r.success ? 'success' : r.error)
  }
  return (
    <div className="grid-2">
      <div className="card card-accent">
        <div className="card-title">活期存款</div>
        <div className="text-dim" style={{marginBottom:12}}>利率 0.05% / 分</div>
        <form onSubmit={e => act(e, '/api/bank/deposit')} className="flex gap-8">
          <input name="amount" placeholder="存入金額" />
          <button className="btn btn-primary btn-sm">存入</button>
        </form>
        <form onSubmit={e => act(e, '/api/bank/withdraw')} className="flex gap-8 mt-12">
          <input name="amount" placeholder="提取金額" />
          <button className="btn btn-sm">提取</button>
        </form>
      </div>
      <div className="card card-warn">
        <div className="card-title">貸款</div>
        <div className="text-dim" style={{marginBottom:12}}>利率 0.15% / 分</div>
        <form onSubmit={e => act(e, '/api/bank/borrow')} className="flex gap-8">
          <input name="amount" placeholder="借款金額" />
          <button className="btn btn-sm">借款</button>
        </form>
      </div>
    </div>
  )
}

function Invest({ api }) {
  const [types, setTypes] = useState([])
  const [investments, setInvestments] = useState([])
  const [amounts, setAmounts] = useState({})
  useEffect(() => { api('/api/investment/types').then(setTypes); api('/api/investment/list').then(d => setInvestments(Array.isArray(d)?d:[])) }, [])
  const inv = async (type) => {
    const a = parseInt(amounts[type]); if (!a || a <= 0) return
    const r = await api('/api/investment/invest', { type, amount: a })
    if (r.success) { setAmounts(p => ({...p, [type]: ''})); api('/api/investment/types').then(setTypes); api('/api/investment/list').then(d => setInvestments(Array.isArray(d)?d:[])) }
    else alert(r.error)
  }
  const withdraw = async (id) => {
    const r = await api('/api/investment/withdraw', { investmentId: id })
    if (r.success) { api('/api/investment/list').then(d => setInvestments(Array.isArray(d)?d:[])); alert(`已贖回 $${r.refund}`) }
    else alert(r.error)
  }
  return (
    <>
      <div className="grid-2 mb-12">
        {(types || []).map(t => (
          <div className="card card-accent" key={t.type}>
            <div className="flex justify-between items-center">
              <div><div className="text-accent font-bold">{t.label}</div>
              <div className="text-dim text-sm" style={{marginTop:4}}>{t.rateMin*100}~{t.rateMax*100}% / 分</div></div>
              {t.unlocked
                ? <div className="flex gap-8 items-center">
                    <input type="number" placeholder="金額" value={amounts[t.type] || ''} onChange={e => setAmounts(p => ({...p, [t.type]: e.target.value}))} style={{width:100}} />
                    <button className="btn btn-primary btn-sm" onClick={() => inv(t.type)}>投資</button>
                  </div>
                : <span className="text-dim text-sm">需賺 ${(t.unlockEarned || 0).toLocaleString()}</span>}
            </div>
          </div>
        ))}
      </div>
      {investments.length > 0 && <div className="card"><div className="card-title">我的投資</div>
        {(investments || []).map(inv => (
          <div className="stat" key={inv.id}>
            <span><span className="text-accent">{inv.type}</span> · ${(inv.amount||0).toLocaleString()}</span>
            <button className="btn btn-sm" onClick={() => withdraw(inv.id)}>贖回</button>
          </div>
        ))}
      </div>}
    </>
  )
}

function Employee({ api }) {
  const [employees, setEmployees] = useState([])
  const [positions, setPositions] = useState([])
  useEffect(() => { api('/api/employee/list').then(d => setEmployees(Array.isArray(d)?d:[])) }, [])
  useEffect(() => { api('/api/employee/positions').then(d => setPositions(Array.isArray(d)?d:[])) }, [])
  const hire = async (pos) => { const r = await api('/api/employee/hire', { position: pos }); if (r.success) api('/api/employee/list').then(d => setEmployees(Array.isArray(d)?d:[])); else alert(r.error) }
  return (
    <>
      <div className="card card-accent mb-12">
        <div className="card-title">僱用</div>
        <div className="grid-2" style={{gap:12}}>
          {(positions || []).map(p => (
            <div className="card" key={p.position} style={{padding:14}}>
              <div className="text-accent font-bold">{p.label}</div>
              <div className="text-dim text-sm" style={{marginTop:4}}>費 ${p.hireCost} · 薪 ${p.salary}/分 · +{p.output}/分</div>
              <button className="btn btn-primary btn-sm mt-12" onClick={() => hire(p.position)}>僱用</button>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-title">員工 ({(employees || []).length})</div>
        <div className="list-container">
          {(employees || []).map(e => (
            <div className="list-row" key={e.id}>
              <span className="text-accent font-bold">{e.position}</span>
              <span className="text-dim text-sm">效 {e.efficiency.toFixed(2)} · 士氣 {e.morale}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

function Company({ api }) {
  const [cs, setCs] = useState([])
  useEffect(() => { api('/api/company/list').then(d => setCs(Array.isArray(d)?d:[])) }, [])
  const create = async () => { const n = prompt('公司名:'); if (!n) return; const r = await api('/api/company/create', { name: n, industry: 'tech' }); if (r.success) api('/api/company/list').then(d => setCs(Array.isArray(d)?d:[])); else alert(r.error) }
  return (
    <>
      <div className="flex justify-between items-center mb-12">
        <div className="card-title" style={{marginBottom:0}}>我的公司</div>
        <button className="btn btn-primary" onClick={create}>+ 創建公司 ($50,000)</button>
      </div>
      {(cs || []).map(c => (
        <div className="card card-accent mb-12" key={c.id}>
          <div className="flex justify-between items-center">
            <span className="text-accent font-bold">{c.name}</span>
            <span className="badge">{c.industry}</span>
          </div>
          <div className="divider"/>
          <div className="stat"><span className="stat-label">利潤</span><span className="stat-value">${c.profit||0}/分</span></div>
        </div>
      ))}
      {(!cs || cs.length === 0) && <div className="text-dim" style={{padding:'40px 0',textAlign:'center'}}>尚無公司</div>}
    </>
  )
}

function Stock({ api }) {
  const [q, setQ] = useState(null); const [h, setH] = useState([]); const [t, setT] = useState([]); const [ipo, setIpo] = useState(null)
  useEffect(() => { api('/api/stock/quote').then(setQ); api('/api/stock/holdings').then(d => setH(Array.isArray(d)?d:[])); api('/api/stock/trades').then(d => setT(Array.isArray(d)?d:[])); api('/api/stock/ipo/info').then(setIpo) }, [])
  const buy = async () => { const n = prompt('股數:'); if (!n) return; const r = await api('/api/stock/buy', { quantity: parseInt(n) }); if (r.success) { api('/api/stock/quote').then(setQ); api('/api/stock/holdings').then(setH); api('/api/stock/trades').then(setT) } else alert(r.error) }
  const sell = async () => { const n = prompt('股數:'); if (!n) return; const r = await api('/api/stock/sell', { quantity: parseInt(n) }); if (r.success) { api('/api/stock/quote').then(setQ); api('/api/stock/holdings').then(setH); api('/api/stock/trades').then(setT) } else alert(r.error) }
  return (
    <>
      {ipo?.phase === 'ipo' && (
        <div className="card card-warn mb-12">
          <div className="card-title" style={{color:'var(--warn)'}}>🚀 IPO 認購中</div>
          <div className="text-dim">$100/股 · {ipo.subscribed}/300,000</div>
          <button className="btn btn-sm mt-12" onClick={async()=>{const s=prompt('股數:');if(!s)return;const r=await api('/api/stock/ipo/subscribe',{shares:parseInt(s)});if(r.success){api('/api/stock/ipo/info').then(setIpo);alert(`認購 ${s} 股成功`)}else alert(r.error)}}>認購</button>
        </div>
      )}
      <div className="card card-accent mb-12">
        <div className="card-title">地球互動科技</div>
        <div className="text-sm text-dim" style={{marginBottom:12}}>股票代號 001</div>
        {q && (
          <>
            <div className="grid-2">
              <div>
                <div className="stat"><span className="stat-label">價格</span><span className="stat-value" style={{fontSize:20}}>${q.price}</span></div>
                <div className="stat"><span className="stat-label">買 / 賣</span><span className="stat-value">${q.buyPrice} / ${q.sellPrice}</span></div>
              </div>
              <div>
                <div className="stat"><span className="stat-label">流通</span><span className="stat-value">{(q.circulating||0).toLocaleString()}</span></div>
                <div className="stat"><span className="stat-label">庫存</span><span className="stat-value">{(q.systemInventory||0).toLocaleString()}</span></div>
              </div>
            </div>
            <div className="flex gap-8 mt-12">
              <button className="btn btn-primary btn-sm" onClick={buy}>買入</button>
              <button className="btn btn-sm" onClick={sell}>賣出</button>
            </div>
          </>
        )}
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-title">持倉</div>
          {(h || []).map(x => (
            <div className="stat" key={x.company_id}>
              <span className="stat-label">公司 {x.company_id}</span>
              <span className="stat-value">{x.quantity} 股</span>
            </div>
          ))}
          {(!h || h.length === 0) && <div className="text-dim">無持股</div>}
        </div>
        <div className="card">
          <div className="card-title">成交紀錄</div>
          <div className="list-container">
            {(t || []).slice(0,10).map(x => (
              <div className="stat" key={x.id}>
                <span>
                  <span style={{color: x.type === 'buy' ? 'var(--accent)' : 'var(--danger)'}}>
                    {x.type === 'buy' ? '▲' : '▼'}
                  </span>
                  {' $'}{x.price}
                </span>
                <span className="stat-value">{x.quantity} 股</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function Contract({ api }) {
  const [cs, setCs] = useState([]); const [mine, setMine] = useState([])
  useEffect(() => { api('/api/contract/list').then(d => setCs(Array.isArray(d)?d:[])); api('/api/contract/mine').then(d => setMine(Array.isArray(d)?d:[])) }, [])
  const accept = async (id) => { const r = await api('/api/contract/accept/' + id); if (r.success) { api('/api/contract/list').then(d => setCs(Array.isArray(d)?d:[])); api('/api/contract/mine').then(d => setMine(Array.isArray(d)?d:[])) } else alert(r.error) }
  return (
    <>
      <div className="card card-accent mb-12">
        <div className="card-title">可接取合約</div>
        {(cs || []).map(c => (
          <div className="list-row" key={c.id}>
            <div className="flex items-center gap-8">
              <span className="text-accent font-bold">{c.type}</span>
              <span className="badge">${c.reward}</span>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => accept(c.id)}>接取</button>
          </div>
        ))}
        {(!cs || cs.length === 0) && <div className="text-dim">目前無可用合約</div>}
      </div>
      <div className="card">
        <div className="card-title">進行中合約</div>
        {(mine || []).map(m => (
          <div className="list-row" key={m.contract_id}>
            <span className="text-accent">{m.type}</span>
            <span>{m.completed
              ? <span className="badge">已完成</span>
              : <span className="badge badge-warn">進行中</span>}
            </span>
          </div>
        ))}
        {(!mine || mine.length === 0) && <div className="text-dim">尚無進行中合約</div>}
      </div>
    </>
  )
}

function Leaderboard({ api }) {
  const [data, setData] = useState([])
  useEffect(() => { api('/api/leaderboard').then(d => setData(Array.isArray(d) ? d : [])) }, [])
  return (
    <div className="card card-accent">
      <div className="card-title">排行榜</div>
      {(data || []).map((u, i) => (
        <div className="list-row" key={u.username}>
          <div className="flex items-center gap-12">
            <span className="stat-value" style={{minWidth:28, color: i < 3 ? 'var(--warn)' : 'var(--text3)'}}>#{i+1}</span>
            <span className="font-bold">{u.username}</span>
          </div>
          <div className="flex items-center gap-16">
            <span className="text-dim">💰${(u.total_earned||0).toLocaleString()}</span>
            <span className="text-xs">{u.stocks} 股</span>
          </div>
        </div>
      ))}
      {data.length === 0 && <div className="text-dim">尚無資料</div>}
    </div>
  )
}

function AdminPanel({ api }) {
  const [users, setUsers] = useState([]); const [stats, setStats] = useState(null)
  useEffect(() => { api('/api/admin/users').then(d => setUsers(Array.isArray(d)?d:[])); api('/api/admin/stats').then(setStats) }, [])
  return (
    <>
      {stats && <div className="grid-4 mb-12">
        <div className="stat-card"><div className="card-title">玩家</div><div className="text-lg">{stats.users}</div></div>
        <div className="stat-card"><div className="card-title">總現金</div><div className="text-lg">${(stats.totalCash||0).toLocaleString()}</div></div>
        <div className="stat-card"><div className="card-title">系統庫存</div><div className="text-lg">{(stats.systemReserve?.stock_inventory||0).toLocaleString()} 股</div></div>
        <div className="stat-card"><div className="card-title">交易次數</div><div className="text-lg">{stats.trades}</div></div>
      </div>}
      {stats && <div className="grid-3 mb-12">
        <div className="stat-card"><div className="card-title">總活存</div><div className="text-lg">${(stats.totalSavings||0).toLocaleString()}</div></div>
        <div className="stat-card"><div className="card-title">員工</div><div className="text-lg">{stats.employees}</div></div>
        <div className="stat-card"><div className="card-title">排行榜</div><div className="text-lg">{stats.leaderboard_count||0} 人</div></div>
      </div>}
      <div className="card">
        <div className="card-title">所有使用者 ({users.length})</div>
        <div className="list-container">
          {(users || []).map(u => (
            <div className="list-row" key={u.id}>
              <span>#{u.id} {u.username} {u.role === 'admin' ? '⚙' : ''}</span>
              <span className="text-dim text-sm">💰${(u.cash||0).toLocaleString()} 🏦${(u.savings||0).toLocaleString()} 📈${(u.total_earned||0).toLocaleString()} 👥{u.employees}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
