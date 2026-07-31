import { useState, useEffect } from 'react'
import LoginGateway from './components/LoginGateway'
import { useToast } from './components/Toast.jsx'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('eo_token'))
  const [user, setUser] = useState(null)
  const [view, setView] = useState('dashboard')
  const [rev, setRev] = useState(0)
  const { toast, prompt } = useToast()

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

  async function api(path, body) {
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
    { id: 'dashboard', label: '📊 儀表板' },
    { id: 'income', label: '⬆️ 升級' },
    { id: 'bank', label: '🏦 銀行' },
    { id: 'invest', label: '💼 投資' },
    { id: 'company', label: '🏢 公司' },
    { id: 'stock', label: '📈 股票' },
    { id: 'contract', label: '📋 合約' },
    { id: 'leaderboard', label: '🏆 排行' },
  ]
  if (user?.role === 'admin') tabs.push({ id: 'admin', label: '⭐ 管理' })

  const act = async (e, path) => {
    e.preventDefault(); const fd = new FormData(e.target); const a = parseInt(fd.get('amount'))
    if (!a) return; const r = await api(path, { amount: a }); toast(r.success ? '成功' : r.error, r.success ? 'success' : 'error')
  }

  return (
    <div className="app">
      <div className="topbar">
        <div className="topbar-left">
          <span className="logo">earthonline</span>
          <span className="badge">💰 {(user?.cash ?? 0).toLocaleString()}</span>
          <span className="badge">🏦 {(user?.savings ?? 0).toLocaleString()}</span>
          <span className="badge badge-danger">📈 {(user?.total_earned ?? 0).toLocaleString()}</span>
        </div>
        <div className="topbar-right">
          <span className="text-dim" style={{fontWeight:500}}>{user?.username ?? '載入中...'}{user?.role === 'admin' ? ' ⭐' : ''}</span>
          <button className="btn btn-sm btn-danger" onClick={logout}>登出</button>
        </div>
      </div>
      <div className="body">
        <div className="sidebar">
          {tabs.map(t => (
            <button key={t.id} className={`tab ${view === t.id ? 'active' : ''}`}
              onClick={() => setView(t.id)}>{t.label}</button>
          ))}
        </div>
        <div className="content">
          {view === 'dashboard' && <Dashboard user={user} api={api} />}
          {view === 'income' && <Income api={api} toast={toast} />}
          {view === 'bank' && <Bank act={act} />}
          {view === 'invest' && <Invest api={api} toast={toast} prompt={prompt} />}
          {view === 'company' && <Company api={api} toast={toast} prompt={prompt} />}
          {view === 'stock' && <Stock api={api} toast={toast} prompt={prompt} />}
          {view === 'contract' && <Contract api={api} toast={toast} />}
          {view === 'leaderboard' && <Leaderboard api={api} />}
          {view === 'admin' && <AdminPanel api={api} />}
        </div>
      </div>
    </div>
  )
}

