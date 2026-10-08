import { createContext, useCallback, useContext, useEffect, useState } from 'react'

/* ---------- toasts ---------- */
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((text, kind = 'ok') => {
    const id = Math.random()
    setItems((x) => [...x, { id, text, kind }])
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 4200)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((i) => <div key={i.id} className={`toast ${i.kind}`}>{i.text}</div>)}
      </div>
    </ToastCtx.Provider>
  )
}

/* ---------- small building blocks ---------- */
export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}

export const Badge = ({ value }) => <span className={`badge ${String(value).toLowerCase()}`}>{String(value).replace('_', ' ').toLowerCase()}</span>

export const Empty = ({ text, children }) => (
  <div className="empty"><p>{text}</p>{children}</div>
)

export const PageHead = ({ title, sub, children }) => (
  <div className="page-head">
    <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
    <div className="actions">{children}</div>
  </div>
)

export const Loading = () => <div className="loading">Loading…</div>

/* ---------- formatting ---------- */
export const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
export const fmtTime = (t) => {
  if (!t) return '—'
  const [h, m] = t.split(':')
  const hr = Number(h)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
}
export const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })
export const today = () => new Date().toISOString().slice(0, 10)
export const SLOTS = Array.from({ length: 16 }, (_, i) => {
  const mins = 9 * 60 + i * 30
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
})

/* ---------- printable documents (prescription / receipt) ---------- */
export function printDoc(title, bodyHtml) {
  const w = window.open('', '_blank', 'width=800,height=900')
  if (!w) return
  w.document.write(`<html><head><title>${title}</title><style>
    body{font-family:Arial,sans-serif;color:#10302E;padding:36px;max-width:720px;margin:auto}
    h1{font-size:22px;margin:0}h2{font-size:15px;margin:22px 0 8px}
    .top{border-bottom:3px solid #10302E;padding-bottom:12px;margin-bottom:18px}
    table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:8px;border-bottom:1px solid #ccd8d5;font-size:14px}
    .muted{color:#5b6f6c;font-size:13px}.total{font-size:18px;font-weight:bold;text-align:right;margin-top:14px}
  </style></head><body>
  <div class="top"><h1>CareLink Hospital</h1><div class="muted">${title}</div></div>${bodyHtml}
  <script>window.onload=()=>window.print()<\/script></body></html>`)
  w.document.close()
}
