import { ipcMain } from 'electron'
import { dbApi } from '../db'
import type { Track, Playlist } from '../../shared'

export function registerDbHandlers(): void {
  // Scan paths
  ipcMain.handle('db-get-scan-paths', () => dbApi.getScanPaths())
  ipcMain.handle('db-add-scan-path', (_e, path: string) => { dbApi.addScanPath(path) })
  ipcMain.handle('db-remove-scan-path', (_e, path: string) => { dbApi.removeScanPath(path) })

  // Tracks
  ipcMain.handle('db-get-all-tracks', () => dbApi.getAllTracks())
  ipcMain.handle('db-upsert-track', (_e, track: Track) => { dbApi.upsertTrack(track) })
  ipcMain.handle('db-remove-track', (_e, id: string) => { dbApi.removeTrack(id) })
  ipcMain.handle('db-increment-play-count', (_e, id: string) => { dbApi.incrementPlayCount(id) })

  // Playlists
  ipcMain.handle('db-get-all-playlists', () => dbApi.getAllPlaylists())
  ipcMain.handle('db-create-playlist', (_e, playlist: Playlist) => { dbApi.createPlaylist(playlist) })
  ipcMain.handle('db-delete-playlist', (_e, id: string) => { dbApi.deletePlaylist(id) })
  ipcMain.handle('db-rename-playlist', (_e, id: string, name: string, updatedAt: number) => {
    dbApi.renamePlaylist(id, name, updatedAt)
  })
  ipcMain.handle('db-add-track-to-playlist', (_e, playlistId: string, trackId: string, position: number) => {
    dbApi.addTrackToPlaylist(playlistId, trackId, position)
  })
  ipcMain.handle('db-remove-track-from-playlist', (_e, playlistId: string, trackId: string) => {
    dbApi.removeTrackFromPlaylist(playlistId, trackId)
  })
  ipcMain.handle('db-reorder-playlist', (_e, playlistId: string, trackIds: string[]) => {
    dbApi.reorderPlaylist(playlistId, trackIds)
  })

  // Tag editing
  ipcMain.handle('update-track-db', (_e, track: Track) => { dbApi.upsertTrack(track) })
}
