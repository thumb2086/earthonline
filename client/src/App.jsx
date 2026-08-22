import { useState, useEffect, useRef } from 'react'
import LoginGateway from './components/LoginGateway'
import Watermark from './components/Watermark'
import useMarketStream from './hooks/useMarketStream'
import { useToast } from './components/Toast.jsx'
import DailyLogin from './components/DailyLogin'
import LaunchBanner from './components/LaunchBanner'
import Gaming from './components/Gaming'
import Casino from './components/Casino'
import LaunchPage from './components/LaunchPage'
import OnboardingGuide from './components/OnboardingGuide'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('eo_token'))
  const [user, setUser] = useState(null)
  const [view, setView] = useState(() => {
    const saved = localStorage.getItem('eo_view')
    const valid = ['dashboard', 'income', 'bank', 'invest', 'company', 'trading', 'subscription', 'history', 'leaderboard', 'help', 'admin']
    return valid.includes(saved) ? saved : 'dashboard'
  })
  const [rev, setRev] = useState(0)
  const [notifs, setNotifs] = useState({ items: [], unread: 0 })
  const [notifOpen, setNotifOpen] = useState(false)
  const [maintenance, setMaintenance] = useState({ full: false, pages: [], message: '系統維護中' })
  const { toast, prompt, promptMulti } = useToast()

  useEffect(() => {
    if (!token) return
    fetch('/api/notifications', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => { if (!r.ok) throw new Error('notif_err'); return r.json() })
      .then(d => setNotifs(Array.isArray(d?.items) ? d : { items: [], unread: 0 }))
      .catch(() => {})
  }, [token, rev])

  const openNotifs = async () => {
    setNotifOpen(o => !o)
    if (!notifOpen) {
      fetch('/api/notifications/read', { method: 'POST', headers: { Authorization: 'Bearer ' + token } }).catch(() => {})
    }
  }

  useEffect(() => {
    if (!token) return
    fetch('/api/me', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => {
        if (r.status === 401) { localStorage.removeItem('eo_token'); setToken(null); throw new Error('stop') }
        return r.json()
      })
      .then(d => setUser(d))
      .catch(() => {})
  }, [token, rev])

  useEffect(() => {
    if (!token) return
    fetch('/api/maintenance').then(r => r.json()).then(d => setMaintenance(d)).catch(() => {})
    const id = setInterval(() => fetch('/api/maintenance').then(r => r.json()).then(d => setMaintenance(d)).catch(() => {}), 10000)
    return () => clearInterval(id)
  }, [token])

  useEffect(() => {
    if (!token) return
    const id = setInterval(() => setRev(r => r + 1), 15000)
    return () => clearInterval(id)
  }, [token])

  useEffect(() => { localStorage.setItem('eo_view', view) }, [view])

  async function api(path, body) {
    const opts = { headers: { Authorization: 'Bearer ' + token } }
    if (body) { opts.method = 'POST'; opts.body = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json' }
    try {
      const r = await fetch(path, opts)
      if (r.status === 401) { localStorage.removeItem('eo_token'); setToken(null); return { error: '請重新登入' } }
      if (body) setTimeout(() => setRev(r2 => r2 + 1), 500)
      return await r.json()
    } catch { return { error: '網路錯誤' } }
  }

  const handleLogin = (t) => { localStorage.setItem('eo_token', t); setToken(t) }
  const logout = () => { localStorage.removeItem('eo_token'); setToken(null); setUser(null) }
  const [uiTheme, setUiTheme] = useState(() => localStorage.getItem('eo_theme_ui') || 'system')
  const [sysDark, setSysDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true)
  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const h = (e) => setSysDark(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])
  useEffect(() => {
    const resolved = uiTheme === 'system' ? (sysDark ? 'dark' : 'light') : uiTheme
    document.documentElement.dataset.theme = resolved
    localStorage.setItem('eo_theme_ui', uiTheme)
  }, [uiTheme, sysDark])
  const renameUser = async () => {
    const name = (prompt(`輸入新名稱（與 admin 等系統名稱相衝突的不可使用，最多 20 字）：`, user?.username) || '').trim()
    if (!name || name === user?.username) return
    const r = await api('/api/auth/rename', { username: name })
    if (r.error) { alert(r.error); return }
    setUser(u => ({ ...u, username: r.username }))
  }

  if (!token) return <><LoginGateway onLogin={handleLogin} /><Watermark /></>

  // 全站維護: 管理員仍可操作
  if (maintenance.full && user?.role !== 'admin') {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'100vh',background:'#0a0a0f',color:'#fff',textAlign:'center',padding:40}}>
        <div>
          <div style={{fontSize:64,marginBottom:20}}>🔧</div>
          <div style={{fontSize:24,fontWeight:700,marginBottom:12}}>系統維護中</div>
          <div style={{fontSize:14,color:'#94a3b8',lineHeight:1.6}}>{maintenance.message}</div>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'dashboard', label: '📊 儀表板' },
    { id: 'income', label: '⬆️ 升級' },
    { id: 'bank', label: '🏦 銀行' },
    { id: 'invest', label: '💼 投資' },
    { id: 'company', label: '🏢 公司' },
    { id: 'trading', label: '📈 交易' },
    { id: 'gaming', label: '🎰 娛樂' },
    { id: 'casino', label: '🎲 賭場' },
    { id: 'subscription', label: '📦 訂閱' },
    { id: 'history', label: '💰 明細' },
    { id: 'leaderboard', label: '🏆 排行' },
    { id: 'help', label: '📖 說明' },
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
          <span className="logo">EARTHONLINE</span>
          {window.electronAPI && <span className="badge badge-desktop" title="電腦版用戶端">🖥️ 電腦版</span>}
          <span className="badge">💰 現金 {(user?.cash ?? 0).toLocaleString()}</span>
          <span className="badge">🏦 活存 {(user?.savings ?? 0).toLocaleString()}</span>
          <span className="badge badge-danger">📈 累計 {(user?.total_earned ?? 0).toLocaleString()}</span>
        </div>
        <div className="topbar-right">
          <div style={{position:'relative'}}>
            <button className="btn btn-sm" onClick={openNotifs} style={{position:'relative'}}>
              🔔{notifs.unread > 0 && <span style={{position:'absolute', top:-4, right:-4, background:'var(--danger)', color:'#fff', borderRadius:8, fontSize:9, padding:'1px 5px', fontWeight:700}}>{notifs.unread}</span>}
            </button>
            {notifOpen && (
              <div style={{position:'absolute', right:0, top:34, width:320, maxHeight:400, overflowY:'auto', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, boxShadow:'0 8px 30px rgba(0,0,0,0.5)', zIndex:1000, padding:10}}>
                <div style={{fontWeight:700, fontSize:13, marginBottom:8, color:'var(--text)'}}>📬 通知信箱</div>
                {notifs.items.length === 0 && <div className="text-dim text-sm">尚無通知</div>}
                {notifs.items.map(n => (
                  <div key={n.id} style={{padding:'6px 4px', borderBottom:'1px solid var(--border)', fontSize:12, color:'var(--text2)'}}>
                    <div>{n.message}</div>
                    <div className="text-dim" style={{fontSize:10, marginTop:2}}>{new Date(n.created_at).toLocaleString('zh-TW')}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <span className="text-dim" style={{fontWeight:500}}>{user?.username ?? '載入中...'}{user?.role === 'admin' ? ' ⭐' : ''}</span>
          <div style={{display:'flex', gap:2}}>
            {[
              { key: 'dark', icon: '🌙', label: '深色' },
              { key: 'light', icon: '☀️', label: '淺色' },
              { key: 'system', icon: '💻', label: '自動' },
            ].map(t => (
              <button key={t.key} className={`btn btn-sm ${uiTheme === t.key ? 'btn-primary' : ''}`}
                onClick={() => setUiTheme(t.key)} title={t.label}
                style={{fontSize:12, padding:'2px 6px'}}>{t.icon}</button>
            ))}
          </div>
          <button className="btn btn-sm" onClick={renameUser} title="改名">✏️</button>
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
          {maintenance.pages.includes(view) && user?.role !== 'admin' ? (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',textAlign:'center',padding:40}}>
              <div>
                <div style={{fontSize:48,marginBottom:16}}>🔧</div>
                <div style={{fontSize:18,fontWeight:700,marginBottom:8}}>此功能維護中</div>
                <div style={{fontSize:13,color:'#94a3b8'}}>{maintenance.message}</div>
              </div>
            </div>
          ) : (<>
          {view === 'dashboard' && <Dashboard user={user} api={api} toast={toast} />}
          {view === 'launch' && <LaunchPage api={api} user={user} onNavigate={setView} />}
          {view === 'income' && <Income api={api} toast={toast} />}
          {view === 'bank' && <Bank act={act} api={api} toast={toast} />}
          {view === 'invest' && <Invest api={api} toast={toast} prompt={prompt} />}
          {view === 'company' && <Company api={api} toast={toast} prompt={prompt} promptMulti={promptMulti} />}
          {view === 'trading' && <Trading api={api} toast={toast} prompt={prompt} user={user} />}
          {view === 'gaming' && <Gaming api={api} user={user} />}
          {view === 'casino' && <Casino api={api} user={user} />}
          {view === 'history' && <History api={api} />}
          {view === 'subscription' && <Subscription api={api} toast={toast} />}
          {view === 'leaderboard' && <Leaderboard api={api} />}
          {view === 'help' && <Help />}
          {view === 'admin' && <AdminPanel api={api} />}
          </>)}
        </div>
      </div>
      <Watermark />
    </div>
  )
}

function Dashboard({ user, api }) {
  const [data, setData] = useState({})
  const [showOffline, setShowOffline] = useState(true)
  const [onboardCollapsed, setOnboardCollapsed] = useState(false)
  useEffect(() => {
    api('/api/stock/quote').then(d => setData(p => ({ ...p, q: d }))).catch(()=>{})
    api('/api/stock/holdings').then(d => setData(p => ({ ...p, h: Array.isArray(d) ? d : [] }))).catch(()=>{})
    api('/api/bank/info').then(d => setData(p => ({ ...p, bank: d }))).catch(()=>{})
    api('/api/investment/list').then(d => setData(p => ({ ...p, inv: Array.isArray(d) ? d : [] }))).catch(()=>{})
    api('/api/subscription/list').then(d => setData(p => ({ ...p, subs: Array.isArray(d) ? d : [] }))).catch(()=>{})
    api('/api/company/list').then(d => setData(p => ({ ...p, companies: Array.isArray(d) ? d : [] }))).catch(()=>{})
    api('/api/stock/ipo/mine').then(d => setData(p => ({ ...p, ipos: Array.isArray(d) ? d : [] }))).catch(()=>{})
  }, [])
  const sv = (data.h || []).reduce((s, h) => s + (data.q?.price || 100) * h.quantity, 0)
  const invTotal = (data.inv || []).filter(i => i.type !== 'deposit').reduce((s, i) => s + i.amount, 0)
  const depTotal = (data.inv || []).filter(i => i.type === 'deposit').reduce((s, i) => s + i.amount, 0)
  const subActive = (data.subs || []).filter(s => s.enabled).length
  const subCost = (data.subs || []).filter(s => s.enabled).reduce((s, x) => s + x.cost, 0)
  const debt = data.bank?.totalDebt || 0
  const netWorth = (user?.cash || 0) + (user?.savings || 0) + depTotal + sv + invTotal - debt
  return (
    <>
      <LaunchBanner api={api} />
      <OnboardingGuide user={user} collapsed={onboardCollapsed} onCollapse={() => setOnboardCollapsed(c => !c)} />
      <DailyLogin api={api} />
      {(user?.offlineEarnings > 0 && showOffline) && <div className="card mb-12" style={{borderColor:'var(--accent)',background:'rgba(0,255,65,0.05)'}}>
        <div className="flex justify-between items-center">
          <div><span className="text-accent" style={{fontWeight:600}}>⚡ 離線收益</span>
          <div className="text-dim text-sm">上線後收入減半 · 獲得 <span className="text-accent">${user.offlineEarnings.toLocaleString()}</span></div></div>
          <button className="btn btn-sm" onClick={() => setShowOffline(false)}>收起</button>
        </div>
      </div>}
      <div className="grid-3 mb-12">
        <div className="card"><div className="card-title">可用現金</div><div className="text-lg">${(user?.cash || 0).toLocaleString()}</div></div>
        <div className="card"><div className="card-title">總資產</div><div className="text-lg">${netWorth.toLocaleString()}</div></div>
        <div className="card"><div className="card-title">累計賺取</div><div className="text-lg">${(user?.total_earned || 0).toLocaleString()}</div></div>
      </div>
      <div className="grid-3 mb-12">
        {(user?.estDivPerMin || 0) > 0 && <div className="card" style={{borderLeft:'3px solid #22c55e'}}><div className="card-title">💎 預估股息</div><div className="text-lg" style={{color:'#22c55e'}}>${user.estDivPerMin.toLocaleString()}/分</div><div className="text-dim text-sm">每 10 分鐘自動發放</div></div>}
        {(user?.btc || 0) > 0 && <div className="card" style={{borderLeft:'3px solid #f7931a'}}><div className="card-title">₿ 比特幣</div><div className="text-lg" style={{color:'#f7931a'}}>{user.btc} BTC</div><div className="text-dim text-sm">開服限定紀念品</div></div>}
      </div>
      <div className="grid-2 mb-12">
        <div className="card"><div className="card-title">活存</div><div className="text-lg">${(user?.savings || 0).toLocaleString()}</div></div>
        <div className="card"><div className="card-title">定存</div><div className="text-lg">${depTotal.toLocaleString()}</div></div>
      </div>
      <div className="grid-2 mb-12">
        <div className="card"><div className="card-title">股票市值</div><div className="text-lg">${sv.toLocaleString()}</div></div>
        <div className="card"><div className="card-title">💼 投資</div><div className="text-lg">${invTotal.toLocaleString()}</div></div>
      </div>
      <div className="grid-2 mb-12">
        <div className="card card-warn"><div className="card-title">💳 債務</div><div className="text-lg">${debt.toLocaleString()}</div>
          {data.bank?.interestPerMin > 0 && <div className="text-dim text-sm">利息 ${data.bank.interestPerMin.toLocaleString()}/分</div>}</div>
        <div className="card"><div className="card-title">📦 訂閱</div><div className="text-lg">{subActive} 項</div>
          {subCost > 0 && <div className="text-dim text-sm">${subCost.toLocaleString()}/分</div>}</div>
      </div>
      {(data.ipos || []).length > 0 && <div className="card mb-12" style={{borderColor:'var(--warn)'}}>
        <div className="card-title" style={{color:'var(--warn)'}}>🚀 IPO 認購中</div>
        {(data.ipos || []).map(ipo => (
          <div className="stat" key={ipo.company_id}>
            <span>{ipo.name} · 認購 <span style={{fontWeight:600}}>{ipo.shares.toLocaleString()} 股</span></span>
            <span className="text-dim text-sm">花費 ${(ipo.total_cost || 0).toLocaleString()} · 上市後入帳</span>
          </div>
        ))}
      </div>}
      <div className="grid-2">
        <div className="card">
          <div className="card-title">資產分布</div>
          <div className="stat"><span className="stat-label">現金</span><span className="stat-value">${(user?.cash || 0).toLocaleString()}</span></div>
          <div className="stat"><span className="stat-label">活存</span><span className="stat-value">${(user?.savings || 0).toLocaleString()}</span></div>
          <div className="stat"><span className="stat-label">定存</span><span className="stat-value">${depTotal.toLocaleString()}</span></div>
          <div className="stat"><span className="stat-label">股票</span><span className="stat-value">${sv.toLocaleString()}</span></div>
          <div className="stat"><span className="stat-label">投資</span><span className="stat-value">${invTotal.toLocaleString()}</span></div>
          <div className="stat"><span className="stat-label">負債</span><span className="stat-value" style={{color:'var(--danger)'}}>-${debt.toLocaleString()}</span></div>
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
  const [launch, setLaunch] = useState(null)
  useEffect(() => { api('/api/income/info').then(setInfo); api('/api/launch/status').then(setLaunch).catch(()=>{}) }, [])
  const up = async (item) => { const r = await api('/api/income/upgrade', { item }); if (r.success) { api('/api/income/info').then(setInfo); toast('升級成功', 'success') } else toast(r.error, 'error') }
  if (!info) return <div className="text-dim">載入中...</div>
  return (
    <>
      <div className="stat-card mb-12">
        <div className="card-title">每分鐘收入</div>
        <div className="text-lg">${info.income || 0} {launch?.doubleActive && <span style={{fontSize:13, color:'#f59e0b', fontWeight:600}}>🚀 開服慶典 x2</span>}</div>
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

function Bank({ act, api, toast }) {
  const [info, setInfo] = useState(null)
  const [terms, setTerms] = useState([])
  const [deposits, setDeposits] = useState([])
  const [termMinutes, setTermMinutes] = useState(60)
  const [depAmount, setDepAmount] = useState('')
  const load = () => {
    api('/api/bank/info').then(setInfo)
    api('/api/investment/terms').then(d => setTerms(Array.isArray(d) ? d : []))
    api('/api/investment/list').then(d => setDeposits(Array.isArray(d) ? d.filter(x => x.type === 'deposit') : []))
  }
  useEffect(() => { load() }, [])
  const repay = async (id) => {
    const r = await api('/api/bank/repay/' + id)
    if (r.success) { load(); toast('已償還', 'success') } else toast(r.error, 'error')
  }
  const doDeposit = async () => {
    const a = parseInt(depAmount); if (!a || a <= 0) return toast('輸入金額', 'error')
    const r = await api('/api/investment/invest', { type: 'deposit', amount: a, termMinutes })
    if (r.success) { setDepAmount(''); load(); toast('已存入定存', 'success') } else toast(r.error, 'error')
  }
  const earlyWithdraw = async (id, amount) => {
    const r = await api('/api/investment/withdraw', { investmentId: id })
    if (r.success) { load(); toast(`提前贖回 $${r.refund}（損失利息）`, 'success') } else toast(r.error, 'error')
  }
  const fmtRemain = (ms) => {
    if (!ms || ms <= 0) return '已到期'
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000)
    if (h > 0) return `${h}小時${m}分`
    return `${m}分`
  }
  return (
    <>
      <div className="grid-3 mb-12">
        <div className="card"><div className="card-title">可用現金</div><div className="text-lg">${(info?.cash || 0).toLocaleString()}</div></div>
        <div className="card"><div className="card-title">活存餘額</div><div className="text-lg">${(info?.savings || 0).toLocaleString()}</div></div>
        <div className="card card-warn"><div className="card-title">目前債務</div><div className="text-lg">${(info?.totalDebt || 0).toLocaleString()}</div>
          {info?.interestPerMin > 0 && <div className="text-dim text-sm">利息 ${(info.interestPerMin).toLocaleString()}/分</div>}</div>
      </div>
      <div className="grid-2">
        <div className="card card-accent">
          <div className="card-title">活期存款 {((info?.savingsRate || 0.0005) * 1440 * 100).toFixed(2)}%/天 <span className="text-dim text-sm">（央行依市場熱度升降息）</span></div>
          <div className="text-dim text-sm" style={{marginTop:4}}>利息 <span className="text-accent">${Math.floor((info?.savings || 0) * (info?.savingsRate || 0.0005) * 1440).toLocaleString()}/天</span></div>
          <form onSubmit={e => { act(e, '/api/bank/deposit'); setTimeout(load, 600) }} className="flex gap-8 mt-12">
            <input name="amount" type="number" placeholder="存入金額" /><button className="btn btn-primary btn-sm">存入</button></form>
          <form onSubmit={e => { act(e, '/api/bank/withdraw'); setTimeout(load, 600) }} className="flex gap-8 mt-12">
            <input name="amount" type="number" placeholder="提取金額" /><button className="btn btn-sm">提取</button></form>
        </div>
        <div className="card card-accent">
          <div className="card-title">定存（到期自動贖回）</div>
          <div className="text-dim text-sm mt-12">選擇期限，利率隨期限提高</div>
          <div className="flex gap-8 flex-wrap mt-12">
            {(terms || []).map(t => (
              <button key={t.minutes} className={`btn btn-sm ${termMinutes === t.minutes ? 'btn-primary' : ''}`} onClick={() => setTermMinutes(t.minutes)}>
                {t.label} ({(t.rate * 1440 * 100).toFixed(2)}%/天)
              </button>
            ))}
          </div>
          <div className="flex gap-8 items-center mt-12">
            <input type="number" placeholder="定存金額" value={depAmount} onChange={e => setDepAmount(e.target.value)} style={{minWidth:120}} />
            <button className="btn btn-primary btn-sm" onClick={doDeposit}>存入</button>
          </div>
          {(deposits || []).length > 0 && <div className="divider" />}
          {(deposits || []).map(d => (
            <div className="stat" key={d.id}>
              <div>
                <span style={{fontWeight:600}}>${(d.amount || 0).toLocaleString()}</span>
                <span className="text-dim text-sm"> · {d.termLabel} · 剩 {fmtRemain(d.matureIn)}</span>
                <div className="text-dim text-sm">利息 <span className="text-accent">${Math.floor((d.amount || 0) * (d.rate || 0) * 1440).toLocaleString()}/天</span> · 已領 ${(d.totalPaid || 0).toLocaleString()}</div>
              </div>
              <button className="btn btn-sm" onClick={() => earlyWithdraw(d.id, d.amount)}>提前贖回</button>
            </div>
          ))}
        </div>
      </div>
      <div className="card card-warn mt-12">
        <div className="card-title">貸款 0.01%/分（約 14.4%/天）</div>
        <form onSubmit={e => { act(e, '/api/bank/borrow'); setTimeout(load, 600) }} className="flex gap-8 mt-12">
          <input name="amount" type="number" placeholder="借款金額" /><button className="btn btn-sm">借款</button></form>
        {(info?.loans || []).length > 0 && <div className="divider" />}
        {(info?.loans || []).map(l => (
          <div className="stat" key={l.id}>
            <span>欠款 <span style={{fontWeight:600}}>${(l.remaining || 0).toLocaleString()}</span></span>
            <button className="btn btn-sm" onClick={() => repay(l.id)}>還款</button>
          </div>
        ))}
      </div>
    </>
  )
}

function Invest({ api, toast, prompt }) {
  const [types, setTypes] = useState([])
  const [investments, setInvestments] = useState([])
  const [amounts, setAmounts] = useState({})
  const [tab, setTab] = useState('overview')
  const labels = { bond: '債券', index_fund: '指數基金', real_estate: '房地產', startup: '新創投資' }
  const icons = { bond: '📜', index_fund: '📊', real_estate: '🏠', startup: '🚀' }
  const colors = { bond: '#3b82f6', index_fund: '#8b5cf6', real_estate: '#f59e0b', startup: '#ef4444' }

  const refresh = () => {
    api('/api/investment/types').then(d => setTypes(Array.isArray(d) ? d : []))
    api('/api/investment/list').then(d => setInvestments(Array.isArray(d) ? d : []))
  }
  useEffect(() => { refresh() }, [])

  const inv = async (type) => {
    const a = parseInt(amounts[type]); if (!a || a <= 0) return
    const r = await api('/api/investment/invest', { type, amount: a })
    if (r.success) { setAmounts(p => ({...p, [type]: ''})); refresh(); toast('投資成功', 'success') }
    else toast(r.error, 'error')
  }
  const withdraw = async (id) => {
    const r = await api('/api/investment/withdraw', { investmentId: id })
    if (r.success) { refresh(); toast(`已贖回 $${r.refund}`, 'success') }
    else toast(r.error, 'error')
  }

  const totalInvested = (investments || []).reduce((s, i) => s + (i.amount || 0), 0)
  const totalDaily = (investments || []).reduce((s, i) => s + (i.dailyEarn || 0), 0)
  const totalPaid = (investments || []).reduce((s, i) => s + (i.totalPaid || 0), 0)
  const totalPending = (investments || []).reduce((s, i) => s + (i.amount || 0) + (i.pending_interest || 0), 0)

  const pieData = []
  const pieLabels = []
  const pieColors = []
  const byType = {}
  for (const inv of (investments || [])) { byType[inv.type] = (byType[inv.type] || 0) + (inv.amount || 0) }
  for (const [t, amt] of Object.entries(byType)) {
    if (amt > 0) { pieData.push(amt); pieLabels.push(labels[t] || t); pieColors.push(colors[t] || '#64748b') }
  }

  return (
    <>
      <div style={{display:'flex', gap:6, marginBottom:12}}>
        {[['overview', '📊 總覽'], ['invest', '💰 投資']].map(([k, v]) => (
          <button key={k} className={`btn btn-sm ${tab === k ? 'btn-primary' : ''}`} onClick={() => setTab(k)}>{v}</button>
        ))}
      </div>

      {tab === 'overview' && <>
        <div className="grid-3 mb-12">
          <div className="card" style={{borderLeft:'3px solid var(--accent)'}}>
            <div className="text-dim text-sm">總投入</div>
            <div style={{fontSize:22, fontWeight:700, color:'var(--text)', marginTop:4}}>${totalInvested.toLocaleString()}</div>
          </div>
          <div className="card" style={{borderLeft:'3px solid #10b981'}}>
            <div className="text-dim text-sm">每日收益</div>
            <div style={{fontSize:22, fontWeight:700, color:'#10b981', marginTop:4}}>+${totalDaily.toLocaleString()}</div>
          </div>
          <div className="card" style={{borderLeft:'3px solid #f59e0b'}}>
            <div className="text-dim text-sm">累計已領</div>
            <div style={{fontSize:22, fontWeight:700, color:'#f59e0b', marginTop:4}}>${totalPaid.toLocaleString()}</div>
          </div>
        </div>
        {pieData.length > 0 && <div className="card mb-12">
          <div className="card-title">📊 資產配置</div>
          <div style={{display:'flex', alignItems:'center', gap:20, flexWrap:'wrap'}}>
            <PieChart data={pieData} labels={pieLabels} colors={pieColors} size={160} />
            <div style={{flex:1, minWidth:200}}>
              <div className="text-dim text-sm mb-12">資產總值（含待領利息）</div>
              <div style={{fontSize:28, fontWeight:700, color:'var(--accent)'}}>${totalPending.toLocaleString()}</div>
              <div className="text-dim text-sm" style={{marginTop:4}}>待領利息 ${(totalPending - totalInvested).toLocaleString()}</div>
            </div>
          </div>
        </div>}
        {investments.length === 0 && <div className="card"><div className="text-dim" style={{textAlign:'center', padding:40}}>尚無投資，點擊「投資」開始配置資產</div></div>}
        {investments.length > 0 && <div className="card mb-12"><div className="card-title">💼 投資組合</div>
          {investments.map(inv => (
            <div className="stat" key={inv.id} style={{borderLeft:`3px solid ${colors[inv.type] || '#64748b'}`, paddingLeft:8, marginBottom:8}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                <div>
                  <span style={{fontWeight:600, color: colors[inv.type] || 'var(--text)'}}>{icons[inv.type] || '💰'} {inv.label || labels[inv.type]}</span>
                  <span className="text-dim text-sm" style={{marginLeft:8}}>${(inv.amount||0).toLocaleString()}</span>
                </div>
                <button className="btn btn-sm" onClick={() => withdraw(inv.id)}>贖回</button>
              </div>
              <div style={{display:'flex', gap:16, marginTop:4}}>
                <span className="text-dim text-sm">日收益 <span style={{color:'#10b981', fontWeight:600}}>${(inv.dailyEarn||0).toLocaleString()}</span></span>
                <span className="text-dim text-sm">已領 <span style={{color:'#f59e0b', fontWeight:600}}>${(inv.totalPaid||0).toLocaleString()}</span></span>
              </div>
            </div>
          ))}
        </div>}
      </>}

      {tab === 'invest' && <>
        <div className="grid-2 mb-12">
          {(types || []).filter(t => t.type !== 'deposit').map(t => (
            <div className="card" key={t.type} style={{borderLeft:`3px solid ${colors[t.type] || '#64748b'}`, opacity: t.unlocked ? 1 : 0.5}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                <div>
                  <div style={{fontWeight:700, fontSize:15, color: colors[t.type] || 'var(--text)'}}>{icons[t.type]} {t.label}</div>
                  <div className="text-dim text-sm" style={{marginTop:4}}>每日 {(t.rateMin*1440*100).toFixed(2)}~{(t.rateMax*1440*100).toFixed(2)}%</div>
                  <div className="text-dim text-sm">風險 {t.type === 'startup' ? '⚡ 高（每分鐘 0.3% 機率虧損 5~20% 本金，不可贖回）' : '🛡️ 低'}</div>
                </div>
                {t.unlocked
                  ? <div style={{display:'flex', gap:6, alignItems:'center'}}>
                      <input type="number" placeholder="金額" value={amounts[t.type] || ''} onChange={e => setAmounts(p => ({...p, [t.type]: e.target.value}))} style={{width:120}} />
                      <button className="btn btn-primary btn-sm" onClick={() => inv(t.type)}>投資</button>
                    </div>
                  : <div className="text-dim text-sm" style={{textAlign:'right'}}>
                      <div>🔒 需累計</div>
                      <div style={{fontWeight:600, color:'var(--warn)'}}>${(t.unlockEarned || 0).toLocaleString()}</div>
                    </div>}
              </div>
              {(() => { const filtered = investments.filter(i => i.type === t.type); if (filtered.length === 0) return null; const amt = filtered.reduce((s, i) => s + (i.amount||0), 0); const paid = filtered.reduce((s, i) => s + (i.totalPaid||0), 0); const pending = filtered.reduce((s, i) => s + (i.pending_interest||0), 0); return (
                <div style={{marginTop:8, paddingTop:8, borderTop:'1px solid var(--border)'}}>
                  <div style={{display:'flex', gap:16, flexWrap:'wrap'}}>
                    <span className="text-dim text-sm">持有 <span style={{color:'var(--accent)', fontWeight:600}}>${amt.toLocaleString()}</span></span>
                    <span className="text-dim text-sm">已賺 <span style={{color:'#10b981', fontWeight:600}}>${paid.toLocaleString()}</span></span>
                    <span className="text-dim text-sm">待領 <span style={{color:'#f59e0b', fontWeight:600}}>${pending.toLocaleString()}</span></span>
                  </div>
                </div>
              ); })()}
            </div>
          ))}
        </div>
      </>}
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

function Company({ api, toast, prompt, promptMulti }) {
  const [cs, setCs] = useState([]); const [employees, setEmployees] = useState([]); const [ipoList, setIpoList] = useState([])
  const [positions, setPositions] = useState([]); const [selectedCompany, setSelectedCompany] = useState(null)
  const [deptData, setDeptData] = useState(null); const [holdings, setHoldings] = useState([])
  const posLabels = { intern: '實習生', specialist: '專員', engineer: '工程師', manager: '經理', expert: '專家' }
  const POSITIONS_MAP = { intern: { salary: 3 }, specialist: { salary: 15 }, engineer: { salary: 50 }, manager: { salary: 130 }, expert: { salary: 350 } }
  const refresh = () => {
    api('/api/company/list').then(d => setCs(Array.isArray(d) ? d : []));
    api('/api/employee/positions').then(d => setPositions(Array.isArray(d) ? d : []));
    api('/api/company/ipo/list?my=1').then(d => setIpoList(Array.isArray(d) ? d : []));
    api('/api/stock/holdings').then(d => setHoldings(Array.isArray(d) ? d : []));
  }
  useEffect(() => { refresh() }, [])
  useEffect(() => { if (selectedCompany) { api('/api/employee/list?companyId=' + selectedCompany).then(d => setEmployees(Array.isArray(d) ? d : [])); api('/api/company/departments?companyId=' + selectedCompany).then(setDeptData) } }, [selectedCompany])
  const create = () => promptMulti('創建公司 ($200,000)', [
    { label: '公司名稱', placeholder: '輸入名稱', default: '' },
    { label: '產業類型', options: [
      { value: 'tech', label: '🔧 科技 (tech)' },
      { value: 'manufacturing', label: '🏭 製造 (manufacturing)' },
      { value: 'finance', label: '💰 金融 (finance)' },
      { value: 'service', label: '🛒 服務 (service)' },
    ], default: 'tech' },
  ], async ([name, industry]) => {
    if (!name) return toast('請輸入公司名稱', 'error')
    const ind = (industry || 'tech').trim().toLowerCase()
    const r = await api('/api/company/create', { name, industry: ind })
    if (r.success) { refresh(); toast('公司創建成功', 'success') } else toast(r.error, 'error')
  })
  const diluteCompany = (c) => {
    const remaining = Math.max(0, ((c.issue_cap || (c.total_shares || 0) * 2) - (c.total_shares || 0)))
    promptMulti(`增資 ${c.name}（單次上限總股本5%，價格不得高於市價，剩餘發行額度 ${remaining.toLocaleString()} 股）`, [
    { label: '發行股數 (≤' + (Math.max(1, Math.floor((c.total_shares || 100000) * 0.05))).toLocaleString() + ')', placeholder: '例: 1000', default: '' },
    { label: '發行價格 (≤市價 $' + (c.share_price || 10) + ')', placeholder: `${c.share_price || 10}`, default: '' },
  ], async ([shares, price]) => {
    const qty = parseInt(shares); if (!qty || qty <= 0) return toast('請輸入股數', 'error')
    const r = await api('/api/company/dilute', { companyId: c.id, shares: qty, price: parseInt(price) })
    if (r.success) { toast(`增資 ${qty} 股 @ $${r.pricePerShare}，獲得 $${r.revenue.toLocaleString()}`, 'success'); refresh() } else toast(r.error, 'error')
  })
}
const splitCompany = (c) => prompt(`拆分「${c.name}」？(股價÷N、持股自動×N、市值不變；費用 $50,000、24h 冷卻) 輸入 2/5/10`, async (v) => {
    const n = parseInt(v); if (![2, 5, 10].includes(n)) return toast('請輸入 2 / 5 / 10', 'error')
    const r = await api('/api/company/split', { companyId: c.id, ratio: n })
    if (r.success) { refresh(); toast(r.message || '拆分成功', 'success') } else toast(r.error, 'error')
  })
  const forceBuy = (c) => prompt(`強制收購 ${c.name} 其他股東的流通股？(市價×1.2 溢價) 輸入 yes 確認`, async (v) => {
    if ((v || '').trim().toLowerCase() !== 'yes') return toast('已取消', 'info')
    const r = await api('/api/company/forcebuy', { companyId: c.id })
    if (r.success) { refresh(); toast(`強制收購成功！支付 $${r.totalCost.toLocaleString()} 買回 ${r.totalShares.toLocaleString()} 股（含20%溢價）`, 'success') } else toast(r.error, 'error')
  })
  const hire = async (pos, qty) => {
    if (!selectedCompany) return toast('請先選擇公司', 'error')
    const deptId = deptData?.departments?.length > 0 ? deptData.departments[0].id : undefined
    const r = await api('/api/employee/hire', { position: pos, companyId: selectedCompany, quantity: qty || 1, departmentId: deptId })
    if (r.success) { api('/api/employee/list?companyId=' + selectedCompany).then(d => setEmployees(Array.isArray(d) ? d : [])); toast(`僱用 ${r.hired} 人`, 'success') }
    else toast(r.error, 'error')
  }
  const createDept = (type) => async () => {
    const r = await api('/api/company/department/create', { companyId: selectedCompany, type })
    if (r.success) { api('/api/company/departments?companyId=' + selectedCompany).then(setDeptData); toast('部門開設成功', 'success') } else toast(r.error, 'error')
  }
  const upgradeDept = async (id) => {
    const r = await api('/api/company/department/upgrade/' + id)
    if (r.success) { api('/api/company/departments?companyId=' + selectedCompany).then(setDeptData); toast('部門升級成功', 'success') } else toast(r.error, 'error')
  }
  const startIpo = (c) => {
    promptMulti('設定IPO參數', [
      { label: 'IPO價格 ($)', placeholder: '100', default: '100' },
      { label: '發行股數', placeholder: String(c.total_shares || 100000), default: String(c.total_shares || 100000) },
      { label: '創辦人保留 % (0~90)', placeholder: '60', default: '60' },
      { label: '認購時間 (分鐘)', placeholder: '60', default: '60' },
    ], async ([priceStr, sharesStr, founderStr, minStr]) => {
      const price = parseInt(priceStr) || 100
      const totalShares = parseInt(sharesStr) || (c.total_shares || 100000)
      const founderRatio = parseInt(founderStr) || 60
      const minutes = parseInt(minStr) || 60
      if (price < 10) return toast('價格至少$10', 'error')
      if (totalShares < 100 || totalShares > 100000) return toast('發行股數需 100~100,000', 'error')
      if (founderRatio < 0 || founderRatio > 90) return toast('保留比例 0~90%', 'error')
      if (minutes < 5 || minutes > 1440) return toast('時間5~1440分鐘', 'error')
      const r = await api('/api/company/ipo/start', { companyId: c.id, ipoPrice: price, totalShares, ipoMinutes: minutes, founderRatio: founderRatio / 100 })
      if (r.success) { refresh(); toast(`IPO啟動 $${price} × ${totalShares.toLocaleString()}股 / ${minutes}分鐘（創辦人保留 ${founderRatio}%）`, 'success') } else toast(r.error, 'error')
    })
  }
  const cancelIpo = (c) => prompt(`取消「${c.name}」的 IPO？(輸入 yes 確認)`, async (v) => {
    if ((v || '').trim().toLowerCase() !== 'yes') return toast('已取消', 'info')
    const r = await api('/api/company/ipo/cancel', { companyId: c.id })
    if (r.success) { refresh(); toast('IPO 已取消', 'success') } else toast(r.error, 'error')
  })
  const liquidate = (c) => prompt(`清算「${c.name}」可得 $${(c.liquidationValue || 0).toLocaleString()}？(公司將解散且股票下市，輸入 yes 確認)`, async (v) => {
    if ((v || '').trim().toLowerCase() !== 'yes') return toast('已取消', 'info')
    const r = await api('/api/company/liquidate', { companyId: c.id })
    if (r.success) { refresh(); toast(`公司已清算，獲得 $${r.payout.toLocaleString()}`, 'success') } else toast(r.error, 'error')
  })
  const heldOf = (companyId) => holdings.find(x => x.company_id === companyId)?.quantity || 0
  const delist = (c) => prompt(`下市「${c.name}」？(將自動以市價×1.2 強制收購其他股東持股，你的持股以市價兌現，公司本身保留，輸入 yes 確認)`, async (v) => {
    if ((v || '').trim().toLowerCase() !== 'yes') return toast('已取消', 'info')
    const r = await api('/api/company/delist', { companyId: c.id })
    if (r.success) { refresh(); toast(`「${c.name}」已下市${r.boughtBack > 0 ? `，強制收購 ${r.boughtBack.toLocaleString()} 股` : ''}${r.payout > 0 ? `，持股兌現 $${r.payout.toLocaleString()}` : ''}`, 'success') } else toast(r.error, 'error')
  })
  return (
    <>
      <div className="card mb-12">
        <div className="flex justify-between items-center">
          <div className="card-title" style={{margin:0}}>我的公司</div>
          <button className="btn btn-primary btn-sm" onClick={create}>+ 創建 ($200,000)</button>
        </div>
      </div>
      {(cs || []).map(c => <div className="card mb-12" key={c.id}>
        <div className="flex justify-between"><span className="text-accent" style={{fontWeight:600}}>{c.name}</span><span className="text-dim text-sm">{c.industry}</span></div>
        <div className="divider" />
        <div className="stat"><span className="stat-label">收入</span><span className="stat-value">${(c.income || 0).toLocaleString()}/分</span></div>
        <div className="stat"><span className="stat-label">成本</span><span className="stat-value">${(c.costs || 0).toLocaleString()}/分</span></div>
        <div className="stat"><span className="stat-label">淨利潤</span><span className="stat-value">${(c.profit || 0).toLocaleString()}/分</span></div>
        <div className="stat"><span className="stat-label">清算可得</span><span className="stat-value">${(c.liquidationValue || 0).toLocaleString()}</span></div>
        <div className="stat"><span className="stat-label">你持股</span><span className="stat-value">{(heldOf(c.id) || 0).toLocaleString()} 股</span></div>
        <div className="flex gap-8 mt-12">
          <button className={`btn btn-sm ${selectedCompany===c.id?'btn-primary':''}`} onClick={() => setSelectedCompany(c.id)}>選擇此公司</button>
          {(!c.phase || c.phase === 'pending') && <button className="btn btn-sm btn-warn" onClick={() => startIpo(c)}>🚀 IPO上市</button>}
          {(c.phase === 'ipo' || c.phase === 'queued' || c.phase === 'pending') && <button className="btn btn-sm btn-danger" onClick={() => cancelIpo(c)}>❌ 取消IPO</button>}
          {c.phase === 'trading' && <button className="btn btn-sm" onClick={() => diluteCompany(c)}>＋ 增資</button>}
          {c.phase === 'trading' && <button className="btn btn-sm" onClick={() => forceBuy(c)}>💼 強制收購</button>}
          {c.phase === 'trading' && <button className="btn btn-sm" onClick={() => splitCompany(c)}>✂️ 拆分</button>}
          {c.phase === 'trading' && <button className="btn btn-sm" onClick={() => delist(c)}>📉 下市</button>}
          <button className="btn btn-sm btn-danger" onClick={() => liquidate(c)}>🗑️ 清算</button>
        </div>
      </div>)}
      {selectedCompany && cs.length > 0 && <div className="card mb-12">
        <div className="card-title">🏢 部門 — {cs.find(c=>c.id===selectedCompany)?.name}</div>
        {(deptData?.departments || []).map(d => (
          <div className="stat" key={d.id}>
            <span className="text-accent" style={{fontWeight:600}}>{deptData.available?.[d.type]?.label || d.type} Lv.{d.level}</span>
            <button className="btn btn-sm" onClick={() => upgradeDept(d.id)}>升級</button>
          </div>
        ))}
        {(!deptData?.departments || deptData.departments.length === 0) && <div className="text-dim text-sm mb-12">尚未開設部門（部門提供員工效率加成）</div>}
        <div className="flex gap-8 flex-wrap mt-12">
          {deptData?.available && Object.entries(deptData.available).map(([type, info]) => (
            <button key={type} className="btn btn-sm" onClick={createDept(type)}>+ {info.label}</button>
          ))}
        </div>
      </div>}
      {selectedCompany && cs.length > 0 && <div className="card mb-12"><div className="card-title">僱用員工 — {cs.find(c=>c.id===selectedCompany)?.name}</div>
        <div className="grid-2 gap-12 mt-12">{(positions || []).map(p => (
          <div className="card" key={p.position} style={{padding:14}}>
            <div className="text-accent" style={{fontWeight:600}}>{p.label}</div>
            <div className="text-dim text-sm mt-12">費 ${p.hireCost.toLocaleString()} · 薪 ${p.salary}/分 · +{p.output}/分</div>
            <div className="flex gap-8 items-center mt-12">
              <button className="btn btn-sm" onClick={() => hire(p.position, 1)}>僱用1人</button>
              <button className="btn btn-sm" onClick={() => hire(p.position, 10)}>僱用10人</button>
              <button className="btn btn-sm" onClick={() => hire(p.position, 100)}>僱用100人</button>
            </div>
          </div>
        ))}</div>
      </div>}
      {employees.length > 0 && <div className="card"><div className="card-title">該公司員工 ({employees.length})</div>
        {Object.entries(employees.reduce((acc, e) => { acc[e.position] = (acc[e.position] || 0) + 1; return acc; }, {})).map(([pos, count]) => (
          <div className="stat" key={pos}>
            <span className="text-accent" style={{fontWeight:600, fontSize:13}}>{posLabels[pos] || pos} ×{count}</span>
            <span className="text-dim text-sm">薪 ${(POSITIONS_MAP[pos]?.salary || 0).toLocaleString()}/分</span>
          </div>
        ))}
      </div>}
    </>
  )
}

function IndexSparkline({ data }) {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || data.length < 2) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth, h = 60
    canvas.width = w * dpr; canvas.height = h * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)
    const vals = data.map(d => d.value)
    const min = Math.min(...vals), max = Math.max(...vals)
    const span = (max - min) || 1
    const pts = vals.map((v, i) => [i / (vals.length - 1) * w, h - 8 - (v - min) / span * (h - 20)])
    ctx.strokeStyle = vals[vals.length - 1] >= vals[0] ? 'var(--danger)' : 'var(--accent)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))
    ctx.stroke()
    const last = pts[pts.length - 1]
    ctx.fillStyle = ctx.strokeStyle
    ctx.beginPath(); ctx.arc(last[0], last[1], 3, 0, Math.PI * 2); ctx.fill()
  }, [data])
  return <canvas ref={ref} style={{ width: '100%', height: 60 }} />
}

function KLineChart({ api, timeframe = 'realtime', companyId = 1, livePrice = null }) {
  const [klines, setKlines] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [hoverIdx, setHoverIdx] = useState(null)
  const [hoverX, setHoverX] = useState(0)
  const canvasRef = useRef(null)
  const seqRef = useRef(0)
  const klineBufferRef = useRef([])

  // 即時模式: 用 API 輪詢價格合成 K 線
  useEffect(() => {
    if (timeframe !== 'realtime') return
    setLoaded(true)
    if (!livePrice) return
    const now = Date.now()
    const interval = 5000
    const block = Math.floor(now / interval) * interval
    const buf = klineBufferRef.current

    if (buf.length === 0 || buf[buf.length - 1].minute < block) {
      // 新的5秒block
      buf.push({ open: livePrice, high: livePrice, low: livePrice, close: livePrice, volume: 0, minute: block })
    } else {
      // 同一個block: 更新OHLC
      const k = buf[buf.length - 1]
      k.close = livePrice
      k.high = Math.max(k.high, livePrice)
      k.low = Math.min(k.low, livePrice)
    }
    setKlines([...buf.slice(-120)])
    setLoaded(true)
  }, [livePrice, timeframe])

  // 即時模式: 非即時模式: 從API抓聚合K線
  useEffect(() => {
    if (timeframe === 'realtime') return
    setLoaded(false)
    setKlines([])
    klineBufferRef.current = []
    const seq = ++seqRef.current
    const fetchKlines = () => {
      api(`/api/stock/klines/agg?interval=${timeframe === '1h' ? '3600000' : '300000'}&limit=120&companyId=${companyId}`).then(d => {
        if (seq !== seqRef.current || !Array.isArray(d)) return
        setKlines(d.slice(-120))
        setLoaded(true)
      }).catch(() => {})
    }
    fetchKlines()
    const id = setInterval(fetchKlines, 5000)
    return () => { clearInterval(id); seqRef.current++ }
  }, [timeframe, companyId])

  useEffect(() => {
    if (!canvasRef.current || klines.length === 0) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const w = canvas.clientWidth, h = canvas.clientHeight
    canvas.width = w * dpr; canvas.height = h * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    const padL = 50, padR = 10, padT = 10, padB = 30
    const cw = w - padL - padR
    const chPrice = Math.floor((h - padT - padB) * 0.7)
    const volTop = padT + chPrice + 14
    const chVol = h - padB - volTop
    const highs = klines.map(k => k.high ?? k.close)
    const lows = klines.map(k => k.low ?? k.close)
    const minP = Math.min(...lows), maxP = Math.max(...highs)
    const range = maxP - minP || 1
    const maxVol = Math.max(...klines.map(k => k.volume), 1)
    const y = (p) => padT + chPrice - ((p - minP) / range) * chPrice

    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const gy = padT + chPrice / 4 * i
      ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(w - padR, gy); ctx.stroke()
      ctx.fillStyle = '#475569'; ctx.font = '10px monospace'; ctx.textAlign = 'right'
      ctx.fillText(`$${(maxP - (range / 4) * i).toFixed(2)}`, padL - 6, gy + 4)
    }

    // K線蠟燭 + 成交量柱 (台灣慣例: 紅漲綠跌)
    const slot = cw / klines.length
    const barW = Math.max(Math.min(slot * 0.7, 9), 1.5)
    klines.forEach((k, i) => {
      const x = padL + slot * i + slot / 2
      const o = k.open ?? k.close, c = k.close, hi = k.high ?? c, lo = k.low ?? c
      const up = c >= o
      const col = up ? '#ef4444' : '#00ff41'
      // 影線
      ctx.strokeStyle = col; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(x, y(hi)); ctx.lineTo(x, y(lo)); ctx.stroke()
      // 實體
      const yo = y(o), yc = y(c)
      const top = Math.min(yo, yc), bh = Math.max(Math.abs(yc - yo), 1)
      ctx.fillStyle = col
      ctx.fillRect(x - barW / 2, top, barW, bh)
      // 成交量柱 (下方, 買=紅 賣=綠)
      if (k.volume > 0) {
        const vH = maxVol > 0 ? (k.volume / maxVol) * chVol : 0
        const buyV = k.buy_volume || 0
        const sellV = k.sell_volume || 0
        ctx.fillStyle = buyV >= sellV ? 'rgba(239,68,68,0.45)' : 'rgba(0,255,65,0.45)'
        ctx.fillRect(x - barW / 2, volTop + chVol - vH, barW, vH)
      }
    })

    // 成交量標籤
    ctx.fillStyle = '#475569'; ctx.font = '10px monospace'; ctx.textAlign = 'left'
    ctx.fillText(`量 ${maxVol.toLocaleString()}`, padL, volTop - 3)

    // 最新價點 + 標籤
    const last = klines[klines.length - 1]
    const lx = padL + slot * (klines.length - 1) + slot / 2
    const ly = y(last.close)
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'
    const label = `$${last.close.toFixed(2)}`
    const labelW = ctx.measureText(label).width
    ctx.textAlign = lx + 8 + labelW > w - padR ? 'right' : 'left'
    ctx.fillText(label, lx + (lx + 8 + labelW > w - padR ? -8 : 8), ly + 4)
  }, [klines])

  if (klines.length === 0) return <div className="text-dim">{loaded ? '尚無走勢資料' : '載入中...'}</div>
  const hk = hoverIdx != null ? klines[hoverIdx] : null
  const up = hk ? (hk.close >= hk.open) : true
  const upCol = up ? '#ef4444' : '#00ff41' // 台股: 紅漲綠跌
  const tipLeft = hoverX > 260 ? null : hoverX
  return (
    <div style={{position:'relative'}}>
      <canvas
        ref={canvasRef}
        style={{width:'100%',height:280,display:'block',background:'#0d1117',borderRadius:8,border:'1px solid #1e293b',cursor:'crosshair'}}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const x = e.clientX - rect.left - 50
          const slot = (rect.width - 60) / klines.length
          const idx = Math.floor(x / slot)
          setHoverIdx(idx >= 0 && idx < klines.length ? idx : null)
          setHoverX(e.clientX - rect.left + 8)
        }}
        onMouseLeave={() => setHoverIdx(null)}
      />
      {hk && (
        <div style={{
          position:'absolute', top:10, left: tipLeft ?? 'auto', right: tipLeft == null ? 10 : 'auto', pointerEvents:'none',
          background:'rgba(13,17,23,0.95)', border:`1px solid ${upCol}`,
          borderRadius:6, padding:'6px 10px', fontSize:12, fontFamily:'monospace', whiteSpace:'nowrap', zIndex:5,
        }}>
          <div style={{color: upCol, fontWeight:700}}>{up ? '▲' : '▼'} 開 ${hk.open} · 收 ${hk.close}</div>
          <div style={{color:'#94a3b8'}}>高 ${hk.high} · 低 ${hk.low}</div>
          <div style={{color: upCol}}>量 {(hk.volume || 0).toLocaleString()} 股</div>
        </div>
      )}
    </div>
  )
}

function ETF({ api, toast }) {
  const [etfs, setEtfs] = useState([])
  const [etfQty, setEtfQty] = useState('')
  const [indexData, setIndexData] = useState(null)

  const refresh = () => {
    api('/api/etf/list').then(d => setEtfs(Array.isArray(d) ? d : []))
    api('/api/stock/index').then(d => { if (d) setIndexData(d) }).catch(() => {})
  }
  useEffect(() => { refresh() }, [])
  useEffect(() => { const id = setInterval(refresh, 5000); return () => clearInterval(id) }, [])

  const etfBuy = async (e) => {
    const qty = parseInt(etfQty); if (!qty || qty <= 0) return toast('請輸入數量', 'error')
    const r = await api('/api/etf/buy', { etfId: e.id, quantity: qty })
    if (r.success) { toast(`買入 ${e.name} ${qty} 單位 @ $${r.fillPrice}`, 'success'); setEtfQty(''); refresh() } else toast(r.error, 'error')
  }
  const etfSell = async (e) => {
    const qty = parseInt(etfQty); if (!qty || qty <= 0) return toast('請輸入數量', 'error')
    const r = await api('/api/etf/sell', { etfId: e.id, quantity: qty })
    if (r.success) { toast(`賣出 ${e.name} ${qty} 單位 @ $${r.fillPrice}（實收 $${r.netRevenue.toLocaleString()}）`, 'success'); setEtfQty(''); refresh() } else toast(r.error, 'error')
  }

  return (
    <>
      {indexData && <div className="card mb-12">
        <div className="flex justify-between items-center">
          <div className="card-title" style={{margin:0}}>📊 大盤指數（{indexData.stocks} 檔上市）</div>
          <div style={{fontSize:20, fontWeight:700}} className={indexData.change >= 0 ? 'text-danger' : 'text-accent'}>
            {indexData.value.toLocaleString()} <span style={{fontSize:13}}>{indexData.change >= 0 ? '▲' : '▼'} {Math.abs(indexData.change)}（{(indexData.value > 0 ? (indexData.change / (indexData.value - indexData.change) * 100) : 0).toFixed(2)}%）</span>
          </div>
        </div>
        {indexData.timeline?.length > 1 && <IndexSparkline data={indexData.timeline} />}
      </div>}
      <div className="card mb-12">
        <div className="card-title">📦 ETF（封閉式 · 追蹤大盤指數）</div>
        <div className="text-dim text-sm mb-12">單位價 = 指數 × $0.01（指數 1000 → $10）· 手續費 0.5% · 與系統交易</div>
        {etfs.length === 0 && <div className="text-dim text-sm">載入中...</div>}
        {etfs.map(e => (
          <div className="stat" key={e.id}>
            <span>
              <span className="text-accent" style={{fontWeight:600}}>{e.name}（{e.symbol}）</span> · 單位價 <strong>${e.price}</strong>（指數 {e.index.toLocaleString()}）
              <div className="text-dim text-sm">庫存 {e.inventory.toLocaleString()} · 流通 {e.circulating.toLocaleString()} · 單筆上限 {e.maxTrade.toLocaleString()} · 你持有 <span className="text-accent">{e.myHolding.toLocaleString()}</span> 單位</div>
            </span>
            <span style={{display:'flex', gap:6, alignItems:'center'}}>
              <input type="number" placeholder="數量" value={etfQty} onChange={ev => setEtfQty(ev.target.value)} style={{width:90}} />
              <button className="btn btn-primary btn-sm" onClick={() => etfBuy(e)}>買入</button>
              <button className="btn btn-sm" onClick={() => etfSell(e)}>賣出</button>
            </span>
          </div>
        ))}
      </div>
    </>
  )
}

function Futures({ api, toast }) {
  const [index, setIndex] = useState(null)
  const [futData, setFutData] = useState({ currentIndex: 0, items: [] })
  const [futDir, setFutDir] = useState('long')
  const [futTerm, setFutTerm] = useState('60')
  const [futContracts, setFutContracts] = useState('1')

  const refresh = () => {
    api('/api/stock/index').then(d => { if (d) setIndex(d) }).catch(() => {});
    api('/api/futures/list').then(d => { if (d) setFutData(d) }).catch(() => {});
  }
  useEffect(() => { refresh() }, [])
  useEffect(() => {
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [])

  const openFuture = async () => {
    const n = parseInt(futContracts)
    if (!n || n <= 0) return toast('請輸入張數', 'error')
    const r = await api('/api/futures/open', { direction: futDir, termMinutes: parseInt(futTerm), contracts: n })
    if (r.success) { toast(r.message || '已進場', 'success'); refresh() } else toast(r.error, 'error')
  }
  const fmtCountdown = (settleAt) => {
    const ms = settleAt - Date.now()
    if (ms <= 0) return '結算中'
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000)
    return h > 0 ? `${h}時${m}分` : `${m}分${s}秒`
  }
  const futPremium = (futData.currentIndex || 1000) * 1 * (parseInt(futContracts) || 0) * 0.05

  return (
    <>
      {index && <div className="card mb-12">
        <div className="flex justify-between items-center">
          <div className="card-title" style={{margin:0}}>📊 大盤指數（{index.stocks} 檔上市）</div>
          <div style={{fontSize:22, fontWeight:700}} className={index.change >= 0 ? 'text-danger' : 'text-accent'}>
            {index.value.toLocaleString()} <span style={{fontSize:13}}>{index.change >= 0 ? '▲' : '▼'} {Math.abs(index.change)}（{(index.value > 0 ? (index.change / (index.value - index.change) * 100) : 0).toFixed(2)}%）</span>
          </div>
        </div>
        {index.timeline?.length > 1 && <IndexSparkline data={index.timeline} />}
        <div className="text-dim text-sm mt-12">期貨結算標的：到期時以當下指數結算損益</div>
      </div>}

      <div className="card mb-12">
        <div className="card-title">⏳ 指數期貨（做多/做空大盤）</div>
        <div className="text-dim text-sm mb-12">權利金 = 契約值 5%（契約值 = 指數 × $1/點 × 張數）· 最大虧損 = 權利金 · 到期自動結算</div>
        <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}} className="mb-12">
          <select value={futDir} onChange={e => setFutDir(e.target.value)} className="select-sm">
            <option value="long">🟢 做多（賭指數漲）</option>
            <option value="short">🔴 做空（賭指數跌）</option>
          </select>
          <select value={futTerm} onChange={e => setFutTerm(e.target.value)} className="select-sm">
            <option value="60">1 小時</option>
            <option value="360">6 小時</option>
            <option value="1440">24 小時</option>
          </select>
          <input type="number" placeholder="張數" value={futContracts} onChange={e => setFutContracts(e.target.value)} style={{width:80}} />
          <button className="btn btn-primary btn-sm" onClick={openFuture}>進場</button>
          <span className="text-dim text-sm">預估權利金：<strong className="text-accent">${Math.round(futPremium).toLocaleString()}</strong></span>
        </div>
        {futData.items?.filter(f => f.status === 'open').length > 0 && <>
          <div className="divider" />
          <div className="text-sm text-accent" style={{fontWeight:600, marginBottom:6}}>持有中</div>
          {futData.items.filter(f => f.status === 'open').map(f => (
            <div className="stat" key={f.id}>
              <span>{f.direction === 'long' ? '🟢 做多' : '🔴 做空'} {f.contracts} 張 · 進場指數 {f.entry_index} · 權利金 ${f.premium.toLocaleString()}</span>
              <span className="text-dim text-sm">剩餘 {fmtCountdown(f.settle_at)}</span>
            </div>
          ))}
        </>}
        {futData.items?.filter(f => f.status === 'settled').length > 0 && <>
          <div className="divider" />
          <div className="text-sm text-accent" style={{fontWeight:600, marginBottom:6}}>已結算</div>
          {futData.items.filter(f => f.status === 'settled').slice(0, 10).map(f => (
            <div className="stat" key={f.id}>
              <span>{f.direction === 'long' ? '🟢 做多' : '🔴 做空'} {f.contracts} 張 · 指數 {f.entry_index} → {f.settle_index}</span>
              <span className={f.pnl > 0 ? 'text-danger' : 'text-dim'} style={{fontWeight:600}}>{f.pnl > 0 ? `+$${f.pnl.toLocaleString()}` : '虧損（權利金損失）'}</span>
            </div>
          ))}
        </>}
      </div>
    </>
  )
}

