import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, Info } from 'lucide-react'

/**
 * Lightweight toast system. Use anywhere:
 *   const toast = useToast()
 *   toast('Profile saved')                 // success (default)
 *   toast('Payment failed', 'error')
 *   toast('Heads up…', 'info')
 */
const ToastContext = createContext(() => {})

const ICONS = {
  success: <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />,
  error: <XCircle size={16} className="shrink-0 text-rose-400" />,
  info: <Info size={16} className="shrink-0 text-brand-300" />,
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const toast = useCallback((text, kind = 'success') => {
    const id = ++idRef.current
    setToasts((t) => [...t.slice(-2), { id, text, kind }]) // max 3 visible
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              role="status"
              className="pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-2xl border border-ink-600 bg-ink-800/95 px-4 py-3 text-sm font-medium text-slate-100 shadow-2xl shadow-black/30 backdrop-blur-xl"
            >
              {ICONS[t.kind] || ICONS.info}
              <span className="min-w-0">{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
