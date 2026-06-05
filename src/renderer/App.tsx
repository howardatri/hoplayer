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
import SettingsPage from '@/pages/SettingsPage'
import VideoPlayer from '@/pages/VideoPlayer'
import usePlaylistStore from '@/store/playlistStore'
import usePlayerStore from '@/store/playerStore'
import { useThemeColor } from '@/hooks/useThemeColor'
import { getPlayerControls } from '@/hooks/usePlayer'

export default function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)
  const [showLyrics, setShowLyrics] = useState(false)
  const createPlaylist = usePlaylistStore(s => s.createPlaylist)
  const currentTrack = usePlayerStore(s => s.currentTrack)
  const [showVideoPlayer, setShowVideoPlayer] = useState(false)

  useThemeColor(currentTrack?.filePath)

  useEffect(() => {
    if (currentTrack?.format === 'video') setShowVideoPlayer(true)
  }, [currentTrack])

  // Keyboard shortcuts — use global player controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const ctrl = e.ctrlKey || e.metaKey
      const controls = getPlayerControls()

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          controls?.togglePlay()
          break
        case 'ArrowRight':
          if (ctrl) controls?.playNext()
          break
        case 'ArrowLeft':
          if (ctrl) controls?.playPrev()
          break
        case 'ArrowUp':
          if (ctrl) {
            e.preventDefault()
            controls?.setVolume(usePlayerStore.getState().volume + 0.1)
          }
          break
        case 'ArrowDown':
          if (ctrl) {
            e.preventDefault()
            controls?.setVolume(usePlayerStore.getState().volume - 0.1)
          }
          break
        case 'KeyL':
          if (ctrl) { e.preventDefault(); setShowLyrics(p => !p) }
          break
        case 'KeyF':
          if (ctrl) {
            e.preventDefault()
            setCurrentPage('library')
            setTimeout(() => {
              (document.querySelector('input[placeholder*="Search"]') as HTMLInputElement)?.focus()
            }, 200)
          }
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Media key shortcuts from main process
  useEffect(() => {
    const cleanups = [
      window.electronAPI.onMediaPlayPause(() => getPlayerControls()?.togglePlay()),
      window.electronAPI.onMediaNext(() => getPlayerControls()?.playNext()),
      window.electronAPI.onMediaPrevious(() => getPlayerControls()?.playPrev())
    ]
    return () => cleanups.forEach(fn => fn())
  }, [])

  const handleCreatePlaylist = useCallback((name: string) => createPlaylist(name), [createPlaylist])

  const renderPage = () => {
    if (currentPage.startsWith('playlist:')) return <PlaylistPage playlistId={currentPage.split(':')[1]} />
    switch (currentPage) {
      case 'home': return <HomePage />
      case 'library': return <LibraryPage />
      case 'settings': return <SettingsPage />
      default: return <HomePage />
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', background: '#0f0f14', color: 'white' }}>
      <TitleBar />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} onCreatePlaylist={() => setShowCreatePlaylist(true)} />

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

      <CreatePlaylistDialog isOpen={showCreatePlaylist} onClose={() => setShowCreatePlaylist(false)} onCreate={handleCreatePlaylist} />

      <AnimatePresence>
        {showVideoPlayer && currentTrack?.format === 'video' && (
          <VideoPlayer track={currentTrack} onClose={() => setShowVideoPlayer(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
