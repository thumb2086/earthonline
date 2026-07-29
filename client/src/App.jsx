import { useState, useEffect } from 'react'

const API = ''

function App() {
  const [token, setToken] = useState(localStorage.getItem('eo_token'))
  const [view, setView] = useState('dashboard')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (!token) { setLoading(false); return }
    fetch(API + '/api/me', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.json()).then(d => { setUser(d); setLoading(false) })
      .catch(() => { localStorage.removeItem('eo_token'); setToken(null); setLoading(false) })
  }, [token])

  async function api(path, body) {
    const opts = { method: 'POST', headers: { 'Content-Type': 'application/json' } }
    if (token) opts.headers.Authorization = 'Bearer ' + token
    if (body) opts.body = JSON.stringify(body)
    const r = await fetch(API + path, opts)
    return r.json()
  }

  function logout() { localStorage.removeItem('eo_token'); setToken(null); setUser(null);
    window.location.href = '/'
  }

  if (!token) return (
    <div style={{ maxWidth: 400, margin: '100px auto', textAlign: 'center' }}>
      <h1>🌍 Earth Online</h1>
      <p style={{ color: '#aaa', marginBottom: 30 }}>Discord 帳號登入</p>
      <a href={API + '/api/auth/discord'}>
        <button style={s.discordBtn}>🔷 Discord 登入</button>
      </a>
      {msg && <p style={{ color: 'red' }}>{msg}</p>}
    </div>
  )

  if (loading) return <div style={{ textAlign: 'center', marginTop: 100 }}>載入中...</div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', background: '#1a1a2e', color: '#eee', padding: '8px 16px', borderRadius: 8, marginBottom: 10 }}>
        <span>💰 ${(user?.cash || 0).toLocaleString()} | 🏦 ${(user?.savings || 0).toLocaleString()} | 📈 ${(user?.total_earned || 0).toLocaleString()}</span>
        <span>{user?.username} {user?.role === 'admin' && '⭐'}
          <button onClick={logout} style={s.btnSmall}>登出</button></span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {['dashboard','income','bank','invest','employee','company','stock','contract', ...(user?.role === 'admin' ? ['admin'] : [])].map(v => (
          <button key={v} onClick={() => setView(v)} style={view === v ? s.tabActive : s.tab}>{v}</button>
        ))}
      </div>

      <div style={{ background: '#16213e', borderRadius: 8, padding: 16, color: '#ddd', minHeight: 400 }}>
        {view === 'dashboard' && <Dashboard user={user} />}
        {view === 'income' && <Income user={user} api={api} />}
        {view === 'bank' && <Bank api={api} />}
        {view === 'invest' && <Invest api={api} />}
        {view === 'employee' && <Employee api={api} />}
        {view === 'company' && <Company api={api} />}
        {view === 'stock' && <Stock api={api} />}
        {view === 'contract' && <Contract api={api} />}
        {view === 'admin' && <AdminPanel api={api} />}
      </div>
    </div>
  )
}

function Dashboard({ user }) {
  return (
    <div>
      <h2>📊 儀表板</h2>
      <p>現金: ${(user?.cash || 0).toLocaleString()}</p>
      <p>活存: ${(user?.savings || 0).toLocaleString()}</p>
      <p>定存: ${(user?.bank || 0).toLocaleString()}</p>
      <p>累計賺取: ${(user?.total_earned || 0).toLocaleString()}</p>
      {user?.levels && <p>升級: 電腦 Lv.{user.levels.computer} | 伺服器 Lv.{user.levels.server} | AI Lv.{user.levels.ai_assistant}</p>}
      {user?.role === 'admin' && <p style={{ color: '#f1c40f' }}>⭐ 管理員權限</p>}
    </div>
  )
}

function Income({ api }) {
  const [info, setInfo] = useState(null)
  useEffect(() => { api('/api/income/info').then(setInfo) }, [])
  async function upgrade(item) {
    const res = await api('/api/income/upgrade', { item })
    if (res.success) api('/api/income/info').then(setInfo)
  }
  if (!info) return <p>載入中...</p>
  return (
    <div>
      <h2>⬆️ 升級商店</h2>
      <p>收入/分: <b>${info.income || 0}</b></p>
      {Object.entries(info.upgrades || {}).map(([k, v]) => (
        <div key={k} style={s.card}>
          {k}: Lv.{v?.nextLevel - 1 || '?'} → Lv.{v?.nextLevel || 'MAX'}
          {v ? ` 升級費 $${v.cost}` : ' 已MAX'}
          {v && <button onClick={() => upgrade(k)} style={s.btnSmall}>升級</button>}
        </div>
      ))}
    </div>
  )
}

