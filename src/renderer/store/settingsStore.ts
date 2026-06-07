import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RepeatMode } from '@shared/index'

interface SettingsStore {
  // Theme
  themeId: string

  // Behavior
  minimizeToTray: boolean
  enableNotifications: boolean
  audioOutputDeviceId: string // '' = default device

  // Audio preferences
  volume: number
  crossfadeDuration: number
  playbackSpeed: number
  eqBands: number[]
  eqPreset: string
  repeatMode: RepeatMode
  isShuffle: boolean

  // Actions
  setThemeId: (id: string) => void
  setVolume: (v: number) => void
  setCrossfadeDuration: (v: number) => void
  setPlaybackSpeed: (v: number) => void
  setEqBands: (bands: number[]) => void
  setEqPreset: (preset: string) => void
  setRepeatMode: (mode: RepeatMode) => void
  setIsShuffle: (v: boolean) => void
  setMinimizeToTray: (v: boolean) => void
  setEnableNotifications: (v: boolean) => void
  setAudioOutputDeviceId: (id: string) => void
}

const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      themeId: 'aurora',
      minimizeToTray: true,
      enableNotifications: true,
      audioOutputDeviceId: '',
      volume: 0.8,
      crossfadeDuration: 0,
      playbackSpeed: 1.0,
      eqBands: [0, 0, 0, 0, 0],
      eqPreset: 'flat',
      repeatMode: 'off',
      isShuffle: false,

      setThemeId: (id) => set({ themeId: id }),
      setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)) }),
      setCrossfadeDuration: (v) => set({ crossfadeDuration: Math.max(0, Math.min(12, v)) }),
      setPlaybackSpeed: (v) => set({ playbackSpeed: Math.max(0.5, Math.min(3.0, v)) }),
      setEqBands: (bands) => set({ eqBands: bands.map(g => Math.max(-12, Math.min(12, g))) }),
      setEqPreset: (preset) => set({ eqPreset: preset }),
      setRepeatMode: (mode) => set({ repeatMode: mode }),
      setIsShuffle: (v) => set({ isShuffle: v }),
      setMinimizeToTray: (v) => set({ minimizeToTray: v }),
      setEnableNotifications: (v) => set({ enableNotifications: v }),
      setAudioOutputDeviceId: (id) => set({ audioOutputDeviceId: id }),
    }),
    {
      name: 'hoplayer-settings',
    }
  )
)

export default useSettingsStore