function Dashboard({ user, api }) {
  const [data, setData] = useState({})
  const [showOffline, setShowOffline] = useState(true)
  useEffect(() => {
    api('/api/stock/quote').then(d => setData(p => ({ ...p, q: d }))).catch(()=>{})
    api('/api/stock/holdings').then(d => setData(p => ({ ...p, h: Array.isArray(d) ? d : [] }))).catch(()=>{})
  }, [])
  const sv = (data.h || []).reduce((s, h) => s + (data.q?.price || 100) * h.quantity, 0)
  const total = (user?.cash || 0) + (user?.savings || 0) + (user?.bank || 0) + sv + (user?.pendingInterest || 0)
  return (
    <>
      {(user?.offlineEarnings > 0 && showOffline) && <div className="card mb-12" style={{borderColor:'var(--accent)',background:'rgba(0,255,65,0.05)'}}>
        <div className="flex justify-between items-center">
          <div><span className="text-accent" style={{fontWeight:600}}>⚡ 離線收益</span>
          <div className="text-dim text-sm">上線後收入減半 · 獲得 <span className="text-accent">${user.offlineEarnings.toLocaleString()}</span></div></div>
          <button className="btn btn-sm" onClick={() => setShowOffline(false)}>收起</button>
        </div>
      </div>}
      <div className="grid-3 mb-12">
        <div className="card"><div className="card-title">可用現金</div><div className="text-lg">${(user?.cash || 0).toLocaleString()}</div></div>
        <div className="card"><div className="card-title">總資產</div><div className="text-lg">${total.toLocaleString()}</div></div>
        <div className="card"><div className="card-title">累計賺取</div><div className="text-lg">${(user?.total_earned || 0).toLocaleString()}</div></div>
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-title">資產分布</div>
          <div className="stat"><span className="stat-label">活存</span><span className="stat-value">${(user?.savings || 0).toLocaleString()}</span></div>
          <div className="stat"><span className="stat-label">定存</span><span className="stat-value">${(user?.bank || 0).toLocaleString()}</span></div>
          <div className="stat"><span className="stat-label">股票</span><span className="stat-value">${sv.toLocaleString()}</span></div>
          {data.q && <div className="stat"><span className="stat-label">001 股價</span><span className="stat-value">${data.q.price}</span></div>}
        </div>
        <div className="card">
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

function Income({ api, toast }) {
  const [info, setInfo] = useState(null)
  useEffect(() => { api('/api/income/info').then(setInfo) }, [])
  const up = async (item) => { const r = await api('/api/income/upgrade', { item }); if (r.success) { api('/api/income/info').then(setInfo); toast('升級成功', 'success') } else toast(r.error, 'error') }
  if (!info) return <div className="text-dim">載入中...</div>
  return (
    <>
      <div className="stat-card mb-12">
        <div className="card-title">每分鐘收入</div>
        <div className="text-lg">${info.income || 0}</div>
        <div className="text-dim text-sm" style={{marginTop:4}}>離線時收入減半（50%）</div>
      </div>
      <div className="grid-2">
        {Object.entries(info.upgrades || {}).map(([k, v]) => (
          <div className="card flex justify-between items-center" key={k}>
            <div>
              <div className="text-accent font-bold">{k === 'computer' ? '電腦' : k === 'server' ? '伺服器' : 'AI 助手'}</div>
              <div className="text-dim text-sm" style={{marginTop:4}}>
                等級 {v ? v.nextLevel-1 : 'MAX'} → {v?.nextLevel || 'MAX'}
                {v ? ` · 費用 $${v.cost}` : ''}
              </div>
              {v && <div className="text-sm" style={{color:'var(--accent)',marginTop:2}}>+${v.gain}/分</div>}
            </div>
            {v && <button className="btn btn-primary btn-sm" onClick={() => up(k)}>升級</button>}
          </div>
        ))}
      </div>
    </>
  )
}

function Bank({ act }) {
  return (
    <div className="grid-2">
      <div className="card card-accent">
        <div className="card-title">活期存款 0.05%/分</div>
        <form onSubmit={e => act(e, '/api/bank/deposit')} className="flex gap-8 mt-12">
          <input name="amount" type="number" placeholder="存入金額" /><button className="btn btn-primary btn-sm">存入</button></form>
        <form onSubmit={e => act(e, '/api/bank/withdraw')} className="flex gap-8 mt-12">
          <input name="amount" type="number" placeholder="提取金額" /><button className="btn btn-sm">提取</button></form>
      </div>
      <div className="card card-warn">
        <div className="card-title">貸款 0.15%/分</div>
        <form onSubmit={e => act(e, '/api/bank/borrow')} className="flex gap-8 mt-12">
          <input name="amount" type="number" placeholder="借款金額" /><button className="btn btn-sm">借款</button></form>
      </div>
    </div>
  )
}

function Invest({ api, toast, prompt }) {
  const [types, setTypes] = useState([])
  const [investments, setInvestments] = useState([])
  const [amounts, setAmounts] = useState({})
  const labels = { deposit: '定存', bond: '債券', index_fund: '指數基金', real_estate: '房地產', startup: '新創投資' }
  useEffect(() => { api('/api/investment/types').then(setTypes); api('/api/investment/list').then(d => setInvestments(Array.isArray(d)?d:[])) }, [])
  const inv = async (type) => {
    const a = parseInt(amounts[type]); if (!a || a <= 0) return
    const r = await api('/api/investment/invest', { type, amount: a })
    if (r.success) { setAmounts(p => ({...p, [type]: ''})); api('/api/investment/types').then(setTypes); api('/api/investment/list').then(d => setInvestments(Array.isArray(d)?d:[])); toast('投資成功', 'success') }
    else toast(r.error, 'error')
  }
  const withdraw = async (id) => {
    const r = await api('/api/investment/withdraw', { investmentId: id })
    if (r.success) { api('/api/investment/list').then(d => setInvestments(Array.isArray(d)?d:[])); toast(`已贖回 $${r.refund}`, 'success') }
    else toast(r.error, 'error')
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
            <span><span className="text-accent">{labels[inv.type] || inv.type}</span> · ${(inv.amount||0).toLocaleString()} {(inv.pending_interest||0) > 0 && <span className="text-dim text-sm">(+${(inv.pending_interest||0).toFixed(2)} 未結)</span>}</span>
            <button className="btn btn-sm" onClick={() => withdraw(inv.id)}>贖回</button>
          </div>
        ))}
      </div>}
    </>
  )
}

