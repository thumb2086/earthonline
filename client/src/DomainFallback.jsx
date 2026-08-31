import { useEffect, useRef, useState } from 'react'

// Earth Online 域名備援機制 (B)
// 雲科大等校園網路可能封鎖標準 DNS (port 53)，導致主網域 twonline.dpdns.org
// 在瀏覽器層無法解析 / 後端 API 連線失敗。此元件在主網域載入時探測
// /api/health，若連線失敗則顯示醒目 banner，讓使用者一鍵切換到備援網址
// (Cloudflare workers.dev)，後端 100% 正常，可無縫繼續遊玩。
const MAIN_DOMAIN = 'twonline.dpdns.org'
const FALLBACK_URL = 'https://earthonline.bold-waterfall-5f4d.workers.dev/'
const LS_KEY = 'eo_use_fallback'

function isMainDomain() {
  try {
    return window.location.hostname === MAIN_DOMAIN
  } catch {
    return false
  }
}

// 探測後端健康狀態；回傳 true 表示連線正常
async function probeHealth() {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 4000)
  try {
    const res = await fetch('/api/health', {
      signal: ctrl.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timer)
    return res.ok
  } catch {
    clearTimeout(timer)
    return false
  }
}

export default function DomainFallbackBanner() {
  const [state, setState] = useState('idle') // idle | checking | blocked | ok
  const [dismissed, setDismissed] = useState(false)
  const probeTimer = useRef(null)

  useEffect(() => {
    // 若使用者先前選擇備援且目前仍在主網域，立即跳轉
    const wantFallback = localStorage.getItem(LS_KEY) === '1'
    if (wantFallback && isMainDomain()) {
      window.location.replace(FALLBACK_URL)
      return
    }
    // 若已成功抵達備援網域，清除強制標記，讓下次回主網域可重新探測
    if (!isMainDomain()) {
      localStorage.removeItem(LS_KEY)
      return
    }

    let cancelled = false
    const run = async () => {
      if (dismissed) return
      const ok = await probeHealth()
      if (cancelled || dismissed) return
      setState(ok ? 'ok' : 'blocked')
    }
    setState('checking')
    run()
    // 持續監測：每 60 秒重新探測，捕捉連線中途失效
    probeTimer.current = setInterval(() => {
      if (state !== 'blocked') run()
    }, 60000)

    return () => {
      cancelled = true
      if (probeTimer.current) clearInterval(probeTimer.current)
    }
  }, [dismissed])

  const goFallback = () => {
    localStorage.setItem(LS_KEY, '1')
    window.location.replace(FALLBACK_URL)
  }
  const stayMain = () => {
    localStorage.setItem(LS_KEY, '0')
    setDismissed(true)
    setState('ok')
  }

  if (state !== 'blocked') return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        background: 'linear-gradient(90deg,#b91c1c,#ef4444)',
        color: '#fff',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        fontSize: 14,
        lineHeight: 1.4,
        boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
      }}
    >
      <span style={{ fontWeight: 700 }}>
        ⚠️ 偵測到主網域連線異常（可能為校園網路 DNS 限制，無法解析 twonline.dpdns.org）
      </span>
      <button
        onClick={goFallback}
        style={{
          background: '#fff',
          color: '#b91c1c',
          border: 'none',
          borderRadius: 6,
          padding: '6px 12px',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        切換備援網址繼續遊玩 ↗
      </button>
      <button
        onClick={stayMain}
        style={{
          background: 'transparent',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.7)',
          borderRadius: 6,
          padding: '6px 10px',
          cursor: 'pointer',
        }}
      >
        仍使用主網域
      </button>
      <a
        href="https://earthonline.bold-waterfall-5f4d.workers.dev/"
        target="_blank"
        rel="noreferrer"
        style={{ color: '#fff', textDecoration: 'underline', marginLeft: 'auto' }}
      >
        備援網址：earthonline.bold-waterfall-5f4d.workers.dev
      </a>
    </div>
  )
}
