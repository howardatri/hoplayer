import { Tray, Menu, nativeImage, BrowserWindow, app } from 'electron'

let tray: Tray | null = null
let currentTitle = ''
let currentArtist = ''
let currentIsPlaying = false
let getWindowFn: (() => BrowserWindow | null) | null = null
let quitFn: (() => void) | null = null

function createTrayIcon(): Electron.NativeImage {
  // Try to load from assets first
  try {
    const { join } = require('path')
    const { existsSync } = require('fs')
    const iconPath = join(__dirname, '../assets/tray-icon.png')
    if (existsSync(iconPath)) {
      return nativeImage.createFromPath(iconPath)
    }
  } catch { /* ignore */ }

  // Create a simple 16x16 purple music note icon programmatically
  const size = 16
  const canvas = Buffer.alloc(size * size * 4) // RGBA
  // Draw a simple filled circle (purple) as a placeholder icon
  const cx = 8, cy = 8, r = 6
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      const idx = (y * size + x) * 4
      if (dist <= r) {
        canvas[idx] = 124      // R
        canvas[idx + 1] = 91   // G
        canvas[idx + 2] = 245  // B
        canvas[idx + 3] = 255  // A
      } else {
        canvas[idx + 3] = 0 // transparent
      }
    }
  }
  return nativeImage.createFromBuffer(canvas, { width: size, height: size })
}

function buildContextMenu(): Electron.Menu {
  const win = getWindowFn?.()
  const nowPlayingLabel = currentTitle
    ? `${currentTitle} - ${currentArtist}`
    : 'No track playing'

  return Menu.buildFromTemplate([
    { label: 'hoplayer', enabled: false },
    { type: 'separator' },
    { label: nowPlayingLabel, enabled: false },
    { type: 'separator' },
    {
      label: currentIsPlaying ? 'Pause' : 'Play',
      click: () => {
        win?.webContents.send('tray-play-pause')
      }
    },
    {
      label: 'Previous',
      click: () => {
        win?.webContents.send('tray-prev')
      }
    },
    {
      label: 'Next',
      click: () => {
        win?.webContents.send('tray-next')
      }
    },
    { type: 'separator' },
    {
      label: 'Show Window',
      click: () => {
        if (win) {
          win.show()
          win.focus()
        }
      }
    },
    {
      label: 'Quit',
      click: () => {
        quitFn ? quitFn() : app.quit()
      }
    }
  ])
}

export function setupTray(getWindow: () => BrowserWindow | null, onQuit?: () => void): Tray {
  getWindowFn = getWindow
  quitFn = onQuit || null
  const icon = createTrayIcon()
  tray = new Tray(icon)
  tray.setToolTip('hoplayer')
  tray.setContextMenu(buildContextMenu())

  // Double-click tray icon -> show window
  tray.on('double-click', () => {
    const win = getWindow()
    if (win) {
      win.show()
      win.focus()
    }
  })

  return tray
}

export function updateTrayMenu(title: string, artist: string, isPlaying: boolean): void {
  if (!tray) return
  currentTitle = title
  currentArtist = artist
  currentIsPlaying = isPlaying
  tray.setContextMenu(buildContextMenu())
}
