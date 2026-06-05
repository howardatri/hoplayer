import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TitleBar from '@/components/TitleBar'
import Sidebar from '@/components/Sidebar'
import PlayerBar from '@/components/PlayerBar'
import CreatePlaylistDialog from '@/components/CreatePlaylistDialog'
import LyricsPanel from '@/components/LyricsPanel'
import HomePage from '@/pages/HomePage'
import LibraryPage from '@/pages/LibraryPage'
import PlaylistPage from '@/pages/PlaylistPage'
import VideoPlayer from '@/pages/VideoPlayer'
import usePlaylistStore from '@/store/playlistStore'
import usePlayerStore from '@/store/playerStore'
import { useThemeColor } from '@/hooks/useThemeColor'

export default function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)
  const [showLyrics, setShowLyrics] = useState(false)
  const createPlaylist = usePlaylistStore((s) => s.createPlaylist)
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
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
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          usePlayerStore.getState().setIsPlaying(!usePlayerStore.getState().isPlaying)
          break
        case 'ArrowRight':
          if (e.ctrlKey || e.metaKey) usePlayerStore.getState().playNext()
          break
        case 'ArrowLeft':
          if (e.ctrlKey || e.metaKey) usePlayerStore.getState().playPrev()
          break
        case 'ArrowUp':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            const v = usePlayerStore.getState().volume
            usePlayerStore.getState().setVolume(Math.min(1, v + 0.1))
          }
          break
        case 'ArrowDown':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            const v = usePlayerStore.getState().volume
            usePlayerStore.getState().setVolume(Math.max(0, v - 0.1))
          }
          break
        case 'KeyL':
          if (e.ctrlKey || e.metaKey) { e.preventDefault(); setShowLyrics(p => !p) }
          break
        case 'KeyF':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            setCurrentPage('library')
            setTimeout(() => {
              const el = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
              el?.focus()
            }, 200)
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
      window.electronAPI.onMediaNext(() => usePlayerStore.getState().playNext()),
      window.electronAPI.onMediaPrevious(() => usePlayerStore.getState().playPrev())
    ]
    return () => cleanups.forEach(fn => fn())
  }, [])

  const handleCreatePlaylist = useCallback((name: string) => {
    createPlaylist(name)
  }, [createPlaylist])

  const renderPage = () => {
    if (currentPage.startsWith('playlist:')) {
      return <PlaylistPage playlistId={currentPage.split(':')[1]} />
    }
    switch (currentPage) {
      case 'home': return <HomePage />
      case 'library': return <LibraryPage />
      default: return <HomePage />
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: '#0f0f14', color: 'white' }}>
      <TitleBar />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          onCreatePlaylist={() => setShowCreatePlaylist(true)}
        />

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </div>

        <LyricsPanel isOpen={showLyrics} onClose={() => setShowLyrics(false)} />
      </div>

      <PlayerBar onToggleLyrics={() => setShowLyrics(p => !p)} lyricsOpen={showLyrics} />

      <CreatePlaylistDialog
        isOpen={showCreatePlaylist}
        onClose={() => setShowCreatePlaylist(false)}
        onCreate={handleCreatePlaylist}
      />

      <AnimatePresence>
        {showVideoPlayer && currentTrack?.format === 'video' && (
          <VideoPlayer track={currentTrack} onClose={() => setShowVideoPlayer(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
