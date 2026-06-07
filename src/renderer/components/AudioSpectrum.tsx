import { useRef, useEffect } from 'react'
import { getAnalyserNode } from '@/hooks/usePlayer'
import usePlayerStore from '@/store/playerStore'

const getComputedPrimary = () => getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#7c5bf5'

// Throttle spectrum to 30fps to halve CPU usage
const FRAME_INTERVAL = 1000 / 30

function hexToRgba(hex: string, alpha: number): string {
  // Handle both hex (#rrggbb) and rgb(r, g, b) formats
  if (hex.startsWith('rgb(')) {
    const nums = hex.slice(4, -1)
    return `rgba(${nums}, ${alpha})`
  }
  const h = hex.startsWith('#') ? hex : `#${hex}`
  const r = parseInt(h.slice(1, 3), 16)
  const g = parseInt(h.slice(3, 5), 16)
  const b = parseInt(h.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

interface AudioSpectrumProps {
  width?: number
  height?: number
  className?: string
  style?: 'bars' | 'wave' | 'circular'
}

/**
 * Canvas 2D audio spectrum visualizer.
 * Reads frequency data from the Web Audio API AnalyserNode.
 */
export default function AudioSpectrum({
  width = 300,
  height = 80,
  className = '',
  style = 'bars'
}: AudioSpectrumProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const styleRef = useRef(style)
  styleRef.current = style

  // Reuse buffers across frames to reduce GC pressure
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const cachedPrimaryRef = useRef<string>('')

  // Stable animation loop — doesn't recreate when style/isPlaying change
  const lastFrameTime = useRef(0)

  useEffect(() => {
    if (!isPlaying) {
      // Draw idle state
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          drawIdleBars(ctx, canvas.width, canvas.height)
        }
      }
      return
    }

    let rafId = 0
    let stopped = false

    const loop = (now: number) => {
      if (stopped) return
      rafId = requestAnimationFrame(loop)

      // Throttle to ~30fps
      if (now - lastFrameTime.current < FRAME_INTERVAL) return
      lastFrameTime.current = now

      // Skip drawing when tab is hidden
      if (document.hidden) return

      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const analyser = getAnalyserNode()
      if (!analyser) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        drawIdleBars(ctx, canvas.width, canvas.height)
        return
      }

      // Reuse Uint8Array buffer
      const bufferLength = analyser.frequencyBinCount
      if (!dataArrayRef.current || dataArrayRef.current.length !== bufferLength) {
        dataArrayRef.current = new Uint8Array(bufferLength)
      }
      analyser.getByteFrequencyData(dataArrayRef.current)

      // Cache primary color
      const primary = getComputedPrimary()
      if (primary !== cachedPrimaryRef.current) {
        cachedPrimaryRef.current = primary
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const currentStyle = styleRef.current
      switch (currentStyle) {
        case 'bars':
          drawBars(ctx, dataArrayRef.current, canvas.width, canvas.height, cachedPrimaryRef.current)
          break
        case 'wave':
          drawWave(ctx, dataArrayRef.current, canvas.width, canvas.height, cachedPrimaryRef.current)
          break
        case 'circular':
          drawCircular(ctx, dataArrayRef.current, canvas.width, canvas.height, cachedPrimaryRef.current)
          break
      }
    }

    rafId = requestAnimationFrame(loop)

    // Pause when tab hidden, resume when visible
    const onVisibility = () => {
      if (!document.hidden && isPlaying) {
        lastFrameTime.current = 0 // force immediate redraw
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stopped = true
      cancelAnimationFrame(rafId)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isPlaying])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ width, height }}
    />
  )
}

function drawBars(
  ctx: CanvasRenderingContext2D,
  data: Uint8Array,
  w: number,
  h: number,
  primary: string
) {
  const barCount = 32
  const step = Math.floor(data.length / barCount)
  const barWidth = (w / barCount) * 0.7
  const gap = (w / barCount) * 0.3

  for (let i = 0; i < barCount; i++) {
    const value = data[i * step] / 255
    const barHeight = Math.max(2, value * h * 0.9)
    const x = i * (barWidth + gap) + gap / 2
    const y = h - barHeight

    const gradient = ctx.createLinearGradient(x, y, x, h)
    gradient.addColorStop(0, hexToRgba(primary, 0.6 + value * 0.4))
    gradient.addColorStop(1, hexToRgba(primary, 0.1))

    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0])
    ctx.fill()
  }
}

function drawWave(
  ctx: CanvasRenderingContext2D,
  data: Uint8Array,
  w: number,
  h: number,
  primary: string
) {
  const sliceWidth = w / data.length
  let x = 0

  ctx.beginPath()
  ctx.strokeStyle = hexToRgba(primary, 0.8)
  ctx.lineWidth = 2

  for (let i = 0; i < data.length; i++) {
    const v = data[i] / 255
    const y = h - v * h * 0.8 - h * 0.1

    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
    x += sliceWidth
  }

  ctx.stroke()

  ctx.lineTo(w, h)
  ctx.lineTo(0, h)
  ctx.closePath()
  ctx.fillStyle = hexToRgba(primary, 0.1)
  ctx.fill()
}

function drawCircular(
  ctx: CanvasRenderingContext2D,
  data: Uint8Array,
  w: number,
  h: number,
  primary: string
) {
  const centerX = w / 2
  const centerY = h / 2
  const radius = Math.min(w, h) * 0.3
  const barCount = 48
  const step = Math.floor(data.length / barCount)

  for (let i = 0; i < barCount; i++) {
    const value = data[i * step] / 255
    const angle = (i / barCount) * Math.PI * 2 - Math.PI / 2
    const barLength = Math.max(2, value * radius * 0.8)

    const x1 = centerX + Math.cos(angle) * radius
    const y1 = centerY + Math.sin(angle) * radius
    const x2 = centerX + Math.cos(angle) * (radius + barLength)
    const y2 = centerY + Math.sin(angle) * (radius + barLength)

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = hexToRgba(primary, 0.3 + value * 0.7)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  ctx.beginPath()
  ctx.arc(centerX, centerY, radius * 0.95, 0, Math.PI * 2)
  ctx.strokeStyle = hexToRgba(primary, 0.2)
  ctx.lineWidth = 1
  ctx.stroke()
}

function drawIdleBars(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
) {
  const barCount = 32
  const barWidth = (w / barCount) * 0.7
  const gap = (w / barCount) * 0.3

  for (let i = 0; i < barCount; i++) {
    const x = i * (barWidth + gap) + gap / 2
    const barHeight = 2
    const y = h - barHeight

    ctx.fillStyle = hexToRgba(getComputedPrimary(), 0.15)
    ctx.beginPath()
    ctx.roundRect(x, y, barWidth, barHeight, [1, 1, 0, 0])
    ctx.fill()
  }
}
