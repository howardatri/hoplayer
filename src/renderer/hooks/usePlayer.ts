import { useRef, useEffect, useCallback } from 'react'
import usePlayerStore from '@/store/playerStore'
import type { Track } from '@shared/index'

// Singleton AudioContext and AnalyserNode for spectrum visualization
let audioContext: AudioContext | null = null
let analyserNode: AnalyserNode | null = null
let sourceNode: MediaElementAudioSourceNode | null = null
let audioConnected = false

function getOrCreateAudioContext(): AudioContext {
  if (!audioContext) audioContext = new AudioContext()
  return audioContext
}

function connectAudioElement(audio: HTMLAudioElement): AnalyserNode {
  const ctx = getOrCreateAudioContext()
  if (!analyserNode) {
    analyserNode = ctx.createAnalyser()
    analyserNode.fftSize = 256
    analyserNode.smoothingTimeConstant = 0.8
    analyserNode.connect(ctx.destination)
  }
  if (!sourceNode || sourceNode.mediaElement !== audio) {
    try { sourceNode?.disconnect() } catch {}
    sourceNode = ctx.createMediaElementSource(audio)
    sourceNode.connect(analyserNode)
  }
  return analyserNode
}

export function getAnalyserNode(): AnalyserNode | null { return analyserNode }
export function getAudioContext(): AudioContext | null { return audioContext }

// Global player controls — set by usePlayer hook, usable from anywhere
let _controls: {
  togglePlay: () => void
  playNext: () => void
  playPrev: () => void
  setVolume: (v: number) => void
  seek: (ratio: number) => void
} | null = null

export function getPlayerControls() { return _controls }

/**
 * Core audio playback hook.
 * Returns an imperative API — call playTrack/togglePlay to control playback.
 */
