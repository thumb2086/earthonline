import { useState, useEffect, useRef } from 'react'
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
    { id: 'history', label: '💰 明細' },
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
          <span className="logo">EARTHONLINE</span>
          <span className="badge">💰 現金 {(user?.cash ?? 0).toLocaleString()}</span>
          <span className="badge">🏦 活存 {(user?.savings ?? 0).toLocaleString()}</span>
          <span className="badge badge-danger">📈 累計 {(user?.total_earned ?? 0).toLocaleString()}</span>
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
          {view === 'history' && <History api={api} />}
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
                    <input type="number" placeholder="金額" value={amounts[t.type] || ''} onChange={e => setAmounts(p => ({...p, [t.type]: e.target.value}))} style={{minWidth:120}} />
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
            <span><span className="text-accent">{inv.label || labels[inv.type] || inv.type}</span> · ${(inv.amount||0).toLocaleString()}
              <div className="text-dim text-sm">每日約 <span className="text-accent">${(inv.dailyEarn||0).toLocaleString()}</span> · 累計已領 <span className="text-accent">${(inv.totalPaid||0).toLocaleString()}</span></div>
            </span>
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
  const [cs, setCs] = useState([]); const [employees, setEmployees] = useState([]); const [ipoList, setIpoList] = useState([])
  const [positions, setPositions] = useState([]); const [selectedCompany, setSelectedCompany] = useState(null)
  const posLabels = { intern: '實習生', specialist: '專員', engineer: '工程師', manager: '經理', expert: '專家' }
  const POSITIONS_MAP = { intern: { salary: 1 }, specialist: { salary: 5 }, engineer: { salary: 20 }, manager: { salary: 50 }, expert: { salary: 200 } }
  const refresh = () => {
    api('/api/company/list').then(d => setCs(Array.isArray(d) ? d : []));
    api('/api/employee/positions').then(d => setPositions(Array.isArray(d) ? d : []));
    api('/api/company/ipo/list?my=1').then(d => setIpoList(Array.isArray(d) ? d : []));
  }
  useEffect(() => { refresh() }, [])
  useEffect(() => { if (selectedCompany) api('/api/employee/list?companyId=' + selectedCompany).then(d => setEmployees(Array.isArray(d) ? d : [])); }, [selectedCompany])
  const create = () => prompt('公司名稱', async (name) => {
    const r = await api('/api/company/create', { name, industry: 'tech' })
    if (r.success) { refresh(); toast('公司創建成功', 'success') } else toast(r.error, 'error')
  })
  const hire = async (pos, qty) => {
    if (!selectedCompany) return toast('請先選擇公司', 'error')
    const r = await api('/api/employee/hire', { position: pos, companyId: selectedCompany, quantity: qty || 1 })
    if (r.success) { api('/api/employee/list?companyId=' + selectedCompany).then(d => setEmployees(Array.isArray(d) ? d : [])); toast(`僱用 ${r.hired} 人`, 'success') }
    else toast(r.error, 'error')
  }
  const startIpo = (c) => {
    const defaultPrice = c.share_price >= 10 ? c.share_price : 100
    prompt('設定IPO發行價 (每股$' + defaultPrice + ')', async (price) => {
      if (!price || parseInt(price) < 10) return toast('價格至少$10', 'error')
      const r = await api('/api/company/ipo/start', { companyId: c.id, ipoPrice: parseInt(price), totalShares: c.total_shares || 100000 })
      if (r.success) { refresh(); toast('IPO已啟動，價格$' + price, 'success') } else toast(r.error, 'error')
    })
  }
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
        <div className="stat"><span className="stat-label">收入</span><span className="stat-value">${(c.income || 0).toLocaleString()}/分</span></div>
        <div className="stat"><span className="stat-label">成本</span><span className="stat-value">${(c.costs || 0).toLocaleString()}/分</span></div>
        <div className="stat"><span className="stat-label">淨利潤</span><span className="stat-value">${(c.profit || 0).toLocaleString()}/分</span></div>
        <div className="flex gap-8 mt-12">
          <button className={`btn btn-sm ${selectedCompany===c.id?'btn-primary':''}`} onClick={() => setSelectedCompany(c.id)}>選擇此公司</button>
          {!c.phase && <button className="btn btn-sm btn-warn" onClick={() => startIpo(c)}>🚀 IPO上市</button>}
        </div>
      </div>)}
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

