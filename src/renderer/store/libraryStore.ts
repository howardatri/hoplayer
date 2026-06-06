import { create } from 'zustand'
import type { Track } from '@shared/index'

interface LibraryStore {
  // Library data
  tracks: Track[]
  isLoading: boolean
  scanPaths: string[]

  // Actions
  setTracks: (tracks: Track[]) => void
  addTracks: (tracks: Track[]) => void
  removeTrack: (id: string) => void
  updateTrack: (id: string, updates: Partial<Track>) => void
  setIsLoading: (loading: boolean) => void
  addScanPath: (path: string) => void
  removeScanPath: (path: string) => void
  setScanPaths: (paths: string[]) => void

  // Derived helpers
  getTrackById: (id: string) => Track | undefined
  getTracksByArtist: (artist: string) => Track[]
  getTracksByAlbum: (album: string) => Track[]
}

const useLibraryStore = create<LibraryStore>((set, get) => ({
  tracks: [],
  isLoading: false,
  scanPaths: [],

  setTracks: (tracks) => set({ tracks }),
  addTracks: (newTracks) =>
    set((state) => {
      // Deduplicate by filePath
      const existingPaths = new Set(state.tracks.map((t) => t.filePath))
      const unique = newTracks.filter((t) => !existingPaths.has(t.filePath))
      return { tracks: [...state.tracks, ...unique] }
    }),
  removeTrack: (id) =>
    set((state) => ({
      tracks: state.tracks.filter((t) => t.id !== id)
    })),
  updateTrack: (id, updates) =>
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === id ? { ...t, ...updates } : t))
    })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  addScanPath: (path) =>
    set((state) => ({
      scanPaths: state.scanPaths.includes(path)
        ? state.scanPaths
        : [...state.scanPaths, path]
    })),
  removeScanPath: (path) =>
    set((state) => ({
      scanPaths: state.scanPaths.filter((p) => p !== path)
    })),
  setScanPaths: (paths) => set({ scanPaths: paths }),

  getTrackById: (id) => get().tracks.find((t) => t.id === id),
  getTracksByArtist: (artist) =>
    get().tracks.filter((t) => t.artist === artist),
  getTracksByAlbum: (album) =>
    get().tracks.filter((t) => t.album === album)
}))

export default useLibraryStore
