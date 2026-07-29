import { useState, useEffect } from 'react'
import LoginGateway from './components/LoginGateway'

const API = ''
const NAV = [
  { id: 'dashboard', label: '📊 儀表板' },
  { id: 'income', label: '⬆️ 升級' },
  { id: 'bank', label: '🏦 銀行' },
  { id: 'invest', label: '💼 投資' },
  { id: 'employee', label: '👥 員工' },
  { id: 'company', label: '🏢 公司' },
  { id: 'stock', label: '📈 股票' },
  { id: 'contract', label: '📋 合約' },
]

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('eo_token'))
  const [view, setView] = useState('dashboard')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    if (urlToken) {
      window.history.replaceState({}, '', window.location.pathname)
      localStorage.setItem('eo_token', urlToken)
      setToken(urlToken); return
    }
    if (!token) { setLoading(false); return }
    fetch(API + '/api/me', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.json()).then(d => { setUser(d); setLoading(false) })
      .catch(() => { localStorage.removeItem('eo_token'); setToken(null); setLoading(false) })
  }, [token])

  const handleLogin = (newToken) => {
    localStorage.setItem('eo_token', newToken)
    setToken(newToken)
  }

  function api(path, body) {
    const opts = { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    if (token) opts.headers.Authorization = 'Bearer ' + token
    if (body) opts.body = JSON.stringify(body)
    return fetch(API + path, opts).then(r => r.json())
  }

  function logout() {
    localStorage.removeItem('eo_token'); setToken(null); setUser(null)
    window.location.href = '/'
  }

  if (!token) return <LoginGateway onLogin={handleLogin} />

  if (loading) return (
    <div className="login-gateway" style={{ justifyContent: 'center', alignItems: 'center', display: 'flex' }}>
      <div className="login-pixel-grid" />
      <div className="login-title">connecting...</div>
    </div>
  )

  const nav = [...NAV]
  if (user?.role === 'admin') nav.push({ id: 'admin', label: '⭐ 管理' })

  return (
    <div className="app-container">
      <div className="system-header">
        <div className="header-left">
          <span className="status-dot" />
          <span style={{ color: 'var(--accent-color)', letterSpacing: 1, fontWeight: 700 }}>earthonline</span>
          <span className="text-dim" style={{ fontSize: '0.78rem' }}>💰 ${(user?.cash || 0).toLocaleString()}</span>
        </div>
        <div className="header-right">
          <span className="text-dim" style={{ fontSize: '0.78rem' }}>
            {user?.username}{user?.role === 'admin' ? <span style={{ color: 'var(--warning-color)', marginLeft: 4 }}>⭐</span> : ''}
          </span>
          <button className="btn small danger" onClick={logout}>exit</button>
        </div>
      </div>
      <div className="main-content">
        <div className="sidebar">
          <div className="nav-group-title">navigation</div>
          {nav.map(item => (
            <button key={item.id} className={`nav-btn ${view === item.id ? 'active' : ''}`}
              onClick={() => setView(item.id)}>{item.label}</button>
          ))}
        </div>
        <div className="content-area">
          {view === 'dashboard' && <Dashboard user={user} api={api} />}
          {view === 'income' && <Income api={api} />}
          {view === 'bank' && <Bank api={api} />}
          {view === 'invest' && <Invest api={api} />}
          {view === 'employee' && <Employee api={api} />}
          {view === 'company' && <Company api={api} />}
          {view === 'stock' && <Stock api={api} />}
          {view === 'contract' && <Contract api={api} />}
          {view === 'admin' && <AdminPanel api={api} />}
        </div>
      </div>
    </div>
  )
}

