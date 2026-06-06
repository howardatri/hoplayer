import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared'

const electronAPI: ElectronAPI = {
  // File operations
  scanDirectory: (dirPath: string) => ipcRenderer.invoke('scan-directory', dirPath),
  getFileCover: (filePath: string) => ipcRenderer.invoke('get-file-cover', filePath),
  readFileMetadata: (filePath: string) => ipcRenderer.invoke('read-file-metadata', filePath),
  readLrcFile: (filePath: string) => ipcRenderer.invoke('read-lrc-file', filePath),
  readFileAsUrl: (filePath: string) => ipcRenderer.invoke('read-file-as-url', filePath),

  // Lyrics online search
  lyricsSearch: (query: string) => ipcRenderer.invoke('lyrics-search', query),
  lyricsSearchExact: (trackName: string, artistName: string, albumName?: string, duration?: number) =>
    ipcRenderer.invoke('lyrics-search-exact', trackName, artistName, albumName, duration),
  lyricsSave: (audioFilePath: string, lrcContent: string) => ipcRenderer.invoke('lyrics-save', audioFilePath, lrcContent),

  // Tag editing
  writeTrackTag: (filePath: string, tags: any) => ipcRenderer.invoke('write-track-tag', filePath, tags),
  updateTrackDb: (track: any) => ipcRenderer.invoke('update-track-db', track),

  // Online cover art
  fetchOnlineCover: (artist: string, album: string) => ipcRenderer.invoke('fetch-online-cover', artist, album),
  saveCoverFile: (audioFilePath: string, dataUrl: string) => ipcRenderer.invoke('save-cover-file', audioFilePath, dataUrl),

  // Drag-drop
  openMediaFiles: (filePaths: string[]) => ipcRenderer.invoke('open-media-files', filePaths),

  // Tray
  updateTrayInfo: (title: string, artist: string, isPlaying: boolean) =>
    ipcRenderer.send('update-tray-info', title, artist, isPlaying),

  // Taskbar
  setTaskbarProgress: (progress: number) => ipcRenderer.send('set-taskbar-progress', progress),
  setTaskbarOverlay: (isPlaying: boolean) => ipcRenderer.send('set-taskbar-overlay', isPlaying),

  // Directory dialog
  openDirectoryDialog: () => ipcRenderer.invoke('open-directory-dialog'),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  toggleMiniPlayer: () => ipcRenderer.send('toggle-mini-player'),
  setMinimizeToTray: (value: boolean) => ipcRenderer.send('set-minimize-to-tray', value),

  // SQLite database
  dbGetScanPaths: () => ipcRenderer.invoke('db-get-scan-paths'),
  dbAddScanPath: (path: string) => ipcRenderer.invoke('db-add-scan-path', path),
  dbRemoveScanPath: (path: string) => ipcRenderer.invoke('db-remove-scan-path', path),
  dbGetAllTracks: () => ipcRenderer.invoke('db-get-all-tracks'),
  dbUpsertTrack: (track) => ipcRenderer.invoke('db-upsert-track', track),
  dbRemoveTrack: (id: string) => ipcRenderer.invoke('db-remove-track', id),
  dbIncrementPlayCount: (id: string) => ipcRenderer.invoke('db-increment-play-count', id),
  dbGetAllPlaylists: () => ipcRenderer.invoke('db-get-all-playlists'),
  dbCreatePlaylist: (playlist) => ipcRenderer.invoke('db-create-playlist', playlist),
  dbDeletePlaylist: (id: string) => ipcRenderer.invoke('db-delete-playlist', id),
  dbRenamePlaylist: (id: string, name: string, updatedAt: number) =>
    ipcRenderer.invoke('db-rename-playlist', id, name, updatedAt),
  dbAddTrackToPlaylist: (playlistId: string, trackId: string, position: number) =>
    ipcRenderer.invoke('db-add-track-to-playlist', playlistId, trackId, position),
  dbRemoveTrackFromPlaylist: (playlistId: string, trackId: string) =>
    ipcRenderer.invoke('db-remove-track-from-playlist', playlistId, trackId),
  dbReorderPlaylist: (playlistId: string, trackIds: string[]) =>
    ipcRenderer.invoke('db-reorder-playlist', playlistId, trackIds),

  // Events
  onFileDropped: (callback: (filePaths: string[]) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, filePaths: string[]) => callback(filePaths)
    ipcRenderer.on('file-dropped', handler)
    return () => {
      ipcRenderer.removeListener('file-dropped', handler)
    }
  },
  onMediaPlayPause: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('media-play-pause', handler)
    return () => { ipcRenderer.removeListener('media-play-pause', handler) }
  },
  onMediaNext: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('media-next', handler)
    return () => { ipcRenderer.removeListener('media-next', handler) }
  },
  onMediaPrevious: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('media-previous', handler)
    return () => { ipcRenderer.removeListener('media-previous', handler) }
  },
  onMediaStop: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('media-stop', handler)
    return () => { ipcRenderer.removeListener('media-stop', handler) }
  },
  onTrayPlayPause: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('tray-play-pause', handler)
    return () => { ipcRenderer.removeListener('tray-play-pause', handler) }
  },
  onTrayNext: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('tray-next', handler)
    return () => { ipcRenderer.removeListener('tray-next', handler) }
  },
  onTrayPrev: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('tray-prev', handler)
    return () => { ipcRenderer.removeListener('tray-prev', handler) }
  },
  onMiniModeChanged: (callback: (isMini: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, isMini: boolean) => callback(isMini)
    ipcRenderer.on('mini-mode-changed', handler)
    return () => { ipcRenderer.removeListener('mini-mode-changed', handler) }
  },

  // File watcher
  startWatching: (paths: string[]) => ipcRenderer.send('start-watching', paths),
  stopWatching: () => ipcRenderer.send('stop-watching'),
  addWatchPath: (path: string) => ipcRenderer.send('add-watch-path', path),
  removeWatchPath: (path: string) => ipcRenderer.send('remove-watch-path', path),
  onWatcherFileChange: (callback: (action: 'add' | 'remove', filePath: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: 'add' | 'remove', filePath: string) => callback(action, filePath)
    ipcRenderer.on('watcher-file-change', handler)
    return () => { ipcRenderer.removeListener('watcher-file-change', handler) }
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
