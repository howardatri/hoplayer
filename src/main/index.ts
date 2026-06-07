import { app, BrowserWindow, shell, ipcMain, dialog, protocol, net, globalShortcut, nativeImage } from 'electron'
import { join, extname } from 'path'
import { readFile, stat as fsStat, open as fsOpen } from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import type { Track } from '../shared'
import { scanDirectory, getFileCover, readFileMetadata, readLrcFile, writeTrackTag, saveCoverFile } from './ipc/fileScan'
import { initDatabase } from './db'
import { registerDbHandlers } from './ipc/dbHandlers'
import { searchLyrics, searchLyricsExact, saveLyricsFile } from './ipc/lyricsApi'
import { fetchOnlineCover } from './ipc/coverArtApi'
import { startWatching, stopWatching, addWatchPath, removeWatchPath } from './ipc/fileWatcher'
import { setupTray, updateTrayMenu } from './tray'

// Memory optimization
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('--js-flags', '--max-old-space-size=256')
// Allow AudioContext to resume without user gesture (needed for auto-advance while minimized)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

let mainWindow: BrowserWindow | null = null
let isMiniMode = false
let minimizeToTray = true
let forceQuit = false
let normalBounds: Electron.Rectangle | null = null
let thumbarIsPlaying = false

// ---- Taskbar thumbnail buttons ----
function createThumbarIcon(pathData: string): Electron.NativeImage {
  // Create a simple 16x16 icon from a path-like description
  const size = 16
  const buf = Buffer.alloc(size * size * 4, 0)

  const setPixel = (x: number, y: number) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return
    const idx = (y * size + x) * 4
    buf[idx] = 200; buf[idx + 1] = 200; buf[idx + 2] = 200; buf[idx + 3] = 255
  }

  const fillRect = (x: number, y: number, w: number, h: number) => {
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) setPixel(x + dx, y + dy)
  }

  // Draw icons based on pathData name
  if (pathData === 'prev') {
    // |< shape
    fillRect(3, 3, 2, 10)
    fillRect(5, 4, 2, 8)
    fillRect(7, 5, 2, 6)
    fillRect(9, 6, 2, 4)
    fillRect(11, 7, 2, 2)
  } else if (pathData === 'play') {
    // triangle
    for (let i = 0; i < 10; i++) {
      const w = Math.max(1, Math.round((i / 9) * 6))
      fillRect(5 + Math.floor((10 - i) / 2), 3 + i, w, 1)
    }
  } else if (pathData === 'pause') {
    // two bars
    fillRect(4, 3, 3, 10)
    fillRect(9, 3, 3, 10)
  } else if (pathData === 'next') {
    // >| shape
    fillRect(3, 7, 2, 2)
    fillRect(5, 6, 2, 4)
    fillRect(7, 5, 2, 6)
    fillRect(9, 4, 2, 8)
    fillRect(11, 3, 2, 10)
  }

  return nativeImage.createFromBuffer(buf, { width: size, height: size })
}

function setupThumbarButtons(win: BrowserWindow | null) {
  if (!win) return
  const prevIcon = createThumbarIcon('prev')
  const playIcon = createThumbarIcon('play')
  const pauseIcon = createThumbarIcon('pause')
  const nextIcon = createThumbarIcon('next')

  const buttons: Electron.ThumbarButton[] = [
    { icon: prevIcon, tooltip: 'Previous', click: () => { win.webContents.send('media-previous') } },
    { icon: playIcon, tooltip: 'Play', click: () => { win.webContents.send('media-play-pause') } },
    { icon: nextIcon, tooltip: 'Next', click: () => { win.webContents.send('media-next') } }
  ]

  win.setThumbarButtons(buttons)
  // Store icon refs for updates
  ;(win as any).__thumbarIcons = { prevIcon, playIcon, pauseIcon, nextIcon }
}

function updateThumbarPlayingState(isPlaying: boolean) {
  if (!mainWindow || thumbarIsPlaying === isPlaying) return
  thumbarIsPlaying = isPlaying
  const icons = (mainWindow as any).__thumbarIcons
  if (!icons) return

  const buttons: Electron.ThumbarButton[] = [
    { icon: icons.prevIcon, tooltip: 'Previous', click: () => { mainWindow?.webContents.send('media-previous') } },
    { icon: isPlaying ? icons.pauseIcon : icons.playIcon, tooltip: isPlaying ? 'Pause' : 'Play', click: () => { mainWindow?.webContents.send('media-play-pause') } },
    { icon: icons.nextIcon, tooltip: 'Next', click: () => { mainWindow?.webContents.send('media-next') } }
  ]

  try { mainWindow.setThumbarButtons(buttons) } catch { /* window might be destroyed */ }
}

const MIME_MAP: Record<string, string> = {
  '.mp3': 'audio/mpeg', '.flac': 'audio/flac', '.wav': 'audio/wav',
  '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
  '.wma': 'audio/x-ms-wma', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo'
}