function Employee({ api, toast }) {
  const [employees, setEmployees] = useState([])
  const [positions, setPositions] = useState([])
  useEffect(() => { api('/api/employee/list').then(d => setEmployees(Array.isArray(d)?d:[])) }, [])
  useEffect(() => { api('/api/employee/positions').then(d => setPositions(Array.isArray(d)?d:[])) }, [])
  const hire = async (pos) => { const r = await api('/api/employee/hire', { position: pos }); if (r.success) { api('/api/employee/list').then(d => setEmployees(Array.isArray(d)?d:[])); toast('僱用成功', 'success') } else toast(r.error, 'error') }
  return (
    <>
      <div className="card mb-12"><div className="card-title">僱用</div>
        <div className="grid-2 gap-12 mt-12">{(positions || []).map(p => (
          <div className="card" key={p.position} style={{padding:14}}>
            <div className="text-accent" style={{fontWeight:600}}>{p.label}</div>
            <div className="text-dim text-sm mt-12">費 ${p.hireCost} · 薪 ${p.salary}/分 · +{p.output}/分</div>
            <button className="btn btn-sm mt-12" onClick={() => hire(p.position)}>僱用</button></div>
        ))}</div>
      </div>
      <div className="card"><div className="card-title">員工 ({(employees || []).length})</div>
        {(employees || []).map(e => <div className="stat" key={e.id}>
          <span className="text-accent" style={{fontWeight:600, fontSize:13}}>{e.position}</span>
          <span className="text-dim text-sm">效 {e.efficiency.toFixed(2)} · 士氣 {e.morale}</span></div>
        )}
      </div>
    </>
  )
}

function Company({ api, toast, prompt }) {
  const [cs, setCs] = useState([]); const [positions, setPositions] = useState([]); const [employees, setEmployees] = useState([])
  useEffect(() => { api('/api/company/list').then(d => setCs(Array.isArray(d)?d:[])) }, [])
  useEffect(() => { api('/api/employee/positions').then(d => setPositions(Array.isArray(d)?d:[])) }, [])
  useEffect(() => { api('/api/employee/list').then(d => setEmployees(Array.isArray(d)?d:[])) }, [])
  const create = () => prompt('公司名稱', async (name) => {
    const r = await api('/api/company/create', { name, industry: 'tech' })
    if (r.success) { api('/api/company/list').then(d => setCs(Array.isArray(d)?d:[])); toast('公司創建成功', 'success') }
    else toast(r.error, 'error')
  })
  const hire = async (pos) => { const r = await api('/api/employee/hire', { position: pos }); if (r.success) { api('/api/employee/list').then(d => setEmployees(Array.isArray(d)?d:[])); toast('僱用成功', 'success') } else toast(r.error, 'error') }
  return (
    <>
      <div className="card mb-12">
        <div className="flex justify-between items-center">
          <div className="card-title" style={{margin:0}}>我的公司</div>
          <button className="btn btn-primary btn-sm" onClick={create}>+ 創建 ($50,000)</button>
        </div>
      </div>
      {(cs || []).map(c => <div className="card mb-12" key={c.id}>
        <div className="flex justify-between"><span className="text-accent" style={{fontWeight:600}}>{c.name}</span><span className="text-dim text-sm">{c.industry}</span></div>
        <div className="divider" />
        <div className="stat"><span className="stat-label">利潤</span><span className="stat-value">${c.profit||0}/分</span></div>
      </div>)}
      {cs.length > 0 && <div className="card mb-12"><div className="card-title">👥 僱用員工</div>
        <div className="grid-2 gap-12 mt-12">{(positions || []).map(p => (
          <div className="card" key={p.position} style={{padding:14}}>
            <div className="text-accent" style={{fontWeight:600}}>{p.label}</div>
            <div className="text-dim text-sm mt-12">費 ${p.hireCost} · 薪 ${p.salary}/分 · +{p.output}/分</div>
            <button className="btn btn-sm mt-12" onClick={() => hire(p.position)}>僱用</button></div>
        ))}</div>
      </div>}
      {employees.length > 0 && <div className="card"><div className="card-title">我的員工 ({employees.length})</div>
        {(employees || []).map(e => <div className="stat" key={e.id}>
          <span className="text-accent" style={{fontWeight:600, fontSize:13}}>{e.position}</span>
          <span className="text-dim text-sm">效 {e.efficiency.toFixed(2)} · 士氣 {e.morale}</span></div>
        )}
      </div>}
    </>
  )
}

