import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Music, Search, Download, ChevronLeft, Loader2, Maximize2 } from 'lucide-react'
import { parseLrc, findCurrentLyricIndex, getLrcPath, type LyricLine } from '@/utils/lrcParser'
import usePlayerStore from '@/store/playerStore'
import useToastStore from '@/store/toastStore'
import type { LyricResult } from '../../shared'

interface LyricsPanelProps {
  isOpen: boolean
  onClose: () => void
  onFullscreen?: () => void
}

export default function LyricsPanel({ isOpen, onClose, onFullscreen }: LyricsPanelProps) {
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const currentTime = usePlayerStore((s) => s.currentTime)
  const addToast = useToastStore((s) => s.addToast)

  const [lyrics, setLyrics] = useState<LyricLine[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Online search state
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<LyricResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [previewResult, setPreviewResult] = useState<LyricResult | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const lineRefs = useRef<(HTMLDivElement | null)[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Load lyrics when track changes
  useEffect(() => {
    if (!currentTrack) {
      setLyrics([])
      setShowSearch(false)
      setPreviewResult(null)
      return
    }

    let cancelled = false
    setIsLoading(true)
    setError(null)
    setShowSearch(false)
    setPreviewResult(null)
    setSearchResults([])

    const loadLyrics = async () => {
      try {
        const lrcPath = getLrcPath(currentTrack.filePath)
        if (!lrcPath) {
          setLyrics([])
          setIsLoading(false)
          return
        }

        const result = await window.electronAPI.readLrcFile(lrcPath)
        if (cancelled) return

        if (result) {
          const parsed = parseLrc(result)
          setLyrics(parsed.lines)
        } else {
          // No local .lrc file — try exact match online
          setLyrics([])
          await tryAutoSearch(currentTrack)
        }
      } catch (err) {
        if (!cancelled) {
          setLyrics([])
          setError('No lyrics found')
          // Still try auto-search
          await tryAutoSearch(currentTrack)
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

  // Auto-search exact match when no local lyrics
  const tryAutoSearch = async (track: NonNullable<typeof currentTrack>) => {
    try {
      const result = await window.electronAPI.lyricsSearchExact(
        track.title,
        track.artist,
        track.album,
        track.duration
      )
      if (result && result.syncedLyrics) {
        // Found exact match with synced lyrics — show it as a suggestion
        const parsed = parseLrc(result.syncedLyrics)
        if (parsed.lines.length > 0) {
          setLyrics(parsed.lines)
          setError(null)
        }
      }
    } catch {
      // Silently fail — user can search manually
    }
  }

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

  // Focus search input when search overlay opens
  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [showSearch])

  const openSearch = useCallback(() => {
    if (currentTrack) {
      setSearchQuery(`${currentTrack.title} ${currentTrack.artist}`)
    }
    setSearchResults([])
    setPreviewResult(null)
    setShowSearch(true)
  }, [currentTrack])

  const closeSearch = useCallback(() => {
    // If there's a preview result, save it before closing
    if (previewResult && currentTrack) {
      const content = previewResult.syncedLyrics || previewResult.plainLyrics
      if (content) {
        window.electronAPI.lyricsSave(currentTrack.filePath, content).then(() => {
          const parsed = parseLrc(content)
          setLyrics(parsed.lines)
          setError(null)
          addToast('Lyrics saved', 'success')
        }).catch(() => {
          addToast('Failed to save lyrics', 'error')
        })
      }
    }
    setShowSearch(false)
    setPreviewResult(null)
  }, [previewResult, currentTrack, addToast])

  const handleSearch = useCallback(async () => {
    const q = searchQuery.trim()
    if (!q) return
    setIsSearching(true)
    setSearchResults([])
    setPreviewResult(null)
    try {
      const results = await window.electronAPI.lyricsSearch(q)
      setSearchResults(results)
    } catch (err) {
      addToast('Search failed. Please try again.', 'error')
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, addToast])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }, [handleSearch])

  const handlePreview = useCallback((result: LyricResult) => {
    setPreviewResult(result)
  }, [])

  const handleUseLyrics = useCallback(async (result: LyricResult) => {
    if (!currentTrack) return
    const lrcContent = result.syncedLyrics || result.plainLyrics
    if (!lrcContent) {
      addToast('No lyrics content available', 'error')
      return
    }

    setIsSaving(true)
    try {
      await window.electronAPI.lyricsSave(currentTrack.filePath, lrcContent)
      // Reload lyrics from the saved file
      const parsed = parseLrc(lrcContent)
      setLyrics(parsed.lines)
      setError(null)
      setShowSearch(false)
      setPreviewResult(null)
      addToast('Lyrics saved successfully', 'success')
    } catch (err) {
      addToast('Failed to save lyrics', 'error')
    } finally {
      setIsSaving(false)
    }
  }, [currentTrack, addToast])

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Determine what to show in the main content area
  const displayLyrics: LyricLine[] = previewResult
    ? (() => {
        const content = previewResult.syncedLyrics || previewResult.plainLyrics || ''
        return parseLrc(content).lines
      })()
    : lyrics

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-10 bottom-20 w-80 glass-strong z-40 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] shrink-0">
            <h3 className="text-sm font-semibold text-fg">
              {previewResult ? (
                <button
                  onClick={closeSearch}
                  className="flex items-center gap-1 hover:text-fg transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                'Lyrics'
              )}
            </h3>
            <div className="flex items-center gap-1">
              {!showSearch && !previewResult && (
                <button
                  onClick={openSearch}
                  className="p-1.5 rounded-full hover:bg-surface-hover text-fg-muted hover:text-fg transition-colors"
                  title="Search online lyrics"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
              {onFullscreen && !showSearch && !previewResult && (
                <button
                  onClick={onFullscreen}
                  className="p-1.5 rounded-lg hover:bg-[var(--color-hover)] transition-colors"
                  title="Fullscreen (Ctrl+Shift+L)"
                >
                  <Maximize2 className="w-4 h-4 text-[var(--color-text-secondary)]" />
                </button>
              )}
              <button
                onClick={previewResult ? closeSearch : onClose}
                className="p-1.5 rounded-full hover:bg-surface-hover text-fg-muted hover:text-fg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search overlay */}
          <AnimatePresence>
            {showSearch && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 top-11 bg-black/80 backdrop-blur-md z-10 flex flex-col"
              >
                {/* Search input */}
                <div className="px-3 py-3 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-2">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Search lyrics..."
                      className="flex-1 bg-surface border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-fg placeholder:text-fg-muted outline-none focus:border-[var(--color-border)] transition-colors"
                    />
                    <button
                      onClick={handleSearch}
                      disabled={isSearching || !searchQuery.trim()}
                      className="p-2 rounded-lg bg-surface-hover hover:bg-surface-active text-fg hover:text-fg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSearching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={closeSearch}
                      className="p-2 rounded-lg hover:bg-surface-hover text-fg-muted hover:text-fg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Search results */}
                <div className="flex-1 overflow-y-auto px-3 py-2">
                  {isSearching ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 text-fg-muted animate-spin" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-fg-muted">
                      <Search className="w-10 h-10 mb-3 opacity-30" />
                      <p className="text-xs">Search for lyrics online</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {searchResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handlePreview(result)}
                          className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors ${
                            previewResult?.id === result.id
                              ? 'bg-surface-active'
                              : 'hover:bg-surface'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-fg truncate font-medium">
                                {result.trackName}
                              </p>
                              <p className="text-xs text-fg-muted truncate">
                                {result.artistName}
                                {result.albumName ? ` - ${result.albumName}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                              {result.instrumental ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover text-fg-muted">
                                  Instrumental
                                </span>
                              ) : result.syncedLyrics ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400/80">
                                  Synced
                                </span>
                              ) : result.plainLyrics ? (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400/80">
                                  Plain
                                </span>
                              ) : null}
                              <span className="text-[10px] text-fg-muted">
                                {formatDuration(result.duration)}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Preview banner */}
          {previewResult && !showSearch && (
            <div className="px-4 py-2 bg-surface border-b border-[var(--color-border)] shrink-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-fg truncate font-medium">
                    {previewResult.trackName}
                  </p>
                  <p className="text-[10px] text-fg-muted truncate">
                    {previewResult.artistName}
                  </p>
                </div>
                <button
                  onClick={() => handleUseLyrics(previewResult)}
                  disabled={isSaving}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-hover hover:bg-surface-active text-fg hover:text-fg text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
                >
                  {isSaving ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  Use This
                </button>
              </div>
            </div>
          )}

          {/* Lyrics content */}
          <div
            ref={containerRef}
            className="flex-1 overflow-y-auto px-4 py-6"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-[var(--color-border)] border-t-primary rounded-full animate-spin" />
              </div>
            ) : displayLyrics.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-fg-muted">
                <Music className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">{error || 'No lyrics available'}</p>
                <p className="text-xs mt-1">Place a .lrc file next to the audio</p>
                <button
                  onClick={openSearch}
                  className="mt-4 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface hover:bg-surface-hover text-fg-muted hover:text-fg text-xs transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  Search Online
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {displayLyrics.map((line, index) => (
                  <div
                    key={`${line.time}-${index}`}
                    ref={(el) => (lineRefs.current[index] = el)}
                    className={`text-center transition-all duration-300 cursor-pointer ${
                      !previewResult && index === currentIndex
                        ? 'text-fg text-lg font-semibold scale-105'
                        : Math.abs(index - (!previewResult ? currentIndex : -999)) <= 2
                          ? 'text-fg-muted text-sm'
                          : 'text-fg-muted text-sm'
                    }`}
                    onClick={() => {
                      if (previewResult) return // Disable seeking during preview
                      const store = usePlayerStore.getState()
                      if (store.duration > 0) {
                        const ratio = line.time / store.duration
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
