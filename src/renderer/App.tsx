import { useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import TitleBar from '@/components/TitleBar'
import Sidebar from '@/components/Sidebar'
import PlayerBar from '@/components/PlayerBar'
import QueuePanel from '@/components/QueuePanel'
import CreatePlaylistDialog from '@/components/CreatePlaylistDialog'
import LyricsPanel from '@/components/LyricsPanel'
import FullscreenLyrics from '@/components/FullscreenLyrics'
import ToastContainer from '@/components/Toast'
import MiniPlayer from '@/components/MiniPlayer'
import HomePage from '@/pages/HomePage'
import LibraryPage from '@/pages/LibraryPage'
import PlaylistPage from '@/pages/PlaylistPage'
import SettingsPage from '@/pages/SettingsPage'
import FolderPage from '@/pages/FolderPage'
import VideoPlayer from '@/pages/VideoPlayer'
import { ArtistPage, AlbumPage } from '@/pages/ArtistPage'
import usePlaylistStore from '@/store/playlistStore'
import usePlayerStore from '@/store/playerStore'
import useSettingsStore from '@/store/settingsStore'
import useLibraryStore from '@/store/libraryStore'
import { useThemeColor } from '@/hooks/useThemeColor'
import { usePlayer, getPlayerControls } from '@/hooks/usePlayer'
import { applyTheme, getThemeById } from '@/themes'

export default function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false)
  const [showLyrics, setShowLyrics] = useState(false)
  const [showQueue, setShowQueue] = useState(false)
  const [isMiniMode, setIsMiniMode] = useState(false)
  const createPlaylist = usePlaylistStore(s => s.createPlaylist)
  const currentTrack = usePlayerStore(s => s.currentTrack)
  const isPlaying = usePlayerStore(s => s.isPlaying)
  const [showVideoPlayer, setShowVideoPlayer] = useState(false)
  const [fullscreenLyrics, setFullscreenLyrics] = useState(false)

  const themeId = useSettingsStore(s => s.themeId)

  // Apply theme on mount and when theme changes
  useEffect(() => {
    applyTheme(getThemeById(themeId))
  }, [themeId])

  // Load persisted settings into player store on mount
  useEffect(() => {
    const s = useSettingsStore.getState()
    const ps = usePlayerStore.getState()
    ps.setVolume(s.volume)
    ps.setCrossfadeDuration(s.crossfadeDuration)
    ps.setPlaybackSpeed(s.playbackSpeed)
    ps.setEqBands(s.eqBands)
    ps.setEqPreset(s.eqPreset)
    // Don't restore repeatMode/shuffle — those feel like session state
    window.electronAPI.setMinimizeToTray(useSettingsStore.getState().minimizeToTray ?? true)
  }, [])

  // Sync player store changes back to settings store (for persistence)
  useEffect(() => {
    const unsub = usePlayerStore.subscribe((s, prev) => {
      const settings = useSettingsStore.getState()
      if (s.volume !== prev.volume) settings.setVolume(s.volume)
      if (s.crossfadeDuration !== prev.crossfadeDuration) settings.setCrossfadeDuration(s.crossfadeDuration)
      if (s.playbackSpeed !== prev.playbackSpeed) settings.setPlaybackSpeed(s.playbackSpeed)
      if (s.eqBands !== prev.eqBands) settings.setEqBands(s.eqBands)
      if (s.eqPreset !== prev.eqPreset) settings.setEqPreset(s.eqPreset)
    })
    return unsub
  }, [])

  useThemeColor(currentTrack?.filePath)
  usePlayer() // initialize player controls (needed in mini mode too)

  useEffect(() => {
    if (currentTrack?.format === 'video') setShowVideoPlayer(true)
  }, [currentTrack])

  // Sync tray info and taskbar when track or play state changes
  useEffect(() => {
    if (currentTrack) {
      window.electronAPI.updateTrayInfo(currentTrack.title, currentTrack.artist, isPlaying)
    }
    window.electronAPI.setTaskbarProgress(usePlayerStore.getState().progress)
    window.electronAPI.setTaskbarOverlay(isPlaying)
  }, [currentTrack, isPlaying])

  // Listen for tray control events
  useEffect(() => {
    const cleanups = [
      window.electronAPI.onTrayPlayPause(() => getPlayerControls()?.togglePlay()),
      window.electronAPI.onTrayNext(() => getPlayerControls()?.playNext()),
      window.electronAPI.onTrayPrev(() => getPlayerControls()?.playPrev()),
    ]
    return () => cleanups.forEach(fn => fn())
  }, [])

  // Listen for mini mode changes
  useEffect(() => {
    const cleanup = window.electronAPI.onMiniModeChanged((isMini) => setIsMiniMode(isMini))
    return cleanup
  }, [])

  // Drag-drop file handling
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    const mediaExts = ['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.wma', '.mp4', '.webm', '.mkv', '.avi']
    const mediaFiles = files.filter(f => {
      const ext = f.name.toLowerCase().slice(f.name.lastIndexOf('.'))
      return mediaExts.includes(ext)
    })
    if (mediaFiles.length === 0) return

    const paths = mediaFiles.map(f => (f as any).path as string).filter(Boolean)
    if (paths.length === 0) return

    try {
      const result = await window.electronAPI.openMediaFiles(paths)
      if (result.tracks.length > 0) {
        useLibraryStore.getState().addTracks(result.tracks)
        const controls = getPlayerControls()
        if (controls) {
          controls.playTrack(result.tracks[0], result.tracks)
        }
      }
    } catch (err) {
      console.error('Failed to open dropped files:', err)
    }
  }, [])

  // Keyboard shortcuts
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
          if (ctrl && e.shiftKey) { e.preventDefault(); setFullscreenLyrics(p => !p) }
          else if (ctrl) { e.preventDefault(); setShowLyrics(p => !p) }
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
    if (currentPage.startsWith('artist:')) return <ArtistPage artistName={currentPage.substring(7)} onNavigate={setCurrentPage} />
    if (currentPage.startsWith('album:')) return <AlbumPage albumName={currentPage.substring(6)} onNavigate={setCurrentPage} />
    if (currentPage.startsWith('folder:')) return <FolderPage onNavigate={setCurrentPage} initialFolder={currentPage.substring(7)} />
    switch (currentPage) {
      case 'home': return <HomePage onNavigate={setCurrentPage} />
      case 'library': return <LibraryPage onNavigate={setCurrentPage} />
      case 'folders': return <FolderPage onNavigate={setCurrentPage} />
      case 'settings': return <SettingsPage />
      default: return <HomePage />
    }
  }

  if (isMiniMode) return <MiniPlayer />

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden', color: 'var(--color-text)' }}
    >
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

        <LyricsPanel isOpen={showLyrics} onClose={() => setShowLyrics(false)} onFullscreen={() => setFullscreenLyrics(true)} />
        <QueuePanel isOpen={showQueue} onClose={() => setShowQueue(false)} />
      </div>

      <PlayerBar
        onToggleLyrics={() => setShowLyrics(p => !p)}
        lyricsOpen={showLyrics}
        onToggleQueue={() => setShowQueue(p => !p)}
        queueOpen={showQueue}
      />

      <CreatePlaylistDialog isOpen={showCreatePlaylist} onClose={() => setShowCreatePlaylist(false)} onCreate={handleCreatePlaylist} />

      <AnimatePresence>
        {showVideoPlayer && currentTrack?.format === 'video' && (
          <VideoPlayer track={currentTrack} onClose={() => setShowVideoPlayer(false)} />
        )}
      </AnimatePresence>

      <FullscreenLyrics isOpen={fullscreenLyrics} onClose={() => setFullscreenLyrics(false)} />

      <ToastContainer />
    </div>
  )
}