function Stock({ api, toast, prompt }) {
  const [q, setQ] = useState(null); const [h, setH] = useState([]); const [t, setT] = useState([]); const [ipo, setIpo] = useState(null)
  useEffect(() => { api('/api/stock/quote').then(setQ); api('/api/stock/holdings').then(d => setH(Array.isArray(d)?d:[])); api('/api/stock/trades').then(d => setT(Array.isArray(d)?d:[])); api('/api/stock/ipo/info').then(setIpo) }, [])
  const buy = () => prompt('買入股數', async (n) => { const r = await api('/api/stock/buy', { quantity: parseInt(n) }); if (r.success) { api('/api/stock/quote').then(setQ); api('/api/stock/holdings').then(setH); api('/api/stock/trades').then(setT); toast(`買入 ${n} 股`, 'success') } else toast(r.error, 'error') })
  const sell = () => prompt('賣出股數', async (n) => { const r = await api('/api/stock/sell', { quantity: parseInt(n) }); if (r.success) { api('/api/stock/quote').then(setQ); api('/api/stock/holdings').then(setH); api('/api/stock/trades').then(setT); toast(`賣出 ${n} 股`, 'success') } else toast(r.error, 'error') })
  const subIpo = () => prompt('認購股數', async (s) => { const r = await api('/api/stock/ipo/subscribe', { shares: parseInt(s) }); if (r.success) { api('/api/stock/ipo/info').then(setIpo); toast(`認購 ${s} 股成功`, 'success') } else toast(r.error, 'error') })
  return (
    <>
      {ipo?.phase === 'ipo' && <div className="card mb-12" style={{borderColor:'var(--warn)'}}>
        <div className="card-title" style={{color:'var(--warn)'}}>🚀 IPO 認購中 — 地球互動科技</div>
        <div className="text-dim mb-12">價格 $100/股 · 每人上限 1,000 股</div>
        <div style={{background:'var(--bg2)', borderRadius:6, height:8, marginBottom:8, overflow:'hidden'}}>
          <div style={{background:'var(--warn)', height:'100%', borderRadius:6, width:`${Math.min(100, (ipo.subscribed/30000)*100)}%`, transition:'width 0.3s'}} />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-accent">{(ipo.subscribed||0).toLocaleString()} / 30,000 股已認購</span>
          <span className="text-dim">{((ipo.subscribed/30000)*100).toFixed(1)}%</span>
        </div>
        <button className="btn btn-sm mt-12" onClick={subIpo}>認購</button>
      </div>}
      <div className="card mb-12"><div className="card-title">地球互動科技 001</div>
        {q && <><div className="grid-2 mt-12">
          <div><div className="stat"><span className="stat-label">價格</span><span className="stat-value" style={{fontSize:20}}>${q.price}</span></div>
            <div className="stat"><span className="stat-label">買/賣</span><span className="stat-value">${q.buyPrice} / ${q.sellPrice}</span></div></div>
          <div><div className="stat"><span className="stat-label">流通</span><span className="stat-value">{(q.circulating||0).toLocaleString()}</span></div>
            <div className="stat"><span className="stat-label">庫存</span><span className="stat-value">{(q.systemInventory||0).toLocaleString()}</span></div></div>
        </div>
        <div className="flex gap-8 mt-12"><button className="btn btn-primary btn-sm" onClick={buy}>買入</button><button className="btn btn-sm" onClick={sell}>賣出</button></div>
        </>}
      </div>
      <div className="grid-2">
        <div className="card"><div className="card-title">持倉</div>
          {(h || []).map(x => <div className="stat" key={x.company_id}><span className="stat-label">{x.company_name || '地球互動科技'}</span><span className="stat-value">{x.quantity} 股</span></div>)}
          {(!h || h.length === 0) && <div className="text-dim">無持股</div>}</div>
        <div className="card"><div className="card-title">成交紀錄</div>
          {(t || []).slice(0,10).map(x => <div className="stat" key={x.id}>
            <span><span style={{color: x.type === 'buy' ? 'var(--accent)' : 'var(--danger)'}}>{x.type === 'buy' ? '▲' : '▼'}</span> ${x.price}</span>
            <span className="stat-value">{x.quantity} 股</span></div>
          )}</div>
      </div>
    </>
  )
}