function Trading({ api, toast, prompt, user }) {
  const [tab, setTab] = useState('stock')
  const subTabs = [['stock', '📈 股票'], ['futures', '⏳ 期貨'], ['etf', '📦 ETF']]
  return (
    <>
      <div style={{display:'flex', gap:6, marginBottom:12}}>
        {subTabs.map(([k, v]) => (
          <button key={k} className={`btn btn-sm ${tab === k ? 'btn-primary' : ''}`} onClick={() => setTab(k)}>{v}</button>
        ))}
      </div>
      {tab === 'stock' && <Stock api={api} toast={toast} prompt={prompt} user={user} />}
      {tab === 'futures' && <Futures api={api} toast={toast} />}
      {tab === 'etf' && <ETF api={api} toast={toast} />}
    </>
  )
}

function Stock({ api, toast, prompt, user }) {
  const [q, setQ] = useState(null); const [h, setH] = useState([]); const [t, setT] = useState([]); const [myTrades, setMyTrades] = useState([]); const [ipo, setIpo] = useState(null)
  const [pnlData, setPnlData] = useState({ stocks: [], totalPnl: 0 })
  const [positions, setPositions] = useState([])
  const [marginType, setMarginType] = useState('long')
  const [marginQty, setMarginQty] = useState('')
  const [marginLev, setMarginLev] = useState('2')
  const [chartTimeframe, setChartTimeframe] = useState('realtime')
  const [limitInfo, setLimitInfo] = useState(null)
  const [orders, setOrders] = useState([])
  const [report, setReport] = useState(null)
  const [ordType, setOrdType] = useState('buy')
  const [ordPrice, setOrdPrice] = useState('')
  const [ordQty, setOrdQty] = useState('')
  const [selectedStock, setSelectedStock] = useState(1)
  const [stockList, setStockList] = useState([])
  const [indexData, setIndexData] = useState(null)

  // 即時股價 WebSocket
  const wsUrl = typeof window !== 'undefined' ? `wss://${window.location.host}/ws/market/subscribe` : null
  const { prices: livePrices, connected: wsConnected } = useMarketStream(null, api)

  // 即時更新股價到 stockList (不用等 5 秒 polling)
  useEffect(() => {
    if (!livePrices || Object.keys(livePrices).length === 0) return
    setStockList(prev => prev.map(s => livePrices[s.id] ? { ...s, price: livePrices[s.id] } : s))
  }, [livePrices])

  const stockNames = { 1: '地球互動科技 001', 10: '深海科技 002', 12: '銀河金融 003', 13: '星雲生技 004', 14: '黑洞能源 005', 15: '元界科技 006' }

  const fmtRemain = (ms) => {
    if (!ms || ms <= 0) return '已到期'
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000)
    if (h > 0) return `${h}小時${m}分`
    return `${m}分${Math.floor((ms % 60000) / 1000)}秒`
  }

  // 漲跌停固定顯示: 觸發後顯示 60 秒
  useEffect(() => {
    if (!limitInfo) return
    const t = setTimeout(() => setLimitInfo(null), 60000)
    return () => clearTimeout(t)
  }, [limitInfo])
  const markLimit = (r, side) => { if (r?.limitHit) setLimitInfo({ side, at: Date.now() }) }

  useEffect(() => {
    api('/api/company/ipo/list').then(d => {
      if (!Array.isArray(d)) return
      const list = d.filter(c => ['trading', 'ipo'].includes(c.phase)).map(c => ({
        id: c.id,
        code: c.code,
        name: (stockNames[c.id] || c.name),
        phase: c.phase
      }))
      if (list.length === 0) list.push({ id: 1, code: '001', name: '地球互動科技', phase: 'trading' })
      setStockList(list)
      if (!list.find(s => s.id === selectedStock) && list.length > 0) setSelectedStock(list[0].id)
    }).catch(() => {})
  }, [])

  const refreshStock = () => {
    api('/api/stock/dashboard?companyId=' + selectedStock).then(d => {
      if (!d || d.error) return
      setQ(d.quote)
      setH(Array.isArray(d.holdings) ? d.holdings : [])
      setT(Array.isArray(d.trades) ? d.trades : [])
      setMyTrades(Array.isArray(d.myTrades) ? d.myTrades : [])
      setPositions(Array.isArray(d.marginPositions) ? d.marginPositions : [])
      setIpo(d.ipo)
      setOrders(Array.isArray(d.orders) ? d.orders : [])
    }).catch(() => {})
  }
  const refreshHeavy = () => {
    api('/api/stock/report?companyId=' + selectedStock).then(d => { if (d && !d.error) setReport(d) }).catch(() => {})
    api('/api/stock/index').then(d => { if (d) setIndexData(d) }).catch(() => {})
    api('/api/stock/pnl').then(d => setPnlData(d || { stocks: [], totalPnl: 0 })).catch(() => {})
  }
  useEffect(() => { refreshStock(); refreshHeavy() }, [selectedStock])
  useEffect(() => {
    const fast = setInterval(refreshStock, 15000)
    const slow = setInterval(refreshHeavy, 30000)
    return () => { clearInterval(fast); clearInterval(slow) }
  }, [selectedStock])
  const buy = async () => {
    const fresh = await api('/api/stock/quote?companyId=' + selectedStock)
    if (fresh?.price) setQ(fresh)
    prompt(`買入股數 (手續費0.5%另計 · 單筆上限 ${(q?.maxTrade || 0).toLocaleString()} 股)`, async (n) => {
      const qty = parseInt(n); if (!qty || qty <= 0) return
      const r = await api('/api/stock/buy', { companyId: selectedStock, quantity: qty })
      if (r.success) { refreshStock(); refreshHeavy(); markLimit(r, 'up'); toast(`買入 ${qty} 股 @ $${r.fillPrice}${r.afterPrice && r.afterPrice !== r.fillPrice ? `（成交後市價 $${r.afterPrice}）` : ''} (含手續費 $${(r.totalCost - (r.fillPrice * qty)).toLocaleString()})`, r.limitHit ? 'info' : 'success') } else toast(r.error, 'error')
    }, async (v) => {
      const qty = parseInt(v) || 0
      if (qty <= 0) return ''
      const live = await api('/api/stock/quote?companyId=' + selectedStock).catch(() => null)
      const cur = live?.price || q?.price || 0
      const ratio = qty / ((q?.circulating || 0) + qty)
      const imp = Math.min(Math.sqrt(ratio) * 0.15, 0.05)
      const afterP = Math.round(cur * (1 + imp))
      return `市價 $${cur} → 影響約 +${(imp * 100).toFixed(1)}% → 成交價約 $${afterP}；預估總額：$${(afterP * qty).toLocaleString()} + 手續費 $${Math.round(afterP * qty * 0.005).toLocaleString()}`
    })
  }
  const sell = async () => {
    const fresh = await api('/api/stock/quote?companyId=' + selectedStock)
    if (fresh?.price) setQ(fresh)
    prompt(`賣出股數 (手續費0.5%另計 · 大單滑點 · 單筆上限 ${(q?.maxTrade || 0).toLocaleString()} 股)`, async (n) => {
      const qty = parseInt(n); if (!qty || qty <= 0) return
      const r = await api('/api/stock/sell', { companyId: selectedStock, quantity: qty })
      if (r.success) { refreshStock(); refreshHeavy(); markLimit(r, 'down'); toast(`賣出 ${qty} 股 @ $${r.fillPrice}${r.afterPrice && r.afterPrice !== r.fillPrice ? `（成交後市價 $${r.afterPrice}）` : ''} (實收 $${r.netRevenue.toLocaleString()})`, r.limitHit ? 'info' : 'success') } else toast(r.error, 'error')
    }, async (v) => {
      const qty = parseInt(v) || 0
      if (qty <= 0) return ''
      const live = await api('/api/stock/quote?companyId=' + selectedStock).catch(() => null)
      const cur = live?.price || q?.price || 0
      const ratio = qty / ((q?.circulating || 0) + qty)
      const imp = Math.min(Math.sqrt(ratio) * 0.15, 0.05)
      const afterP = Math.max(1, Math.round(cur * (1 - imp)))
      return `市價 $${cur} → 影響約 -${(imp * 100).toFixed(1)}% → 成交價約 $${afterP}；預估實收：$${Math.round(afterP * qty * 0.995).toLocaleString()}（扣手續費）`
    })
  }
  const maxBuy = async () => {
    const price = q?.price || 0
    if (price <= 0) return
    const availableFunds = (user?.cash || 0) + (user?.savings || 0)
    const maxByCash = Math.floor(availableFunds / (price * 1.005))
    const maxByInv = q?.systemInventory || 0
    const n = Math.max(0, Math.min(maxByCash, maxByInv))
    if (n <= 0) return toast('現金或庫存不足', 'error')
    toast(`買入 ${n.toLocaleString()} 股`, 'info')
    const r = await api('/api/stock/buy', { companyId: selectedStock, quantity: n, force: true })
    if (r.success) { refreshStock(); refreshHeavy(); markLimit(r, 'up'); toast(`買入 ${n} 股 @ $${r.fillPrice}${r.afterPrice && r.afterPrice !== r.fillPrice ? `（成交後市價 $${r.afterPrice}）` : ''} (含手續費 $${(r.totalCost - (r.fillPrice * n)).toLocaleString()})`, r.limitHit ? 'info' : 'success') } else toast(r.error, 'error')
  }
  const maxSell = async () => { const held = h.find(x => x.company_id === selectedStock); const cap = q?.maxTrade || 0; const n = Math.min(held?.quantity || 0, cap); if (n <= 0) return; toast(`賣出 ${n.toLocaleString()} 股（單筆上限 ${cap.toLocaleString()} 股）`, 'info'); const r = await api('/api/stock/sell', { companyId: selectedStock, quantity: n, force: true }); if (r.success) { refreshStock(); refreshHeavy(); markLimit(r, 'down'); toast(`賣出 ${n} 股 @ $${r.fillPrice}${r.afterPrice && r.afterPrice !== r.fillPrice ? `（成交後市價 $${r.afterPrice}）` : ''} (實收 $${r.netRevenue.toLocaleString()})`, r.limitHit ? 'info' : 'success') } else toast(r.error, 'error') }
  const subIpo = () => prompt('認購股數', async (s) => { const r = await api('/api/stock/ipo/subscribe', { companyId: selectedStock, shares: parseInt(s) }); if (r.success) { toast(`認購 ${s} 股成功`, 'success'); refreshStock() } else toast(r.error, 'error') })
  const openMargin = async () => {
    const qty = parseInt(marginQty); const lev = parseInt(marginLev)
    if (!qty || qty <= 0) return toast('請輸入股數', 'error')
    const r = await api('/api/stock/margin/open', { companyId: selectedStock, quantity: qty, leverage: lev, type: marginType });
    if (r.success) { toast(`${marginType === 'long' ? '做多' : '做空'}成功，保證金 $${r.marginAmount.toLocaleString()}`, 'success'); setMarginQty(''); api('/api/stock/margin/positions').then(d => setPositions(Array.isArray(d)?d:[])); api('/api/stock/quote?companyId=' + selectedStock).then(setQ); api('/api/stock/holdings').then(setH); refreshHeavy() }
    else toast(r.error, 'error')
  }
  const closePos = async (id) => {
    const r = await api('/api/stock/margin/close/' + id)
    if (r.success) { toast('平倉成功', 'success'); api('/api/stock/margin/positions').then(d => setPositions(Array.isArray(d)?d:[])); api('/api/stock/quote?companyId=' + selectedStock).then(setQ); api('/api/stock/holdings').then(setH); refreshHeavy() }
    else toast(r.error, 'error')
  }
  const addMargin = async (p) => {
    const cur = q?.price || 0
    const need = p.type === 'long'
      ? Math.max(0, Math.ceil((p.loan_amount * 1.15 - (p.extra_margin||0) - cur * p.quantity) / 1))
      : Math.max(0, Math.ceil((cur * p.quantity * 1.15 - p.loan_amount - p.margin_amount - (p.extra_margin||0) + p.dividend_debt) / 1))
    const amount = Math.min(need || 0, user?.cash || 0)
    if (amount <= 0) return toast('現金不足或已達標', 'info')
    const r = await api('/api/stock/margin/add', { positionId: p.id, amount })
    if (r.success) { toast(`自動補繳 $${amount.toLocaleString()}！維持率 → ${r.maintenanceRate}%`, 'success'); api('/api/stock/margin/positions').then(d => setPositions(Array.isArray(d)?d:[])) }
    else toast(r.error, 'error')
  }
  const placeOrder = async () => {
    const p = parseFloat(ordPrice); const n = parseInt(ordQty)
    if (!p || p <= 0) return toast('請輸入掛單價格', 'error')
    if (!n || n <= 0) return toast('請輸入股數', 'error')
    const r = await api('/api/stock/order/place', { companyId: selectedStock, type: ordType, price: p, quantity: n })
    if (r.success) { toast(r.message || '掛單成功', 'success'); setOrdPrice(''); setOrdQty(''); api('/api/stock/order/list').then(d => setOrders(Array.isArray(d) ? d : [])) }
    else toast(r.error, 'error')
  }
  const cancelOrder = async (id) => {
    const r = await api('/api/stock/order/cancel/' + id)
    if (r.success) { toast('掛單已取消', 'success'); api('/api/stock/order/list').then(d => setOrders(Array.isArray(d) ? d : [])) }
    else toast(r.error, 'error')
  }

  return (
    <>
      {/* 頂部: 大盤指數 + 股票選擇 */}
      {indexData && <div className="card mb-12" style={{padding:'10px 14px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <span className="text-dim text-sm">📊 大盤 {indexData.stocks} 檔</span>
          <span style={{fontSize:18, fontWeight:700}} className={indexData.change >= 0 ? 'text-danger' : 'text-accent'}>
            {indexData.value.toLocaleString()}
            <span style={{fontSize:12, marginLeft:6}}>{indexData.change >= 0 ? '▲' : '▼'} {Math.abs(indexData.change)}（{(indexData.value > 0 ? (indexData.change / (indexData.value - indexData.change) * 100) : 0).toFixed(2)}%）</span>
          </span>
        </div>
      </div>}
      <div style={{display:'flex', gap:6, marginBottom:12, overflowX:'auto', paddingBottom:4, alignItems:'center'}}>
        <span title={wsConnected ? '即時連線中' : '輪詢模式'} style={{width:8, height:8, borderRadius:'50%', background: wsConnected ? '#22c55e' : '#ef4444', flexShrink:0}} />
        {stockList.map(s => (
          <button key={s.id} className={`btn btn-sm ${selectedStock === s.id ? 'btn-primary' : ''}`} onClick={() => setSelectedStock(s.id)} style={{whiteSpace:'nowrap', fontSize:11}}>
            {s.code ? `${s.code} ` : ''}{s.name.split(' ')[0]}{s.phase === 'ipo' ? ' 🚀' : s.phase === 'queued' ? ' 📋' : ''}
          </button>
        ))}
      </div>

      {/* 財報 (置頂) */}
      {ipo?.phase !== 'ipo' && report && <div className="card mb-12">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
          <span style={{fontWeight:600, fontSize:13}}>📋 {report.code ? `${report.code} ` : ''}{report.name}</span>
          {report.rating && <span style={{padding:'2px 8px', borderRadius:99, fontSize:11, fontWeight:700, color:'#fff', background: report.rating === 'S' ? '#dc2626' : report.rating === 'A' ? '#ea580c' : report.rating === 'B' ? '#ca8a04' : '#64748b'}}>{report.rating}</span>}
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:8, marginBottom:8}}>
          <div style={{textAlign:'center'}}><div className="text-dim" style={{fontSize:10}}>收入/分</div><div style={{fontWeight:600, fontSize:13}}>${(report.incomeRate || 0).toLocaleString()}</div></div>
          <div style={{textAlign:'center'}}><div className="text-dim" style={{fontSize:10}}>淨利潤/分</div><div style={{fontWeight:600, fontSize:13, color: report.profitRate >= 0 ? 'var(--accent)' : 'var(--danger)'}}>${(report.profitRate || 0).toLocaleString()}</div></div>
          <div style={{textAlign:'center'}}><div className="text-dim" style={{fontSize:10}}>本益比</div><div style={{fontWeight:600, fontSize:13}}>{report.pe !== null && report.pe !== undefined ? report.pe.toFixed(1) : '—'}</div></div>
          <div style={{textAlign:'center'}}><div className="text-dim" style={{fontSize:10}}>殖利率</div><div style={{fontWeight:600, fontSize:13, color: report.yieldPctDaily > 0.002 ? 'var(--accent)' : 'inherit'}}>{(report.yieldPctDaily * 100).toFixed(2)}%</div></div>
        </div>
        <div style={{display:'flex', gap:12, flexWrap:'wrap', fontSize:11}}>
          <span className="text-dim">市值 ${report.marketCap ? report.marketCap.toLocaleString() : 0}</span>
          <span className="text-dim">24h <span style={{color: report.growthPct >= 0 ? 'var(--accent)' : 'var(--danger)'}}>{report.growthPct !== null ? (report.growthPct >= 0 ? '+' : '') + (report.growthPct * 100).toFixed(1) + '%' : '—'}</span></span>
          <span className="text-dim">趨勢 <span style={{color: report.trend === 'up' ? 'var(--danger)' : report.trend === 'down' ? 'var(--accent)' : 'var(--text-secondary)'}}>{report.trend === 'up' ? '▲強' : report.trend === 'down' ? '▼弱' : '—持平'}</span></span>
          <span className="text-dim">24h量 {(report.volume24h || 0).toLocaleString()}</span>
        </div>
        {report.analysis && <div className="text-dim" style={{marginTop:8, fontSize:12, lineHeight:1.6, background:'var(--bg2)', padding:'8px 10px', borderRadius:6}}>🔍 {report.analysis}</div>}
      </div>}

      {/* IPO 認購 */}
      {ipo?.phase === 'ipo' && <div className="card mb-12" style={{borderColor:'var(--warn)'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <span style={{fontWeight:700, color:'var(--warn)'}}>🚀 IPO 認購中</span>
            <span className="text-dim text-sm" style={{marginLeft:8}}>${ipo.price || 100}/股</span>
          </div>
          <span className="text-dim text-sm">{fmtRemain(ipo.remainMs)}</span>
        </div>
        <div style={{background:'var(--bg2)', borderRadius:4, height:6, marginTop:8, overflow:'hidden'}}>
          <div style={{background:'var(--warn)', height:'100%', borderRadius:4, width:`${Math.min(100, ((ipo.subscribed||0)/(ipo.maxSubscribed||1))*100)}%`, transition:'width 0.3s'}} />
        </div>
        <div style={{display:'flex', justifyContent:'space-between', marginTop:4}}>
          <span className="text-dim text-sm">{(ipo.subscribed||0).toLocaleString()} / {(ipo.maxSubscribed||0).toLocaleString()}</span>
          <span className="text-dim text-sm">你 {(ipo.myShares||0).toLocaleString()} 股</span>
        </div>
        <button className="btn btn-sm mt-12" onClick={subIpo} disabled={ipo.isFull} style={{width:'100%', ...(ipo.isFull ? {opacity:0.5} : {})}}>{ipo.isFull ? '已滿' : '認購'}</button>
      </div>}

      {/* 主要交易區 */}
      {ipo?.phase !== 'ipo' && q && <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12}}>
        {/* 左側: 價格 + 走勢圖 */}
        <div>
          <div className="card" style={{marginBottom:0}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
              <div>
                <div style={{fontSize:28, fontWeight:700}}>${q.price}</div>
                {q.limit && <span style={{fontSize:11, color: q.limit === 'circuit_break' ? '#f59e0b' : q.limit === 'up' ? '#ef4444' : '#00ff41', fontWeight:600}}>⚠️ {q.limit === 'circuit_break' ? '熔斷暫停' : q.limit === 'up' ? '漲停' : '跌停'}</span>}
              </div>
              <div style={{textAlign:'right'}}>
                <div className="text-dim text-sm">流通 {(q.circulating||0).toLocaleString()}</div>
                <div className="text-dim text-sm">上限 {(q.maxTrade||0).toLocaleString()} 股</div>
              </div>
            </div>
            <div style={{display:'flex', gap:6, marginTop:10}}>
              <button className="btn btn-primary btn-sm" onClick={buy} disabled={q.limit === 'up' || q.limit === 'circuit_break'} style={{flex:1, ...((q.limit === 'up' || q.limit === 'circuit_break') ? {opacity:0.5} : {})}}>買入</button>
              <button className="btn btn-sm" onClick={sell} disabled={q.limit === 'down' || q.limit === 'circuit_break'} style={{flex:1, ...((q.limit === 'down' || q.limit === 'circuit_break') ? {opacity:0.5} : {})}}>賣出</button>
              <button className="btn btn-sm" onClick={maxBuy} disabled={q.limit === 'up' || q.limit === 'circuit_break'} style={{fontSize:10, ...((q.limit === 'up' || q.limit === 'circuit_break') ? {opacity:0.5} : {})}}>全買</button>
              <button className="btn btn-sm" onClick={maxSell} disabled={q.limit === 'down' || q.limit === 'circuit_break'} style={{fontSize:10, ...((q.limit === 'down' || q.limit === 'circuit_break') ? {opacity:0.5} : {})}}>全賣</button>
            </div>
          </div>
          <div className="card" style={{marginTop:12}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
              <span style={{fontWeight:600, fontSize:13}}>📈 走勢圖</span>
              <div style={{display:'flex', gap:4}}>
                {[['realtime', '即時'], ['5m', '5分'], ['1h', '1時']].map(([k, v]) => (
                  <button key={k} className={`btn btn-sm ${chartTimeframe === k ? 'btn-primary' : ''}`} onClick={() => setChartTimeframe(k)} style={{fontSize:10, padding:'2px 8px'}}>{v}</button>
                ))}
              </div>
            </div>
            {limitInfo && <div style={{padding:'8px 10px', borderRadius:6, marginBottom:8, fontWeight:600, fontSize:12, background: limitInfo.side === 'up' ? 'rgba(239,68,68,0.12)' : limitInfo.side === 'circuit_break' ? 'rgba(245,158,11,0.12)' : 'rgba(0,255,65,0.12)', border:`1px solid ${limitInfo.side === 'up' ? 'rgba(239,68,68,0.3)' : limitInfo.side === 'circuit_break' ? 'rgba(245,158,11,0.3)' : 'rgba(0,255,65,0.3)'}`, color: limitInfo.side === 'up' ? '#ef4444' : limitInfo.side === 'circuit_break' ? '#f59e0b' : '#00ff41', display:'flex', justifyContent:'space-between'}}>
              <span>⚠️ {limitInfo.side === 'up' ? '漲停' : limitInfo.side === 'circuit_break' ? '熔斷暫停' : '跌停'}</span>
              <span>{Math.max(0, Math.ceil(60 - (Date.now() - limitInfo.at) / 1000))}s</span>
            </div>}
            <KLineChart api={api} timeframe={chartTimeframe} companyId={selectedStock} livePrice={livePrices?.[selectedStock]} />
          </div>
        </div>

        {/* 右側: 持倉 + 損益 + 交易 */}
        <div>
          {/* 持倉損益 */}
          <div className="card" style={{marginBottom:12}}>
            <div style={{fontWeight:600, fontSize:13, marginBottom:8}}>💼 持倉</div>
            {(pnlData?.stocks || []).filter(x => x.companyId === selectedStock).length === 0 && <div className="text-dim text-sm">無持股</div>}
            {(pnlData?.stocks || []).filter(x => x.companyId === selectedStock).map(x => (
              <div key={x.companyId} style={{padding:'8px 0', borderTop:'1px solid var(--border)'}}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <span style={{fontWeight:600}}>{x.holdings} 股</span>
                  <span style={{fontWeight:700, color: x.totalPnl >= 0 ? 'var(--accent)' : 'var(--danger)'}}>{x.totalPnl >= 0 ? '+' : ''}{x.totalPnl.toLocaleString()}</span>
                </div>
                <div style={{display:'flex', gap:12, marginTop:4}}>
                  <span className="text-dim text-sm">均價 ${(x.avgCost || 0).toLocaleString()}</span>
                  <span className="text-dim text-sm">現價 ${x.currentPrice || '?'}</span>
                </div>
                <div style={{display:'flex', gap:12, marginTop:2}}>
                  <span className="text-dim text-sm">已實現 <span style={{color: x.realizedPnl >= 0 ? 'var(--accent)' : 'var(--danger)'}}>{x.realizedPnl >= 0 ? '+' : ''}{x.realizedPnl.toLocaleString()}</span></span>
                  <span className="text-dim text-sm">浮動 <span style={{color: x.unrealizedPnl >= 0 ? 'var(--accent)' : 'var(--danger)'}}>{x.unrealizedPnl >= 0 ? '+' : ''}{x.unrealizedPnl.toLocaleString()}</span></span>
                </div>
              </div>
            ))}
          </div>

          {/* 掛單 */}
          <div className="card" style={{marginBottom:12}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
              <span style={{fontWeight:600, fontSize:13}}>📋 掛單</span>
              <span className="text-dim text-sm">{orders.filter(o => o.status === 'open').length}/20</span>
            </div>
            <div style={{display:'flex', gap:6, marginBottom:8, alignItems:'center'}}>
              <select value={ordType} onChange={e => setOrdType(e.target.value)} className="select-sm" style={{width:75, flexShrink:0}}>
                <option value="buy">買入</option>
                <option value="sell">賣出</option>
              </select>
              <input type="number" placeholder="價格 $" value={ordPrice} onChange={e => setOrdPrice(e.target.value)} style={{flex:1, minWidth:0, fontSize:12, padding:'5px 8px'}} />
              <input type="number" placeholder="數量 股" value={ordQty} onChange={e => setOrdQty(e.target.value)} style={{flex:1, minWidth:0, fontSize:12, padding:'5px 8px'}} />
              <button className="btn btn-primary btn-sm" onClick={placeOrder} style={{flexShrink:0}}>掛</button>
            </div>
            {orders.filter(o => o.company_id === selectedStock).slice(0, 5).map(o => (
              <div key={o.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'4px 0', borderTop:'1px solid var(--border)', fontSize:12}}>
                <span>
                  <span style={{color: o.type === 'buy' ? 'var(--accent)' : 'var(--danger)', fontWeight:600}}>{o.type === 'buy' ? '買' : '賣'}</span>
                  {' '}${o.price} × {o.quantity}
                  <span className="text-dim" style={{marginLeft:4}}>{o.status === 'open' ? '⏳' : o.status === 'filled' ? '✅' : '❌'}</span>
                </span>
                {o.status === 'open' && <button className="btn btn-sm" onClick={() => cancelOrder(o.id)} style={{fontSize:9, padding:'1px 6px'}}>取消</button>}
              </div>
            ))}
          </div>

          {/* 槓桿 */}
          <div className="card" style={{marginBottom:12}}>
            <div style={{fontWeight:600, fontSize:13, marginBottom:8}}>⚡ 槓桿</div>
            <div style={{display:'flex', gap:6, marginBottom:6, alignItems:'center'}}>
              <select value={marginType} onChange={e => setMarginType(e.target.value)} className="select-sm" style={{width:75, flexShrink:0}}>
                <option value="long">做多</option>
                <option value="short">做空</option>
              </select>
              <input type="number" placeholder="數量 股" value={marginQty} onChange={e => setMarginQty(e.target.value)} style={{flex:1, minWidth:0, fontSize:12, padding:'5px 8px'}} />
              <select value={marginLev} onChange={e => setMarginLev(e.target.value)} className="select-sm" style={{width:60, flexShrink:0}}>
                <option value="2">2x</option><option value="3">3x</option><option value="5">5x</option>
              </select>
              <button className="btn btn-primary btn-sm" onClick={openMargin} style={{flexShrink:0}}>開</button>
            </div>
            {positions.filter(p => p.company_id === selectedStock).map(p => {
              const cur = q?.price || 0;
              const pnl = p.type === 'long' ? (cur - p.entry_price) * p.quantity - p.dividend_debt : (p.entry_price - cur) * p.quantity - p.dividend_debt;
              const mRate = p.type === 'long' ? (p.loan_amount > 0 ? (cur * p.quantity + (p.extra_margin||0)) / p.loan_amount * 100 : 0) : (cur * p.quantity > 0 ? (p.loan_amount + p.margin_amount + (p.extra_margin||0) - p.dividend_debt) / (cur * p.quantity) * 100 : 0);
              const mc = mRate < 115
              return (
                <div key={p.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderTop:'1px solid var(--border)', borderLeft:`3px solid ${p.type === 'long' ? 'var(--accent)' : 'var(--danger)'}`, paddingLeft:8}}>
                  <div>
                    <span style={{color: p.type === 'long' ? 'var(--accent)' : 'var(--danger)', fontWeight:600, fontSize:12}}>{p.type === 'long' ? '多' : '空'} {p.quantity}股 ×{p.leverage}</span>
                    <div style={{fontSize:11, color: pnl >= 0 ? 'var(--accent)' : 'var(--danger)'}}>{pnl >= 0 ? '+' : ''}{pnl.toLocaleString()} · {mRate.toFixed(0)}%{mc ? ' ⚠️' : ''}</div>
                  </div>
                  <div style={{display:'flex', gap:4}}>
                    {mc && <button className="btn btn-sm" onClick={() => addMargin(p)} style={{fontSize:9, padding:'1px 6px', borderColor:'var(--danger)', color:'var(--danger)'}}>補</button>}
                    <button className="btn btn-sm" onClick={() => closePos(p.id)} style={{fontSize:9, padding:'1px 6px'}}>平</button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 最近成交 */}
          <div className="card">
            <div style={{fontWeight:600, fontSize:13, marginBottom:8}}>📊 最近成交</div>
            {(t || []).slice(0,8).map(x => (
              <div key={x.id} style={{display:'flex', justifyContent:'space-between', padding:'3px 0', borderTop:'1px solid var(--border)', fontSize:12}}>
                <span><span style={{color: x.type === 'buy' ? 'var(--danger)' : 'var(--accent)'}}>{x.type === 'buy' ? '▲' : '▼'}</span> ${x.price}</span>
                <span>{x.quantity} 股</span>
              </div>
            ))}
          </div>
        </div>
      </div>}

      {/* 我的成交紀錄 */}
      {ipo?.phase !== 'ipo' && myTrades?.length > 0 && <div className="card">
        <div style={{fontWeight:600, fontSize:13, marginBottom:8}}>🕐 我的紀錄</div>
        {myTrades.slice(0,10).map(x => {
          const gross = x.price * x.quantity
          const fee = Math.floor(gross * 0.005)
          return (
            <div key={x.id} style={{display:'flex', justifyContent:'space-between', padding:'4px 0', borderTop:'1px solid var(--border)', fontSize:12}}>
              <span>
                <span style={{color: x.type === 'buy' ? 'var(--accent)' : 'var(--danger)', fontWeight:600}}>{x.type === 'buy' ? '▲' : '▼'}</span>
                {' '}${x.price} × {x.quantity}
                <span className="text-dim" style={{marginLeft:4}}>{x.type === 'buy' ? `-($${(gross+fee).toLocaleString()})` : `+$${(gross-fee).toLocaleString()}`}</span>
              </span>
              <span className="text-dim">{new Date(x.traded_at).toLocaleTimeString('zh-TW', {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
          )
        })}
      </div>}
    </>
  )
}

function Leaderboard({ api }) {
  const [data, setData] = useState([])
  useEffect(() => { api('/api/leaderboard').then(d => setData(Array.isArray(d) ? d : [])) }, [])
  return (
    <div className="card">
      <div className="card-title">🏆 身價排行榜</div>
      {(data || []).map((u, i) => (
        <div className="stat" key={u.username}>
          <span><span className="text-accent" style={{fontWeight:700}}>#{i+1}</span> {u.rank && <span style={{marginRight:4, color:'#f59e0b', fontSize:12}}>{u.rank}</span>} <span>{u.username}</span> {u.online ? <span style={{color:'var(--accent)',fontSize:11}}>●線上</span> : <span className="text-dim" style={{fontSize:11}}>●離線</span>}</span>
          <span className="text-dim">💎${(u.worth||0).toLocaleString()} 📊{u.stocks} 股</span>
        </div>
      ))}
      {data.length === 0 && <div className="text-dim">尚無資料</div>}
    </div>
  )
}

const POSITIONS_MAP = { intern: { label: '實習生', salary: 1 }, specialist: { label: '專員', salary: 5 }, engineer: { label: '工程師', salary: 20 }, manager: { label: '經理', salary: 50 }, expert: { label: '專家', salary: 200 } }

function PieChart({ data, labels, colors, size = 200 }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    if (!canvasRef.current || !data.length) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr; canvas.height = size * dpr
    canvas.style.width = size + 'px'; canvas.style.height = size + 'px'
    ctx.scale(dpr, dpr)

    const total = data.reduce((s, v) => s + v, 0) || 1
    const cx = size / 2, cy = size / 2, r = size / 2 - 20
    let angle = -Math.PI / 2

    data.forEach((val, i) => {
      const sliceAngle = (val / total) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.arc(cx, cy, r, angle, angle + sliceAngle)
      ctx.closePath()
      ctx.fillStyle = colors[i % colors.length]
      ctx.fill()
      angle += sliceAngle
    })
  }, [data, labels, colors, size])

  const total = data.reduce((s, v) => s + v, 0) || 1
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {data.map((val, i) => {
          const pct = ((val / total) * 100).toFixed(1)
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: colors[i % colors.length], flexShrink: 0 }} />
              <span style={{ color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{labels[i]}</span>
              <span style={{ color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}>{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const CHART_COLORS = ['#00ff41', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6']

function AdminPanel({ api }) {
  const { toast, prompt, promptMulti } = useToast()
  const [users, setUsers] = useState([]); const [stats, setStats] = useState(null); const [expanded, setExpanded] = useState(null)
  const [stockDist, setStockDist] = useState([])
  const [ipoList, setIpoList] = useState([])
  const [ipoCollapsed, setIpoCollapsed] = useState(false)
  const [tradesCollapsed, setTradesCollapsed] = useState(false)
  const [annCollapsed, setAnnCollapsed] = useState(false)
  const [tradeData, setTradeData] = useState({ trades: [], stats: [] })
  const [marginData, setMarginData] = useState({ positions: [], byUser: [], byCompany: [] })
  const [announcements, setAnnouncements] = useState([])
  const [exclude, setExclude] = useState(() => localStorage.getItem('eo_admin_exclude') || '')
  const [resetReq, setResetReq] = useState(null)
  const [ipoSchedule, setIpoSchedule] = useState([])
  const [settleLog, setSettleLog] = useState([])
  const [maintStatus, setMaintStatus] = useState({ full: false, pages: [], message: '系統維護中，請稍後再試。' })
  const loadAll = (ex) => {
    const q = ex ? '?exclude=' + encodeURIComponent(ex) : ''
    api('/api/admin/users' + q).then(d => setUsers(Array.isArray(d) ? d : []));
    api('/api/admin/stats' + q).then(setStats);
    api('/api/admin/stocks' + q).then(d => setStockDist(Array.isArray(d) ? d : []));
    api('/api/admin/ipo' + q).then(d => setIpoList(Array.isArray(d) ? d : []));
    api('/api/admin/trades' + q).then(d => setTradeData(d || { trades: [], stats: [] }));
    api('/api/admin/margin' + q).then(d => setMarginData(d && d.positions ? d : { positions: [], byUser: [], byCompany: [] }));
    api('/api/admin/announcements').then(d => setAnnouncements(Array.isArray(d) ? d : []));
    api('/api/admin/reset/status').then(d => setResetReq(d?.request || null));
    api('/api/admin/ipo/schedule').then(d => setIpoSchedule(Array.isArray(d) ? d : []));
    api('/api/admin/maintenance/status').then(d => setMaintStatus(d || { full: false, pages: [], message: '系統維護中' }));
  }
  useEffect(() => { loadAll(exclude) }, [])
  useEffect(() => {
    const id = setInterval(() => loadAll(exclude), 30000)
    return () => clearInterval(id)
  }, [exclude])
  const dilute = (companyId, companyName) => {
    prompt(`增資 ${companyName}（新股加入庫存）`, async (n) => {
      const shares = parseInt(n); if (!shares || shares <= 0) return
      const r = await api('/api/admin/dilute', { companyId, shares })
      if (r.success) { toast(`增資成功！${companyName} 總股數 → ${r.newTotal.toLocaleString()}`, 'success'); loadAll(exclude) }
      else toast(r.error, 'error')
    })
  }
  const grantMoney = (u) => {
    prompt(`給 ${u.username} 加錢（負數=扣款）`, async (n) => {
      const amount = parseInt(n); if (!amount) return
      const r = await api('/api/admin/grant', { userId: u.id, amount })
      if (r.success) { toast(`已${amount > 0 ? '加' : '扣'} $${Math.abs(amount).toLocaleString()} 給 ${u.username}`, 'success'); loadAll(exclude) }
      else toast(r.error, 'error')
    })
  }
  const applyExclude = () => {
    localStorage.setItem('eo_admin_exclude', exclude)
    loadAll(exclude)
  }

  const stocksWithHolders = (stockDist || []).filter(s => s.held > 0)
  const holdingsByCompany = stocksWithHolders.map(s => ({
    id: s.id,
    name: s.name,
    data: (s.holders || []).map(h => h.quantity),
    labels: (s.holders || []).map(h => h.username),
    total: s.held,
    system: s.system_inventory || 0,
    totalShares: s.total_shares || (s.held + (s.system_inventory || 0)),
  }))
  const cashData = users.filter(u => u.cash > 0).map(u => u.cash)
  const cashLabels = users.filter(u => u.cash > 0).map(u => u.username)
  const earnedData = users.filter(u => u.total_earned > 0).map(u => u.total_earned)
  const earnedLabels = users.filter(u => u.total_earned > 0).map(u => u.username)
  const activeIpoList = (ipoList || []).filter(s => s.phase === 'ipo')
  const ipoByCompany = activeIpoList.reduce((acc, s) => {
    if (!acc[s.company_name]) acc[s.company_name] = { data: [], labels: [], detail: {} }
    const g = acc[s.company_name]
    g.detail[s.username] = (g.detail[s.username] || 0) + s.shares
    return acc
  }, {})
  Object.values(ipoByCompany).forEach(g => {
    g.labels = Object.keys(g.detail)
    g.data = Object.values(g.detail)
  })

  const toggleFullMaint = async () => {
    const r = await api('/api/admin/maintenance/toggle', { method: 'POST' });
    if (r.success !== undefined) setMaintStatus(s => ({ ...s, full: r.full }));
  }
  const togglePageMaint = async (page) => {
    const enabled = !maintStatus.pages.includes(page)
    const r = await api('/api/admin/maintenance/page', { method: 'POST', page, enabled });
    if (r.success) setMaintStatus(s => ({ ...s, pages: r.pages }));
  }
  const updateMaintMsg = async () => {
    const msg = prompt('輸入維護訊息：', maintStatus.message)
    if (!msg || msg === maintStatus.message) return
    const r = await api('/api/admin/maintenance/message', { method: 'POST', message: msg });
    if (r.success) setMaintStatus(s => ({ ...s, message: msg }));
  }
  const pageOptions = [
    { id: 'trading', label: '📈 交易' }, { id: 'gaming', label: '🎰 娛樂' }, { id: 'casino', label: '🎲 賭場' },
    { id: 'bank', label: '🏦 銀行' }, { id: 'invest', label: '💼 投資' }, { id: 'company', label: '🏢 公司' },
    { id: 'income', label: '⬆️ 升級' }, { id: 'subscription', label: '📦 訂閱' }, { id: 'launch', label: '🚀 開服' },
    { id: 'dashboard', label: '📊 儀表板' }, { id: 'leaderboard', label: '🏆 排行' },
  ]

  return (
    <>
      <div className="card mb-12" style={maintStatus.full ? { borderLeft: '3px solid #ef4444' } : {}}>
        <div className="card-title" style={{margin:0}}>🔧 維護模式</div>
        <div className="flex gap-8 items-center" style={{marginTop:8}}>
          <button className="btn btn-sm" onClick={toggleFullMaint}
            style={{background: maintStatus.full ? '#ef4444' : undefined, color: maintStatus.full ? '#fff' : undefined}}>
            {maintStatus.full ? '🔴 全站維護中 — 點擊關閉' : '🟢 全站正常 — 點擊開啟維護'}
          </button>
          <button className="btn btn-sm" onClick={updateMaintMsg}>📝 維護訊息</button>
        </div>
        <div style={{marginTop:10, display:'flex', flexWrap:'wrap', gap:6}}>
          {pageOptions.map(p => (
            <button key={p.id} className="btn btn-sm" onClick={() => togglePageMaint(p.id)}
              style={{fontSize:11, background: maintStatus.pages.includes(p.id) ? '#f59e0b' : undefined, color: maintStatus.pages.includes(p.id) ? '#000' : undefined}}>
              {maintStatus.pages.includes(p.id) ? '🔧 ' : ''}{p.label}
            </button>
          ))}
        </div>
        {maintStatus.full && <div style={{marginTop:8, fontSize:11, color:'#ef4444', fontWeight:600}}>⚠️ 全站維護中，非管理員無法操作</div>}
        {maintStatus.pages.length > 0 && <div style={{marginTop:4, fontSize:11, color:'#f59e0b'}}>維護中分頁：{maintStatus.pages.join(', ')}</div>}
      </div>
      <div className="card mb-12">
        <div className="card-title" style={{margin:0}}>統計排除設定</div>
        <div className="text-dim text-sm mb-12">輸入要排除的用戶名（逗號分隔，例如：好吃的蛋包咖哩飯, duckkk），排除後所有統計/圖表/明細都會過濾</div>
        <div className="flex gap-8 items-center">
          <input value={exclude} onChange={e => setExclude(e.target.value)} placeholder="要排除的用戶名..." style={{flex:1}} />
          <button className="btn btn-primary btn-sm" onClick={applyExclude}>套用</button>
          <button className="btn btn-sm" onClick={() => { setExclude(''); localStorage.removeItem('eo_admin_exclude'); loadAll('') }}>清除</button>
        </div>
      </div>
      {stats && <div className="grid-3 mb-12">
        <div className="card"><div className="card-title">玩家</div><div className="text-lg">{stats.users}</div></div>
        <div className="card"><div className="card-title">總現金</div><div className="text-lg">${(stats.totalCash || 0).toLocaleString()}</div></div>
        <div className="card"><div className="card-title">系統庫存</div><div className="text-lg">{(stockDist || []).reduce((s, x) => s + (x.system_inventory || 0), 0).toLocaleString()} 股</div>
          <div className="text-dim text-sm" style={{marginTop:6}}>
            {(stockDist || []).map(s => (
              <div key={s.id} className="flex justify-between" style={{fontSize:12, marginTop:2}}>
                <span>{s.name}</span>
                <span>{(s.system_inventory || 0).toLocaleString()} 股</span>
              </div>
            ))}
          </div>
        </div>
      </div>}
      {stats && <div className="grid-3 mb-12">
        <div className="card"><div className="card-title">總活存</div><div className="text-lg">${(stats.totalSavings || 0).toLocaleString()}</div></div>
        <div className="card"><div className="card-title">員工</div><div className="text-lg">{stats.employees}</div></div>
        <div className="card"><div className="card-title">交易</div><div className="text-lg">{stats.trades}</div></div>
      </div>}

      {announcements.length > 0 && <div className="card mb-12">
        <div className="card-title" style={{display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', margin:0}} onClick={() => setAnnCollapsed(c => !c)}>
          📢 系統公告（{announcements.length}）<span className="text-dim text-sm">{annCollapsed ? '▸ 展開' : '▾ 收起'}</span>
        </div>
        {!annCollapsed && announcements.map(a => (
          <div className="stat" key={a.id}>
            <span className="text-dim text-sm">⏱{new Date(a.created_at).toLocaleString('zh-TW')}</span>
            <span>{a.message}</span>
          </div>
        ))}
      </div>}

      {/* IPO 排程管理 */}
      {ipoSchedule.length > 0 && <div className="card mb-12">
        <div className="card-title">📋 IPO 排程管理</div>
        <div className="text-dim text-sm mb-12">管理系統公司上市時程 · 點「開始」設定 IPO 時間</div>
        <div style={{display:'grid', gap:8}}>
          {ipoSchedule.map(c => {
            const phaseLabel = c.phase === 'ipo' ? '🚀 IPO中' : c.phase === 'trading' ? '✅ 交易中' : c.phase === 'queued' ? '⏳ 排隊中' : '⏸️ 待設定';
            const phaseColor = c.phase === 'ipo' ? 'var(--accent)' : c.phase === 'trading' ? '#10b981' : c.phase === 'queued' ? 'var(--warn)' : 'var(--text-secondary)';
            return (
              <div key={c.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'var(--bg2)', borderRadius:8, borderLeft:`3px solid ${phaseColor}`}}>
                <div>
                  <span style={{fontWeight:600, fontSize:13}}>{c.code} {c.name}</span>
                  <span className="text-dim text-sm" style={{marginLeft:8}}>{c.industry}</span>
                  <span style={{marginLeft:8, fontSize:11, color:phaseColor, fontWeight:600}}>{phaseLabel}</span>
                  {c.phase === 'ipo' && c.started_at > 0 && <span className="text-dim text-sm" style={{marginLeft:8}}>
                    剩 {Math.max(0, Math.ceil(((c.duration_minutes || 4320) * 60000 - (Date.now() - c.started_at)) / 3600000))}h
                  </span>}
                </div>
                <div style={{display:'flex', gap:6, alignItems:'center'}}>
                  <span className="text-dim text-sm">庫存 {(c.inventory || 0).toLocaleString()}</span>
                  {(c.phase === 'pending' || c.phase === 'queued') && <button className="btn btn-primary btn-sm" style={{fontSize:11}} onClick={async () => {
                    promptMulti('設定 IPO（預設3天）', [
                      { label: 'IPO時長(分鐘)', placeholder: '4320 = 3天', default: '4320' },
                    ], async ([mins]) => {
                      const r = await api('/api/admin/ipo/start', { companyId: c.id, durationMinutes: parseInt(mins) || 4320 })
                      if (r.success) { toast(r.message, 'success'); loadAll(exclude) } else toast(r.error, 'error')
                    })
                  }}>開始</button>}
                  {c.phase === 'queued' && <button className="btn btn-sm" style={{fontSize:11}} onClick={async () => {
                    const r = await api('/api/admin/ipo/cancel', { companyId: c.id })
                    if (r.success) { toast('已取消', 'success'); loadAll(exclude) } else toast(r.error, 'error')
                  }}>取消</button>}
                </div>
              </div>
            )
          })}
        </div>
      </div>}

      <div className="grid-3 mb-12">
        {cashData.length > 0 && <div className="card">
          <div className="card-title">💰 現金分布</div>
          <PieChart data={cashData} labels={cashLabels} colors={CHART_COLORS} size={200} />
        </div>}
        {earnedData.length > 0 && <div className="card">
          <div className="card-title">📈 累計賺取</div>
          <PieChart data={earnedData} labels={earnedLabels} colors={CHART_COLORS} size={200} />
        </div>}
        {holdingsByCompany.length > 0 && <div className="card">
          <div className="card-title">📊 持股分布</div>
          {holdingsByCompany.map(s => (
            <div key={s.name} style={{marginBottom: 12}}>
              <div className="flex justify-between items-center" style={{marginBottom:6}}>
                <span className="text-dim text-sm" style={{fontWeight:600}}>{s.name}（玩家持股 {s.total.toLocaleString()} · 流通 {(s.totalShares - s.system).toLocaleString()}）</span>
                <button className="btn btn-sm" style={{fontSize:10, padding:'2px 8px'}} onClick={() => dilute(s.id, s.name)}>＋增資</button>
              </div>
              <PieChart data={s.data} labels={s.labels} colors={CHART_COLORS} size={170} />
            </div>
          ))}
        </div>}
        {Object.keys(ipoByCompany).length > 0 && <div className="card">
          <div className="card-title">🚀 IPO 認購分布</div>
          {Object.entries(ipoByCompany).map(([company, g]) => (
            <div key={company} style={{marginBottom: 12}}>
              <div className="text-dim text-sm" style={{fontWeight:600, marginBottom:6}}>{company}</div>
              <PieChart data={g.data} labels={g.labels} colors={CHART_COLORS} size={170} />
            </div>
          ))}
        </div>}
        {marginData.byUser.length > 0 && <div className="card">
          <div className="card-title">⚡ 槓桿曝險（按用戶）</div>
          <PieChart data={marginData.byUser.map(m => m.exposure)} labels={marginData.byUser.map(m => `${m.username} (${m.positions}筆)`)} colors={CHART_COLORS} size={200} />
        </div>}
        {marginData.byCompany.length > 0 && <div className="card">
          <div className="card-title">⚡ 槓桿曝險（按公司）</div>
          <PieChart data={marginData.byCompany.map(m => m.exposure)} labels={marginData.byCompany.map(m => `${m.name} (${m.positions}筆)`)} colors={CHART_COLORS} size={200} />
        </div>}
      </div>

      <div className="card mb-12">
        <div className="flex justify-between items-center">
          <div className="card-title" style={{margin:0}}>🚀 IPO 認購紀錄（進行中）({activeIpoList.length})</div>
          <button className="btn btn-sm" onClick={() => setIpoCollapsed(!ipoCollapsed)}>{ipoCollapsed ? '展開' : '收合'}</button>
        </div>
        {!ipoCollapsed && <>
          {activeIpoList.length === 0 && <div className="text-dim mt-12">暫無進行中的認購</div>}
          {activeIpoList.map(s => (
            <div className="stat" key={s.id}>
              <span><span className="text-accent" style={{fontWeight:600}}>{s.username}</span> 認購 <span style={{fontWeight:600}}>{s.shares.toLocaleString()} 股</span> {s.company_name} @ ${s.share_price}</span>
              <span className="text-dim text-sm">${(s.total_cost || 0).toLocaleString()} · {new Date(s.subscribed_at).toLocaleString('zh-TW')}</span>
            </div>
          ))}
        </>}
      </div>

      <div className="card mb-12"><div className="card-title">⚡ 槓桿持倉（{marginData?.positions?.length || 0}筆）</div>
        {(marginData?.positions || []).length === 0 && <div className="text-dim">暫無槓桿持倉</div>}
        {(marginData?.positions || []).map(p => (
          <div className="stat" key={p.id}>
            <span><span className="text-accent" style={{fontWeight:600}}>{p.username}</span> <span style={{color: p.type === 'long' ? 'var(--accent)' : 'var(--danger)'}}>{p.type === 'long' ? '做多' : '做空'} {p.quantity}股</span> {p.company_name} <span className="text-dim text-sm">×{p.leverage}</span></span>
            <span className="text-dim text-sm">開倉 ${p.entry_price} → 現價 ${p.share_price} · 損益 <span style={{color: p.pnl >= 0 ? 'var(--accent)' : 'var(--danger)'}}>{p.pnl >= 0 ? '+' : ''}${p.pnl.toLocaleString()}</span> · 維持率 {p.maintenanceRate}% / 追繳線115%{p.margin_call_at ? <span style={{color:'var(--danger)'}}> ⚠️追繳</span> : ''}</span>
          </div>
        ))}
      </div>

      <div className="card mb-12"><div className="card-title">📈 股票交易統計（所有人）</div>
        {(tradeData?.stats || []).length === 0 && <div className="text-dim">暫無交易</div>}
        {(tradeData?.stats || []).map(s => (
          <div className="stat" key={s.user_id}>
            <span><span className="text-accent" style={{fontWeight:600}}>{s.username}</span> <span style={{color:'var(--accent)'}}>買 {s.buyCount}次/{s.buyVol.toLocaleString()}股</span> <span style={{color:'var(--danger)'}}>賣 {s.sellCount}次/{s.sellVol.toLocaleString()}股</span></span>
            <span className="text-dim text-sm">花 ${(s.spent||0).toLocaleString()} · 收 ${(s.revenue||0).toLocaleString()}</span>
          </div>
        ))}
      </div>
      <div className="card mb-12">
        <div className="flex justify-between items-center">
          <div className="card-title" style={{margin:0}}>📋 股票交易明細（最近300筆）</div>
          <button className="btn btn-sm" onClick={() => setTradesCollapsed(!tradesCollapsed)}>{tradesCollapsed ? '展開' : '收合'}</button>
        </div>
        {!tradesCollapsed && <>
          {(tradeData?.trades || []).length === 0 && <div className="text-dim">暫無交易</div>}
          {(tradeData?.trades || []).slice(0,50).map(t => (
            <div className="stat" key={t.id}>
              <span><span className="text-accent" style={{fontWeight:600}}>{t.username}</span> {t.type === 'buy' ? <span style={{color:'var(--accent)'}}>▲買入</span> : <span style={{color:'var(--danger)'}}>▼賣出</span>} {t.quantity.toLocaleString()}股 {t.company_name} @ ${t.price}</span>
              <span className="text-dim text-sm">${(t.price * t.quantity).toLocaleString()} · {new Date(t.traded_at).toLocaleString('zh-TW')}</span>
            </div>
          ))}
        </>}
      </div>

      <div className="card"><div className="card-title">使用者 ({users.length})</div>
        {(users || []).map(u => <div className="stat" key={u.id} style={{flexDirection:'column', alignItems:'stretch', gap:6}}>
          <div className="flex justify-between items-center">
            <div>
              <span style={{fontWeight:600}}>#{u.id} {u.username} {u.role === 'admin' ? '⭐' : ''}</span>
              <div className="text-dim text-sm">💰${(u.cash || 0).toLocaleString()} 📈${(u.total_earned || 0).toLocaleString()} ⏱${(u.incomePerMin || 0).toLocaleString()}/分 📊${(u.stocks || 0)}股</div>
            </div>
            <div className="flex gap-8 items-center">
              <button className="btn btn-sm" onClick={() => setExpanded(expanded === u.id ? null : u.id)}>{expanded === u.id ? '收起' : '資產配置'}</button>
              <button className="btn btn-sm btn-warn" onClick={() => grantMoney(u)}>💰 加錢</button>
              <button className="btn btn-sm btn-danger" onClick={() => prompt(`停權 ${u.username}？輸入理由`, async (reason) => {
                if (!reason) return
                const r = await api('/api/admin/ban', { userId: u.id, reason })
                if (r.success) { toast(r.message, 'success'); loadAll(exclude) } else toast(r.error, 'error')
              })}>🚫 停權</button>
            </div>
          </div>
          {expanded === u.id && <div className="card" style={{padding:12, marginTop:4}}>
            <div className="grid-2 gap-8">
              <div className="stat"><span className="stat-label">活存</span><span className="stat-value">${(u.savings||0).toLocaleString()}</span></div>
              <div className="stat"><span className="stat-label">定存</span><span className="stat-value">${(u.deposits||0).toLocaleString()}</span></div>
              <div className="stat"><span className="stat-label">持股</span><span className="stat-value">{u.stocks||0} 股</span></div>
              <div className="stat"><span className="stat-label">投資</span><span className="stat-value">${(u.investments||0).toLocaleString()}</span></div>
              <div className="stat"><span className="stat-label">貸款</span><span className="stat-value">${(u.loans||0).toLocaleString()}</span></div>
              <div className="stat"><span className="stat-label">槓桿倉位</span><span className="stat-value">{u.margin||0}</span></div>
              <div className="stat"><span className="stat-label">公司</span><span className="stat-value">{u.companies||0} ({u.departments||0}部門)</span></div>
              <div className="stat"><span className="stat-label">員工</span><span className="stat-value">{u.employees||0}人</span></div>
            </div>
            {u.detail && <div>
              <div className="divider" />
              <div className="text-sm">
                <div className="text-dim">每分收支估算:</div>
                <div>基礎 ${(u.detail.baseIncome||0).toLocaleString()} + 公司 ${(u.detail.companyProfit||0).toLocaleString()} + 利息 ${(u.detail.invPerMin||0).toLocaleString()}</div>
                <div>- 生活費 ${(u.detail.expenses?.livingCost||0).toLocaleString()} - 訂閱 ${(u.detail.expenses?.subCost||0).toLocaleString()} = <span className="text-accent" style={{fontWeight:600}}>淨 ${(u.detail.netPerMin||0).toLocaleString()}/分</span></div>
              </div>
            </div>}
          </div>}
        </div>)}
      </div>

      {/* 危險區域 */}
      <div className="card" style={{borderColor:'var(--danger)', marginTop:12}}>
        <div style={{fontWeight:600, fontSize:13, color:'var(--danger)', marginBottom:8}}>⚠️ 危險區域</div>

        <div style={{display:'flex', gap:8, marginBottom:12}}>
          <button className="btn btn-sm" onClick={async () => {
            toast('🎭 正在清算身份組...', 'info')
            const r = await api('/api/admin/rank-settle')
            if (r.success) { toast(`✅ 已分發 ${r.applied} 人`, 'success'); setSettleLog(r.log || []) }
            else if (r.error) toast(r.error, 'error')
            else toast('清算完成（0 人）', 'info')
          }}>🎭 立即清算身份組</button>
          <button className="btn btn-sm" onClick={async () => {
            const d = await api('/api/admin/rank-debug')
            if (d?.error) { toast(d.error, 'error'); setSettleLog([`錯誤：${d.error}`]); return }
            const lines = [`🛠️ bot: ${d.bot.username} (${d.bot.id}) ${d.bot.isInGuild ? '在公會內' : '❌ 不在公會'}`, `🎭 公會: ${d.guildName}`]
            lines.push(`🔧 bot 身分組: ${(d.bot.roleNames || []).join(', ') || '無'}`, '')
            lines.push('📋 公會角色 (由高到低):')
            d.roles.forEach(r => lines.push(`  ${r.name} [${r.id}] pos=${r.position}`))
            lines.push('', '✅ 比對成功:')
            Object.entries(d.matched || {}).forEach(([k, v]) => lines.push(`  ${k} → ${v}`))
            lines.push('', '❌ 比對失敗:')
            ;(d.unmatched || []).forEach(u => lines.push(`  ${u}`))
            if (d.resolvedIds?.length) lines.push('', `解析結果: ${d.resolvedIds.join(', ')}`)
            setSettleLog(lines)
          }}>🔍 身分組除錯</button>
          {settleLog.length > 0 && <button className="btn btn-sm" onClick={() => setSettleLog([])}>清除紀錄</button>}
        </div>
        {settleLog.length > 0 && <div className="card" style={{padding:10, marginBottom:12}}>
          {settleLog.map((l, i) => <div key={i} className="text-dim text-sm">{l}</div>)}
        </div>}

        {resetReq && !resetReq.executed && <div style={{background:'rgba(239,68,68,0.1)', border:'1px solid var(--danger)', borderRadius:8, padding:12, marginBottom:12}}>
          <div style={{fontWeight:600, fontSize:13, marginBottom:6}}>📋 重置請求進行中</div>
          <div className="text-dim text-sm" style={{marginBottom:8}}>發起者: {resetReq.initiatorName} · 簽署: {resetReq.signatures.length}/{resetReq.required}</div>
          <div style={{display:'flex', gap:6, flexWrap:'wrap', marginBottom:8}}>
            {resetReq.signatures.map((s, i) => <span key={i} className="btn btn-sm" style={{fontSize:10, opacity:0.7}}>✅ #{s}</span>)}
          </div>
          {!resetReq.signatures.includes(window.__userId) && <button className="btn btn-danger btn-sm" onClick={async () => {
            const r = await api('/api/admin/reset/sign', {})
            if (r.success) { toast(r.message, 'success'); loadAll(exclude) } else toast(r.error, 'error')
          }}>✍️ 簽署重置</button>}
        </div>}

        {!resetReq?.executed && <div style={{display:'flex', gap:8}}>
          <button className="btn btn-danger btn-sm" onClick={async () => {
            prompt('⚠️ 全服重置：所有玩家數據將歸零，無法復原！輸入「重置」確認', async (v) => {
              if (v !== '重置') return toast('已取消', 'info')
              toast('正在重置...', 'info')
              const r = await api('/api/admin/reset?force=1')
              if (r.success) { toast('✅ 全服重置完成！', 'success'); loadAll(exclude) }
              else if (r.needSignatures) {
                // 需要多管理員簽署
                const req = await api('/api/admin/reset/request', {})
                if (req.success) { toast(req.message, 'success'); loadAll(exclude) } else toast(req.error, 'error')
              }
              else toast(r.error || '重置失敗', 'error')
            })
          }}>🗑️ 全服重置</button>
          {resetReq && !resetReq.executed && <button className="btn btn-sm" onClick={async () => {
            const r = await api('/api/admin/reset/request', {})
            if (r.success) { toast(r.message, 'success'); loadAll(exclude) } else toast(r.error, 'error')
          }}>📋 發起重置請求</button>}
        </div>}
        {resetReq?.executed && <div className="text-dim text-sm">✅ 上次重置: {new Date(resetReq.executedAt).toLocaleString('zh-TW')}</div>}
      </div>
    </>
  )
}

function History({ api }) {
  const [txs, setTxs] = useState([])
  useEffect(() => { api('/api/transactions?limit=100').then(d => setTxs(Array.isArray(d) ? d : [])) }, [])
  const typeLabels = { income: '⬆️ 基礎收入(本小時)', expense: '⬇️ 支出', stock_buy: '📈 買股', stock_sell: '📉 賣股', margin_open: '⚡ 槓桿開倉', margin_close: '⚡ 平倉', ipo_subscribe: '🚀 IPO認購', ipo_revenue: '🚀 IPO募集', bank_deposit: '🏦 存款', bank_withdraw: '🏦 提款', bank_interest: '🏦 活存利息(本小時)', loan: '🏦 借貸', loan_interest: '🏦 貸款利息(本小時)', employee_hire: '👥 僱用', employee_salary: '👥 薪資', company_create: '🏢 創建公司', upgrade: '⬆️ 升級', investment: '💼 投資', investment_interest: '💼 投資利息(本小時)', investment_loss: '💼 投資虧損', company_profit: '🏢 公司利潤(本小時)', company_loss: '🏢 公司虧損(本小時)', dividend: '💰 股利(本小時)', living_cost: '🏠 生活費(本小時)', subscription: '📦 訂閱月費(本小時)', lottery_cost: '🎱 樂透購票', lottery_prize: '🎱 樂透中獎', scratch_cost: '🎰 刮刮樂購買', scratch_reward: '🎰 刮刮樂中獎', admin_grant: '⭐ 管理員發放' }
  const typeColors = { income: 'var(--accent)', expense: 'var(--danger)', stock_buy: 'var(--danger)', stock_sell: 'var(--accent)', ipo_subscribe: 'var(--warn)', employee_hire: 'var(--danger)', company_create: 'var(--danger)', upgrade: 'var(--danger)' }
  return (
    <div className="card">
      <div className="card-title">💰 收支明細</div>
      <div className="text-dim text-sm mb-12">每分收入/支出會按小時彙總顯示 · 交易類即時顯示</div>
      {txs.length === 0 && <div className="text-dim">暫無紀錄</div>}
      {txs.map(tx => (
        <div className="stat" key={tx.id} style={{borderBottom:'1px solid var(--border)', paddingBottom:8, marginBottom:8}}>
          <div className="flex justify-between">
            <span style={{fontSize:13}}>{typeLabels[tx.type] || tx.type}</span>
            <span style={{fontSize:13, fontWeight:600, color: tx.amount >= 0 ? 'var(--accent)' : 'var(--danger)'}}>
              {tx.amount >= 0 ? '+' : ''}{tx.amount.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-dim" style={{fontSize:12}}>{tx.description}</span>
            <span className="text-dim" style={{fontSize:12}}>{new Date(tx.created_at).toLocaleString('zh-TW')}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function Subscription({ api, toast }) {
  const [subs, setSubs] = useState([])
  const load = () => api('/api/subscription/list').then(d => setSubs(Array.isArray(d) ? d : []))
  useEffect(() => { load() }, [])
  const toggle = async (key, enabled) => {
    const r = await api('/api/subscription/toggle', { key })
    if (r.success) { load(); toast(enabled ? '已停用' : '已啟用', 'success') } else toast(r.error, 'error')
  }
  return (
    <div className="card">
      <div className="card-title">📦 訂閱服務</div>
      <div className="text-dim text-sm mb-12">每分鐘扣費 · 現金不足自動停用 · 收支明細可查看</div>
      {(subs || []).map(s => (
        <div className="stat" key={s.key} style={{borderBottom:'1px solid var(--border)', paddingBottom:10, marginBottom:10}}>
          <div className="flex justify-between items-center">
            <div>
              <div style={{fontSize:14, fontWeight:600}}>{s.label}</div>
              <div className="text-dim text-sm">${s.cost.toLocaleString()}/分 · {s.desc}</div>
            </div>
            <button className={`btn btn-sm ${s.enabled ? 'btn-danger' : 'btn-primary'}`} onClick={() => toggle(s.key, s.enabled)}>
              {s.enabled ? '停用' : '啟用'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function Help() {
  const [expanded, setExpanded] = useState(null);
  const sections = [
    { icon: '⬆️', title: '升級', color: '#3b82f6', desc: '升級設備提高每分鐘收入', detail: '電腦/伺服器/AI 助手，三條線各自升級。離線時收入減半。' },
    { icon: '🏦', title: '銀行', color: '#10b981', desc: '存錢賺利息、借錢渡難關', detail: '活存利率由央行自動升降息調整。定存有 1hr~7 天期限。貸款利息 0.15%/分。' },
    { icon: '💼', title: '投資', color: '#8b5cf6', desc: '被動收入，風險越高報酬越大', detail: '債券→基金→房地產→新創，依累計收入解鎖。新創有虧損風險。' },
    { icon: '🏢', title: '公司', color: '#f59e0b', desc: '僱人開公司，衝上市 IPO', detail: '花 $200,000 創建。開部門、僱員工、升級設備，淨利潤歸你。' },
    { icon: '📈', title: '股票', color: '#ef4444', desc: '買低賣高、做多做空', detail: '影響價交易（大單會推高買價），手續費 0.5%。可掛單、槓桿 2~5x。' },
    { icon: '📦', title: 'ETF', color: '#06b6d4', desc: '追蹤大盤指數', detail: '單位價 = 指數 × $0.01。系統做市，手續費 0.5%。' },
    { icon: '⏳', title: '期貨', color: '#ec4899', desc: '做多做空大盤指數', detail: '1hr/6hr/24hr 期限，權利金 5%，到期自動結算。' },
    { icon: '🏠', title: '生活費 & 訂閱', color: '#64748b', desc: '收入越高扣越多，訂閱享折扣', detail: '生活費 10~25%。6 種訂閱服務各有加成。' },
    { icon: '📅', title: '每日登入', color: '#22c55e', desc: '7 天循環，連續獎勵加倍', detail: '$500→$10,000 循環。第 7/14/30 天額外 +$5K/$15K/$50K。' },
    { icon: '🎰', title: '刮刮樂', color: '#f59e0b', desc: '銅銀金三等級，最高 10x', detail: '花 $500~$5,000 刮 3 格符號。每日免費 5 次。' },
    { icon: '🎱', title: '樂透', color: '#8b5cf6', desc: '選 6 號碼，系統底池 $10,000', detail: '每注 $100，每天 08:00 開獎。中 3~6 號分獎池。未領獎金滾入下期。每日免費 5 注。' },
    { icon: '🚀', title: '開服慶典', color: '#f97316', desc: '72 小時限定活動', detail: '雙倍收入、排行榜 Top 10 每日發獎、新手 $5,000、每人 1 顆 BTC。' },
  ];

  return (
    <div>
      <div className="card mb-12" style={{borderLeft:'3px solid #3b82f6', textAlign:'center', padding:'20px 16px'}}>
        <div style={{fontSize:32, marginBottom:8}}>🌍</div>
        <div style={{fontWeight:800, fontSize:18, marginBottom:4}}>地球在線 Earth Online</div>
        <div className="text-dim" style={{fontSize:13}}>從零開始，征服全球經濟</div>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:8}}>
        {sections.map((s, i) => {
          const isOpen = expanded === i;
          return (
            <div key={i} onClick={() => setExpanded(isOpen ? null : i)}
              style={{
                borderLeft: `3px solid ${s.color}`,
                background: isOpen ? `${s.color}10` : 'var(--surface)',
                border: `1px solid ${isOpen ? s.color : 'var(--border)'}`,
                borderRadius: 8, padding: '12px 14px', cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: isOpen ? 'scale(1.02)' : 'scale(1)',
              }}>
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                <div style={{fontSize:28, transition:'transform 0.3s', transform: isOpen ? 'scale(1.2) rotate(10deg)' : 'scale(1)'}}>{s.icon}</div>
                <div>
                  <div style={{fontWeight:700, fontSize:14, color: isOpen ? s.color : 'var(--text)'}}>{s.title}</div>
                  <div className="text-dim" style={{fontSize:12}}>{s.desc}</div>
                </div>
                <div style={{marginLeft:'auto', fontSize:11, color:'var(--text-dim)', transition:'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : ''}}>▼</div>
              </div>
              <div style={{
                maxHeight: isOpen ? '200px' : '0', overflow: 'hidden',
                transition: 'max-height 0.3s ease, opacity 0.2s ease, margin 0.2s ease',
                opacity: isOpen ? 1 : 0, marginTop: isOpen ? 8 : 0,
              }}>
                <div className="text-dim" style={{fontSize:12, lineHeight:1.6, borderTop:`1px solid ${s.color}30`, paddingTop:8}}>
                  {s.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )
}
