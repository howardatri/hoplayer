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

  // Store
  STORE_GET: 'store-get',
  STORE_SET: 'store-set',

  // Dialogs
  OPEN_DIRECTORY_DIALOG: 'open-directory-dialog',

  // Events (main -> renderer)
  FILE_DROPPED: 'file-dropped'
} as const

// Electron API exposed via contextBridge
export interface ElectronAPI {
  scanDirectory: (dirPath: string) => Promise<ScanResult>
  getFileCover: (filePath: string) => Promise<string | null>
  readFileMetadata: (filePath: string) => Promise<Partial<Track> | null>
  openDirectoryDialog: () => Promise<string | null>
  minimizeWindow: () => void
  maximizeWindow: () => void
  closeWindow: () => void
  toggleMiniPlayer: () => void
  storeGet: <T>(key: string, defaultValue: T) => Promise<T>
  storeSet: <T>(key: string, value: T) => Promise<void>
  onFileDropped: (callback: (filePaths: string[]) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