function Contract({ api, toast }) {
  const [cs, setCs] = useState([]); const [mine, setMine] = useState([])
  useEffect(() => { api('/api/contract/list').then(d => setCs(Array.isArray(d)?d:[])); api('/api/contract/mine').then(d => setMine(Array.isArray(d)?d:[])) }, [])
  const accept = async (id) => { const r = await api('/api/contract/accept/' + id); if (r.success) { api('/api/contract/list').then(d => setCs(Array.isArray(d)?d:[])); api('/api/contract/mine').then(d => setMine(Array.isArray(d)?d:[])); toast('已接取合約', 'success') } else toast(r.error, 'error') }
  return (
    <>
      <div className="card mb-12"><div className="card-title">合約</div>
        {(cs || []).map(c => <div className="stat" key={c.id}>
          <span><span className="text-accent" style={{fontWeight:600}}>{c.type}</span><span className="text-dim text-sm" style={{marginLeft:8}}>${c.reward}</span></span>
          <button className="btn btn-sm" onClick={() => accept(c.id)}>接取</button></div>
        )}
      </div>
      <div className="card"><div className="card-title">進行中</div>
        {(mine || []).map(m => <div className="stat" key={m.contract_id}>{m.type}<span>{m.completed ? '✅' : '⏳'}</span></div>)}
      </div>
    </>
  )
}

function Leaderboard({ api }) {
  const [data, setData] = useState([])
  useEffect(() => { api('/api/leaderboard').then(d => setData(Array.isArray(d) ? d : [])) }, [])
  return (
    <div className="card">
      <div className="card-title">🏆 排行榜</div>
      {(data || []).map((u, i) => (
        <div className="stat" key={u.username}>
          <span><span className="text-accent" style={{fontWeight:700}}>#{i+1}</span> {u.username} {u.online ? <span style={{color:'var(--accent)',fontSize:11}}>●線上</span> : <span className="text-dim" style={{fontSize:11}}>●離線</span>}</span>
          <span className="text-dim">💰${(u.total_earned||0).toLocaleString()} 📊{u.stocks} 股</span>
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
      {stats && <div className="grid-3 mb-12">
        <div className="card"><div className="card-title">玩家</div><div className="text-lg">{stats.users}</div></div>
        <div className="card"><div className="card-title">總現金</div><div className="text-lg">${(stats.totalCash||0).toLocaleString()}</div></div>
        <div className="card"><div className="card-title">庫存</div><div className="text-lg">{(stats.systemReserve?.stock_inventory||0).toLocaleString()} 股</div></div>
      </div>}
      {stats && <div className="grid-3 mb-12">
        <div className="card"><div className="card-title">總活存</div><div className="text-lg">${(stats.totalSavings||0).toLocaleString()}</div></div>
        <div className="card"><div className="card-title">員工</div><div className="text-lg">{stats.employees}</div></div>
        <div className="card"><div className="card-title">交易</div><div className="text-lg">{stats.trades}</div></div>
      </div>}
      <div className="card"><div className="card-title">使用者 ({users.length})</div>
        {(users || []).map(u => <div className="stat" key={u.id}>
          <span>#{u.id} {u.username} {u.role === 'admin' ? '⭐' : ''}</span>
          <span className="text-dim text-sm">💰${(u.cash||0).toLocaleString()} 🏦${(u.savings||0).toLocaleString()} 📈${(u.total_earned||0).toLocaleString()} 👥{u.employees}</span>
        </div>)}
      </div>
    </>
  )
}
