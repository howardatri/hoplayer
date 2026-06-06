// Shared type definitions between main and renderer processes

export interface Track {
  id: string
  title: string
  artist: string
  album: string
  duration: number // seconds
  filePath: string
  coverUrl?: string // blob URL for cover art
  format: 'audio' | 'video'
  genre?: string
  year?: number
  trackNumber?: number
  bitrate?: number
  playCount?: number
  lastPlayed?: number  // Unix timestamp ms
}

export interface Playlist {
  id: string
  name: string
  trackIds: string[]
  createdAt: number
  updatedAt: number
}

export interface ScanResult {
  tracks: Track[]
  errors: { filePath: string; error: string }[]
}

export type RepeatMode = 'off' | 'all' | 'one'

export interface LyricResult {
  id: number
  trackName: string
  artistName: string
  albumName: string
  duration: number
  instrumental: boolean
  plainLyrics: string | null
  syncedLyrics: string | null
}

export interface PlayerState {
  currentTrack: Track | null
  isPlaying: boolean
  volume: number // 0-1
  progress: number // 0-1
  currentTime: number // seconds
  duration: number // seconds
  repeatMode: RepeatMode
  isShuffle: boolean
}

// IPC channel names
export const IPC_CHANNELS = {
  // File operations
  SCAN_DIRECTORY: 'scan-directory',
  GET_FILE_COVER: 'get-file-cover',
  READ_FILE_METADATA: 'read-file-metadata',

  // Player controls (renderer -> main for system-level actions)
  GET_AUDIO_STREAM: 'get-audio-stream',

  // Window controls
  MINIMIZE_WINDOW: 'minimize-window',
  MAXIMIZE_WINDOW: 'maximize-window',
  CLOSE_WINDOW: 'close-window',
  TOGGLE_MINI_PLAYER: 'toggle-mini-player',

  // Database (SQLite)
  DB_GET_SCAN_PATHS: 'db-get-scan-paths',
  DB_ADD_SCAN_PATH: 'db-add-scan-path',
  DB_REMOVE_SCAN_PATH: 'db-remove-scan-path',
  DB_GET_ALL_TRACKS: 'db-get-all-tracks',
  DB_UPSERT_TRACK: 'db-upsert-track',
  DB_REMOVE_TRACK: 'db-remove-track',
  DB_INCREMENT_PLAY_COUNT: 'db-increment-play-count',
  DB_GET_ALL_PLAYLISTS: 'db-get-all-playlists',
  DB_CREATE_PLAYLIST: 'db-create-playlist',
  DB_DELETE_PLAYLIST: 'db-delete-playlist',
  DB_RENAME_PLAYLIST: 'db-rename-playlist',
  DB_ADD_TRACK_TO_PLAYLIST: 'db-add-track-to-playlist',
  DB_REMOVE_TRACK_FROM_PLAYLIST: 'db-remove-track-from-playlist',
  DB_REORDER_PLAYLIST: 'db-reorder-playlist',

  // Dialogs
  OPEN_DIRECTORY_DIALOG: 'open-directory-dialog',

  // Lyrics
  READ_LRC_FILE: 'read-lrc-file',
  LYRICS_SEARCH: 'lyrics-search',
  LYRICS_SEARCH_EXACT: 'lyrics-search-exact',
  LYRICS_SAVE: 'lyrics-save',

  // Tag editing
  WRITE_TRACK_TAG: 'write-track-tag',
  UPDATE_TRACK_DB: 'update-track-db',

  // Events (main -> renderer)
  FILE_DROPPED: 'file-dropped',

  // Tray
  UPDATE_TRAY_INFO: 'update-tray-info',
  TRAY_PLAY_PAUSE: 'tray-play-pause',
  TRAY_NEXT: 'tray-next',
  TRAY_PREV: 'tray-prev',

  // Mini mode
  MINI_MODE_CHANGED: 'mini-mode-changed',

  // Settings
  SET_MINIMIZE_TO_TRAY: 'set-minimize-to-tray',

  // Taskbar
  SET_TASKBAR_PROGRESS: 'set-taskbar-progress',
  SET_TASKBAR_OVERLAY: 'set-taskbar-overlay',

  // Drag-drop
  OPEN_MEDIA_FILES: 'open-media-files'
} as const

// Electron API exposed via contextBridge
export interface ElectronAPI {
  // File operations
  scanDirectory: (dirPath: string) => Promise<ScanResult>
  getFileCover: (filePath: string) => Promise<string | null>
  readFileMetadata: (filePath: string) => Promise<Partial<Track> | null>
  readLrcFile: (filePath: string) => Promise<string | null>
  readFileAsUrl: (filePath: string) => Promise<string | null>

  // Lyrics online search
  lyricsSearch: (query: string) => Promise<LyricResult[]>
  lyricsSearchExact: (trackName: string, artistName: string, albumName?: string, duration?: number) => Promise<LyricResult | null>
  lyricsSave: (audioFilePath: string, lrcContent: string) => Promise<string>
  openDirectoryDialog: () => Promise<string | null>

  // Window controls
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void
  toggleMiniPlayer: () => void

  // SQLite database
  dbGetScanPaths: () => Promise<string[]>
  dbAddScanPath: (path: string) => Promise<void>
  dbRemoveScanPath: (path: string) => Promise<void>
  dbGetAllTracks: () => Promise<Track[]>
  dbUpsertTrack: (track: Track) => Promise<void>
  dbRemoveTrack: (id: string) => Promise<void>
  dbIncrementPlayCount: (id: string) => Promise<void>
  dbGetAllPlaylists: () => Promise<Playlist[]>
  dbCreatePlaylist: (playlist: Playlist) => Promise<void>
  dbDeletePlaylist: (id: string) => Promise<void>
  dbRenamePlaylist: (id: string, name: string, updatedAt: number) => Promise<void>
  dbAddTrackToPlaylist: (playlistId: string, trackId: string, position: number) => Promise<void>
  dbRemoveTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>
  dbReorderPlaylist: (playlistId: string, trackIds: string[]) => Promise<void>

  // Tag editing
  writeTrackTag: (filePath: string, tags: Partial<Track>) => Promise<boolean>
  updateTrackDb: (track: Track) => Promise<void>

  // Online cover art
  fetchOnlineCover: (artist: string, album: string) => Promise<string | null>
  saveCoverFile: (audioFilePath: string, dataUrl: string) => Promise<boolean>

  // Drag-drop
  openMediaFiles: (filePaths: string[]) => Promise<ScanResult>

  // Tray
  updateTrayInfo: (title: string, artist: string, isPlaying: boolean) => void
  onTrayPlayPause: (callback: () => void) => () => void
  onTrayNext: (callback: () => void) => () => void
  onTrayPrev: (callback: () => void) => () => void

  // Mini mode
  onMiniModeChanged: (callback: (isMini: boolean) => void) => () => void

  // Settings
  setMinimizeToTray: (value: boolean) => void

  // Taskbar
  setTaskbarProgress: (progress: number) => void
  setTaskbarOverlay: (isPlaying: boolean) => void

  // File watcher
  startWatching: (paths: string[]) => void
  stopWatching: () => void
  addWatchPath: (path: string) => void
  removeWatchPath: (path: string) => void
  onWatcherFileChange: (callback: (action: 'add' | 'remove', filePath: string) => void) => () => void

  // Events
  onFileDropped: (callback: (filePaths: string[]) => void) => () => void
  onMediaPlayPause: (callback: () => void) => () => void
  onMediaNext: (callback: () => void) => () => void
  onMediaPrevious: (callback: () => void) => () => void
  onMediaStop: (callback: () => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