function KLineChart({ api, timeframe = 'realtime', companyId = 1 }) {
  const [klines, setKlines] = useState([])
  const [loaded, setLoaded] = useState(false)
  const canvasRef = useRef(null)

  useEffect(() => {
    const fetchKlines = () => {
      if (timeframe === 'realtime') {
        api('/api/stock/klines?companyId=' + companyId).then(d => setKlines((Array.isArray(d) ? [...d].reverse() : []).slice(-120))).catch(()=>{})
      } else {
        api(`/api/stock/klines/agg?interval=${timeframe === '1h' ? '3600000' : '300000'}&limit=120&companyId=${companyId}`).then(d => setKlines(Array.isArray(d) ? d : [])).catch(()=>{})
      }
    }
    fetchKlines(); setLoaded(true)
    const id = setInterval(fetchKlines, 5000)
    return () => clearInterval(id)
  }, [timeframe])

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
    const cw = w - padL - padR, ch = h - padT - padB
    const closes = klines.map(k => k.close)
    const minP = Math.min(...closes), maxP = Math.max(...closes)
    const range = maxP - minP || 1
    const maxVol = Math.max(...klines.map(k => k.volume), 1)
    const volH = ch * 0.2

    // grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = padT + (ch - volH) / 4 * i
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke()
      ctx.fillStyle = '#475569'; ctx.font = '10px monospace'; ctx.textAlign = 'right'
      ctx.fillText(`$${(maxP - (range / 4) * i).toFixed(2)}`, padL - 6, y + 4)
    }

    const pts = closes.map((c, i) => ({
      x: padL + (cw / (closes.length - 1 || 1)) * i,
      y: padT + (ch - volH) - (((c - minP) / range) * (ch - volH))
    }))

    // volume bars
    const barW = Math.max(Math.min(cw / klines.length, 6), 2)
    klines.forEach((k, i) => {
      const x = padL + (cw / (closes.length - 1 || 1)) * i
      const vH = maxVol > 0 ? (k.volume / maxVol) * volH : 0
      ctx.fillStyle = k.close >= k.open ? 'rgba(0,255,65,0.25)' : 'rgba(239,68,68,0.25)'
      ctx.fillRect(x - barW / 2, padT + ch - vH, barW, vH)
    })

    // gradient fill
    const grad = ctx.createLinearGradient(0, padT, 0, padT + ch - volH)
    grad.addColorStop(0, 'rgba(0,255,65,0.2)'); grad.addColorStop(1, 'rgba(0,255,65,0)')
    ctx.fillStyle = grad; ctx.beginPath()
    ctx.moveTo(pts[0].x, padT + ch - volH)
    pts.forEach(p => ctx.lineTo(p.x, p.y))
    ctx.lineTo(pts[pts.length - 1].x, padT + ch - volH)
    ctx.closePath(); ctx.fill()

    // price line
    ctx.strokeStyle = '#00ff41'; ctx.lineWidth = 2
    ctx.beginPath()
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
    ctx.stroke()

    // latest dot
    const last = pts[pts.length - 1]
    ctx.fillStyle = '#00ff41'
    ctx.beginPath(); ctx.arc(last.x, last.y, 4, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'left'
    ctx.fillText(`$${closes[closes.length - 1].toFixed(2)}`, last.x + 8, last.y + 4)
  }, [klines])

  if (klines.length === 0) return <div className="text-dim">{loaded ? '尚無走勢資料' : '載入中...'}</div>
  return <canvas ref={canvasRef} style={{width:'100%',height:200,display:'block',background:'#0d1117',borderRadius:8,border:'1px solid #1e293b'}} />
}

