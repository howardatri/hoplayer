import { app, BrowserWindow, shell, ipcMain, dialog, protocol, net, globalShortcut } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { scanDirectory, getFileCover, readFileMetadata, readLrcFile } from './ipc/fileScan'
import Store from 'electron-store'

// Memory optimization
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('--js-flags', '--max-old-space-size=256')

const store = new Store()
let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false, // Frameless for custom title bar
    titleBarStyle: 'hidden',
    backgroundColor: '#0f0f14',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      spellcheck: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Load renderer
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  // Handle window state for mini player
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized')
  })

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-unmaximized')
  })
}

// Register IPC handlers
function registerIPC(): void {
  // File scanning
  ipcMain.handle('scan-directory', async (_event, dirPath: string) => {
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
    return store.get(key, defaultValue)
  })

  ipcMain.handle('store-set', async (_event, key: string, value: unknown) => {
    store.set(key, value)
  })

  // Directory dialog
  ipcMain.handle('open-directory-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      properties: ['openDirectory']
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })
}

// Custom protocol for local files
protocol.registerSchemesAsPrivileged([
  { scheme: 'local', privileges: { bypassCSP: true, stream: true } }
])

app.whenReady().then(() => {
  // Register custom protocol for serving local audio/video files
  protocol.handle('local', (request) => {
    const filePath = decodeURIComponent(request.url.slice('local://'.length))
    return net.fetch(`file://${filePath}`)
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

// Register global media shortcuts
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
      // Shortcut may not be available on this platform
      console.warn(`Failed to register global shortcut: ${key}`)
    }
  }
}
