import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TitleBar from '@/components/TitleBar'
import Sidebar from '@/components/Sidebar'
import PlayerBar from '@/components/PlayerBar'
import CreatePlaylistDialog from '@/components/CreatePlaylistDialog'
import HomePage from '@/pages/HomePage'
import LibraryPage from '@/pages/LibraryPage'
import PlaylistPage from '@/pages/PlaylistPage'
import VideoPlayer from '@/pages/VideoPlayer'
import usePlaylistStore from '@/store/playlistStore'
import usePlayerStore from '@/store/playerStore'
import { usePlayer } from '@/hooks/usePlayer'

export default function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)
  const createPlaylist = usePlaylistStore((s) => s.createPlaylist)
  const currentTrack = usePlayerStore((s) => s.currentTrack)
  const [showVideoPlayer, setShowVideoPlayer] = useState(false)

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
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Handle file drops
  useEffect(() => {
    const cleanup = window.electronAPI.onFileDropped((filePaths) => {
      // TODO: handle dropped files
      console.log('Files dropped:', filePaths)
    })
    return cleanup
  }, [])

  const handleCreatePlaylist = useCallback(
    (name: string) => {
      createPlaylist(name)
    },
    [createPlaylist]
  )

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

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentPage={currentPage}
          onNavigate={setCurrentPage}
          onCreatePlaylist={() => setShowCreatePlaylist(true)}
        />

        {/* Page content with transition */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {renderPage()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Player bar */}
      <PlayerBar />

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