function Stock({ api, toast, prompt }) {
  const [q, setQ] = useState(null); const [h, setH] = useState([]); const [t, setT] = useState([]); const [ipo, setIpo] = useState(null)
  const [positions, setPositions] = useState([])
  const [marginType, setMarginType] = useState('long')
  const [marginQty, setMarginQty] = useState('')
  const [marginLev, setMarginLev] = useState('2')
  const [chartTimeframe, setChartTimeframe] = useState('realtime')
  const [selectedStock, setSelectedStock] = useState(1)
  const [stockList, setStockList] = useState([])

  const stockNames = { 1: '地球互動科技 001', 10: '深海科技 002', 12: '銀河金融 003', 13: '星雲生技 004', 14: '黑洞能源 005', 15: '元界科技 006' }

  useEffect(() => {
    api('/api/company/ipo/list').then(d => {
      if (!Array.isArray(d)) return
      const list = d.filter(c => c.phase && c.phase !== 'null').map(c => ({
        id: c.id,
        name: (stockNames[c.id] || c.name),
        phase: c.phase
      }))
      if (list.length === 0) list.push({ id: 1, name: '地球互動科技 001', phase: 'trading' })
      setStockList(list)
      if (!list.find(s => s.id === selectedStock) && list.length > 0) setSelectedStock(list[0].id)
    }).catch(() => {})
  }, [])

  const refreshStock = () => {
    api('/api/stock/quote?companyId=' + selectedStock).then(setQ);
    api('/api/stock/holdings').then(d => setH(Array.isArray(d)?d:[]));
    api('/api/stock/trades?companyId=' + selectedStock).then(d => setT(Array.isArray(d)?d:[]));
    api('/api/stock/margin/positions').then(d => setPositions(Array.isArray(d)?d:[]));
    api('/api/stock/ipo/info?companyId=' + selectedStock).then(setIpo);
  }
  useEffect(() => { refreshStock() }, [selectedStock])
  useEffect(() => { api('/api/stock/quote').then(setQ); api('/api/stock/holdings').then(d => setH(Array.isArray(d)?d:[])); api('/api/stock/trades').then(d => setT(Array.isArray(d)?d:[])); api('/api/stock/ipo/info').then(setIpo); api('/api/stock/margin/positions').then(d => setPositions(Array.isArray(d)?d:[])) }, [])
  const buy = () => prompt('買入股數', async (n) => { const r = await api('/api/stock/buy', { companyId: selectedStock, quantity: parseInt(n) }); if (r.success) { refreshStock(); toast(`買入 ${n} 股`, 'success') } else toast(r.error, 'error') })
  const sell = () => prompt('賣出股數', async (n) => { const r = await api('/api/stock/sell', { companyId: selectedStock, quantity: parseInt(n) }); if (r.success) { refreshStock(); toast(`賣出 ${n} 股`, 'success') } else toast(r.error, 'error') })
  const maxBuy = async () => { const n = q?.maxTrade || 0; if (n <= 0) return; const r = await api('/api/stock/buy', { companyId: selectedStock, quantity: n, force: true }); if (r.success) { refreshStock(); toast(`買入 ${n} 股`, 'success') } else toast(r.error, 'error') }
  const maxSell = async () => { const held = h.find(x => x.company_id === selectedStock); const n = held?.quantity || 0; if (n <= 0) return; const r = await api('/api/stock/sell', { companyId: selectedStock, quantity: n, force: true }); if (r.success) { refreshStock(); toast(`賣出 ${n} 股`, 'success') } else toast(r.error, 'error') }
  const subIpo = () => prompt('認購股數', async (s) => { const r = await api('/api/stock/ipo/subscribe', { companyId: selectedStock, shares: parseInt(s) }); if (r.success) { toast(`認購 ${s} 股成功`, 'success'); refreshStock() } else toast(r.error, 'error') })

  const openMargin = async () => {
    const qty = parseInt(marginQty); const lev = parseInt(marginLev)
    if (!qty || qty <= 0) return toast('請輸入股數', 'error')
    const r = await api('/api/stock/margin/open', { quantity: qty, leverage: lev, type: marginType });
    if (r.success) { toast(`${marginType === 'long' ? '做多' : '做空'}成功`, 'success'); setMarginQty(''); api('/api/stock/margin/positions').then(d => setPositions(Array.isArray(d)?d:[])); api('/api/stock/quote').then(setQ); api('/api/stock/holdings').then(setH) }
    else toast(r.error, 'error')
  }
  const closePos = async (id) => {
    const r = await api('/api/stock/margin/close/' + id)
    if (r.success) { toast('平倉成功', 'success'); api('/api/stock/margin/positions').then(d => setPositions(Array.isArray(d)?d:[])); api('/api/stock/quote').then(setQ); api('/api/stock/holdings').then(setH) }
    else toast(r.error, 'error')
  }

  return (
    <>
      {ipo?.phase === 'ipo' && <div className="card mb-12" style={{borderColor:'var(--warn)'}}>
        <div className="card-title" style={{color:'var(--warn)'}}>🚀 IPO 認購中 — {stockNames[selectedStock] || '股票'}</div>
        <div className="text-dim mb-12">價格 ${ipo.price || 100}/股 · 每人上限 1,000 股</div>
        <div style={{background:'var(--bg2)', borderRadius:6, height:8, marginBottom:8, overflow:'hidden'}}>
          <div style={{background:'var(--warn)', height:'100%', borderRadius:6, width:`${Math.min(100, ((ipo.subscribed||0)/(ipo.maxSubscribed||1))*100)}%`, transition:'width 0.3s'}} />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-accent">{(ipo.subscribed||0).toLocaleString()} / {(ipo.maxSubscribed||0).toLocaleString()} 股已認購</span>
          <span className="text-dim">{(((ipo.subscribed||0)/(ipo.maxSubscribed||1))*100).toFixed(1)}%</span>
        </div>
        <button className="btn btn-sm mt-12" onClick={subIpo}>認購</button>
      </div>}
      <div className="flex gap-8 mb-12">
        {stockList.map(s => (
          <button key={s.id} className={`btn ${selectedStock === s.id ? 'btn-primary' : ''}`} onClick={() => setSelectedStock(s.id)}>{s.name}</button>
        ))}
      </div>
        {q && <><div className="grid-2 mt-12">
          <div><div className="stat"><span className="stat-label">價格</span><span className="stat-value" style={{fontSize:20}}>${q.price}</span></div>
            <div className="stat"><span className="stat-label">買/賣</span><span className="stat-value">${q.buyPrice} / ${q.sellPrice}</span></div>
            <div className="stat"><span className="stat-label">單筆上限</span><span className="stat-value">{(q.maxTrade||0).toLocaleString()} 股</span></div></div>
          <div><div className="stat"><span className="stat-label">流通</span><span className="stat-value">{(q.circulating||0).toLocaleString()}</span></div>
            <div className="stat"><span className="stat-label">庫存</span><span className="stat-value">{(q.systemInventory||0).toLocaleString()}</span></div></div>
        </div>
        <div className="flex gap-8 mt-12">
          <button className="btn btn-primary btn-sm" onClick={buy}>買入</button>
          <button className="btn btn-primary btn-sm" onClick={maxBuy}>全部買入</button>
          <button className="btn btn-sm" onClick={sell}>賣出</button>
          <button className="btn btn-sm" onClick={maxSell}>全部賣出</button>
        </div>
        </>}
      {ipo?.phase !== 'ipo' && <div className="card mb-12">
        <div className="flex justify-between items-center mb-12">
          <div className="card-title" style={{margin:0}}>📈 走勢圖</div>
          <div className="flex gap-8">
            {[['realtime', '即時'], ['5m', '5分'], ['1h', '1時']].map(([k, v]) => (
              <button key={k} className={`btn btn-sm ${chartTimeframe === k ? 'btn-primary' : ''}`} onClick={() => setChartTimeframe(k)}>{v}</button>
            ))}
          </div>
        </div>
        <KLineChart api={api} timeframe={chartTimeframe} companyId={selectedStock} />
      </div>}
      <div className="card mb-12">
        <div className="card-title">⚡ 槓桿交易</div>
        <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}} className="mt-12 mb-12">
          <select value={marginType} onChange={e => setMarginType(e.target.value)} className="select-sm">
            <option value="long">🟢 做多</option>
            <option value="short">🔴 做空</option>
          </select>
          <input type="number" placeholder="股數" value={marginQty} onChange={e => setMarginQty(e.target.value)} style={{width:100}} />
          <select value={marginLev} onChange={e => setMarginLev(e.target.value)} className="select-sm">
            <option value="2">2x</option>
            <option value="3">3x</option>
            <option value="5">5x</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={openMargin}>開倉</button>
        </div>
        <div className="text-dim text-sm">維持率 130% 追繳 · 100% 強制平倉</div>
        {positions.length > 0 && <>
          <div className="divider" />
          <div className="card-title">槓桿持倉</div>
          {positions.map(p => {
            const pnl = p.type === 'long'
              ? ((q?.price || 0) - p.entry_price) * p.quantity - p.dividend_debt
              : (p.entry_price - (q?.price || 0)) * p.quantity - p.dividend_debt;
            return (
              <div className="stat" key={p.id} style={{borderLeft: `3px solid ${p.type === 'long' ? 'var(--accent)' : 'var(--danger)'}`, paddingLeft:8}}>
                <div>
                  <span style={{color: p.type === 'long' ? 'var(--accent)' : 'var(--danger)', fontWeight:600}}>{p.type === 'long' ? '做多' : '做空'}</span>
                  <span className="text-dim text-sm"> {p.quantity}股 ×{p.leverage} · 入場${p.entry_price}</span>
                  <div className="text-sm" style={{color: pnl >= 0 ? 'var(--accent)' : 'var(--danger)'}}>
                    {pnl >= 0 ? '+' : ''}{pnl.toLocaleString()}
                    {p.dividend_debt > 0 && <span className="text-dim"> (股利欠${p.dividend_debt.toLocaleString()})</span>}
                  </div>
                </div>
                <button className="btn btn-sm" onClick={() => closePos(p.id)}>平倉</button>
              </div>
            )
          })}
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

      const pct = ((val / total) * 100).toFixed(1)
      if (pct < 3) { angle += sliceAngle; return }
      const midAngle = angle + sliceAngle / 2
      const lx = cx + Math.cos(midAngle) * (r * 0.65)
      const ly = cy + Math.sin(midAngle) * (r * 0.65)
      ctx.fillStyle = '#fff'
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`${labels[i]} ${pct}%`, lx, ly)
      angle += sliceAngle
    })
  }, [data, labels, colors, size])

  return <canvas ref={canvasRef} style={{ display: 'block', margin: '0 auto' }} />
}

