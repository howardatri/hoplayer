import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface ContextMenuItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  danger?: boolean
  divider?: boolean
  disabled?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

export default function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    if (rect.right > vw) ref.current.style.left = `${vw - rect.width - 8}px`
    if (rect.bottom > vh) ref.current.style.top = `${vh - rect.height - 8}px`
  }, [x, y])

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
    }
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.92, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -4 }}
      transition={{ duration: 0.12 }}
      style={{
        position: 'fixed', left: x, top: y, zIndex: 300,
        minWidth: 180, padding: 4,
        background: 'color-mix(in srgb, var(--color-bg) 97%, transparent)',
        backdropFilter: 'blur(30px)',
        border: '1px solid var(--color-border)',
        borderRadius: 10,
        boxShadow: '0 12px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.1)',
      }}
    >
      {items.map((item, i) => {
        if (item.divider) {
          return <div key={i} style={{ height: 1, background: 'var(--color-border)', margin: '4px 8px' }} />
        }
        return (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => { item.onClick(); onClose() }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '7px 12px', borderRadius: 6,
              fontSize: 13, border: 'none', cursor: item.disabled ? 'default' : 'pointer',
              background: 'transparent',
              color: item.disabled ? 'var(--color-text-muted)' : item.danger ? 'var(--color-danger, #ef4444)' : 'var(--color-text)',
              transition: 'background 0.1s',
              opacity: item.disabled ? 0.5 : 1,
            }}
            onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.background = 'var(--color-surface-hover)' }}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {item.icon && <span style={{ width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{item.icon}</span>}
            <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
          </button>
        )
      })}
    </motion.div>
  )
}

// Hook to manage context menu state
export function useContextMenu() {
  const [state, setState] = useState<{ x: number; y: number; items: ContextMenuItem[] } | null>(null)

  const open = useCallback((e: React.MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault()
    e.stopPropagation()
    setState({ x: e.clientX, y: e.clientY, items })
  }, [])

  const close = useCallback(() => setState(null), [])

  return { contextMenu: state, openContextMenu: open, closeContextMenu: close }
}
