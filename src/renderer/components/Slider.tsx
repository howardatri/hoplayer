import { useRef, useState, useCallback, useEffect } from 'react'

interface SliderProps {
  value: number // 0-1
  onChange: (value: number) => void // called on every drag move
  onCommit?: (value: number) => void // called when drag ends
  color?: string
  trackHeight?: number
  thumbSize?: number
  showThumb?: boolean // always show thumb, or only on hover
  style?: React.CSSProperties
}

/**
 * Custom drag slider. Handles mousedown/mousemove/mouseup internally.
 * - onChange fires continuously during drag (for live visual feedback)
 * - onCommit fires once on mouseup (for seek, etc.)
 * - Returns value 0-1
 */
export default function Slider({
  value,
  onChange,
  onCommit,
  color = 'var(--color-primary, #7c5bf5)',
  trackHeight = 4,
  thumbSize = 12,
  showThumb = false,
  style
}: SliderProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
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
    setIsDragging(true)
    onChange(v)
  }, [getValueFromEvent, onChange])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      const v = getValueFromEvent(e)
      onChange(v)
    }

    const handleMouseUp = (e: MouseEvent) => {
      const v = getValueFromEvent(e)
      setIsDragging(false)
      onCommit?.(v)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, getValueFromEvent, onChange, onCommit])

  const thumbVisible = showThumb || isDragging || hovering
  const displayValue = Math.max(0, Math.min(1, value))

  return (
    <div
      ref={trackRef}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      style={{
        position: 'relative',
        height: Math.max(trackHeight, thumbSize),
        cursor: 'pointer',
        touchAction: 'none',
        ...style
      }}
    >
      {/* Track background */}
      <div style={{
        position: 'absolute',
        left: 0, right: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        height: trackHeight,
        background: 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
        borderRadius: trackHeight / 2
      }} />

      {/* Filled portion */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        width: `${displayValue * 100}%`,
        height: trackHeight,
        background: color,
        borderRadius: trackHeight / 2,
        transition: isDragging ? 'none' : 'width 0.1s linear'
      }} />

      {/* Thumb */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: `${displayValue * 100}%`,
        transform: 'translate(-50%, -50%)',
        width: thumbSize,
        height: thumbSize,
        borderRadius: '50%',
        background: 'white',
        boxShadow: '0 0 4px rgba(0,0,0,0.3)',
        opacity: thumbVisible ? 1 : 0,
        transition: isDragging ? 'none' : 'opacity 0.15s, left 0.1s linear',
        pointerEvents: 'none'
      }} />
    </div>
  )
}
