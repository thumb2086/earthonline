import { useEffect, useRef, useState } from 'react'

// Earth Online 域名備援機制 (B+)
// 雲科大等校園網路封鎖標準 DNS (port 53)，導致主網域 twonline.dpdns.org
// 後端 API (/api/health) 連線失敗。主網域載入即「自動」探測健康狀態，
// 若連線失敗（雲科大 DNS 導致 /api/health 不可達），不再只顯示 banner 等
// 手動點，而是「無痛自動跳轉」到備援網址 (Cloudflare workers.dev)，後端
// 100% 正常，使用者直接看到遊戲。備援網域下不自動跳回。
const MAIN_DOMAIN = 'twonline.dpdns.org'
const FALLBACK_URL = 'https://earthonline.bold-waterfall-5f4d.workers.dev/'
// 自動跳轉標記：避免重複跳，並讓下次回到主網域時直接跳（省去再探測一輪）
const AUTO_KEY = 'eo_fallback_auto'

function isMainDomain() {
  try {
    return window.location.hostname === MAIN_DOMAIN
  } catch {
    return false
  }
}

// 探測後端健康狀態；回傳 true 表示連線正常。
// 走同源 /api/health：主網域若因 DNS 失敗而連不上，fetch 會直接 reject，
// 這正是我們要的觸發條件。設短逾時 (4s) 避免卡住。
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
  const [showManual, setShowManual] = useState(false)
  const probeTimer = useRef(null)

  useEffect(() => {
    // 已抵達備援網域：正常遊玩，清除自動標記以便下次回主網域重新探測
    if (!isMainDomain()) {
      try { localStorage.removeItem(AUTO_KEY) } catch {}
      return
    }

    // 已標記自動跳轉（例如上次跳過）→ 直接無痛再跳，不重複探測
    try {
      if (localStorage.getItem(AUTO_KEY) === '1') {
        window.location.replace(FALLBACK_URL)
        return
      }
    } catch {}

    let cancelled = false
    let redirected = false

    const run = async () => {
      if (redirected || cancelled) return
      const ok = await probeHealth()
      if (cancelled || redirected) return
      if (!ok) {
        // 主網域連線失敗（雲科大 DNS 導致 /api/health 不可達）
        // → 寫入標記並「無痛自動跳轉」備援網址，location.replace 不堆歷史
        redirected = true
        try { localStorage.setItem(AUTO_KEY, '1') } catch {}
        try {
          window.location.replace(FALLBACK_URL)
        } catch {
          // 極少數（如被 sandbox 擋）才顯示手動備援按鈕
          setShowManual(true)
        }
      }
      // 連線正常：什麼都不顯示，直接玩遊戲
    }

    run()

    // 持續監測：每 60 秒重新探測，若連線中途失效則自動跳轉
    probeTimer.current = setInterval(() => {
      if (redirected) return
      try {
        if (localStorage.getItem(AUTO_KEY) === '1') return
      } catch {}
      run()
    }, 60000)

    return () => {
      cancelled = true
      if (probeTimer.current) clearInterval(probeTimer.current)
    }
  }, [])

  const goFallbackManual = () => {
    try { localStorage.setItem(AUTO_KEY, '1') } catch {}
    window.location.replace(FALLBACK_URL)
  }

  if (!showManual) return null

  // 僅當自動跳轉被環境阻擋時的備用入口
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
        ⚠️ 自動跳轉失敗，請手動切換備援網址繼續遊玩
      </span>
      <button
        onClick={goFallbackManual}
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