function Bank({ api }) {
  async function handle(e, path) {
    e.preventDefault()
    const fd = new FormData(e.target)
    const res = await api(path, { amount: parseInt(fd.get('amount')) || 0 })
    if (res.success) alert('成功')
    else alert(res.error)
  }
  return (
    <div>
      <h2>🏦 銀行</h2>
      <form onSubmit={e => handle(e, '/api/bank/deposit')}>
        <input name="amount" placeholder="金額" style={s.in} /><button style={s.btnSmall}>存入</button>
      </form>
      <form onSubmit={e => handle(e, '/api/bank/withdraw')}>
        <input name="amount" placeholder="金額" style={s.in} /><button style={s.btnSmall}>提取</button>
      </form>
      <form onSubmit={e => handle(e, '/api/bank/borrow')}>
        <input name="amount" placeholder="借款金額" style={s.in} /><button style={s.btnSmall}>借款</button>
      </form>
    </div>
  )
}

function Invest({ api }) {
  const [types, setTypes] = useState([])
  useEffect(() => { api('/api/investment/types').then(setTypes) }, [])
  async function invest(type) {
    const amount = prompt('投入金額:')
    if (!amount) return
    const res = await api('/api/investment/invest', { type, amount: parseInt(amount) })
    alert(res.success ? '成功' : res.error)
  }
  return (
    <div>
      <h2>💼 投資</h2>
      {types.map(t => (
        <div key={t.type} style={s.card}>
          {t.label} | {t.rateMin * 100}~{t.rateMax * 100}%/分
          {t.unlocked ? <button onClick={() => invest(t.type)} style={s.btnSmall}>投資</button> : ` (需賺 $${t.unlockEarned})`}
        </div>
      ))}
    </div>
  )
}

function Employee({ api }) {
  const [employees, setEmployees] = useState([])
  const [positions, setPositions] = useState([])
  useEffect(() => { api('/api/employee/list').then(d => setEmployees(d)) }, [])
  useEffect(() => { api('/api/employee/positions').then(setPositions) }, [])
  async function hire(pos) {
    const res = await api('/api/employee/hire', { position: pos })
    if (res.success) api('/api/employee/list').then(d => setEmployees(d))
    else alert(res.error)
  }
  return (
    <div>
      <h2>👥 員工</h2>
      {positions.map(p => (
        <div key={p.position} style={s.card}>
          {p.label} | 費 ${p.hireCost} | 薪 ${p.salary}/分 | +{p.output}/分
          <button onClick={() => hire(p.position)} style={s.btnSmall}>僱用</button>
        </div>
      ))}
      <h3>我的員工 ({employees.length})</h3>
      {employees.map(e => <div key={e.id} style={s.cardSmall}>[{e.position}] 效率 {e.efficiency.toFixed(2)} | 滿意度 {e.morale} | 薪 ${e.salary}</div>)}
    </div>
  )
}

function Company({ api }) {
  const [companies, setCompanies] = useState([])
  useEffect(() => { api('/api/company/list').then(setCompanies) }, [])
  async function create() {
    const name = prompt('公司名:')
    if (!name) return
    const res = await api('/api/company/create', { name, industry: 'tech' })
    if (res.success) api('/api/company/list').then(setCompanies)
    else alert(res.error)
  }
  return (
    <div>
      <h2>🏢 公司</h2>
      <button onClick={create} style={s.btn}>創建 ($50,000)</button>
      {companies.map(c => <div key={c.id} style={s.card}>{c.name} ({c.industry}) | 利潤 ${c.profit}/分</div>)}
    </div>
  )
}

