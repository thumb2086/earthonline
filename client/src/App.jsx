import { useState, useEffect } from 'react'
import LoginGateway from './components/LoginGateway'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('eo_token'))
  const [user, setUser] = useState(null)
  const [view, setView] = useState('dashboard')

  useEffect(() => {
    if (!token) return
    fetch('/api/me', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.json()).then(d => { setUser(d) })
      .catch(() => { localStorage.removeItem('eo_token'); setToken(null) })
  }, [token])

  function api(path, body) {
    const opts = { headers: { Authorization: 'Bearer ' + token } }
    if (body) { opts.method = 'POST'; opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json' }
    return fetch(path, opts).then(r => r.json())
  }

  const handleLogin = (t) => { localStorage.setItem('eo_token', t); setToken(t) }
  const logout = () => { localStorage.removeItem('eo_token'); setToken(null); setUser(null) }

  if (!token) return <LoginGateway onLogin={handleLogin} />

  const tabs = [
    { id: 'dashboard', label: '📊 儀表板' },
    { id: 'income', label: '⬆️ 升級' },
    { id: 'bank', label: '🏦 銀行' },
    { id: 'invest', label: '💼 投資' },
    { id: 'employee', label: '👥 員工' },
    { id: 'company', label: '🏢 公司' },
    { id: 'stock', label: '📈 股票' },
    { id: 'contract', label: '📋 合約' },
  ]
  if (user?.role === 'admin') tabs.push({ id: 'admin', label: '⭐ 管理' })

  return (
    <div className="app-container">
      <div className="system-header">
        <div className="header-left">
          <span className="status-dot" />
          <span style={{ color: 'var(--accent-color)', letterSpacing: 1, fontWeight: 700 }}>earthonline</span>
          <span className="text-dim text-sm">💰 {(user?.cash || 0).toLocaleString()}</span>
        </div>
        <div className="header-right">
          <span className="text-dim text-sm">{user?.username}{user?.role === 'admin' ? ' ⭐' : ''}</span>
          <button className="btn small danger" onClick={logout}>exit</button>
        </div>
      </div>
      <div className="main-content">
        <div className="sidebar">
          <div className="nav-group-title">navigation</div>
          {tabs.map(t => (
            <button key={t.id} className={`nav-btn ${view === t.id ? 'active' : ''}`}
              onClick={() => setView(t.id)}>{t.label}</button>
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
  const [data, setData] = useState({ quote: null, holdings: [] })
  useEffect(() => {
    api('/api/stock/quote').then(d => setData(p => ({ ...p, quote: d }))).catch(()=>{})
    api('/api/stock/holdings').then(d => setData(p => ({ ...p, holdings: Array.isArray(d) ? d : [] }))).catch(()=>{})
  }, [])
  const sv = (data.holdings || []).reduce((s, h) => s + (data.quote?.price || 100) * h.quantity, 0)
  const total = (user?.cash || 0) + (user?.savings || 0) + (user?.bank || 0) + sv

  return (
    <div>
      <div className="grid-3 mb-8">
        <div className="panel"><div className="panel-title">可用現金</div><div className="value-lg">${(user?.cash || 0).toLocaleString()}</div></div>
        <div className="panel"><div className="panel-title">總資產</div><div className="value-lg">${total.toLocaleString()}</div></div>
        <div className="panel"><div className="panel-title">累計賺取</div><div className="value-lg">${(user?.total_earned || 0).toLocaleString()}</div></div>
      </div>
      <div className="grid-2 mb-8">
        <div className="panel">
          <div className="panel-title">資產分布</div>
          <div className="stat-row"><span className="stat-label">活存</span><span className="stat-value">${(user?.savings || 0).toLocaleString()}</span></div>
          <div className="stat-row"><span className="stat-label">定存</span><span className="stat-value">${(user?.bank || 0).toLocaleString()}</span></div>
          <div className="stat-row"><span className="stat-label">股票</span><span className="stat-value">${sv.toLocaleString()}</span></div>
          {data.quote && <div className="stat-row"><span className="stat-label">001 股價</span><span className="stat-value">${data.quote.price}</span></div>}
        </div>
        <div className="panel">
          <div className="panel-title">升級</div>
          {user?.levels ? <>
            <div className="stat-row"><span className="stat-label">電腦</span><span className="stat-value">Lv.{user.levels.computer}</span></div>
            <div className="stat-row"><span className="stat-label">伺服器</span><span className="stat-value">Lv.{user.levels.server}</span></div>
            <div className="stat-row"><span className="stat-label">AI 助手</span><span className="stat-value">Lv.{user.levels.ai_assistant}</span></div>
          </> : <div className="text-dim">載入中...</div>}
        </div>
      </div>
    </div>
  )
}

function Income({ api }) {
  const [info, setInfo] = useState(null)
  useEffect(() => { api('/api/income/info').then(setInfo) }, [])
  const up = async (item) => { const r = await api('/api/income/upgrade', { item }); if (r.success) api('/api/income/info').then(setInfo) }
  if (!info) return <div className="text-dim p-16">載入中...</div>
  return (
    <div>
      <div className="panel"><div className="panel-title">收入/分</div><div className="value-lg">${info.income || 0}</div></div>
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
  const act = async (e, path) => {
    e.preventDefault(); const fd = new FormData(e.target); const a = parseInt(fd.get('amount'))
    if (!a) return; const r = await api(path, { amount: a }); alert(r.success ? 'success' : r.error)
  }
  return (
    <div>
      <div className="panel"><div className="panel-title">活期存款 · 0.05%/分</div>
        <form onSubmit={e => act(e, '/api/bank/deposit')} className="flex gap-8 mt-8">
          <input name="amount" placeholder="金額" style={{flex:1}} /><button className="btn primary small">存入</button></form>
        <form onSubmit={e => act(e, '/api/bank/withdraw')} className="flex gap-8 mt-8">
          <input name="amount" placeholder="金額" style={{flex:1}} /><button className="btn small">提取</button></form>
      </div>
      <div className="panel"><div className="panel-title">貸款 · 0.15%/分</div>
        <form onSubmit={e => act(e, '/api/bank/borrow')} className="flex gap-8 mt-8">
          <input name="amount" placeholder="金額" style={{flex:1}} /><button className="btn small">借款</button></form>
      </div>
    </div>
  )
}

function Invest({ api }) {
  const [types, setTypes] = useState([])
  useEffect(() => { api('/api/investment/types').then(setTypes) }, [])
  const inv = async (type) => { const a = prompt('金額:'); if (!a) return; const r = await api('/api/investment/invest', { type, amount: parseInt(a) }); alert(r.success ? 'success' : r.error) }
  return (
    <div>{(types || []).map(t => (
      <div className="card flex justify-between items-center" key={t.type}>
        <div><div className="text-accent">{t.label}</div><div className="text-sm text-dim">{t.rateMin*100}~{t.rateMax*100}%/分</div></div>
        {t.unlocked ? <button className="btn small" onClick={() => inv(t.type)}>投資</button>
          : <span className="text-dim text-sm">需 ${(t.unlockEarned || 0).toLocaleString()}</span>}
      </div>
    ))}</div>
  )
}

function Employee({ api }) {
  const [employees, setEmployees] = useState([])
  const [positions, setPositions] = useState([])
  useEffect(() => { api('/api/employee/list').then(d => setEmployees(Array.isArray(d)?d:[])) }, [])
  useEffect(() => { api('/api/employee/positions').then(d => setPositions(Array.isArray(d)?d:[])) }, [])
  const hire = async (pos) => { const r = await api('/api/employee/hire', { position: pos }); if (r.success) api('/api/employee/list').then(d => setEmployees(Array.isArray(d)?d:[])); else alert(r.error) }
  return (
    <div>
      <div className="panel"><div className="panel-title">僱用</div>
        <div className="grid-2">{(positions || []).map(p => (
          <div className="card" key={p.position}>
            <div className="text-accent">{p.label}</div>
            <div className="text-sm text-dim">費 ${p.hireCost} · 薪 ${p.salary}/分 · +{p.output}/分</div>
            <button className="btn small mt-8" onClick={() => hire(p.position)}>僱用</button></div>
        ))}</div>
      </div>
      <div className="panel"><div className="panel-title">員工 ({(employees || []).length})</div>
        {(employees || []).map(e => (
          <div className="card flex justify-between" key={e.id}>
            <span className="text-accent">{e.position}</span>
            <span className="text-dim text-sm">效 {e.efficiency.toFixed(2)} · 士氣 {e.morale}</span></div>
        ))}
      </div>
    </div>
  )
}

function Company({ api }) {
  const [cs, setCs] = useState([])
  useEffect(() => { api('/api/company/list').then(d => setCs(Array.isArray(d)?d:[])) }, [])
  const create = async () => { const n = prompt('公司名:'); if (!n) return; const r = await api('/api/company/create', { name: n, industry: 'tech' }); if (r.success) api('/api/company/list').then(d => setCs(Array.isArray(d)?d:[])); else alert(r.error) }
  return (
    <div>
      <button className="btn primary" onClick={create}>+ 創建 ($50,000)</button>
      {(cs || []).map(c => <div className="card mt-8" key={c.id}>
        <div className="flex justify-between"><span className="text-accent">{c.name}</span><span className="text-dim text-sm">{c.industry}</span></div>
        <div className="text-sm text-dim mt-8">利潤 <span className="text-accent">${c.profit||0}/分</span></div>
      </div>)}
    </div>
  )
}

function Stock({ api }) {
  const [q, setQ] = useState(null); const [h, setH] = useState([]); const [t, setT] = useState([]); const [ipo, setIpo] = useState(null)
  useEffect(() => { api('/api/stock/quote').then(setQ); api('/api/stock/holdings').then(d => setH(Array.isArray(d)?d:[])); api('/api/stock/trades').then(d => setT(Array.isArray(d)?d:[])); api('/api/stock/ipo/info').then(setIpo) }, [])
  const buy = async () => { const n = prompt('股數:'); if (!n) return; const r = await api('/api/stock/buy', { quantity: parseInt(n) }); if (r.success) { api('/api/stock/quote').then(setQ); api('/api/stock/holdings').then(setH); api('/api/stock/trades').then(setT) } else alert(r.error) }
  const sell = async () => { const n = prompt('股數:'); if (!n) return; const r = await api('/api/stock/sell', { quantity: parseInt(n) }); if (r.success) { api('/api/stock/quote').then(setQ); api('/api/stock/holdings').then(setH); api('/api/stock/trades').then(setT) } else alert(r.error) }
  return (
    <div>
      {ipo?.phase === 'ipo' && <div className="panel" style={{borderColor:'var(--warning-color)'}}>
        <div className="panel-title" style={{color:'var(--warning-color)'}}>🚀 IPO 認購中</div>
        <div className="text-sm text-dim">$100/股 · {ipo.subscribed}/300,000</div>
        <button className="btn small mt-8" onClick={async()=>{const s=prompt('股數:');if(!s)return;const r=await api('/api/stock/ipo/subscribe',{shares:parseInt(s)});if(r.success){api('/api/stock/ipo/info').then(setIpo);alert(`認購 ${s} 股成功`)}else alert(r.error)}}>認購</button>
      </div>}
      <div className="panel">
        <div className="panel-title">地球互動科技 001</div>
        {q && <div>
          <div className="grid-2">
            <div><div className="stat-row"><span className="stat-label">價</span><span className="stat-value" style={{fontSize:'1.2rem'}}>${q.price}</span></div>
              <div className="stat-row"><span className="stat-label">買/賣</span><span className="stat-value">${q.buyPrice} / ${q.sellPrice}</span></div></div>
            <div><div className="stat-row"><span className="stat-label">流通</span><span className="stat-value">{(q.circulating||0).toLocaleString()}</span></div>
              <div className="stat-row"><span className="stat-label">庫存</span><span className="stat-value">{(q.systemInventory||0).toLocaleString()}</span></div></div>
          </div>
          <div className="flex gap-8 mt-8"><button className="btn primary small" onClick={buy}>買</button><button className="btn small" onClick={sell}>賣</button></div>
        </div>}
      </div>
      <div className="grid-2">
        <div className="panel"><div className="panel-title">持倉</div>
          {(h || []).map(x => <div className="card text-sm" key={x.company_id}>公司 {x.company_id}: {x.quantity} 股</div>)}
          {(!h || h.length === 0) && <div className="text-dim text-sm">無持股</div>}</div>
        <div className="panel"><div className="panel-title">成交</div>
          {(t || []).slice(0,10).map(x => <div className="card text-sm flex justify-between" key={x.id}><span>{x.type === 'buy' ? '🟢' : '🔴'} ${x.price}</span><span className="text-dim">{x.quantity} 股</span></div>)}</div>
      </div>
    </div>
  )
}

function Contract({ api }) {
  const [cs, setCs] = useState([]); const [mine, setMine] = useState([])
  useEffect(() => { api('/api/contract/list').then(d => setCs(Array.isArray(d)?d:[])); api('/api/contract/mine').then(d => setMine(Array.isArray(d)?d:[])) }, [])
  const accept = async (id) => { const r = await api('/api/contract/accept/' + id); if (r.success) { api('/api/contract/list').then(d => setCs(Array.isArray(d)?d:[])); api('/api/contract/mine').then(d => setMine(Array.isArray(d)?d:[])) } else alert(r.error) }
  return (
    <div>
      <div className="panel"><div className="panel-title">合約</div>
        {(cs || []).map(c => <div className="card flex justify-between items-center" key={c.id}><div><span className="text-accent">{c.type}</span><span className="text-dim text-sm" style={{marginLeft:8}}>${c.reward}</span></div><button className="btn small" onClick={() => accept(c.id)}>接取</button></div>)}
      </div>
      <div className="panel"><div className="panel-title">進行中</div>
        {(mine || []).map(m => <div className="card text-sm" key={m.contract_id}>{m.type} {m.completed ? '✅ 可領取' : '⏳'}</div>)}
      </div>
    </div>
  )
}

function AdminPanel({ api }) {
  const [users, setUsers] = useState([]); const [stats, setStats] = useState(null)
  useEffect(() => { api('/api/admin/users').then(d => setUsers(Array.isArray(d)?d:[])); api('/api/admin/stats').then(setStats) }, [])
  return (
    <div>
      {stats && <div className="grid-3 mb-8">
        <div className="panel"><div className="panel-title">玩家</div><div className="value-lg">{stats.users}</div></div>
        <div className="panel"><div className="panel-title">總現金</div><div className="value-lg">${(stats.totalCash||0).toLocaleString()}</div></div>
        <div className="panel"><div className="panel-title">庫存</div><div className="value-lg">{(stats.systemReserve?.stock_inventory||0).toLocaleString()} 股</div></div>
      </div>}
      <div className="panel"><div className="panel-title">使用者</div>
        {(users || []).map(u => <div className="card text-sm flex justify-between" key={u.id}>
          <span>#{u.id} {u.username} {u.role === 'admin' ? '⭐' : ''}</span>
          <span className="text-dim">💰${(u.cash||0).toLocaleString()} 🏦${(u.savings||0).toLocaleString()} 👥{u.employees} 📊{u.stocks}</span>
        </div>)}
      </div>
    </div>
  )
}
