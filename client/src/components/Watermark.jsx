const BUILD_HASH = typeof __BUILD_HASH__ !== 'undefined' ? __BUILD_HASH__ : 'dev'
const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : null

function formatTime(iso) {
  if (!iso) return new Date().toLocaleString('zh-TW')
  return new Date(iso).toLocaleString('zh-TW', { hour12: false })
}

export default function Watermark() {
  return (
    <div style={{
      position: 'fixed', right: 6, bottom: 4, zIndex: 9998,
      fontSize: 10, fontFamily: 'monospace',
      color: 'rgba(148,163,184,0.35)', background: 'rgba(0,0,0,0.25)',
      padding: '2px 6px', borderRadius: 4, pointerEvents: 'none',
      userSelect: 'none', whiteSpace: 'nowrap', letterSpacing: '0.3px',
    }}>
      {BUILD_HASH} · {formatTime(BUILD_TIME)}
    </div>
  )
}
