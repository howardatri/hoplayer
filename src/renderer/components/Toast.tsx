import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle, Info, XCircle, X } from 'lucide-react'
import useToastStore from '@/store/toastStore'

const icons = {
  info: Info,
  success: CheckCircle,
  error: XCircle
}

const iconColors = {
  info: 'var(--color-primary)',
  success: '#22c55e',
  error: 'var(--color-danger)'
}

const borderColors = {
  info: 'color-mix(in srgb, var(--color-primary) 40%, transparent)',
  success: 'color-mix(in srgb, #22c55e 40%, transparent)',
  error: 'color-mix(in srgb, var(--color-danger) 40%, transparent)'
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  return (
    <div style={{
      position: 'fixed', bottom: 100, right: 24, zIndex: 200,
      display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none'
    }}>
      <AnimatePresence>
        {toasts.map((toast) => {
          const type = toast.type || 'info'
          const Icon = icons[type]
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 16px', borderRadius: 10,
                background: 'color-mix(in srgb, var(--color-bg) 95%, transparent)',
                backdropFilter: 'blur(20px)',
                borderLeft: `3px solid ${borderColors[type]}`,
                border: '1px solid var(--color-surface-hover)',
                borderLeftWidth: 3,
                borderLeftColor: borderColors[type],
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                pointerEvents: 'auto', minWidth: 200, maxWidth: 360
              }}
            >
              <Icon size={16} style={{ color: iconColors[type], flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: 'var(--color-text)', flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 2, display: 'flex', borderRadius: 4, transition: 'color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
              >
                <X size={14} />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
