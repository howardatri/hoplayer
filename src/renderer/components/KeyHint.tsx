import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Search,
  Music
} from 'lucide-react'

interface KeyAction {
  key: string
  label: string
  icon: React.ReactNode
}

const KEY_ACTIONS: Record<string, KeyAction> = {
  Space: {
    key: 'Space',
    label: 'Play / Pause',
    icon: <Play className="w-5 h-5" />
  },
  'Ctrl+ArrowRight': {
    key: 'Ctrl+→',
    label: 'Next Track',
    icon: <SkipForward className="w-5 h-5" />
  },
  'Ctrl+ArrowLeft': {
    key: 'Ctrl+←',
    label: 'Previous Track',
    icon: <SkipBack className="w-5 h-5" />
  },
  'Ctrl+ArrowUp': {
    key: 'Ctrl+↑',
    label: 'Volume Up',
    icon: <Volume2 className="w-5 h-5" />
  },
  'Ctrl+ArrowDown': {
    key: 'Ctrl+↓',
    label: 'Volume Down',
    icon: <VolumeX className="w-5 h-5" />
  },
  'Ctrl+KeyL': {
    key: 'Ctrl+L',
    label: 'Toggle Lyrics',
    icon: <Music className="w-5 h-5" />
  },
  'Ctrl+KeyF': {
    key: 'Ctrl+F',
    label: 'Search',
    icon: <Search className="w-5 h-5" />
  }
}

function getKeyCode(e: KeyboardEvent): string {
  const parts = []
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.shiftKey) parts.push('Shift')
  if (e.altKey) parts.push('Alt')
  parts.push(e.code)
  return parts.join('+')
}

/**
 * Visual keyboard shortcut hint overlay.
 * Shows a brief animation when a recognized keyboard shortcut is pressed.
 */
export default function KeyHint() {
  const [activeAction, setActiveAction] = useState<KeyAction | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const keyCode = getKeyCode(e)
      const action = KEY_ACTIONS[keyCode]
      if (!action) return

      // Show the hint
      setActiveAction(action)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setActiveAction(null), 1200)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  return (
    <AnimatePresence>
      {activeAction && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[300] pointer-events-none"
        >
          <div className="flex items-center gap-3 px-5 py-3 rounded-xl glass-strong shadow-2xl">
            <div className="text-primary">{activeAction.icon}</div>
            <div>
              <div className="text-sm font-semibold text-fg">{activeAction.label}</div>
              <div className="text-xs text-fg-muted">{activeAction.key}</div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