function getMimeType(filePath: string): string {
  return MIME_MAP[extname(filePath).toLowerCase()] || 'application/octet-stream'
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f0f14',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false, // Need false for protocol handler to work
      spellcheck: false,
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false // Keep audio playing when minimized
    }
  })

  mainWindow.on('close', (event) => {
    if (minimizeToTray && !forceQuit) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
    setupThumbarButtons(mainWindow)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Log renderer console messages for debugging
  mainWindow.webContents.on('console-message', (_event, level, message) => {
    if (level >= 2) {
      console.log(`[renderer ${level === 2 ? 'warn' : 'error'}] ${message}`)
    }
  })

  // Use ELECTRON_RENDERER_URL in dev, file in production
  const rendererUrl = process.env['ELECTRON_RENDERER_URL']
  if (rendererUrl) {
    mainWindow.loadURL(rendererUrl)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Register IPC handlers
function registerIPC(): void {
  // File scanning
  ipcMain.handle('scan-directory', async (_event, dirPath: string) => {
    console.log('[IPC] scan-directory:', dirPath)
    return scanDirectory(dirPath)
  })

  ipcMain.handle('get-file-cover', async (_event, filePath: string) => {
    return getFileCover(filePath)
  })

  ipcMain.handle('read-file-metadata', async (_event, filePath: string) => {
    return readFileMetadata(filePath)
  })

  ipcMain.handle('read-lrc-file', async (_event, filePath: string) => {
    return readLrcFile(filePath)
  })

  // Lyrics online search
  ipcMain.handle('lyrics-search', async (_event, query: string) => {
    return searchLyrics(query)
  })

  ipcMain.handle('lyrics-search-exact', async (_event, trackName: string, artistName: string, albumName?: string, duration?: number) => {
    return searchLyricsExact(trackName, artistName, albumName, duration)
  })

  ipcMain.handle('lyrics-save', async (_event, audioFilePath: string, lrcContent: string) => {
    return saveLyricsFile(audioFilePath, lrcContent)
  })

  // Online cover art fetch
  ipcMain.handle('fetch-online-cover', async (_e, artist: string, album: string) => {
    return fetchOnlineCover(artist, album)
  })

  // Save cover art to file
  ipcMain.handle('save-cover-file', async (_e, audioFilePath: string, dataUrl: string) => {
    return saveCoverFile(audioFilePath, dataUrl)
  })

  // Tag editing
  ipcMain.handle('write-track-tag', async (_event, filePath: string, tags: Parameters<typeof writeTrackTag>[1]) => {
    return writeTrackTag(filePath, tags)
  })

  // Read audio/video file as base64 for blob URL playback (seek support)
  ipcMain.handle('read-file-as-url', async (_event, filePath: string) => {
    try {
      const buffer = await readFile(filePath)
      const ext = extname(filePath).toLowerCase()
      const mimeMap: Record<string, string> = {
        '.mp3': 'audio/mpeg', '.flac': 'audio/flac', '.wav': 'audio/wav',
        '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.aac': 'audio/aac',
        '.wma': 'audio/x-ms-wma', '.mp4': 'video/mp4', '.webm': 'video/webm',
        '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo'
      }
      const mime = mimeMap[ext] || 'application/octet-stream'
      const base64 = buffer.toString('base64')
      return `data:${mime};base64,${base64}`
    } catch (e) {
      console.error('[IPC] read-file-as-url failed:', e)
      return null
    }
  })

  // Window controls
  ipcMain.on('minimize-window', () => {
    mainWindow?.minimize()
  })

  ipcMain.on('maximize-window', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  })

  ipcMain.on('close-window', () => {
    mainWindow?.close()
  })

  ipcMain.on('toggle-mini-player', () => {
    if (!mainWindow) return
    if (isMiniMode) {
      // Restore normal mode
      if (normalBounds) mainWindow.setBounds(normalBounds)
      mainWindow.setMinimumSize(800, 600)
      mainWindow.setAlwaysOnTop(false)
      isMiniMode = false
    } else {
      // Enter mini mode
      normalBounds = mainWindow.getBounds()
      mainWindow.setMinimumSize(320, 100)
      mainWindow.setBounds({ width: 320, height: 100 })
      mainWindow.setAlwaysOnTop(true)
      mainWindow.center()
      isMiniMode = true
    }
    mainWindow.webContents.send('mini-mode-changed', isMiniMode)
  })

  // Tray info update + thumbar sync
  ipcMain.on('update-tray-info', (_event, title: string, artist: string, isPlaying: boolean) => {
    updateTrayMenu(title, artist, isPlaying)
    updateThumbarPlayingState(isPlaying)
  })

  // Minimize to tray setting
  ipcMain.on('set-minimize-to-tray', (_e, value: boolean) => { minimizeToTray = value })

  // Taskbar progress bar
  ipcMain.on('set-taskbar-progress', (_e, progress: number) => {
    if (!mainWindow) return
    if (progress < 0 || progress >= 1) {
      mainWindow.setProgressBar(-1)
    } else {
      mainWindow.setProgressBar(progress)
    }
  })

  // Taskbar overlay icon
  ipcMain.on('set-taskbar-overlay', (_e, isPlaying: boolean) => {
    if (!mainWindow) return
    mainWindow.setOverlayIcon(null, isPlaying ? 'Playing' : 'Paused')
  })

  // Open dropped media files
  ipcMain.handle('open-media-files', async (_event, filePaths: string[]) => {
    const tracks: Track[] = []
    const errors: { filePath: string; error: string }[] = []
    for (const fp of filePaths) {
      try {
        const s = await fsStat(fp)
        if (s.isDirectory()) {
          const result = await scanDirectory(fp)
          tracks.push(...result.tracks)
          errors.push(...result.errors)
        } else {
          // Individual file — read metadata directly
          try {
            const meta = await readFileMetadata(fp)
            const fileName = fp.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || 'Unknown'
            const isVideo = /\.(mp4|webm|mkv|avi)$/i.test(fp)
            tracks.push({
              id: uuidv4(),
              title: meta?.title || fileName,
              artist: meta?.artist || 'Unknown Artist',
              album: meta?.album || 'Unknown Album',
              duration: meta?.duration || 0,
              filePath: fp,
              format: (isVideo ? 'video' : 'audio') as 'audio' | 'video'
            })
          } catch (e) {
            errors.push({ filePath: fp, error: String(e) })
          }
        }
      } catch (e) {
        errors.push({ filePath: fp, error: String(e) })
      }
    }
    return { tracks, errors }
  })

  // Directory dialog — use focused window as fallback
  ipcMain.handle('open-directory-dialog', async () => {
    const win = mainWindow || BrowserWindow.getFocusedWindow()
    if (!win) {
      console.error('[IPC] No window available for dialog')
      return null
    }
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  // File watcher controls
  ipcMain.on('start-watching', (_e, paths: string[]) => { startWatching(paths) })
  ipcMain.on('stop-watching', () => { stopWatching() })
  ipcMain.on('add-watch-path', (_e, path: string) => { addWatchPath(path) })
  ipcMain.on('remove-watch-path', (_e, path: string) => { removeWatchPath(path) })
}

// Custom protocol for local files — must be registered before app.ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local',
    privileges: {
      bypassCSP: true,
      stream: true,
      supportFetchAPI: true,
      corsEnabled: true
    }
  }
])

app.whenReady().then(async () => {
  // Register custom protocol for serving local audio/video files
  protocol.handle('local', async (request) => {
    const url = request.url
    let filePath = decodeURIComponent(url.slice('local://'.length))
    filePath = filePath.replace(/\\/g, '/')

    // Handle range requests (required for video/audio seeking)
    const rangeHeader = request.headers.get('Range')
    if (rangeHeader) {
      try {
        const fileStat = await fsStat(filePath)
        const fileSize = fileStat.size
        const parts = rangeHeader.replace(/bytes=/, '').split('-')
        const start = parseInt(parts[0], 10)
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1

        if (start >= fileSize || start < 0) {
          return new Response(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${fileSize}` }
          })
        }

        const chunkSize = end - start + 1
        const handle = await fsOpen(filePath, 'r')
        const buffer = Buffer.alloc(chunkSize)
        await handle.read(buffer, 0, chunkSize, start)
        await handle.close()

        return new Response(buffer, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': String(chunkSize),
            'Content-Type': getMimeType(filePath)
          }
        })
      } catch (e) {
        console.error('[protocol] range request failed:', e)
        return new Response(null, { status: 404 })
      }
    }

    // No range header — serve full file via net.fetch
    const fileUrl = `file:///${filePath.startsWith('/') ? filePath.slice(1) : filePath}`
    return net.fetch(fileUrl)
  })

  await initDatabase()

  // Start file watcher for saved scan paths
  const { dbApi } = await import('./db')
  const savedPaths = dbApi.getScanPaths()
  if (savedPaths.length > 0) {
    startWatching(savedPaths)
  }

  registerIPC()
  registerDbHandlers()
  createWindow()
  setupTray(() => mainWindow, () => { forceQuit = true; app.quit() })
  registerGlobalShortcuts()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function registerGlobalShortcuts(): void {
  const shortcuts: [string, string][] = [
    ['MediaPlayPause', 'media-play-pause'],
    ['MediaNextTrack', 'media-next'],
    ['MediaPreviousTrack', 'media-previous'],
    ['MediaStop', 'media-stop']
  ]

  for (const [key, channel] of shortcuts) {
    try {
      globalShortcut.register(key, () => {
        mainWindow?.webContents.send(channel)
      })
    } catch {
      console.warn(`Failed to register global shortcut: ${key}`)
    }
  }
}
