import { useState, useEffect, useCallback } from 'react'

const AUTH_TOKEN_KEY = 'eo_token'
const USER_KEY = 'eo_user'

const GITHUB_EARTH = 'https://raw.githubusercontent.com/earthonline/assets/main/earth-day.webp'
const GITHUB_EARTH_NIGHT = 'https://raw.githubusercontent.com/earthonline/assets/main/earth-night.webp'
const DISCORD_CLIENT_ID = '1359796830294188162'
const DISCORD_REDIRECT = window.location.origin + '/callback'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY))
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) } catch { return null }
  })
  const [page, setPage] = useState('dashboard')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const t = params.get('token')
    if (t) {
      setToken(t)
      localStorage.setItem(AUTH_TOKEN_KEY, t)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (token && !user) {
      fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(u => { setUser(u); localStorage.setItem(USER_KEY, JSON.stringify(u)) })
        .catch(() => { setToken(null); setUser(null); localStorage.clear() })
    }
  }, [token])

  const logout = useCallback(() => {
    setToken(null); setUser(null); localStorage.clear()
  }, [])

  if (!token) return <LoginGateway />

  return (
    <div className="app-container">
      <SystemHeader user={user} page={page} logout={logout} />
      <div className="main-content">
        <Sidebar page={page} setPage={setPage} />
        <ContentArea page={page} token={token} loading={loading} setLoading={setLoading} />
      </div>
    </div>
  )
}