export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialize audio element once
  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'auto'
    audioRef.current = audio

    // Wire up events
    const onTimeUpdate = () => {
      if (audio.duration && isFinite(audio.duration)) {
        usePlayerStore.getState().setCurrentTime(audio.currentTime)
        usePlayerStore.getState().setProgress(audio.currentTime / audio.duration)
      }
    }
    const onLoadedMetadata = () => {
      usePlayerStore.getState().setDuration(audio.duration || 0)
    }
    const onEnded = () => {
      const { repeatMode } = usePlayerStore.getState()
      if (repeatMode === 'one') {
        audio.currentTime = 0
        audio.play()
      } else {
        usePlayerStore.getState().playNext()
      }
    }
    const onError = () => {
      usePlayerStore.getState().setIsPlaying(false)
      console.error('[usePlayer] Audio error:', audio.error?.code, audio.error?.message)
    }
    const onCanPlay = () => {
      // Auto-play when track loads and isPlaying is true
      if (usePlayerStore.getState().isPlaying) {
        audio.play().catch(e => {
          console.warn('[usePlayer] Auto-play blocked:', e.message)
          usePlayerStore.getState().setIsPlaying(false)
        })
      }
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)
    audio.addEventListener('canplay', onCanPlay)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      audio.removeEventListener('canplay', onCanPlay)
      audio.pause()
      audio.src = ''
      audioRef.current = null
      audioConnected = false
    }
  }, [])

  // Ensure Web Audio API is connected (for spectrum)
  const ensureConnected = useCallback(() => {
    const audio = audioRef.current
    if (!audio || audioConnected) return
    try {
      connectAudioElement(audio)
      audioConnected = true
      if (audioContext?.state === 'suspended') audioContext.resume()
    } catch (e) {
      console.warn('[usePlayer] Web Audio connect failed:', e)
    }
  }, [])

  // playTrack: load a new track and start playing
  const playTrack = useCallback((track: Track, queue?: Track[]) => {
    const audio = audioRef.current
    if (!audio) return

    // Set queue if provided
    if (queue) {
      const index = queue.findIndex(t => t.id === track.id)
      usePlayerStore.getState().setQueue(queue, index >= 0 ? index : 0)
    } else {
      usePlayerStore.getState().setCurrentTrack(track)
    }

    // Load and play
    const fileUrl = `local://${encodeURIComponent(track.filePath)}`
    audio.src = fileUrl
    audio.load()
    usePlayerStore.getState().setIsPlaying(true)

    ensureConnected()

    // Attempt play — may need user gesture on first interaction
    const playPromise = audio.play()
    if (playPromise) {
      playPromise.catch(e => {
        console.warn('[usePlayer] play() failed, will try on canplay:', e.message)
        // Don't set isPlaying false here — let canplay handler retry
      })
    }
  }, [ensureConnected])

  // togglePlay: pause/resume current track
  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    const { currentTrack, isPlaying } = usePlayerStore.getState()
    if (!currentTrack) return

    ensureConnected()

    if (isPlaying) {
      audio.pause()
      usePlayerStore.getState().setIsPlaying(false)
    } else {
      if (audioContext?.state === 'suspended') audioContext.resume()
      audio.play().then(() => {
        usePlayerStore.getState().setIsPlaying(true)
      }).catch(e => {
        console.warn('[usePlayer] Resume failed:', e.message)
      })
    }
  }, [ensureConnected])

  // seek: jump to a position (0-1 ratio)
  const seek = useCallback((ratio: number) => {
    const audio = audioRef.current
    if (!audio || !audio.duration || !isFinite(audio.duration)) return
    audio.currentTime = ratio * audio.duration
    usePlayerStore.getState().setCurrentTime(audio.currentTime)
    usePlayerStore.getState().setProgress(ratio)
  }, [])

  // seekToTime: jump to specific seconds
  const seekToTime = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio || !audio.duration || !isFinite(audio.duration)) return
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration))
  }, [])

  // setVolume
  const setVolume = useCallback((vol: number) => {
    const v = Math.max(0, Math.min(1, vol))
    usePlayerStore.getState().setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
  }, [])

  // Sync volume from store to audio element
  useEffect(() => {
    const unsub = usePlayerStore.subscribe(
      state => { if (audioRef.current) audioRef.current.volume = state.volume }
    )
    // Set initial volume
    if (audioRef.current) audioRef.current.volume = usePlayerStore.getState().volume
    return unsub
  }, [])

  // playNext / playPrev — load the new track from the store
  const playNextTrack = useCallback(() => {
    usePlayerStore.getState().playNext()
    // The next track is now currentTrack — load it
    requestAnimationFrame(() => {
      const { currentTrack, isPlaying } = usePlayerStore.getState()
      const audio = audioRef.current
      if (!audio || !currentTrack) return
      audio.src = `local://${encodeURIComponent(currentTrack.filePath)}`
      audio.load()
      if (isPlaying) {
        ensureConnected()
        audio.play().catch(() => {})
      }
    })
  }, [ensureConnected])

  const playPrevTrack = useCallback(() => {
    const audio = audioRef.current
    // If more than 3s in, restart
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    usePlayerStore.getState().playPrev()
    requestAnimationFrame(() => {
      const { currentTrack, isPlaying } = usePlayerStore.getState()
      const audio = audioRef.current
      if (!audio || !currentTrack) return
      audio.src = `local://${encodeURIComponent(currentTrack.filePath)}`
      audio.load()
      if (isPlaying) {
        ensureConnected()
        audio.play().catch(() => {})
      }
    })
  }, [ensureConnected])

  // Register global controls
  useEffect(() => {
    _controls = { togglePlay, playNext: playNextTrack, playPrev: playPrevTrack, setVolume, seek }
    return () => { _controls = null }
  }, [togglePlay, playNextTrack, playPrevTrack, setVolume, seek])

  return {
    playTrack,
    togglePlay,
    seek,
    seekToTime,
    setVolume,
    playNext: playNextTrack,
    playPrev: playPrevTrack,
    audioRef
  }
}
