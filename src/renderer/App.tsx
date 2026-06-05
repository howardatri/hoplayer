import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TitleBar from '@/components/TitleBar'
import Sidebar from '@/components/Sidebar'
import PlayerBar from '@/components/PlayerBar'
import CreatePlaylistDialog from '@/components/CreatePlaylistDialog'
import LyricsPanel from '@/components/LyricsPanel'
import GestureHandler from '@/components/GestureHandler'
import KeyHint from '@/components/KeyHint'
import HomePage from '@/pages/HomePage'
import LibraryPage from '@/pages/LibraryPage'
import PlaylistPage from '@/pages/PlaylistPage'
import VideoPlayer from '@/pages/VideoPlayer'
import usePlaylistStore from '@/store/playlistStore'
import usePlayerStore from '@/store/playerStore'
import { usePlayer } from '@/hooks/usePlayer'
import { useThemeColor } from '@/hooks/useThemeColor'

export default function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)
  const [showLyrics, setShowLyrics] = useState(false)
  const createPlaylist = usePlaylistStore((s) => s.createPlaylist)
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const [showVideoPlayer, setShowVideoPlayer] = useState(false)

  // Dynamic theming from cover art
  useThemeColor(currentTrack?.filePath)

  // Show video player when a video track starts playing
  useEffect(() => {
    if (currentTrack?.format === 'video') {
      setShowVideoPlayer(true)
    }
  }, [currentTrack])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if focus is on an input
      if (e.target instanceof HTMLInputElement) return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          usePlayerStore.getState().setIsPlaying(!usePlayerStore.getState().isPlaying)
          break
        case 'ArrowRight':
          if (e.ctrlKey || e.metaKey) {
            usePlayerStore.getState().playNext()
          }
          break
        case 'ArrowLeft':
          if (e.ctrlKey || e.metaKey) {
            usePlayerStore.getState().playPrev()
          }
          break
        case 'ArrowUp':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            const vol = usePlayerStore.getState().volume
            usePlayerStore.getState().setVolume(Math.min(1, vol + 0.1))
          }
          break
        case 'ArrowDown':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            const vol = usePlayerStore.getState().volume
            usePlayerStore.getState().setVolume(Math.max(0, vol - 0.1))
          }
          break
        case 'KeyL':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            setShowLyrics((prev) => !prev)
          }
          break
        case 'KeyF':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            setCurrentPage('library')
            // Focus search input after navigation
            setTimeout(() => {
              const searchInput = document.querySelector(
                'input[placeholder*="Search"]'
              ) as HTMLInputElement
              searchInput?.focus()
            }, 100)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Global media key shortcuts from main process
  useEffect(() => {
    const cleanups = [
      window.electronAPI.onMediaPlayPause(() => {
        usePlayerStore.getState().setIsPlaying(!usePlayerStore.getState().isPlaying)
      }),
      window.electronAPI.onMediaNext(() => {
        usePlayerStore.getState().playNext()
      }),
      window.electronAPI.onMediaPrevious(() => {
        usePlayerStore.getState().playPrev()
      })
    ]
    return () => cleanups.forEach((fn) => fn())
  }, [])

  // Handle file drops
  useEffect(() => {
    const cleanup = window.electronAPI.onFileDropped((filePaths) => {
      // TODO: handle dropped files
      console.log('Files dropped:', filePaths)
    })
    return cleanup
  }, [])

  // Gesture handlers
  const handleGestureVolume = useCallback((delta: number) => {
    const store = usePlayerStore.getState()
    store.setVolume(Math.max(0, Math.min(1, store.volume + delta)))
  }, [])

  const handleGestureSeek = useCallback((deltaSeconds: number) => {
    const store = usePlayerStore.getState()
    const audio = document.querySelector('audio')
    if (audio && audio.duration && isFinite(audio.duration)) {
      const newTime = Math.max(0, Math.min(audio.duration, audio.currentTime + deltaSeconds))
      audio.currentTime = newTime
      store.setCurrentTime(newTime)
      store.setProgress(newTime / audio.duration)
    }
  }, [])

  const handleCreatePlaylist = useCallback(
    (name: string) => {
      createPlaylist(name)
    },
    [createPlaylist]
  )

  // Page transition variants
  const pageVariants = {
    initial: { opacity: 0, y: 8, filter: 'blur(4px)' },
    animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
    exit: { opacity: 0, y: -8, filter: 'blur(4px)' }
  }

  const renderPage = () => {
    if (currentPage.startsWith('playlist:')) {
      const playlistId = currentPage.split(':')[1]
      return <PlaylistPage playlistId={playlistId} />
    }

    switch (currentPage) {
      case 'home':
        return <HomePage />
      case 'library':
        return <LibraryPage />
      default:
        return <HomePage />
    }
  }

  return (
    <div className="h-screen flex flex-col bg-[#0f0f14] text-white overflow-hidden">
      {/* Title bar */}
      <TitleBar />

      {/* Main content with gesture support */}
      <GestureHandler
        onVolumeChange={handleGestureVolume}
        onSeekDelta={handleGestureSeek}
      >
        <div className="flex-1 flex overflow-hidden relative">
          <Sidebar
            currentPage={currentPage}
            onNavigate={setCurrentPage}
            onCreatePlaylist={() => setShowCreatePlaylist(true)}
          />

          {/* Page content with transition */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>

          {/* Lyrics panel overlay */}
          <LyricsPanel
            isOpen={showLyrics}
            onClose={() => setShowLyrics(false)}
          />
        </div>
      </GestureHandler>

      {/* Player bar */}
      <PlayerBar
        onToggleLyrics={() => setShowLyrics((prev) => !prev)}
        lyricsOpen={showLyrics}
      />

      {/* Keyboard shortcut hints */}
      <KeyHint />

      {/* Create playlist dialog */}
      <CreatePlaylistDialog
        isOpen={showCreatePlaylist}
        onClose={() => setShowCreatePlaylist(false)}
        onCreate={handleCreatePlaylist}
      />

      {/* Video player overlay */}
      <AnimatePresence>
        {showVideoPlayer && currentTrack?.format === 'video' && (
          <VideoPlayer
            track={currentTrack}
            onClose={() => setShowVideoPlayer(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
