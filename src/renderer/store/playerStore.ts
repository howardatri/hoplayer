import { create } from 'zustand'
import type { Track, RepeatMode } from '@shared/index'

interface PlayerStore {
  // Playback state
  currentTrack: Track | null
  isPlaying: boolean
  volume: number
  progress: number
  currentTime: number
  duration: number
  repeatMode: RepeatMode
  isShuffle: boolean

  // Queue
  queue: Track[]
  currentIndex: number

  // Actions
  setCurrentTrack: (track: Track | null) => void
  setIsPlaying: (playing: boolean) => void
  setVolume: (volume: number) => void
  setProgress: (progress: number) => void
  setCurrentTime: (time: number) => void
  setDuration: (duration: number) => void
  toggleRepeat: () => void
  toggleShuffle: () => void

  // Queue actions
  setQueue: (tracks: Track[], startIndex?: number) => void
  playNext: () => void
  playPrev: () => void
  addToQueue: (track: Track) => void
  removeFromQueue: (index: number) => void
}

const usePlayerStore = create<PlayerStore>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  volume: 0.8,
  progress: 0,
  currentTime: 0,
  duration: 0,
  repeatMode: 'off',
  isShuffle: false,

  queue: [],
  currentIndex: -1,

  setCurrentTrack: (track) => set({ currentTrack: track }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  setProgress: (progress) => set({ progress: Math.max(0, Math.min(1, progress)) }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setDuration: (duration) => set({ duration }),
  toggleRepeat: () =>
    set((state) => {
      const modes: RepeatMode[] = ['off', 'all', 'one']
      const nextIndex = (modes.indexOf(state.repeatMode) + 1) % modes.length
      return { repeatMode: modes[nextIndex] }
    }),
  toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),

  setQueue: (tracks, startIndex = 0) =>
    set({
      queue: tracks,
      currentIndex: startIndex,
      currentTrack: tracks[startIndex] || null
    }),

  playNext: () => {
    const { queue, currentIndex, repeatMode, isShuffle } = get()
    if (queue.length === 0) return

    let nextIndex: number

    if (repeatMode === 'one') {
      nextIndex = currentIndex
    } else if (isShuffle) {
      nextIndex = Math.floor(Math.random() * queue.length)
      // Avoid repeating the same track
      if (queue.length > 1) {
        while (nextIndex === currentIndex) {
          nextIndex = Math.floor(Math.random() * queue.length)
        }
      }
    } else {
      nextIndex = currentIndex + 1
      if (nextIndex >= queue.length) {
        if (repeatMode === 'all') {
          nextIndex = 0
        } else {
          return // Stop at end
        }
      }
    }

    set({
      currentIndex: nextIndex,
      currentTrack: queue[nextIndex],
      isPlaying: true
    })
  },

  playPrev: () => {
    const { queue, currentIndex, currentTime } = get()
    if (queue.length === 0) return

    // If more than 3 seconds in, restart current track
    if (currentTime > 3) {
      set({ currentTime: 0, progress: 0 })
      return
    }

    let prevIndex = currentIndex - 1
    if (prevIndex < 0) prevIndex = queue.length - 1

    set({
      currentIndex: prevIndex,
      currentTrack: queue[prevIndex],
      isPlaying: true
    })
  },

  addToQueue: (track) => set((state) => ({ queue: [...state.queue, track] })),

  removeFromQueue: (index) =>
    set((state) => {
      const newQueue = [...state.queue]
      newQueue.splice(index, 1)
      const newIndex =
        state.currentIndex > index
          ? state.currentIndex - 1
          : state.currentIndex === index
            ? Math.min(index, newQueue.length - 1)
            : state.currentIndex
      return {
        queue: newQueue,
        currentIndex: newIndex,
        currentTrack: newQueue[newIndex] || null
      }
    })
}))

export default usePlayerStore
