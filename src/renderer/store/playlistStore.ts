import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'
import type { Playlist } from '@shared/index'

interface PlaylistStore {
  playlists: Playlist[]

  // Actions
  createPlaylist: (name: string) => Playlist
  deletePlaylist: (id: string) => void
  renamePlaylist: (id: string, name: string) => void
  addTrackToPlaylist: (playlistId: string, trackId: string) => void
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void
  reorderPlaylist: (playlistId: string, trackIds: string[]) => void
  setPlaylists: (playlists: Playlist[]) => void

  // Helpers
  getPlaylistById: (id: string) => Playlist | undefined
}

const usePlaylistStore = create<PlaylistStore>((set, get) => ({
  playlists: [],

  createPlaylist: (name) => {
    const playlist: Playlist = {
      id: uuidv4(),
      name,
      trackIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    set((state) => ({ playlists: [...state.playlists, playlist] }))
    return playlist
  },

  deletePlaylist: (id) =>
    set((state) => ({
      playlists: state.playlists.filter((p) => p.id !== id)
    })),

  renamePlaylist: (id, name) =>
    set((state) => ({
      playlists: state.playlists.map((p) =>
        p.id === id ? { ...p, name, updatedAt: Date.now() } : p
      )
    })),

  addTrackToPlaylist: (playlistId, trackId) =>
    set((state) => ({
      playlists: state.playlists.map((p) => {
        if (p.id !== playlistId) return p
        if (p.trackIds.includes(trackId)) return p
        return { ...p, trackIds: [...p.trackIds, trackId], updatedAt: Date.now() }
      })
    })),

  removeTrackFromPlaylist: (playlistId, trackId) =>
    set((state) => ({
      playlists: state.playlists.map((p) =>
        p.id === playlistId
          ? { ...p, trackIds: p.trackIds.filter((id) => id !== trackId), updatedAt: Date.now() }
          : p
      )
    })),

  reorderPlaylist: (playlistId, trackIds) =>
    set((state) => ({
      playlists: state.playlists.map((p) =>
        p.id === playlistId ? { ...p, trackIds, updatedAt: Date.now() } : p
      )
    })),

  setPlaylists: (playlists) => set({ playlists }),

  getPlaylistById: (id) => get().playlists.find((p) => p.id === id)
}))

export default usePlaylistStore
