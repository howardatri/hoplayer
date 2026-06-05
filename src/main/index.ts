import { app, BrowserWindow, shell, ipcMain, dialog, protocol, net, globalShortcut } from 'electron'
import { join } from 'path'
import { scanDirectory, getFileCover, readFileMetadata, readLrcFile } from './ipc/fileScan'
import Store from 'electron-store'

// Memory optimization
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('--js-flags', '--max-old-space-size=256')

let store: InstanceType<typeof Store>
try {
  store = new Store()
} catch (e) {
  console.error('Failed to init electron-store, using fallback:', e)
  // Fallback: in-memory store
  const mem = new Map<string, unknown>()
  store = {
    get: (key: string, defaultValue?: unknown) => (mem.has(key) ? mem.get(key) : defaultValue),
    set: (_key: string, _value: unknown) => {},
    delete: (_key: string) => {}
  } as unknown as InstanceType<typeof Store>
}

let mainWindow: BrowserWindow | null = null

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
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
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
    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    } else {
      mainWindow.minimize()
    }
  })

  // Store operations
  ipcMain.handle('store-get', async (_event, key: string, defaultValue: unknown) => {
    try {
      return store.get(key, defaultValue)
    } catch {
      return defaultValue
    }
  })

  ipcMain.handle('store-set', async (_event, key: string, value: unknown) => {
    try {
      store.set(key, value)
    } catch (e) {
      console.error('[IPC] store-set failed:', e)
    }
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

app.whenReady().then(() => {
  // Register custom protocol for serving local audio/video files
  protocol.handle('local', (request) => {
    const url = request.url
    let filePath = decodeURIComponent(url.slice('local://'.length))
    filePath = filePath.replace(/\\/g, '/')
    const fileUrl = `file:///${filePath.startsWith('/') ? filePath.slice(1) : filePath}`
    return net.fetch(fileUrl)
  })

  registerIPC()
  createWindow()
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