function Stock({ api }) {
  const [quote, setQuote] = useState(null)
  const [holdings, setHoldings] = useState([])
  const [trades, setTrades] = useState([])
  const [ipo, setIpo] = useState(null)

  useEffect(() => { api('/api/stock/quote').then(setQuote); api('/api/stock/holdings').then(setHoldings); api('/api/stock/trades').then(setTrades); api('/api/stock/ipo/info').then(setIpo) }, [])

  async function buy() {
    const q = prompt('買入股數:'); if (!q) return
    const res = await api('/api/stock/buy', { quantity: parseInt(q) })
    if (res.success) { api('/api/stock/quote').then(setQuote); api('/api/stock/holdings').then(setHoldings); api('/api/stock/trades').then(setTrades) }
    else alert(res.error)
  }
  async function sell() {
    const q = prompt('賣出股數:'); if (!q) return
    const res = await api('/api/stock/sell', { quantity: parseInt(q) })
    if (res.success) { api('/api/stock/quote').then(setQuote); api('/api/stock/holdings').then(setHoldings); api('/api/stock/trades').then(setTrades) }
    else alert(res.error)
  }
  async function subIpo() {
    const s = prompt('認購股數:'); if (!s) return
    const res = await api('/api/stock/ipo/subscribe', { shares: parseInt(s) })
    if (res.success) { api('/api/stock/ipo/info').then(setIpo); alert(`認購 ${s} 股成功`) }
    else alert(res.error)
  }

  return (
    <div>
      <h2>📈 地球互動科技 (001)</h2>
      {ipo?.phase === 'ipo' && <div style={{ background: '#e67e22', padding: 12, borderRadius: 8, marginBottom: 10 }}>🚀 IPO 中 ${ipo.subscribed}/300,000 <button onClick={subIpo} style={s.btnSmall}>認購</button></div>}
      {quote && <div style={s.card}>
        價 ${quote.price} | 買 ${quote.buyPrice} | 賣 ${quote.sellPrice}
        <br />流通 {quote.circulating.toLocaleString()} | 庫存 {quote.systemInventory.toLocaleString()}
        <button onClick={buy} style={s.btnSmall}>買</button><button onClick={sell} style={s.btnSmall}>賣</button>
      </div>}
      <h3>持倉</h3>
      {holdings.map(h => <div key={h.company_id} style={s.cardSmall}>公司 {h.company_id}: {h.quantity} 股</div>)}
    </div>
  )
}

function Contract({ api }) {
  const [contracts, setContracts] = useState([])
  const [mine, setMine] = useState([])
  useEffect(() => { api('/api/contract/list').then(setContracts); api('/api/contract/mine').then(setMine) }, [])
  async function accept(id) {
    const res = await api('/api/contract/accept/' + id)
    if (res.success) { api('/api/contract/list').then(setContracts); api('/api/contract/mine').then(setMine) }
    else alert(res.error)
  }
  return (
    <div>
      <h2>📋 合約</h2>
      {contracts.map(c => <div key={c.id} style={s.card}>{c.type} | $${c.reward} <button onClick={() => accept(c.id)} style={s.btnSmall}>接取</button></div>)}
      <h3>我的合約</h3>
      {mine.map(m => <div key={m.contract_id} style={s.cardSmall}>{m.type} | {m.completed ? '✅' : '⏳'}</div>)}
    </div>
  )
}

function AdminPanel({ api }) {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  useEffect(() => { api('/api/admin/users').then(setUsers); api('/api/admin/stats').then(setStats) }, [])

  return (
    <div>
      <h2>⭐ 管理面板</h2>
      {stats && <div style={s.card}>
        用戶 {stats.users} | 總現金 ${stats.totalCash?.toLocaleString()} | 總活存 ${stats.totalSavings?.toLocaleString()}
        <br />員工 {stats.employees} | 公司 {stats.companies} | 交易 {stats.trades}
        <br />系統現金 ${stats.systemReserve?.cash?.toLocaleString()} | 庫存 {stats.systemReserve?.stock_inventory?.toLocaleString()} 股 | 股價 ${stats.stockPrice}
      </div>}
      <h3>所有使用者</h3>
      {users.map(u => <div key={u.id} style={s.cardSmall}>
        #{u.id} {u.username} {u.role === 'admin' ? '⭐' : ''} | 💰${u.cash?.toLocaleString()} | 🏦${u.savings?.toLocaleString()} | 📈${u.total_earned?.toLocaleString()} | 👥{u.employees} 員工 | 📊{u.stocks} 股
      </div>)}
    </div>
  )
}

const s = {
  in: { width: '80%', padding: 8, margin: '4px 0', borderRadius: 4, border: '1px solid #555', background: '#0f3460', color: '#eee' },
  btn: { padding: '8px 20px', margin: 4, borderRadius: 4, border: 'none', background: '#e94560', color: '#fff', cursor: 'pointer' },
  btnSmall: { padding: '4px 10px', margin: 2, borderRadius: 4, border: 'none', background: '#e94560', color: '#fff', cursor: 'pointer', fontSize: 12 },
  tab: { padding: '6px 12px', borderRadius: 4, border: '1px solid #555', background: '#16213e', color: '#aaa', cursor: 'pointer' },
  tabActive: { padding: '6px 12px', borderRadius: 4, border: '1px solid #e94560', background: '#e94560', color: '#fff', cursor: 'pointer' },
  card: { background: '#0f3460', padding: 10, borderRadius: 6, margin: '6px 0' },
  cardSmall: { background: '#1a1a2e', padding: 6, borderRadius: 4, margin: '4px 0', fontSize: 13 },
  discordBtn: { padding: '14px 40px', fontSize: 18, borderRadius: 8, border: 'none', background: '#5865F2', color: '#fff', cursor: 'pointer', fontWeight: 'bold' },
}

export default App
