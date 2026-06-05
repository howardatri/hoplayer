import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Music } from 'lucide-react'
import { parseLrc, findCurrentLyricIndex, getLrcPath, type LyricLine } from '@/utils/lrcParser'
import usePlayerStore from '@/store/playerStore'

interface LyricsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export default function LyricsPanel({ isOpen, onClose }: LyricsPanelProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])

  // Load lyrics when track changes
  useEffect(() => {
    if (!currentTrack) {
      setLyrics([])
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)

    const loadLyrics = async () => {
      try {
        // Try to read .lrc file via IPC
        const lrcPath = getLrcPath(currentTrack.filePath)
        if (!lrcPath) {
          setLyrics([])
          setIsLoading(false)
          return
        }

        // Read the file via IPC (we'll add this handler)
        const result = await window.electronAPI.readLrcFile(lrcPath)
        if (cancelled) return

        if (result) {
          const parsed = parseLrc(result)
          setLyrics(parsed.lines)
        } else {
          setLyrics([])
        }
      } catch (err) {
        if (!cancelled) {
          setLyrics([])
          setError('No lyrics found')
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadLyrics()
    return () => {
      cancelled = true
    }
  }, [currentTrack?.filePath])

  // Current lyric index
  const currentIndex = useMemo(
    () => findCurrentLyricIndex(lyrics, currentTime),
    [lyrics, currentTime]
  )

  // Auto-scroll to current line
  useEffect(() => {
    if (currentIndex >= 0 && lineRefs.current[currentIndex]) {
      lineRefs.current[currentIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  }, [currentIndex])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-10 bottom-20 w-80 glass-strong z-40 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <h3 className="text-sm font-semibold text-white/80">Lyrics</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Lyrics content */}
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto px-4 py-6"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : lyrics.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-white/20">
                <Music className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">{error || 'No lyrics available'}</p>
                <p className="text-xs mt-1">Place a .lrc file next to the audio</p>
              </div>
            ) : (
              <div className="space-y-4">
                {lyrics.map((line, index) => (
                  <div
                    key={`${line.time}-${index}`}
                    ref={(el) => (lineRefs.current[index] = el)}
                    className={`text-center transition-all duration-300 cursor-pointer ${
                      index === currentIndex
                        ? 'text-white text-lg font-semibold scale-105'
                        : Math.abs(index - currentIndex) <= 2
                          ? 'text-white/40 text-sm'
                          : 'text-white/15 text-sm'
                    }`}
                    onClick={() => {
                      // Seek to this lyric's time
                      const store = usePlayerStore.getState()
                      if (store.duration > 0) {
                        const ratio = line.time / store.duration
                        // We need to trigger seek through the audio element
                        // For now, update the store
                        store.setCurrentTime(line.time)
                        store.setProgress(ratio)
                      }
                    }}
                  >
                    {line.text}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
