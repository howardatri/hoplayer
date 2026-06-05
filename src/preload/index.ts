import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../shared'

const electronAPI: ElectronAPI = {
  // File operations
  scanDirectory: (dirPath: string) => ipcRenderer.invoke('scan-directory', dirPath),
  getFileCover: (filePath: string) => ipcRenderer.invoke('get-file-cover', filePath),
  readFileMetadata: (filePath: string) => ipcRenderer.invoke('read-file-metadata', filePath),

  // Directory dialog
  openDirectoryDialog: () => ipcRenderer.invoke('open-directory-dialog'),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
  toggleMiniPlayer: () => ipcRenderer.send('toggle-mini-player'),

  // Store
  storeGet: <T>(key: string, defaultValue: T) =>
    ipcRenderer.invoke('store-get', key, defaultValue),
  storeSet: <T>(key: string, value: T) =>
    ipcRenderer.invoke('store-set', key, value),

  // Events
  onFileDropped: (callback: (filePaths: string[]) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, filePaths: string[]) => callback(filePaths)
    ipcRenderer.on('file-dropped', handler)
    return () => {
      ipcRenderer.removeListener('file-dropped', handler)
    }
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
