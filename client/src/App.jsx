import { useState, useEffect, useRef } from 'react'
import LoginGateway from './components/LoginGateway'
import { useToast } from './components/Toast.jsx'

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('eo_token'))
  const [user, setUser] = useState(null)
  const [view, setView] = useState('dashboard')
  const [rev, setRev] = useState(0)
  const { toast, prompt, promptMulti } = useToast()

  useEffect(() => {
    if (!token) return
    fetch('/api/me', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => { if (!r.ok) throw new Error('unauth'); return r.json() })
      .then(d => setUser(d))
      .catch(() => { localStorage.removeItem('eo_token'); setToken(null) })
  }, [token, rev])

  useEffect(() => {
    if (!token) return
    const id = setInterval(() => setRev(r => r + 1), 5000)
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
          {view === 'bank' && <Bank act={act} api={api} toast={toast} />}
          {view === 'invest' && <Invest api={api} toast={toast} prompt={prompt} />}
          {view === 'company' && <Company api={api} toast={toast} prompt={prompt} promptMulti={promptMulti} />}
          {view === 'stock' && <Stock api={api} toast={toast} prompt={prompt} user={user} />}
          {view === 'history' && <History api={api} />}
          {view === 'subscription' && <Subscription api={api} toast={toast} />}
          {view === 'leaderboard' && <Leaderboard api={api} />}
          {view === 'help' && <Help />}
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
          <div className="card-title">活期存款 0.05%/分</div>
          <div className="text-dim text-sm" style={{marginTop:4}}>利息 <span className="text-accent">${((info?.savings || 0) * 0.0005).toFixed(2)}/分</span>（每天約 ${Math.floor((info?.savings || 0) * 0.0005 * 1440).toLocaleString()}）</div>
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
                {t.label} ({(t.rate * 100).toFixed(2)}%/分)
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
                <div className="text-dim text-sm">利息 <span className="text-accent">${Math.floor((d.amount || 0) * (d.rate || 0)).toLocaleString()}/分</span> · 已領 ${(d.totalPaid || 0).toLocaleString()}</div>
              </div>
              <button className="btn btn-sm" onClick={() => earlyWithdraw(d.id, d.amount)}>提前贖回</button>
            </div>
          ))}
        </div>
      </div>
      <div className="card card-warn mt-12">
        <div className="card-title">貸款 0.15%/分</div>
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
        {(types || []).filter(t => t.type !== 'deposit').map(t => (
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
      {investments.filter(i => i.type !== 'deposit').length > 0 && <div className="card"><div className="card-title">我的投資</div>
        {(investments || []).filter(i => i.type !== 'deposit').map(inv => (
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

function Company({ api, toast, prompt, promptMulti }) {
  const [cs, setCs] = useState([]); const [employees, setEmployees] = useState([]); const [ipoList, setIpoList] = useState([])
  const [positions, setPositions] = useState([]); const [selectedCompany, setSelectedCompany] = useState(null)
  const [deptData, setDeptData] = useState(null)
  const [acquirable, setAcquirable] = useState([])
  const [market, setMarket] = useState([])
  const posLabels = { intern: '實習生', specialist: '專員', engineer: '工程師', manager: '經理', expert: '專家' }
  const POSITIONS_MAP = { intern: { salary: 3 }, specialist: { salary: 15 }, engineer: { salary: 50 }, manager: { salary: 130 }, expert: { salary: 350 } }
  const refresh = () => {
    api('/api/company/list').then(d => setCs(Array.isArray(d) ? d : []));
    api('/api/employee/positions').then(d => setPositions(Array.isArray(d) ? d : []));
    api('/api/company/ipo/list?my=1').then(d => setIpoList(Array.isArray(d) ? d : []));
    api('/api/company/acquirable').then(d => setAcquirable(Array.isArray(d) ? d : [])).catch(()=>{});
    api('/api/company/market').then(d => setMarket(Array.isArray(d) ? d : [])).catch(()=>{});
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
  const diluteCompany = (c) => promptMulti(`增資 ${c.name}`, [
    { label: '發行股數', placeholder: '例: 10000', default: '' },
    { label: '發行價格', placeholder: `例: ${c.share_price || 10}`, default: '' },
  ], async ([shares, price]) => {
    const qty = parseInt(shares); if (!qty || qty <= 0) return toast('請輸入股數', 'error')
    const r = await api('/api/company/dilute', { companyId: c.id, shares: qty, price: parseInt(price) })
    if (r.success) { toast(`增資 ${qty} 股，獲得 $${r.revenue.toLocaleString()}`, 'success'); refresh() } else toast(r.error, 'error')
  })
  const buyout = (c) => prompt(`收購 ${c.name}（$2${c.buyoutPrice.toLocaleString()}？）`, async (s) => {
    const r = await api('/api/company/buyout', { companyId: c.id })
    if (r.success) { toast(`收購成功！支付 $${r.buyPrice.toLocaleString()}`, 'success'); refresh() } else toast(r.error, 'error')
  })
  const offerSell = (c) => prompt(`掛牌出售 ${c.name}？輸入售價$`, async (v) => {
    const price = parseInt(v); if (!price || price <= 0) return toast('價格無效', 'error')
    const r = await api('/api/company/sell/offer', { companyId: c.id, price })
    if (r.success) { refresh(); toast('已掛牌出售', 'success') } else toast(r.error, 'error')
  })
  const cancelSell = async (c) => {
    const r = await api('/api/company/sell/offer', { companyId: c.id, price: 0 })
    if (r.success) { refresh(); toast('已取消出售', 'success') } else toast(r.error, 'error')
  }
  const buyCompany = (c) => prompt(`確認收購 ${c.name}？$${(c.sell_price || 0).toLocaleString()}（員工將一併轉移）輸入 yes 確認`, async (v) => {
    if ((v || '').trim().toLowerCase() !== 'yes') return toast('已取消', 'info')
    const r = await api('/api/company/buy', { companyId: c.id })
    if (r.success) { refresh(); toast(`收購成功！共支付 $${r.total.toLocaleString()}（含手續費 $${r.fee.toLocaleString()}）`, 'success') } else toast(r.error, 'error')
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
  const liquidate = (c) => prompt(`清算「${c.name}」可得 $${(c.liquidationValue || 0).toLocaleString()}？(公司將解散且股票下市，輸入 yes 確認)`, async (v) => {
    if ((v || '').trim().toLowerCase() !== 'yes') return toast('已取消', 'info')
    const r = await api('/api/company/liquidate', { companyId: c.id })
    if (r.success) { refresh(); toast(`公司已清算，獲得 $${r.payout.toLocaleString()}`, 'success') } else toast(r.error, 'error')
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
        <div className="stat"><span className="stat-label">清算可得</span><span className="stat-value">$${(c.liquidationValue || 0).toLocaleString()}</span></div>
        <div className="flex gap-8 mt-12">
          <button className={`btn btn-sm ${selectedCompany===c.id?'btn-primary':''}`} onClick={() => setSelectedCompany(c.id)}>選擇此公司</button>
          {!c.phase && <button className="btn btn-sm btn-warn" onClick={() => startIpo(c)}>🚀 IPO上市</button>}
          {c.phase && <button className="btn btn-sm" onClick={() => diluteCompany(c)}>＋ 增資</button>}
          {c.sell_price > 0
            ? <button className="btn btn-sm" onClick={() => cancelSell(c)}>取消掛牌</button>
            : <button className="btn btn-sm" onClick={() => offerSell(c)}>掛牌出售</button>}
          <button className="btn btn-sm btn-danger" onClick={() => liquidate(c)}>🗑️ 清算</button>
        </div>
      </div>)}
      {market.length > 0 && <div className="card mb-12">
        <div className="card-title">🏦 收購市場</div>
        {market.map(c => (
          <div className="stat" key={c.id}>
            <span><span style={{fontWeight:600}}>{c.name}</span> <span className="text-dim text-sm">{c.owner_name || ''} 掛牌 · ${c.sell_price?.toLocaleString?.() || 0}</span></span>
            <button className="btn btn-sm btn-warn" onClick={() => buyCompany(c)}>買下</button>
          </div>
        ))}
      </div>}
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

function KLineChart({ api, timeframe = 'realtime', companyId = 1 }) {
  const [klines, setKlines] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [hoverIdx, setHoverIdx] = useState(null)
  const [hoverX, setHoverX] = useState(0)
  const canvasRef = useRef(null)

  useEffect(() => {
    setLoaded(false)
    const fetchKlines = () => {
      if (timeframe === 'realtime') {
        api('/api/stock/klines?companyId=' + companyId).then(d => { setKlines((Array.isArray(d) ? [...d].reverse() : []).slice(-120)); setLoaded(true) }).catch(()=>{})
      } else {
        api(`/api/stock/klines/agg?interval=${timeframe === '1h' ? '3600000' : '300000'}&limit=120&companyId=${companyId}`).then(d => { setKlines(Array.isArray(d) ? d : []); setLoaded(true) }).catch(()=>{})
      }
    }
    fetchKlines()
    const id = setInterval(fetchKlines, 500)
    return () => clearInterval(id)
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
      // 成交量柱 (下方)
      const vH = maxVol > 0 ? (k.volume / maxVol) * chVol : 0
      ctx.fillStyle = up ? 'rgba(239,68,68,0.45)' : 'rgba(0,255,65,0.45)'
      ctx.fillRect(x - barW / 2, volTop + chVol - vH, barW, vH)
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

function Stock({ api, toast, prompt, user }) {
  const [q, setQ] = useState(null); const [h, setH] = useState([]); const [t, setT] = useState([]); const [myTrades, setMyTrades] = useState([]); const [ipo, setIpo] = useState(null)
  const [pnlData, setPnlData] = useState({ stocks: [], totalPnl: 0 })
  const [positions, setPositions] = useState([])
  const [marginType, setMarginType] = useState('long')
  const [marginQty, setMarginQty] = useState('')
  const [marginLev, setMarginLev] = useState('2')
  const [chartTimeframe, setChartTimeframe] = useState('realtime')
  const [selectedStock, setSelectedStock] = useState(1)
  const [stockList, setStockList] = useState([])
  const [indexData, setIndexData] = useState(null)

  const stockNames = { 1: '地球互動科技 001', 10: '深海科技 002', 12: '銀河金融 003', 13: '星雲生技 004', 14: '黑洞能源 005', 15: '元界科技 006' }

  const fmtRemain = (ms) => {
    if (!ms || ms <= 0) return '已到期'
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000)
    if (h > 0) return `${h}小時${m}分`
    return `${m}分${Math.floor((ms % 60000) / 1000)}秒`
  }

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
    api('/api/stock/index').then(d => { if (d) setIndexData(d) }).catch(()=>{});
    api('/api/stock/holdings').then(d => setH(Array.isArray(d)?d:[]));
    api('/api/stock/trades?companyId=' + selectedStock).then(d => setT(Array.isArray(d)?d:[]));
    api('/api/stock/trades?companyId=' + selectedStock + '&mine=1').then(d => setMyTrades(Array.isArray(d)?d:[]));
    api('/api/stock/margin/positions').then(d => setPositions(Array.isArray(d)?d:[]));
    api('/api/stock/ipo/info?companyId=' + selectedStock).then(setIpo);
    api('/api/stock/pnl').then(d => setPnlData(d || { stocks: [], totalPnl: 0 })).catch(()=>{});
  }
  useEffect(() => { refreshStock() }, [selectedStock])
  useEffect(() => {
    const id = setInterval(refreshStock, 5000)
    return () => clearInterval(id)
  }, [selectedStock])
  const buy = async () => {
    const fresh = await api('/api/stock/quote?companyId=' + selectedStock)
    if (fresh?.price) setQ(fresh)
    prompt(`買入股數 (手續費1.5%另計)`, async (n) => {
      const qty = parseInt(n); if (!qty || qty <= 0) return
      const r = await api('/api/stock/buy', { companyId: selectedStock, quantity: qty })
      if (r.success) { refreshStock(); toast(`買入 ${qty} 股 @ $${r.fillPrice} (含手續費 $${(r.totalCost - (r.fillPrice * qty)).toLocaleString()})${r.limitHit ? ' ⚠️已達漲停板，1分鐘後恢復' : ''}`, r.limitHit ? 'info' : 'success') } else toast(r.error, 'error')
    }, async (v) => {
      const qty = parseInt(v) || 0
      if (qty <= 0) return ''
      const live = await api('/api/stock/quote?companyId=' + selectedStock).catch(() => null)
      const cur = live?.price || q?.price || 0
      return `市價 $${cur} → 預估總額：$${(cur * qty).toLocaleString()} + 手續費 $${Math.round(cur * qty * 0.015).toLocaleString()} = $${Math.round(cur * qty * 1.015).toLocaleString()}`
    })
  }
  const sell = async () => {
    const fresh = await api('/api/stock/quote?companyId=' + selectedStock)
    if (fresh?.price) setQ(fresh)
    prompt(`賣出股數 (手續費1.5%另計 · 大單滑點)`, async (n) => {
      const qty = parseInt(n); if (!qty || qty <= 0) return
      const r = await api('/api/stock/sell', { companyId: selectedStock, quantity: qty })
      if (r.success) { refreshStock(); toast(`賣出 ${qty} 股 @ $${r.fillPrice} (實收 $${r.netRevenue.toLocaleString()})${r.limitHit ? ' ⚠️已達跌停板，1分鐘後恢復' : ''}`, r.limitHit ? 'info' : 'success') } else toast(r.error, 'error')
    }, async (v) => {
      const qty = parseInt(v) || 0
      if (qty <= 0) return ''
      const live = await api('/api/stock/quote?companyId=' + selectedStock).catch(() => null)
      const cur = live?.price || q?.price || 0
      return `市價 $${cur} → 預估實收：$${Math.round(cur * qty * 0.985).toLocaleString()}（扣手續費，大單另有滑點）`
    })
  }
  const maxBuy = async () => {
    // 全部買入 = 用所有現金買最多股 (含手續費, 受單筆上限限制)
    const price = q?.price || 0
    if (price <= 0) return
    const maxByCash = Math.floor((user?.cash || 0) / (price * 1.015))
    const maxByInv = Math.max(0, (q?.systemInventory || 0) - (q?.minInventory || 0))
    const n = Math.max(0, Math.min(maxByCash, maxByInv))
    if (n <= 0) return toast('現金或庫存不足', 'error')
    toast(`全部買入 ${n} 股`, 'info')
    const r = await api('/api/stock/buy', { companyId: selectedStock, quantity: n, force: true })
    if (r.success) { refreshStock(); toast(`買入 ${n} 股 @ $${r.fillPrice} (含手續費 $${(r.totalCost - (r.fillPrice * n)).toLocaleString()})${r.limitHit ? ' ⚠️已達漲停板，1分鐘後恢復' : ''}`, r.limitHit ? 'info' : 'success') } else toast(r.error, 'error')
  }
  const maxSell = async () => { const held = h.find(x => x.company_id === selectedStock); const n = held?.quantity || 0; if (n <= 0) return; const r = await api('/api/stock/sell', { companyId: selectedStock, quantity: n, force: true }); if (r.success) { refreshStock(); toast(`賣出 ${n} 股 @ $${r.fillPrice} (實收 $${r.netRevenue.toLocaleString()})${r.limitHit ? ' ⚠️已達跌停板，1分鐘後恢復' : ''}`, r.limitHit ? 'info' : 'success') } else toast(r.error, 'error') }
  const subIpo = () => prompt('認購股數', async (s) => { const r = await api('/api/stock/ipo/subscribe', { companyId: selectedStock, shares: parseInt(s) }); if (r.success) { toast(`認購 ${s} 股成功`, 'success'); refreshStock() } else toast(r.error, 'error') })
  const registerStock = () => promptMulti('自訂加股 ($200,000) 立即上市', [
    { label: '股票名稱 (2~20字)', placeholder: '例: 天網科技', default: '' },
    { label: '產業', options: [
      { value: 'tech', label: '🔧 科技 (tech)' },
      { value: 'manufacturing', label: '🏭 製造 (manufacturing)' },
      { value: 'finance', label: '💰 金融 (finance)' },
      { value: 'service', label: '🛒 服務 (service)' },
    ], default: 'tech' },
    { label: '發行價 $10~$100', placeholder: '50', default: '50' },
    { label: '發行股數 1,000~100,000', placeholder: '10000', default: '10000' },
  ], async ([name, industry, price, shares]) => {
    const ind = (industry || 'tech').trim().toLowerCase()
    const p = parseInt(price); const sh = parseInt(shares)
    if (!name || !p || !sh) return toast('請填完整', 'error')
    if (sh * p > 2000000) return toast('發行規模過大（股數 × 價格 ≤ $2,000,000）', 'error')
    const r = await api('/api/stock/register', { name: name.trim(), industry: ind, price: p, shares: sh })
    if (r.success) { toast(`新股票 ${r.name} 已上市！（創辦人持有 ${(r.totalShares - r.floatShares).toLocaleString()} 股）`, 'success'); refreshStock() }
    else toast(r.error, 'error')
  })

  const openMargin = async () => {
    const qty = parseInt(marginQty); const lev = parseInt(marginLev)
    if (!qty || qty <= 0) return toast('請輸入股數', 'error')
    const r = await api('/api/stock/margin/open', { companyId: selectedStock, quantity: qty, leverage: lev, type: marginType });
    if (r.success) { toast(`${marginType === 'long' ? '做多' : '做空'}成功`, 'success'); setMarginQty(''); api('/api/stock/margin/positions').then(d => setPositions(Array.isArray(d)?d:[])); api('/api/stock/quote?companyId=' + selectedStock).then(setQ); api('/api/stock/holdings').then(setH) }
    else toast(r.error, 'error')
  }
  const closePos = async (id) => {
    const r = await api('/api/stock/margin/close/' + id)
    if (r.success) { toast('平倉成功', 'success'); api('/api/stock/margin/positions').then(d => setPositions(Array.isArray(d)?d:[])); api('/api/stock/quote?companyId=' + selectedStock).then(setQ); api('/api/stock/holdings').then(setH) }
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
      <div className="flex gap-8 mb-12">
        {stockList.map(s => (
          <button key={s.id} className={`btn ${selectedStock === s.id ? 'btn-primary' : ''}`} onClick={() => setSelectedStock(s.id)}>{s.name}</button>
        ))}
        <button className="btn btn-sm btn-warn" onClick={registerStock}>＋ 自訂加股</button>
      </div>
      {ipo?.phase === 'ipo' && <div className="card mb-12" style={{borderColor:'var(--warn)'}}>
        <div className="card-title" style={{color:'var(--warn)'}}>🚀 IPO 認購中 — {stockNames[selectedStock] || '股票'}</div>
        <div className="text-dim mb-12">價格 ${ipo.price || 100}/股</div>
        <div style={{background:'var(--bg2)', borderRadius:6, height:8, marginBottom:8, overflow:'hidden'}}>
          <div style={{background:'var(--warn)', height:'100%', borderRadius:6, width:`${Math.min(100, ((ipo.subscribed||0)/(ipo.maxSubscribed||1))*100)}%`, transition:'width 0.3s'}} />
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-accent">{(ipo.subscribed||0).toLocaleString()} / {(ipo.maxSubscribed||0).toLocaleString()} 股已認購</span>
          <span className="text-dim">{(((ipo.subscribed||0)/(ipo.maxSubscribed||1))*100).toFixed(1)}%</span>
        </div>
        {ipo.isFull
          ? <div className="text-sm mt-12" style={{color:'var(--accent)', fontWeight:600}}>✅ 認購已滿，即將上市</div>
          : <div className="text-sm mt-12" style={{color:'var(--warn)'}}>剩餘時間：<span style={{fontWeight:600}}>{fmtRemain(ipo.remainMs)}</span>（滿了立即上市，未滿等期限）</div>}
        <div className="text-sm mt-12" style={{color:'var(--warn)'}}>你已認購 <span style={{fontWeight:600}}>{(ipo.myShares||0).toLocaleString()} 股</span>（花費 ${((ipo.myShares||0) * (ipo.price||100)).toLocaleString()}）</div>
        <button className="btn btn-sm mt-12" onClick={subIpo} disabled={ipo.isFull} style={ipo.isFull ? {opacity:0.5, cursor:'not-allowed'} : {}}>{ipo.isFull ? '已滿' : '認購'}</button>
      </div>}
        {ipo?.phase !== 'ipo' && q && <><div className="grid-2 mt-12">
          <div><div className="stat"><span className="stat-label">價格</span><span className="stat-value" style={{fontSize:20}}>${q.price}</span></div>
            <div className="stat"><span className="stat-label">手續費</span><span className="stat-value">1.5%</span></div>
            <div className="stat"><span className="stat-label">流通</span><span className="stat-value">{(q.circulating||0).toLocaleString()}</span></div></div>
          <div><div className="stat"><span className="stat-label">庫存</span><span className="stat-value">{(q.systemInventory||0).toLocaleString()}</span></div>
            <div className="stat"><span className="stat-label">可買量</span><span className="stat-value">{(Math.max(0,(q.systemInventory||0)-(q.minInventory||0))).toLocaleString()}</span></div></div>
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
      {ipo?.phase !== 'ipo' && <div className="card mb-12">
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
        <div className="text-dim text-sm">維持率 115% 追繳 · 100% 強制平倉</div>
        {positions.filter(p => p.company_id === selectedStock).length > 0 && <>
          <div className="divider" />
          <div className="card-title">槓桿持倉</div>
          {positions.filter(p => p.company_id === selectedStock).map(p => {
            const cur = q?.price || 0;
            const pnl = p.type === 'long'
              ? (cur - p.entry_price) * p.quantity - p.dividend_debt
              : (p.entry_price - cur) * p.quantity - p.dividend_debt;
            const pnlPct = p.margin_amount > 0 ? (pnl / p.margin_amount) * 100 : 0;
            const mRate = p.type === 'long'
              ? (p.loan_amount > 0 ? (cur * p.quantity + (p.extra_margin||0)) / p.loan_amount * 100 : 0)
              : (cur * p.quantity > 0 ? (p.loan_amount + p.margin_amount + (p.extra_margin||0) - p.dividend_debt) / (cur * p.quantity) * 100 : 0);
            const marginCall = mRate < 115
            return (
              <div className="stat" key={p.id} style={{borderLeft: `3px solid ${p.type === 'long' ? 'var(--accent)' : 'var(--danger)'}`, paddingLeft:8}}>
                <div>
                  <span style={{color: p.type === 'long' ? 'var(--accent)' : 'var(--danger)', fontWeight:600}}>{p.type === 'long' ? '做多' : '做空'}</span>
                  <span className="text-dim text-sm"> {p.quantity}股 ×{p.leverage} · 入場${p.entry_price}</span>
                  <div className="text-sm" style={{color: pnl >= 0 ? 'var(--accent)' : 'var(--danger)'}}>
                    {pnl >= 0 ? '+' : ''}{pnl.toLocaleString()} ({pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%)
                    {p.dividend_debt > 0 && <span className="text-dim"> (股利欠${p.dividend_debt.toLocaleString()})</span>}
                  </div>
                  <div className="text-sm" style={{color: marginCall ? 'var(--danger)' : 'var(--text-dim)'}}>
                    維持率 {mRate.toFixed(0)}%{marginCall ? <span style={{fontWeight:700}}> ⚠️追繳中！</span> : ''}
                    {p.extra_margin > 0 && <span className="text-dim"> · 已補繳 ${p.extra_margin.toLocaleString()}</span>}
                  </div>
                  {marginCall && <button className="btn btn-sm" style={{marginTop:6, borderColor:'var(--danger)', color:'var(--danger)'}} onClick={() => addMargin(p)}>💸 自動補繳</button>}
                </div>
                <button className="btn btn-sm" onClick={() => closePos(p.id)}>平倉</button>
              </div>
            )
          })}
        </>}
      </div>}
      {ipo?.phase !== 'ipo' && <div className="grid-2">
        <div className="card"><div className="card-title">持倉損益</div>
          {(pnlData?.stocks || []).filter(x => x.companyId === selectedStock).map(x => (
            <div key={x.companyId}>
              <div className="stat">
                <span className="stat-label">{x.companyName}</span>
                <span className="stat-value">{x.holdings} 股</span>
              </div>
              <div className="stat">
                <span className="stat-label">均價</span>
                <span className="stat-value">${(x.avgCost || 0).toLocaleString()}</span>
              </div>
              <div className="stat">
                <span className="stat-label">現價</span>
                <span className="stat-value">${x.currentPrice || '?'}</span>
              </div>
              <div className="stat">
                <span className="stat-label">已實現損益</span>
                <span className="stat-value" style={{color: x.realizedPnl >= 0 ? 'var(--accent)' : 'var(--danger)'}}>{x.realizedPnl >= 0 ? '+' : ''}{x.realizedPnl.toLocaleString()}</span>
              </div>
              <div className="stat">
                <span className="stat-label">浮動損益</span>
                <span className="stat-value" style={{color: x.unrealizedPnl >= 0 ? 'var(--accent)' : 'var(--danger)'}}>{x.unrealizedPnl >= 0 ? '+' : ''}{x.unrealizedPnl.toLocaleString()}</span>
              </div>
              <div className="stat">
                <span className="stat-label" style={{fontWeight:700}}>總損益</span>
                <span className="stat-value" style={{fontWeight:700, color: x.totalPnl >= 0 ? 'var(--accent)' : 'var(--danger)'}}>{x.totalPnl >= 0 ? '+' : ''}{x.totalPnl.toLocaleString()}</span>
              </div>
            </div>
          ))}
          {(!pnlData?.stocks || pnlData.stocks.filter(x => x.companyId === selectedStock).length === 0) && <div className="text-dim">無持股</div>}</div>
        <div className="card"><div className="card-title">全部成交紀錄</div>
          {(t || []).slice(0,10).map(x => <div className="stat" key={x.id}>
            <span><span style={{color: x.type === 'buy' ? 'var(--accent)' : 'var(--danger)'}}>{x.type === 'buy' ? '▲' : '▼'}</span> ${x.price}</span>
            <span className="stat-value">{x.quantity} 股</span></div>
          )}</div>
      </div>}
      {ipo?.phase !== 'ipo' && <div className="card mt-12"><div className="card-title">我的成交紀錄</div>
        {(myTrades || []).length === 0 && <div className="text-dim">暫無交易</div>}
        {(myTrades || []).slice(0,20).map(x => {
          const gross = x.price * x.quantity
          const fee = Math.floor(gross * 0.015)
          const amount = x.type === 'buy' ? -(gross + fee) : (gross - fee)
          return (
            <div className="stat" key={x.id}>
              <div>
                <span><span style={{color: x.type === 'buy' ? 'var(--accent)' : 'var(--danger)'}}>{x.type === 'buy' ? '▲買入' : '▼賣出'}</span> ${x.price} × {x.quantity}股</span>
                <div className="text-dim text-sm">{x.type === 'buy' ? `花費 $${(gross + fee).toLocaleString()}（含手續費 $${fee.toLocaleString()}）` : `實收 $${(gross - fee).toLocaleString()}（扣手續費 $${fee.toLocaleString()}）`}</div>
              </div>
              <span className="text-dim text-sm">{new Date(x.traded_at).toLocaleTimeString('zh-TW')}</span>
            </div>
          )
        })}</div>}
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
          <span><span className="text-accent" style={{fontWeight:700}}>#{i+1}</span> {u.username} {u.online ? <span style={{color:'var(--accent)',fontSize:11}}>●線上</span> : <span className="text-dim" style={{fontSize:11}}>●離線</span>}</span>
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
  const [users, setUsers] = useState([]); const [stats, setStats] = useState(null); const [expanded, setExpanded] = useState(null)
  const [stockDist, setStockDist] = useState([])
  const [ipoList, setIpoList] = useState([])
  const [ipoCollapsed, setIpoCollapsed] = useState(false)
  const [tradesCollapsed, setTradesCollapsed] = useState(false)
  const [tradeData, setTradeData] = useState({ trades: [], stats: [] })
  const [marginData, setMarginData] = useState({ positions: [], byUser: [], byCompany: [] })
  const [announcements, setAnnouncements] = useState([])
  const [exclude, setExclude] = useState(() => localStorage.getItem('eo_admin_exclude') || '')
  const loadAll = (ex) => {
    const q = ex ? '?exclude=' + encodeURIComponent(ex) : ''
    api('/api/admin/users' + q).then(d => setUsers(Array.isArray(d) ? d : []));
    api('/api/admin/stats' + q).then(setStats);
    api('/api/admin/stocks' + q).then(d => setStockDist(Array.isArray(d) ? d : []));
    api('/api/admin/ipo' + q).then(d => setIpoList(Array.isArray(d) ? d : []));
    api('/api/admin/trades' + q).then(d => setTradeData(d || { trades: [], stats: [] }));
    api('/api/admin/margin' + q).then(d => setMarginData(d || { positions: [], byUser: [], byCompany: [] }));
    api('/api/admin/announcements').then(d => setAnnouncements(Array.isArray(d) ? d : []));
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

  return (
    <>
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
        <div className="card-title">📢 系統公告</div>
        {announcements.map(a => (
          <div className="stat" key={a.id}>
            <span className="text-dim text-sm">⏱{new Date(a.created_at).toLocaleString('zh-TW')}</span>
            <span>{a.message}</span>
          </div>
        ))}
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
                <span className="text-dim text-sm" style={{fontWeight:600}}>{s.name}（流通 {s.total.toLocaleString()} 股 · 庫存 {s.system.toLocaleString()}）</span>
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
            <button className="btn btn-sm" onClick={() => setExpanded(expanded === u.id ? null : u.id)}>{expanded === u.id ? '收起' : '資產配置'}</button>
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
    </>
  )
}

function History({ api }) {
  const [txs, setTxs] = useState([])
  useEffect(() => { api('/api/transactions?limit=100').then(d => setTxs(Array.isArray(d) ? d : [])) }, [])
  const typeLabels = { income: '⬆️ 基礎收入(本小時)', expense: '⬇️ 支出', stock_buy: '📈 買股', stock_sell: '📉 賣股', margin_open: '⚡ 槓桿開倉', margin_close: '⚡ 平倉', ipo_subscribe: '🚀 IPO認購', ipo_revenue: '🚀 IPO募集', bank_deposit: '🏦 存款', bank_withdraw: '🏦 提款', bank_interest: '🏦 活存利息(本小時)', loan: '🏦 借貸', loan_interest: '🏦 貸款利息(本小時)', employee_hire: '👥 僱用', employee_salary: '👥 薪資', company_create: '🏢 創建公司', upgrade: '⬆️ 升級', investment: '💼 投資', investment_interest: '💼 投資利息(本小時)', investment_loss: '💼 投資虧損', company_profit: '🏢 公司利潤(本小時)', company_loss: '🏢 公司虧損(本小時)', dividend: '💰 股利(本小時)', living_cost: '🏠 生活費(本小時)', subscription: '📦 訂閱月費(本小時)' }
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
  const sections = [
    { title: '⬆️ 升級', items: [
      '基礎收入 $20/分，可升級電腦/伺服器/AI助手提升收入',
      '離線時收入減半（訂閱雲端備份可提升到 80%）',
    ]},
    { title: '🏦 銀行', items: [
      '活存：隨時存取，0.05%/分利息',
      '定存：選擇期限（1hr/6hr/24hr/7天），利率更高（0.08~0.3%/分），到期自動贖回，提前贖回損失利息',
      '貸款：可借總收入 50% 額度，0.15%/分利息（利息滾入欠款）',
    ]},
    { title: '💼 投資', items: [
      '債券/指數基金/房地產/新創：依累計收入解鎖',
      '投資利率會隨金額遞減（越大越慢）',
      '新創投資有虧損風險（可能損失本金 5~20%）',
      '贖回收 1% 手續費（定存免費）',
    ]},
    { title: '🏢 公司', items: [
      '創建 $200,000，可選產業（tech/finance/manufacturing/service）',
      '收入 = base × 產業倍率 × 員工產出 × 部門加成 × 光環',
      '部門：開設成本遞增，升級提升該部門員工效率，不同部門加成不同職位',
      '員工：同職位邊際效率遞減（第N人×0.8^N），經理/專家有光環加成',
      '員工薪資計入公司成本，公司虧損會扣你的現金',
      '設備有折舊成本（equipment_level × 2/分）',
    ]},
    { title: '📈 股票', items: [
      '系統做市商：買入向系統買，賣出賣回系統',
      '成交價 = 市場價（無價差），手續費 1.5% 另計',
      '大單影響價格：買1股約影響 0.8%，大量買賣影響可達 10% 上限',
      '單筆上限 = 流通量 5%（全部買入按鈕可突破）',
      '槓桿：做多/做空 2x/3x/5x，維持率 130% 追繳，100% 強制平倉',
      '股利：上市公司每分鐘配發股利給持股者',
    ]},
    { title: '🚀 IPO', items: [
      '公司 owner 可設定 IPO 價格/發行股數/認購時間',
      '玩家公司 IPO 募集資金歸 owner；系統公司 IPO 資金銷毀（回收經濟）',
      '認購滿 30% 立即上市；未滿等期限到期自動上市',
      '上市後認購的股票入帳到持股，剩餘留系統庫存',
    ]},
    { title: '🏠 生活費 & 📦 訂閱', items: [
      '生活費：每分收入越高扣越多（10~25%），現金為 0 不懲罰',
      '訂閱：高級住宅/雲端備份/資產保險/AI/財經資訊/企業顧問',
      '訂閱每分鐘扣費，現金不足自動停用',
      '資產保險：生活費扣款時現金最低保留 $200',
    ]},
    { title: '💰 收支明細', items: [
      '交易類（買賣股/投資/僱用等）即時顯示',
      '每分鐘收支（收入/生活費/利息/股利）按小時彙總顯示',
      '頁面標示 (本小時) 的即為彙總值',
    ]},
  ]
  return (
    <div className="card">
      <div className="card-title">📖 遊戲說明</div>
      {sections.map(s => (
        <div key={s.title} style={{marginBottom: 16}}>
          <div className="text-accent" style={{fontWeight: 700, fontSize: 14, marginBottom: 6}}>{s.title}</div>
          {s.items.map((item, i) => (
            <div key={i} className="text-dim" style={{fontSize: 13, lineHeight: 1.6, marginBottom: 2}}>• {item}</div>
          ))}
        </div>
      ))}
    </div>
  )
}
