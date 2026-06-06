import { useRef, useEffect, useCallback } from 'react'
import { getAnalyserNode } from '@/hooks/usePlayer'
import usePlayerStore from '@/store/playerStore'

const getComputedPrimary = () => getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#7c5bf5'

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
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
  const animationRef = useRef<number>(0)
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  // Reuse buffers across frames to reduce GC pressure
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const cachedPrimaryRef = useRef<string>('')
  const cachedPrimaryRgbaRef = useRef<string>('')

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const analyser = getAnalyserNode()
    if (!analyser) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawIdleBars(ctx, canvas.width, canvas.height)
      if (isPlaying) {
        animationRef.current = requestAnimationFrame(draw)
      }
      return
    }

    // Reuse Uint8Array buffer instead of allocating every frame
    const bufferLength = analyser.frequencyBinCount
    if (!dataArrayRef.current || dataArrayRef.current.length !== bufferLength) {
      dataArrayRef.current = new Uint8Array(bufferLength)
    }
    analyser.getByteFrequencyData(dataArrayRef.current)

    // Cache primary color - only recompute when it changes
    const primary = getComputedPrimary()
    if (primary !== cachedPrimaryRef.current) {
      cachedPrimaryRef.current = primary
      cachedPrimaryRgbaRef.current = primary.startsWith('#')
        ? primary
        : `#${primary}`
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    switch (style) {
      case 'bars':
        drawBars(ctx, dataArrayRef.current, canvas.width, canvas.height, cachedPrimaryRgbaRef.current)
        break
      case 'wave':
        drawWave(ctx, dataArrayRef.current, canvas.width, canvas.height, cachedPrimaryRgbaRef.current)
        break
      case 'circular':
        drawCircular(ctx, dataArrayRef.current, canvas.width, canvas.height, cachedPrimaryRgbaRef.current)
        break
    }

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(draw)
    }
  }, [isPlaying, style])

  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(draw)
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, draw])

  // Draw idle state when not playing
  useEffect(() => {
    if (!isPlaying) {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      drawIdleBars(ctx, canvas.width, canvas.height)
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
