import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Music } from 'lucide-react'
import usePlayerStore from '@/store/playerStore'
import { useCoverArt } from '@/hooks/useCoverArt'
import { parseLrc, findCurrentLyricIndex, getLrcPath, type LyricLine } from '@/utils/lrcParser'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export default function FullscreenLyrics({ isOpen, onClose }: Props) {
  const currentTrack = usePlayerStore(s => s.currentTrack)
  const currentTime = usePlayerStore(s => s.currentTime)
  const duration = usePlayerStore(s => s.duration)
  const setProgress = usePlayerStore(s => s.setProgress)
  const setCurrentTime = usePlayerStore(s => s.setCurrentTime)
  const { coverUrl } = useCoverArt(currentTrack?.filePath)
  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])

  // Load lyrics on track change
  useEffect(() => {
    if (!isOpen || !currentTrack) {
      if (!isOpen) {
        setLyrics([])
      }
      return
    }
    let cancelled = false
    setLoading(true)
    setLyrics([])

    const loadLyrics = async () => {
      try {
        // Try local .lrc file first
        const lrcPath = getLrcPath(currentTrack.filePath)
        if (lrcPath) {
          const lrcContent = await window.electronAPI.readLrcFile(lrcPath)
          if (cancelled) return
          if (lrcContent) {
            const parsed = parseLrc(lrcContent)
            setLyrics(parsed.lines)
            setLoading(false)
            return
          }
        }
        // Fallback to online search
        const result = await window.electronAPI.lyricsSearchExact(
          currentTrack.title, currentTrack.artist, currentTrack.album, currentTrack.duration
        )
        if (cancelled) return
        if (result?.syncedLyrics) {
          const parsed = parseLrc(result.syncedLyrics)
          setLyrics(parsed.lines)
        }
      } catch (e) {
        console.warn('[fullscreen-lyrics] load failed:', e)
      }
      if (!cancelled) setLoading(false)
    }
    loadLyrics()
    return () => { cancelled = true }
  }, [isOpen, currentTrack?.filePath])

  // Auto-scroll to current line
  const currentIndex = useMemo(() => findCurrentLyricIndex(lyrics, currentTime), [lyrics, currentTime])

  useEffect(() => {
    if (currentIndex >= 0 && lineRefs.current[currentIndex]) {
      lineRefs.current[currentIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentIndex])

  // ESC to close
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const handleLineClick = useCallback((time: number) => {
    if (duration > 0) {
      setProgress(time / duration)
      setCurrentTime(time)
      // Also seek the audio element
      const audio = document.querySelector('audio') as HTMLAudioElement
      if (audio) audio.currentTime = time
    }
  }, [duration, setProgress, setCurrentTime])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Background with blurred cover art */}
          <div className="absolute inset-0 bg-black">
            {coverUrl && (
              <img
                src={coverUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover opacity-20 blur-3xl scale-110"
              />
            )}
            <div className="absolute inset-0 bg-black/60" />
          </div>

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-8 py-6">
            <div className="flex items-center gap-4">
              {coverUrl ? (
                <img src={coverUrl} alt="" className="w-14 h-14 rounded-lg object-cover shadow-lg" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center">
                  <Music className="w-6 h-6 text-white/50" />
                </div>
              )}
              <div>
                <h2 className="text-white text-xl font-semibold">{currentTrack?.title || 'Unknown'}</h2>
                <p className="text-white/60 text-sm">{currentTrack?.artist || 'Unknown Artist'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6 text-white/70" />
            </button>
          </div>

          {/* Lyrics */}
          <div ref={containerRef} className="relative z-10 flex-1 overflow-y-auto px-8 py-4 scroll-smooth">
            <div className="max-w-3xl mx-auto space-y-2 py-40">
              {loading && (
                <div className="text-center text-white/40 text-lg py-20">Loading lyrics...</div>
              )}
              {!loading && lyrics.length === 0 && (
                <div className="text-center text-white/40 text-lg py-20">No lyrics available</div>
              )}
              {lyrics.map((line, i) => (
                <div
                  key={`${line.time}-${i}`}
                  ref={el => { lineRefs.current[i] = el }}
                  onClick={() => handleLineClick(line.time)}
                  className={`
                    cursor-pointer transition-all duration-500 text-center leading-relaxed
                    ${i === currentIndex
                      ? 'text-white text-3xl font-bold scale-105 drop-shadow-lg'
                      : Math.abs(i - currentIndex) === 1
                        ? 'text-white/40 text-xl'
                        : 'text-white/20 text-xl'
                    }
                  `}
                >
                  {line.text}
                </div>
              ))}
              {/* Bottom padding for scroll */}
              <div className="h-96" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
