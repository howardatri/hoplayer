import chokidar from 'chokidar'
import type { FSWatcher } from 'chokidar'
import { extname } from 'path'
import { BrowserWindow } from 'electron'

const SUPPORTED_EXTENSIONS = new Set([
  '.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.wma',
  '.mp4', '.webm', '.mkv', '.avi'
])

let watcher: FSWatcher | null = null
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()

function getMainWindow(): BrowserWindow | null {
  return BrowserWindow.getAllWindows()[0] || null
}

function debouncedNotify(filePath: string, action: 'add' | 'remove', delay = 300): void {
  const key = `${action}:${filePath}`
  const existing = debounceTimers.get(key)
  if (existing) clearTimeout(existing)
  debounceTimers.set(
    key,
    setTimeout(() => {
      debounceTimers.delete(key)
      const win = getMainWindow()
      if (!win || win.isDestroyed()) return
      win.webContents.send('watcher-file-change', action, filePath)
    }, delay)
  )
}

export function startWatching(paths: string[]): void {
  stopWatching()
  if (paths.length === 0) return

  watcher = chokidar.watch(paths, {
    ignored: /(^|[\/\\])\../, // ignore hidden files
    persistent: true,
    ignoreInitial: true, // don't fire for existing files on startup
    depth: 10,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 }
  })

  watcher.on('add', (filePath: string) => {
    const ext = extname(filePath).toLowerCase()
    if (!SUPPORTED_EXTENSIONS.has(ext)) return
    debouncedNotify(filePath, 'add')
  })

  watcher.on('unlink', (filePath: string) => {
    const ext = extname(filePath).toLowerCase()
    if (!SUPPORTED_EXTENSIONS.has(ext)) return
    debouncedNotify(filePath, 'remove')
  })

  watcher.on('error', (error: unknown) => {
    console.error('[Watcher] Error:', error)
  })

  console.log('[Watcher] Started watching', paths.length, 'path(s)')
}

export function stopWatching(): void {
  if (watcher) {
    watcher.close()
    watcher = null
    console.log('[Watcher] Stopped')
  }
  debounceTimers.forEach((timer) => clearTimeout(timer))
  debounceTimers.clear()
}

export function addWatchPath(dirPath: string): void {
  if (watcher) {
    watcher.add(dirPath)
  }
}

export function removeWatchPath(dirPath: string): void {
  if (watcher) {
    watcher.unwatch(dirPath)
  }
}
