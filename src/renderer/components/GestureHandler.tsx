import { useRef, useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Volume2, FastForward, Rewind } from 'lucide-react'

interface GestureHandlerProps {
  onVolumeChange?: (delta: number) => void
  onSeekDelta?: (deltaSeconds: number) => void
  children: React.ReactNode
}

/**
 * Gesture handler overlay for the player area.
 * Horizontal swipe: seek forward/backward
 * Vertical swipe on right side: volume up/down
 */
export default function GestureHandler({
  onVolumeChange,
  onSeekDelta,
  children
}: GestureHandlerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const isDraggingRef = useRef(false)
  const gestureTypeRef = useRef<'none' | 'horizontal' | 'vertical'>('none')

  const [gestureHint, setGestureHint] = useState<{
    type: 'volume' | 'seek'
    direction: 'up' | 'down' | 'left' | 'right'
    value: string
  } | null>(null)

  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const showHint = useCallback(
    (type: 'volume' | 'seek', direction: 'up' | 'down' | 'left' | 'right', value: string) => {
      setGestureHint({ type, direction, value })
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current)
      hintTimeoutRef.current = setTimeout(() => setGestureHint(null), 800)
    },
    []
  )

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only activate on primary button (touch or mouse)
    if (e.button !== 0) return
    startXRef.current = e.clientX
    startYRef.current = e.clientY
    isDraggingRef.current = true
    gestureTypeRef.current = 'none'

    const container = containerRef.current
    if (container) {
      container.setPointerCapture(e.pointerId)
    }
  }, [])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return

      const dx = e.clientX - startXRef.current
      const dy = e.clientY - startYRef.current
      const threshold = 20

      // Determine gesture type on first significant movement
      if (gestureTypeRef.current === 'none') {
        if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
          gestureTypeRef.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical'
        }
        return
      }

      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()

      if (gestureTypeRef.current === 'horizontal') {
        // Horizontal: seek
        const seekDelta = (dx / rect.width) * 30 // 30 seconds at full width
        if (Math.abs(seekDelta) > 1) {
          showHint('seek', dx > 0 ? 'right' : 'left', `${Math.abs(Math.round(seekDelta))}s`)
          onSeekDelta?.(seekDelta)
          startXRef.current = e.clientX
        }
      } else {
        // Vertical on right side: volume
        const isRightSide = e.clientX > rect.left + rect.width * 0.5
        if (isRightSide) {
          const volumeDelta = -(dy / rect.height) * 0.5 // 50% at full height
          if (Math.abs(volumeDelta) > 0.02) {
            showHint('volume', dy < 0 ? 'up' : 'down', `${Math.round(volumeDelta * 100)}%`)
            onVolumeChange?.(volumeDelta)
            startYRef.current = e.clientY
          }
        }
      }
    },
    [onVolumeChange, onSeekDelta, showHint]
  )

  const handlePointerUp = useCallback(() => {
    isDraggingRef.current = false
    gestureTypeRef.current = 'none'
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {children}

      {/* Gesture hint overlay */}
      <AnimatePresence>
        {gestureHint && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="flex flex-col items-center gap-2 px-6 py-4 rounded-2xl bg-black/60 backdrop-blur-md">
              {gestureHint.type === 'volume' ? (
                <Volume2 className="w-8 h-8 text-white" />
              ) : gestureHint.direction === 'right' ? (
                <FastForward className="w-8 h-8 text-white" />
              ) : (
                <Rewind className="w-8 h-8 text-white" />
              )}
              <span className="text-2xl font-bold text-white">{gestureHint.value}</span>
              <span className="text-xs text-white/50 capitalize">
                {gestureHint.type} {gestureHint.direction}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