function Dashboard({ user, api }) {
  const [quote, setQuote] = useState(null)
  const [holdings, setHoldings] = useState([])
  useEffect(() => { api('/api/stock/quote').then(setQuote).catch(()=>{}); api('/api/stock/holdings').then(d=>setHoldings(Array.isArray(d)?d:[])).catch(()=>{}) }, [])
  const stockValue = holdings.reduce((s, h) => s + (quote?.price || 100) * h.quantity, 0)
  const total = (user?.cash || 0) + (user?.savings || 0) + (user?.bank || 0) + stockValue
  return (
    <div>
      <div className="grid-3 mb-8">
        <div className="panel"><div className="panel-title">可用現金</div><div className="stat-value" style={{fontSize:'1.5rem'}}>${(user?.cash || 0).toLocaleString()}</div></div>
        <div className="panel"><div className="panel-title">總資產</div><div className="stat-value" style={{fontSize:'1.5rem'}}>${total.toLocaleString()}</div></div>
        <div className="panel"><div className="panel-title">累計賺取</div><div className="stat-value" style={{fontSize:'1.5rem'}}>${(user?.total_earned || 0).toLocaleString()}</div></div>
      </div>
      <div className="grid-2 mb-8">
        <div className="panel">
          <div className="panel-title">資產分布</div>
          <div className="stat-row"><span className="stat-label">活存</span><span className="stat-value">${(user?.savings || 0).toLocaleString()}</span></div>
          <div className="stat-row"><span className="stat-label">定存</span><span className="stat-value">${(user?.bank || 0).toLocaleString()}</span></div>
          <div className="stat-row"><span className="stat-label">股票</span><span className="stat-value">${stockValue.toLocaleString()}</span></div>
        </div>
        <div className="panel">
          <div className="panel-title">升級狀態</div>
          {user?.levels ? <>
            <div className="stat-row"><span className="stat-label">電腦</span><span className="stat-value">Lv.{user.levels.computer}</span></div>
            <div className="stat-row"><span className="stat-label">伺服器</span><span className="stat-value">Lv.{user.levels.server}</span></div>
            <div className="stat-row"><span className="stat-label">AI 助手</span><span className="stat-value">Lv.{user.levels.ai_assistant}</span></div>
          </> : <div className="text-dim">無資料</div>}
        </div>
      </div>
    </div>
  )
}

function Income({ api }) {
  const [info, setInfo] = useState(null)
  useEffect(() => { api('/api/income/info').then(setInfo) }, [])
  async function up(item) {
    const r = await api('/api/income/upgrade', { item })
    if (r.success) api('/api/income/info').then(setInfo)
  }
  if (!info) return <div className="text-dim">loading...</div>
  return (
    <div>
      <div className="panel"><div className="panel-title">收入/分</div><div className="stat-value" style={{fontSize:'1.5rem'}}>${info.income || 0}</div></div>
      {Object.entries(info.upgrades || {}).map(([k, v]) => (
        <div className="card flex justify-between items-center" key={k}>
          <div><div className="text-accent">{k}</div><div className="text-sm text-dim">Lv.{v ? v.nextLevel-1 : '?'} → Lv.{v?.nextLevel||'MAX'} {v ? `· $${v.cost}` : ''}</div></div>
          {v && <button className="btn primary small" onClick={() => up(k)}>升級</button>}
        </div>
      ))}
    </div>
  )
}

function Bank({ api }) {
  async function handle(e, path) {
    e.preventDefault(); const fd = new FormData(e.target); const a = parseInt(fd.get('amount'))
    if (!a) return; const r = await api(path, { amount: a }); alert(r.success ? 'success' : r.error)
  }
  return (
    <div>
      <div className="panel">
        <div className="panel-title">活期存款 · 0.05%/分</div>
        <form onSubmit={e => handle(e, '/api/bank/deposit')} className="flex gap-8 mt-8">
          <input name="amount" placeholder="存入金額" style={{flex:1}} /><button className="btn primary small">存入</button>
        </form>
        <form onSubmit={e => handle(e, '/api/bank/withdraw')} className="flex gap-8 mt-8">
          <input name="amount" placeholder="提取金額" style={{flex:1}} /><button className="btn small">提取</button>
        </form>
      </div>
      <div className="panel">
        <div className="panel-title">貸款 · 0.15%/分</div>
        <form onSubmit={e => handle(e, '/api/bank/borrow')} className="flex gap-8 mt-8">
          <input name="amount" placeholder="借款金額" style={{flex:1}} /><button className="btn small">借款</button>
        </form>
      </div>
    </div>
  )
}

function Invest({ api }) {
  const [types, setTypes] = useState([])
  useEffect(() => { api('/api/investment/types').then(setTypes) }, [])
  async function inv(type) {
    const a = prompt('投入金額:'); if (!a) return; const r = await api('/api/investment/invest', { type, amount: parseInt(a) })
    alert(r.success ? 'success' : r.error)
  }
  return (
    <div>{types.map(t => (
      <div className="card flex justify-between items-center" key={t.type}>
        <div><div className="text-accent">{t.label}</div><div className="text-sm text-dim">{t.rateMin*100}~{t.rateMax*100}%/分</div></div>
        {t.unlocked ? <button className="btn small" onClick={() => inv(t.type)}>投資</button>
          : <span className="text-dim text-sm">需 ${t.unlockEarned.toLocaleString()}</span>}
      </div>
    ))}</div>
  )
}

