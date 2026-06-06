import { useCallback, useEffect, useRef } from 'react'
import useLibraryStore from '@/store/libraryStore'
import usePlaylistStore from '@/store/playlistStore'
import { getTrackFolder } from '@/utils/paths'
import type { Track } from '@shared/index'

const VIDEO_EXTENSIONS_RE = /\.(mp4|webm|mkv|avi)$/i

/**
 * Hook for managing the media library.
 * Loads from SQLite on mount, persists changes back to SQLite.
 */
export function useLibrary() {
  const {
    tracks,
    isLoading,
    scanPaths,
    setTracks,
    addTracks,
    setIsLoading,
    addScanPath,
    removeScanPath,
    setScanPaths
  } = useLibraryStore()

  const playlists = usePlaylistStore((s) => s.playlists)
  const setPlaylists = usePlaylistStore((s) => s.setPlaylists)
  const playlistsLoaded = useRef(false)
  const libraryLoaded = useRef(false)

  // Load from SQLite on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedPaths, savedTracks, savedPlaylists] = await Promise.all([
          window.electronAPI.dbGetScanPaths(),
          window.electronAPI.dbGetAllTracks(),
          window.electronAPI.dbGetAllPlaylists()
        ])

        setScanPaths(savedPaths)
        if (savedTracks.length > 0) setTracks(savedTracks)
        setPlaylists(savedPlaylists)
        playlistsLoaded.current = true
        libraryLoaded.current = true

        // Re-scan saved paths in background to pick up new files
        if (savedPaths.length > 0) {
          for (const path of savedPaths) {
            await scanDirectory(path, false)
          }
        }
      } catch (err) {
        console.error('Failed to load data from SQLite:', err)
        playlistsLoaded.current = true
        libraryLoaded.current = true
      }
    }
    loadData()
  }, [])

  // Listen for file watcher events (auto-add/remove files)
  useEffect(() => {
    const cleanup = window.electronAPI.onWatcherFileChange(async (action, filePath) => {
      if (action === 'add') {
        try {
          const meta = await window.electronAPI.readFileMetadata(filePath)
          const fileName = filePath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '') || 'Unknown'
          const isVideo = VIDEO_EXTENSIONS_RE.test(filePath)
          const track: Track = {
            id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            title: meta?.title || fileName,
            artist: meta?.artist || 'Unknown Artist',
            album: meta?.album || 'Unknown Album',
            duration: meta?.duration || 0,
            filePath,
            format: isVideo ? 'video' : 'audio'
          }
          addTracks([track])
        } catch (e) {
          console.warn('[watcher] Failed to process new file:', filePath, e)
        }
      } else if (action === 'remove') {
        const store = useLibraryStore.getState()
        const track = store.tracks.find(t => t.filePath === filePath)
        if (track) {
          store.removeTrack(track.id)
          window.electronAPI.dbRemoveTrack(track.id).catch(() => {})
        }
      }
    })
    return cleanup
  }, [addTracks])

  // Sync file watcher with scan paths
  useEffect(() => {
    if (!libraryLoaded.current) return
    window.electronAPI.startWatching(scanPaths)
  }, [scanPaths])

  // Persist playlists to SQLite when they change (skip initial load)
  useEffect(() => {
    if (!playlistsLoaded.current) return
    // Persist the full playlist list by syncing with DB
    const sync = async () => {
      try {
        const dbPlaylists = await window.electronAPI.dbGetAllPlaylists()
        const dbIds = new Set(dbPlaylists.map(p => p.id))
        const currentIds = new Set(playlists.map(p => p.id))

        // Delete playlists that no longer exist
        for (const db of dbPlaylists) {
          if (!currentIds.has(db.id)) {
            await window.electronAPI.dbDeletePlaylist(db.id)
          }
        }

        // Upsert current playlists
        for (const pl of playlists) {
          if (!dbIds.has(pl.id)) {
            await window.electronAPI.dbCreatePlaylist(pl)
            // Restore track associations
            for (let i = 0; i < pl.trackIds.length; i++) {
              await window.electronAPI.dbAddTrackToPlaylist(pl.id, pl.trackIds[i], i)
            }
          } else {
            // Check if track list changed
            const dbPl = dbPlaylists.find(d => d.id === pl.id)!
            const dbTrackStr = dbPl.trackIds.join(',')
            const curTrackStr = pl.trackIds.join(',')
            if (dbTrackStr !== curTrackStr) {
              // Rebuild: remove all old, add all new
              for (const tid of dbPl.trackIds) {
                await window.electronAPI.dbRemoveTrackFromPlaylist(pl.id, tid)
              }
              for (let i = 0; i < pl.trackIds.length; i++) {
                await window.electronAPI.dbAddTrackToPlaylist(pl.id, pl.trackIds[i], i)
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to persist playlists:', err)
      }
    }
    sync()
  }, [playlists])

  // Persist tracks to SQLite when they change
  useEffect(() => {
    if (tracks.length === 0) return
    const sync = async () => {
      try {
        const dbTracks = await window.electronAPI.dbGetAllTracks()
        const dbIds = new Set(dbTracks.map(t => t.id))
        // Upsert new/changed tracks
        for (const t of tracks) {
          await window.electronAPI.dbUpsertTrack(t)
        }
        // Remove tracks no longer in library
        const currentIds = new Set(tracks.map(t => t.id))
        for (const db of dbTracks) {
          if (!currentIds.has(db.id)) {
            await window.electronAPI.dbRemoveTrack(db.id)
          }
        }
      } catch (err) {
        console.error('Failed to persist tracks:', err)
      }
    }
    sync()
  }, [tracks])

  // Persist scan paths to SQLite when they change
  useEffect(() => {
    if (!libraryLoaded.current) return
    const sync = async () => {
      try {
        const dbPaths = await window.electronAPI.dbGetScanPaths()
        const dbSet = new Set(dbPaths)
        const curSet = new Set(scanPaths)
        for (const p of scanPaths) {
          if (!dbSet.has(p)) await window.electronAPI.dbAddScanPath(p)
        }
        for (const p of dbPaths) {
          if (!curSet.has(p)) await window.electronAPI.dbRemoveScanPath(p)
        }
      } catch (err) {
        console.error('Failed to persist scan paths:', err)
      }
    }
    sync()
  }, [scanPaths])

  // Scan a directory
  const scanDirectory = useCallback(
    async (dirPath: string, isNewScan = true) => {
      if (isNewScan) setIsLoading(true)
      try {
        const result = await window.electronAPI.scanDirectory(dirPath)
        if (isNewScan) {
          addTracks(result.tracks)
          addScanPath(dirPath)
        } else {
          addTracks(result.tracks)
        }
        if (result.errors.length > 0) console.warn('Scan errors:', result.errors)
        return result
      } catch (err) {
        console.error('Scan failed:', err)
        return null
      } finally {
        if (isNewScan) setIsLoading(false)
      }
    },
    [addTracks, addScanPath, setIsLoading]
  )

  // Open directory dialog and scan
  const addDirectory = useCallback(async () => {
    const dirPath = await window.electronAPI.openDirectoryDialog()
    if (!dirPath) return null
    return scanDirectory(dirPath)
  }, [scanDirectory])

  // Remove a scan path and its tracks
  const removeDirectory = useCallback(
    (dirPath: string) => {
      // Compute remaining paths BEFORE removing
      const remainingPaths = scanPaths.filter(p => p !== dirPath)
      removeScanPath(dirPath)
      // Keep only tracks that belong to another folder
      const remaining = tracks.filter((t) => getTrackFolder(t.filePath, remainingPaths) !== null)
      setTracks(remaining)
    },
    [removeScanPath, scanPaths, tracks, setTracks]
  )

  return {
    tracks,
    isLoading,
    scanPaths,
    scanDirectory,
    addDirectory,
    removeDirectory,
    setTracks
  }
}
