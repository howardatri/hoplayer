import { useEffect, useState, useRef } from 'react'
import { useCoverArt } from './useCoverArt'

interface RGBColor {
  r: number
  g: number
  b: number
}

// Reuse a single off-screen canvas to avoid repeated GPU resource allocation
const _sharedCanvas = document.createElement('canvas')
_sharedCanvas.width = 64
_sharedCanvas.height = 64
const _sharedCtx = _sharedCanvas.getContext('2d', { willReadFrequently: true })

/**
 * Extract the dominant color from a cover art image and apply it as a CSS variable.
 * Uses Canvas to sample pixels and find the most vibrant non-dark color.
 */
export function useThemeColor(filePath: string | undefined) {
  const { coverUrl } = useCoverArt(filePath)
  const [dominantColor, setDominantColor] = useState<RGBColor | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    if (!coverUrl) {
      resetTheme()
      setDominantColor(null)
      return
    }

    let cancelled = false

    // Abort previous image load if still in-flight
    if (imgRef.current) {
      imgRef.current.onload = null
      imgRef.current.onerror = null
      imgRef.current.src = ''
    }

    const img = new Image()
    imgRef.current = img
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      if (cancelled) {
        // Release image immediately if cancelled
        img.onload = null
        img.onerror = null
        img.src = ''
        return
      }

      const ctx = _sharedCtx
      if (!ctx) return

      ctx.drawImage(img, 0, 0, 64, 64)
      const imageData = ctx.getImageData(0, 0, 64, 64)
      const pixels = imageData.data

      // Release image bitmap immediately
      img.onload = null
      img.onerror = null
      img.src = ''

      // Release imageData reference
      const color = extractDominantColor(pixels)
      if (color && !cancelled) {
        setDominantColor(color)
        applyTheme(color)
      }
    }

    img.onerror = () => {
      if (!cancelled) {
        resetTheme()
        setDominantColor(null)
      }
      img.onload = null
      img.onerror = null
      img.src = ''
    }

    img.src = coverUrl

    return () => {
      cancelled = true
      // Abort image load on cleanup
      if (imgRef.current) {
        imgRef.current.onload = null
        imgRef.current.onerror = null
        imgRef.current.src = ''
      }
    }
  }, [coverUrl])

  return dominantColor
}

/**
 * Extract dominant vibrant color from pixel data.
 * Filters out very dark and very light pixels, then averages.
 */
function extractDominantColor(pixels: Uint8ClampedArray): RGBColor | null {
  let r = 0,
    g = 0,
    b = 0
  let count = 0

  for (let i = 0; i < pixels.length; i += 4) {
    const pr = pixels[i]
    const pg = pixels[i + 1]
    const pb = pixels[i + 2]
    const pa = pixels[i + 3]

    if (pa < 128) continue // Skip transparent

    // Skip very dark pixels
    const brightness = (pr + pg + pb) / 3
    if (brightness < 30) continue

    // Skip very light pixels (likely white background)
    if (brightness > 240) continue

    // Boost saturated colors
    const max = Math.max(pr, pg, pb)
    const min = Math.min(pr, pg, pb)
    const saturation = max === 0 ? 0 : (max - min) / max

    if (saturation > 0.15) {
      // Prefer more saturated colors
      const weight = 1 + saturation * 2
      r += pr * weight
      g += pg * weight
      b += pb * weight
      count += weight
    } else {
      r += pr
      g += pg
      b += pb
      count++
    }
  }

  if (count === 0) return null

  return {
    r: Math.round(r / count),
    g: Math.round(g / count),
    b: Math.round(b / count)
  }
}

/**
 * Apply the extracted color as CSS custom properties.
 */
function applyTheme(color: RGBColor) {
  const root = document.documentElement
  const { r, g, b } = color

  root.style.setProperty('--color-primary', `rgb(${r}, ${g}, ${b})`)
  root.style.setProperty(
    '--color-primary-light',
    `rgb(${Math.min(255, r + 30)}, ${Math.min(255, g + 30)}, ${Math.min(255, b + 30)})`
  )
  root.style.setProperty(
    '--color-primary-dark',
    `rgb(${Math.max(0, r - 30)}, ${Math.max(0, g - 30)}, ${Math.max(0, b - 30)})`
  )
}

/**
 * Reset theme to default indigo.
 */
function resetTheme() {
  const root = document.documentElement
  root.style.setProperty('--color-primary', '#7c5bf5')
  root.style.setProperty('--color-primary-light', '#9b82f8')
  root.style.setProperty('--color-primary-dark', '#5e3dd7')
}
