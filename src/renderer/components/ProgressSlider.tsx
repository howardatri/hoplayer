import { useRef, useState, useCallback, useEffect } from 'react'
import { setSeeking } from '@/hooks/usePlayer'

interface ProgressSliderProps {
  progress: number // 0-1 from store (updated by timeupdate)
  onSeek: (ratio: number) => void
}

/**
 * Progress bar with independent drag state.
 *
 * Key: during drag, displays an internal dragProgress value instead of
 * the store's progress (which keeps getting overwritten by timeupdate).
 */
export default function ProgressSlider({ progress, onSeek }: ProgressSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragProgress, setDragProgress] = useState(0)
  const [hovering, setHovering] = useState(false)

  const getValueFromEvent = useCallback((e: MouseEvent | React.MouseEvent) => {
    const rect = trackRef.current?.getBoundingClientRect()
    if (!rect) return 0
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const v = getValueFromEvent(e)
    setDragProgress(v)
    setIsDragging(true)
    setSeeking(true) // block timeupdate immediately
  }, [getValueFromEvent])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      const v = getValueFromEvent(e)
      setDragProgress(v)
    }

    const handleMouseUp = (e: MouseEvent) => {
      const v = getValueFromEvent(e)
      setIsDragging(false)
      onSeek(v) // commit seek; seek() sets _isSeeking + seeked clears it
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, getValueFromEvent, onSeek])

  // While dragging, show dragProgress. Otherwise show store progress.
  const displayValue = isDragging ? dragProgress : progress
  const thumbVisible = isDragging || hovering

  return (
    <div
      ref={trackRef}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        position: 'relative',
        height: 14,
        cursor: 'pointer',
        touchAction: 'none',
        flex: 1
      }}
    >
      {/* Track background */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        height: 4,
        background: 'rgba(255,255,255,0.1)',
        borderRadius: 2
      }} />

      {/* Filled portion */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        width: `${displayValue * 100}%`,
        height: 4,
        background: 'var(--color-primary, #6366f1)',
        borderRadius: 2,
        transition: isDragging ? 'none' : 'width 0.1s linear'
      }} />

      {/* Thumb */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: `${displayValue * 100}%`,
        transform: 'translate(-50%, -50%)',
        width: isDragging ? 14 : 12,
        height: isDragging ? 14 : 12,
        borderRadius: '50%',
        background: 'white',
        boxShadow: '0 0 4px rgba(0,0,0,0.3)',
        opacity: thumbVisible ? 1 : 0,
        transition: isDragging ? 'none' : 'opacity 0.15s',
        pointerEvents: 'none'
      }} />
    </div>
  )
}
