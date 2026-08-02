import { useState, useCallback, createContext, useContext, useEffect } from 'react'

const ToastContext = createContext()

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [modal, setModal] = useState(null)
  const [tick, setTick] = useState(0)
  const [previewText, setPreviewText] = useState('')

  useEffect(() => {
    if (!modal) return
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [modal])

  useEffect(() => {
    if (!modal?.preview || !modal.value) { setPreviewText(''); return }
    let cancelled = false
    Promise.resolve(modal.preview(modal.value, tick)).then(txt => { if (!cancelled) setPreviewText(txt || '') })
    return () => { cancelled = true }
  }, [modal?.preview, modal?.value, tick])

  const toast = useCallback((msg, type = 'info') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }, [])

  const prompt = useCallback((title, cb, preview) => {
    setModal({ title, cb, value: '', preview })
  }, [])

  const promptMulti = useCallback((title, fields, cb) => {
    setModal({ title, fields, cb, values: fields.map(f => f.default || '') })
  }, [])

  const closeModal = useCallback(() => setModal(null), [])

  return (
    <ToastContext.Provider value={{ toast, prompt, promptMulti }}>
      {children}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.type === 'success' ? 'rgba(0,255,65,0.12)' : 'rgba(239,68,68,0.12)',
            border: `1px solid ${t.type === 'success' ? 'rgba(0,255,65,0.3)' : 'rgba(239,68,68,0.3)'}`,
            color: t.type === 'success' ? 'var(--accent)' : 'var(--danger)',
            padding: '10px 18px', borderRadius: 8, fontSize: 13,
            backdropFilter: 'blur(8px)', maxWidth: 300,
            animation: 'slideIn 0.2s ease',
          }}>{t.msg}</div>
        ))}
      </div>
      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}
          onClick={closeModal}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, minWidth: 300 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ color: 'var(--text)', fontSize: 14, marginBottom: 16, fontWeight: 600 }}>{modal.title}</div>
            {modal.fields ? modal.fields.map((f, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ color: 'var(--dim)', fontSize: 12, marginBottom: 4 }}>{f.label}</div>
                {f.options ? (
                  <select autoFocus={i === 0} value={modal.values[i]} onChange={e => setModal(prev => { const v = [...prev.values]; v[i] = e.target.value; return { ...prev, values: v } })}
                    style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 14px', borderRadius: 6, fontSize: 13, width: '100%', outline: 'none' }}>
                    {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input autoFocus={i === 0} value={modal.values[i]} onChange={e => setModal(prev => { const v = [...prev.values]; v[i] = e.target.value; return { ...prev, values: v } })}
                    placeholder={f.placeholder || ''}
                    style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 14px', borderRadius: 6, fontSize: 13, width: '100%', outline: 'none' }} />
                )}
              </div>
            )            ) : (
              <div>
                <input autoFocus value={modal.value} onChange={e => setModal(prev => ({ ...prev, value: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter' && modal.value) { modal.cb(modal.value); closeModal() } }}
                  placeholder="輸入..."
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '10px 14px', borderRadius: 6, fontSize: 13, width: '100%', outline: 'none' }} />
                {previewText && <div style={{ marginTop: 8, fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
                  {previewText}
                </div>}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="btn btn-sm" onClick={closeModal}>取消</button>
              <button className="btn btn-primary btn-sm" onClick={() => {
                if (modal.fields) { modal.cb(modal.values); closeModal() }
                else if (modal.value) { modal.cb(modal.value); closeModal() }
              }} style={{ opacity: (modal.fields || modal.value) ? 1 : 0.5 }}>確定</button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}

export function useToastMulti() {
  return useContext(ToastContext)
}