function Employee({ api }) {
  const [employees, setEmployees] = useState([])
  const [positions, setPositions] = useState([])
  useEffect(() => { api('/api/employee/list').then(d=>setEmployees(Array.isArray(d)?d:[])).catch(()=>{}) }, [])
  useEffect(() => { api('/api/employee/positions').then(d=>setPositions(Array.isArray(d)?d:[])).catch(()=>{}) }, [])
  async function hire(pos) {
    const r = await api('/api/employee/hire', { position: pos })
    if (r.success) api('/api/employee/list').then(d=>setEmployees(Array.isArray(d)?d:[])); else alert(r.error)
  }
  return (
    <div>
      <div className="panel">
        <div className="panel-title">僱用</div>
        <div className="grid-2">{positions.map(p => (
          <div className="card" key={p.position}>
            <div className="text-accent">{p.label}</div>
            <div className="text-sm text-dim">費 ${p.hireCost} · 薪 ${p.salary}/分 · +{p.output}/分</div>
            <button className="btn small mt-8" onClick={() => hire(p.position)}>僱用</button>
          </div>
        ))}</div>
      </div>
      <div className="panel">
        <div className="panel-title">員工 ({employees.length})</div>
        {employees.map(e => (
          <div className="card flex justify-between" key={e.id}>
            <span className="text-accent">{e.position}</span>
            <span className="text-dim text-sm">效 {e.efficiency.toFixed(2)} · 士氣 {e.morale} · ${e.salary}/分</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Company({ api }) {
  const [companies, setCompanies] = useState([])
  useEffect(() => { api('/api/company/list').then(d=>setCompanies(Array.isArray(d)?d:[])).catch(()=>{}) }, [])
  async function create() {
    const name = prompt('公司名:'); if (!name) return
    const r = await api('/api/company/create', { name, industry: 'tech' })
    if (r.success) api('/api/company/list').then(d=>setCompanies(Array.isArray(d)?d:[])); else alert(r.error)
  }
  return (
    <div>
      <button className="btn primary" onClick={create}>+ 創建 ($50,000)</button>
      {companies.map(c => (
        <div className="card mt-8" key={c.id}>
          <div className="flex justify-between"><span className="text-accent">{c.name}</span><span className="text-dim text-sm">{c.industry}</span></div>
          <div className="text-sm text-dim mt-8">利潤 <span className="text-accent">${c.profit||0}/分</span></div>
        </div>
      ))}
    </div>
  )
}

function Stock({ api }) {
  const [quote, setQuote] = useState(null); const [holdings, setHoldings] = useState([])
  const [trades, setTrades] = useState([]); const [ipo, setIpo] = useState(null)
  useEffect(() => {
    api('/api/stock/quote').then(setQuote).catch(()=>{}); api('/api/stock/holdings').then(d=>setHoldings(Array.isArray(d)?d:[])).catch(()=>{})
    api('/api/stock/trades').then(d=>setTrades(Array.isArray(d)?d:[])).catch(()=>{}); api('/api/stock/ipo/info').then(setIpo).catch(()=>{})
  }, [])
  async function buy() { const q = prompt('股數:'); if (!q) return; const r = await api('/api/stock/buy', {quantity:parseInt(q)}); if(r.success){api('/api/stock/quote').then(setQuote);api('/api/stock/holdings').then(setHoldings);api('/api/stock/trades').then(setTrades)}else alert(r.error) }
  async function sell() { const q = prompt('股數:'); if (!q) return; const r = await api('/api/stock/sell', {quantity:parseInt(q)}); if(r.success){api('/api/stock/quote').then(setQuote);api('/api/stock/holdings').then(setHoldings);api('/api/stock/trades').then(setTrades)}else alert(r.error) }
  return (
    <div>
      {ipo?.phase === 'ipo' && <div className="panel" style={{borderColor:'var(--warning-color)'}}>
        <div className="panel-title" style={{color:'var(--warning-color)'}}>🚀 IPO 認購中</div>
        <div className="text-sm text-dim">$100/股 · {ipo.subscribed}/300,000</div>
        <button className="btn small mt-8" onClick={async()=>{const s=prompt('股數:');if(!s)return;const r=await api('/api/stock/ipo/subscribe',{shares:parseInt(s)});if(r.success){api('/api/stock/ipo/info').then(setIpo);alert(`認購 ${s} 股成功`)}else alert(r.error)}}>認購</button>
      </div>}
      <div className="panel">
        <div className="panel-title">地球互動科技 001</div>
        {quote && <div>
          <div className="grid-2">
            <div><div className="stat-row"><span className="stat-label">當前價</span><span className="stat-value" style={{fontSize:'1.2rem'}}>${quote.price}</span></div>
              <div className="stat-row"><span className="stat-label">買/賣</span><span className="stat-value">${quote.buyPrice} / ${quote.sellPrice}</span></div></div>
            <div><div className="stat-row"><span className="stat-label">流通</span><span className="stat-value">{quote.circulating?.toLocaleString()}</span></div>
              <div className="stat-row"><span className="stat-label">庫存</span><span className="stat-value">{quote.systemInventory?.toLocaleString()}</span></div></div>
          </div>
          <div className="flex gap-8 mt-8"><button className="btn primary small" onClick={buy}>買入</button><button className="btn small" onClick={sell}>賣出</button></div>
        </div>}
      </div>
      <div className="grid-2">
        <div className="panel"><div className="panel-title">持倉</div>
          {holdings.map(h => <div className="card text-sm" key={h.company_id}>公司 {h.company_id}: {h.quantity} 股</div>)}
          {holdings.length === 0 && <div className="text-dim text-sm">無持股</div>}</div>
        <div className="panel"><div className="panel-title">近期成交</div>
          {trades.slice(0, 10).map(t => <div className="card text-sm flex justify-between" key={t.id}><span>{t.type === 'buy' ? '🟢' : '🔴'} ${t.price}</span><span className="text-dim">{t.quantity} 股</span></div>)}</div>
      </div>
    </div>
  )
}

function Contract({ api }) {
  const [contracts, setContracts] = useState([]); const [mine, setMine] = useState([])
  useEffect(() => { api('/api/contract/list').then(d=>setContracts(Array.isArray(d)?d:[])).catch(()=>{}); api('/api/contract/mine').then(d=>setMine(Array.isArray(d)?d:[])).catch(()=>{}) }, [])
  async function accept(id) {
    const r = await api('/api/contract/accept/' + id)
    if (r.success) { api('/api/contract/list').then(d=>setContracts(Array.isArray(d)?d:[])); api('/api/contract/mine').then(d=>setMine(Array.isArray(d)?d:[])) } else alert(r.error)
  }
  return (
    <div>
      <div className="panel"><div className="panel-title">合約列表</div>
        {contracts.map(c => <div className="card flex justify-between items-center" key={c.id}><div><span className="text-accent">{c.type}</span><span className="text-dim text-sm" style={{marginLeft:8}}>${c.reward}</span></div><button className="btn small" onClick={() => accept(c.id)}>接取</button></div>)}
      </div>
      <div className="panel"><div className="panel-title">進行中</div>
        {mine.map(m => <div className="card text-sm" key={m.contract_id}>{m.type} {m.completed ? '✅ 可領取' : '⏳ 進行中'}</div>)}
      </div>
    </div>
  )
}

function AdminPanel({ api }) {
  const [users, setUsers] = useState([]); const [stats, setStats] = useState(null)
  useEffect(() => { api('/api/admin/users').then(setUsers).catch(()=>{}); api('/api/admin/stats').then(setStats).catch(()=>{}) }, [])
  return (
    <div>
      {stats && <div className="grid-3 mb-8">
        <div className="panel"><div className="panel-title">玩家</div><div className="stat-value" style={{fontSize:'1.5rem'}}>{stats.users}</div></div>
        <div className="panel"><div className="panel-title">總現金</div><div className="stat-value" style={{fontSize:'1.5rem'}}>${stats.totalCash?.toLocaleString()}</div></div>
        <div className="panel"><div className="panel-title">系統庫存</div><div className="stat-value" style={{fontSize:'1.5rem'}}>{stats.systemReserve?.stock_inventory?.toLocaleString()} 股</div></div>
      </div>}
      <div className="panel"><div className="panel-title">所有使用者</div>
        {users.map(u => <div className="card text-sm flex justify-between" key={u.id}>
          <span>#{u.id} {u.username} {u.role === 'admin' ? '⭐' : ''}</span>
          <span className="text-dim">💰${u.cash?.toLocaleString()} 🏦${u.savings?.toLocaleString()} 👥{u.employees} 📊{u.stocks}</span>
        </div>)}
      </div>
    </div>
  )
}