const CHART_COLORS = ['#00ff41', '#3b82f6', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6']

function AdminPanel({ api }) {
  const [users, setUsers] = useState([]); const [stats, setStats] = useState(null)
  useEffect(() => { api('/api/admin/users').then(d => setUsers(Array.isArray(d) ? d : [])); api('/api/admin/stats').then(setStats) }, [])

  const holdingsData = users.filter(u => u.stocks > 0).map(u => u.stocks)
  const holdingsLabels = users.filter(u => u.stocks > 0).map(u => u.username)
  const cashData = users.filter(u => u.cash > 0).map(u => u.cash)
  const cashLabels = users.filter(u => u.cash > 0).map(u => u.username)
  const earnedData = users.filter(u => u.total_earned > 0).map(u => u.total_earned)
  const earnedLabels = users.filter(u => u.total_earned > 0).map(u => u.username)

  return (
    <>
      {stats && <div className="grid-3 mb-12">
        <div className="card"><div className="card-title">玩家</div><div className="text-lg">{stats.users}</div></div>
        <div className="card"><div className="card-title">總現金</div><div className="text-lg">${(stats.totalCash || 0).toLocaleString()}</div></div>
        <div className="card"><div className="card-title">系統庫存</div><div className="text-lg">{(stats.systemReserve?.stock_inventory || 0).toLocaleString()} 股</div></div>
      </div>}
      {stats && <div className="grid-3 mb-12">
        <div className="card"><div className="card-title">總活存</div><div className="text-lg">${(stats.totalSavings || 0).toLocaleString()}</div></div>
        <div className="card"><div className="card-title">員工</div><div className="text-lg">{stats.employees}</div></div>
        <div className="card"><div className="card-title">交易</div><div className="text-lg">{stats.trades}</div></div>
      </div>}

      <div className="grid-3 mb-12">
        {cashData.length > 0 && <div className="card">
          <div className="card-title">💰 現金分布</div>
          <PieChart data={cashData} labels={cashLabels} colors={CHART_COLORS} size={200} />
        </div>}
        {holdingsData.length > 0 && <div className="card">
          <div className="card-title">📊 持股分布</div>
          <PieChart data={holdingsData} labels={holdingsLabels} colors={CHART_COLORS} size={200} />
        </div>}
        {earnedData.length > 0 && <div className="card">
          <div className="card-title">📈 累計賺取</div>
          <PieChart data={earnedData} labels={earnedLabels} colors={CHART_COLORS} size={200} />
        </div>}
      </div>

      <div className="card"><div className="card-title">使用者 ({users.length})</div>
        {(users || []).map(u => <div className="stat" key={u.id}>
          <span>#{u.id} {u.username} {u.role === 'admin' ? '⭐' : ''}</span>
          <span className="text-dim text-sm">💰${(u.cash || 0).toLocaleString()} 📈${(u.total_earned || 0).toLocaleString()} ⏱${(u.incomePerMin || 0).toLocaleString()}/分</span>
        </div>)}
      </div>
    </>
  )
}

function History({ api }) {
  const [txs, setTxs] = useState([])
  useEffect(() => { api('/api/transactions?limit=100').then(d => setTxs(Array.isArray(d) ? d : [])) }, [])
  const typeLabels = { income: '⬆️ 收入', expense: '⬇️ 支出', stock_buy: '📈 買股', stock_sell: '📉 賣股', ipo_subscribe: '🚀 IPO認購', bank_deposit: '🏦 存款', bank_withdraw: '🏦 提款', loan: '🏦 貸款', employee_hire: '👥 僱用', company_create: '🏢 創建公司', upgrade: '⬆️ 升級', investment: '💼 投資', dividend: '💰 股利' }
  const typeColors = { income: 'var(--accent)', expense: 'var(--danger)', stock_buy: 'var(--danger)', stock_sell: 'var(--accent)', ipo_subscribe: 'var(--warn)', employee_hire: 'var(--danger)', company_create: 'var(--danger)', upgrade: 'var(--danger)' }
  return (
    <div className="card">
      <div className="card-title">💰 收支明細</div>
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