/* ─── Login ─── */
function LoginGateway() {
  const [stars] = useState(() => {
    const arr = []
    for (let i = 0; i < 120; i++) arr.push({ id: i, top: Math.random() * 100, left: Math.random() * 100, size: Math.random() * 3 + 1, delay: Math.random() * 3 })
    return arr
  })

  return (
    <div className="login-gateway">
      <div className="login-pixel-grid" />
      <div className="login-bg">
        <div className="nasa-bg">
          <div className="nasa-stars">
            {stars.map(s => (
              <div key={s.id} className="nasa-star" style={{ top: `${s.top}%`, left: `${s.left}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }} />
            ))}
          </div>
          <div className="nasa-earth">
            <img src={GITHUB_EARTH} alt="" className="nasa-earth-day" />
            <img src={GITHUB_EARTH_NIGHT} alt="" className="nasa-earth-night" />
            <div className="nasa-glow" />
          </div>
          <div className="nasa-glow" />
        </div>
      </div>
      <div className="login-box">
        <h1 className="login-title">EARTH ONLINE</h1>
        <p className="login-sub">A multiplayer strategy experience</p>
        <a className="discord-btn" href={`https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=token&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT)}&scope=identify`}>
          <DiscordIcon /> Sign in with Discord
        </a>
      </div>
    </div>
  )
}

function DiscordIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 127.14 96.36" fill="currentColor">
      <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,56.6,122.09,32.65,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.71,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91,65.69,84.69,65.69Z" />
    </svg>
  )
}

/* ─── Header ─── */
function SystemHeader({ user, page, logout }) {
  return (
    <header className="system-header">
      <div className="header-left">
        <span className={`status-dot ${user ? 'online' : 'offline'}`} />
        <span className="text-accent">EARTH ONLINE</span>
        <span className="text-dim text-sm">v1.0.0</span>
      </div>
      <div className="header-right">
        <div className="flex items-center gap-8">
          <span className="text-dim text-sm">CASH</span>
          <span className="text-accent">${(user?.cash ?? 0).toLocaleString()}</span>
          <span className="text-dim" style={{ margin: '0 4px' }}>|</span>
          <span className="text-sm">{user?.username ?? 'Agent'}</span>
        </div>
        <button className="btn btn-small btn-danger" onClick={logout}>LOGOUT</button>
      </div>
    </header>
  )
}

/* ─── Sidebar ─── */
const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'income', label: 'Income' },
  { key: 'bank', label: 'Bank' },
  { key: 'invest', label: 'Invest' },
  { key: 'employee', label: 'Employee' },
  { key: 'company', label: 'Company' },
  { key: 'stock', label: 'Stock' },
  { key: 'contract', label: 'Contract' },
  { key: 'admin', label: 'Admin' },
]

function Sidebar({ page, setPage }) {
  return (
    <nav className="sidebar">
      <div className="flex items-center gap-8" style={{ padding: '16px 12px', borderBottom: '1px solid #0a3a0a' }}>
        <span className="status-dot online" />
        <span className="text-accent text-sm">NAV</span>
      </div>
      {NAV_ITEMS.map(item => (
        <button key={item.key} className={`nav-btn${page === item.key ? ' active' : ''}`} onClick={() => setPage(item.key)}>
          {item.label}
        </button>
      ))}
    </nav>
  )
}

/* ─── Content Area ─── */
function ContentArea({ page, token, loading, setLoading }) {
  const api = useCallback((path, opts = {}) => {
    setLoading(true)
    return fetch(path, { ...opts, headers: { ...opts.headers, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
      .then(r => r.json())
      .finally(() => setLoading(false))
  }, [token, setLoading])

  switch (page) {
    case 'dashboard': return <Dashboard api={api} />
    case 'income': return <Income api={api} />
    case 'bank': return <Bank api={api} />
    case 'invest': return <Invest api={api} />
    case 'employee': return <Employee api={api} />
    case 'company': return <Company api={api} />
    case 'stock': return <Stock api={api} />
    case 'contract': return <Contract api={api} />
    case 'admin': return <AdminPanel api={api} />
    default: return <Dashboard api={api} />
  }
}

/* ─── Pages ─── */

function Dashboard({ api }) {
  const [data, setData] = useState(null)
  useEffect(() => { api('/api/dashboard').then(setData) }, [])

  return (
    <div className="content-area">
      <div className="panel">
        <h2 className="panel-title">Dashboard</h2>
        <div className="grid-3">
          <div className="card">
            <div className="stat-label">Total Cash</div>
            <div className="stat-value text-accent">${(data?.cash ?? 0).toLocaleString()}</div>
          </div>
          <div className="card">
            <div className="stat-label">Bank Balance</div>
            <div className="stat-value text-accent">${(data?.bank ?? 0).toLocaleString()}</div>
          </div>
          <div className="card">
            <div className="stat-label">Investments</div>
            <div className="stat-value text-accent">${(data?.investments ?? 0).toLocaleString()}</div>
          </div>
        </div>
        <div className="grid-2 mt-8">
          <div className="card">
            <div className="stat-label">Active Contracts</div>
            <div className="stat-value">{data?.activeContracts ?? 0}</div>
          </div>
          <div className="card">
            <div className="stat-label">Companies Owned</div>
            <div className="stat-value">{data?.companies ?? 0}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Income({ api }) {
  const [data, setData] = useState(null)
  useEffect(() => { api('/api/income').then(setData) }, [])

  return (
    <div className="content-area">
      <div className="panel">
        <h2 className="panel-title">Income Overview</h2>
        <div className="grid-3">
          <div className="card">
            <div className="stat-label">Per-Second Income</div>
            <div className="stat-value text-accent">${data?.perSecond ?? 0}/s</div>
          </div>
          <div className="card">
            <div className="stat-label">Per-Minute Income</div>
            <div className="stat-value text-accent">${data?.perMinute ?? 0}/m</div>
          </div>
          <div className="card">
            <div className="stat-label">Total Earned</div>
            <div className="stat-value text-accent">${(data?.totalEarned ?? 0).toLocaleString()}</div>
          </div>
        </div>
        <div className="mt-8">
          <div className="stat-row">
            <span className="stat-label">Active Sources</span>
            <span className="stat-value">{data?.sources ?? 0}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Bank({ api }) {
  const [data, setData] = useState(null)
  const [amount, setAmount] = useState('')
  useEffect(() => { api('/api/bank').then(setData) }, [])

  const deposit = () => { api('/api/bank/deposit', { method: 'POST', body: JSON.stringify({ amount: Number(amount) }) }).then(setData); setAmount('') }
  const withdraw = () => { api('/api/bank/withdraw', { method: 'POST', body: JSON.stringify({ amount: Number(amount) }) }).then(setData); setAmount('') }

  return (
    <div className="content-area">
      <div className="panel">
        <h2 className="panel-title">Bank</h2>
        <div className="grid-3">
          <div className="card">
            <div className="stat-label">Balance</div>
            <div className="stat-value text-accent">${(data?.balance ?? 0).toLocaleString()}</div>
          </div>
          <div className="card">
            <div className="stat-label">Interest Rate</div>
            <div className="stat-value text-accent">{data?.interestRate ?? 0}%</div>
          </div>
          <div className="card">
            <div className="stat-label">Cash on Hand</div>
            <div className="stat-value text-accent">${(data?.cash ?? 0).toLocaleString()}</div>
          </div>
        </div>
        <div className="flex gap-8 mt-8" style={{ alignItems: 'flex-end' }}>
          <div className="card" style={{ flex: 1 }}>
            <div className="stat-label">Amount</div>
            <input className="w-full" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount..." style={{ background: '#0d0d0d', border: '1px solid #0a3a0a', color: '#00ff41', padding: '8px', borderRadius: 4, marginTop: 8 }} />
          </div>
          <button className="btn btn-primary" onClick={deposit}>DEPOSIT</button>
          <button className="btn btn-small btn-danger" onClick={withdraw}>WITHDRAW</button>
        </div>
      </div>
    </div>
  )
}

function Invest({ api }) {
  const [data, setData] = useState(null)
  const [amount, setAmount] = useState('')
  useEffect(() => { api('/api/invest').then(setData) }, [])

  const invest = () => { api('/api/invest/buy', { method: 'POST', body: JSON.stringify({ amount: Number(amount) }) }).then(setData); setAmount('') }
  const sell = () => { api('/api/invest/sell', { method: 'POST', body: JSON.stringify({ amount: Number(amount) }) }).then(setData); setAmount('') }

  return (
    <div className="content-area">
      <div className="panel">
        <h2 className="panel-title">Investments</h2>
        <div className="grid-3">
          <div className="card">
            <div className="stat-label">Portfolio Value</div>
            <div className="stat-value text-accent">${(data?.portfolio ?? 0).toLocaleString()}</div>
          </div>
          <div className="card">
            <div className="stat-label">Return Rate</div>
            <div className="stat-value text-accent">{data?.returnRate ?? 0}%</div>
          </div>
          <div className="card">
            <div className="stat-label">Cash Available</div>
            <div className="stat-value text-accent">${(data?.cash ?? 0).toLocaleString()}</div>
          </div>
        </div>
        <div className="flex gap-8 mt-8" style={{ alignItems: 'flex-end' }}>
          <div className="card" style={{ flex: 1 }}>
            <div className="stat-label">Amount</div>
            <input className="w-full" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount..." style={{ background: '#0d0d0d', border: '1px solid #0a3a0a', color: '#00ff41', padding: '8px', borderRadius: 4, marginTop: 8 }} />
          </div>
          <button className="btn btn-primary" onClick={invest}>BUY</button>
          <button className="btn btn-small btn-danger" onClick={sell}>SELL</button>
        </div>
      </div>
    </div>
  )
}

function Employee({ api }) {
  const [data, setData] = useState(null)
  useEffect(() => { api('/api/employee').then(setData) }, [])
  const hire = (id) => { api('/api/employee/hire', { method: 'POST', body: JSON.stringify({ employeeId: id }) }).then(setData) }
  const fire = (id) => { api('/api/employee/fire', { method: 'POST', body: JSON.stringify({ employeeId: id }) }).then(setData) }

  return (
    <div className="content-area">
      <div className="panel">
        <h2 className="panel-title">Employees</h2>
        <div className="stat-row">
          <span className="stat-label">Total Hired</span>
          <span className="stat-value">{data?.total ?? 0}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Total Output</span>
          <span className="stat-value text-accent">${data?.totalOutput ?? 0}/s</span>
        </div>
        <div className="mt-8">
          {data?.employees?.map(emp => (
            <div key={emp.id} className="card flex items-center justify-between">
              <div>
                <div className="stat-label">{emp.name}</div>
                <div className="text-sm text-dim">${emp.output}/s | Cost: ${emp.cost}</div>
              </div>
              <div className="flex gap-8">
                {!emp.hired && <button className="btn btn-small btn-primary" onClick={() => hire(emp.id)}>HIRE</button>}
                {emp.hired && <button className="btn btn-small btn-danger" onClick={() => fire(emp.id)}>FIRE</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Company({ api }) {
  const [data, setData] = useState(null)
  const [name, setName] = useState('')
  useEffect(() => { api('/api/company').then(setData) }, [])

  const create = () => { api('/api/company/create', { method: 'POST', body: JSON.stringify({ name }) }).then(setData); setName('') }

  return (
    <div className="content-area">
      <div className="panel">
        <h2 className="panel-title">Companies</h2>
        <div className="stat-row">
          <span className="stat-label">Owned</span>
          <span className="stat-value">{data?.owned ?? 0}</span>
        </div>
        <div className="flex gap-8 mt-8" style={{ alignItems: 'flex-end' }}>
          <div className="card" style={{ flex: 1 }}>
            <div className="stat-label">Company Name</div>
            <input className="w-full" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter name..." style={{ background: '#0d0d0d', border: '1px solid #0a3a0a', color: '#00ff41', padding: '8px', borderRadius: 4, marginTop: 8 }} />
          </div>
          <button className="btn btn-primary" onClick={create}>CREATE</button>
        </div>
        <div className="mt-8">
          {data?.companies?.map(c => (
            <div key={c.id} className="card flex items-center justify-between">
              <div>
                <div className="stat-label">{c.name}</div>
                <div className="text-sm text-dim">Value: ${(c.value ?? 0).toLocaleString()} | Revenue: ${c.revenue ?? 0}/s</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Stock({ api }) {
  const [data, setData] = useState(null)
  const [symbol, setSymbol] = useState('')
  const [shares, setShares] = useState('')
  useEffect(() => { api('/api/stock').then(setData) }, [])

  const buy = () => { api('/api/stock/buy', { method: 'POST', body: JSON.stringify({ symbol: symbol.toUpperCase(), shares: Number(shares) }) }).then(setData); setSymbol(''); setShares('') }
  const sell = () => { api('/api/stock/sell', { method: 'POST', body: JSON.stringify({ symbol: symbol.toUpperCase(), shares: Number(shares) }) }).then(setData); setSymbol(''); setShares('') }

  return (
    <div className="content-area">
      <div className="panel">
        <h2 className="panel-title">Stock Market</h2>
        <div className="grid-2">
          <div className="card">
            <div className="stat-label">Portfolio Value</div>
            <div className="stat-value text-accent">${(data?.portfolio ?? 0).toLocaleString()}</div>
          </div>
          <div className="card">
            <div className="stat-label">Cash Available</div>
            <div className="stat-value text-accent">${(data?.cash ?? 0).toLocaleString()}</div>
          </div>
        </div>
        <div className="flex gap-8 mt-8" style={{ alignItems: 'flex-end' }}>
          <div className="card" style={{ flex: 1 }}>
            <div className="stat-label">Symbol</div>
            <input className="w-full" type="text" value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="e.g. AAPL" style={{ background: '#0d0d0d', border: '1px solid #0a3a0a', color: '#00ff41', padding: '8px', borderRadius: 4, marginTop: 8 }} />
          </div>
          <div className="card" style={{ flex: 1 }}>
            <div className="stat-label">Shares</div>
            <input className="w-full" type="number" value={shares} onChange={e => setShares(e.target.value)} placeholder="Quantity" style={{ background: '#0d0d0d', border: '1px solid #0a3a0a', color: '#00ff41', padding: '8px', borderRadius: 4, marginTop: 8 }} />
          </div>
          <button className="btn btn-primary" onClick={buy}>BUY</button>
          <button className="btn btn-small btn-danger" onClick={sell}>SELL</button>
        </div>
        <div className="mt-8">
          {data?.holdings?.map(h => (
            <div key={h.symbol} className="card flex items-center justify-between">
              <div>
                <div className="stat-label">{h.symbol}</div>
                <div className="text-sm text-dim">{h.shares} shares @ ${h.price?.toFixed(2) ?? '0.00'}</div>
              </div>
              <div className="stat-value text-accent">${(h.value ?? 0).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Contract({ api }) {
  const [data, setData] = useState(null)
  useEffect(() => { api('/api/contract').then(setData) }, [])
  const accept = (id) => { api('/api/contract/accept', { method: 'POST', body: JSON.stringify({ contractId: id }) }).then(setData) }
  const complete = (id) => { api('/api/contract/complete', { method: 'POST', body: JSON.stringify({ contractId: id }) }).then(setData) }

  return (
    <div className="content-area">
      <div className="panel">
        <h2 className="panel-title">Contracts</h2>
        <div className="stat-row">
          <span className="stat-label">Active</span>
          <span className="stat-value">{data?.active ?? 0}</span>
        </div>
        <div className="mt-8">
          {data?.contracts?.map(c => (
            <div key={c.id} className="card flex items-center justify-between">
              <div>
                <div className="stat-label">{c.title}</div>
                <div className="text-sm text-dim">Reward: ${(c.reward ?? 0).toLocaleString()} | Status: {c.status}</div>
              </div>
              <div className="flex gap-8">
                {c.status === 'available' && <button className="btn btn-small btn-primary" onClick={() => accept(c.id)}>ACCEPT</button>}
                {c.status === 'active' && <button className="btn btn-small btn-primary" onClick={() => complete(c.id)}>COMPLETE</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AdminPanel({ api }) {
  const [data, setData] = useState(null)
  useEffect(() => { api('/api/admin').then(setData) }, [])

  const grant = (userId, field, value) => {
    api('/api/admin/grant', { method: 'POST', body: JSON.stringify({ userId, field, value }) }).then(setData)
  }

  return (
    <div className="content-area">
      <div className="panel">
        <h2 className="panel-title">Admin Panel</h2>
        <div className="stat-row">
          <span className="stat-label">Total Users</span>
          <span className="stat-value">{data?.totalUsers ?? 0}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Server Uptime</span>
          <span className="stat-value">{data?.uptime ?? 'N/A'}</span>
        </div>
        <div className="mt-8">
          {data?.users?.map(u => (
            <div key={u.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <div className="stat-label">{u.username}</div>
                  <div className="text-sm text-dim">Cash: ${(u.cash ?? 0).toLocaleString()} | Bank: ${(u.bank ?? 0).toLocaleString()}</div>
                </div>
                <div className="flex gap-8">
                  <button className="btn btn-small btn-primary" onClick={() => grant(u.id, 'cash', 100000)}>+$100k</button>
                  <button className="btn btn-small btn-primary" onClick={() => grant(u.id, 'bank', 100000)}>+Bank</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
