import { useRef, useEffect, useCallback } from 'react'
import usePlayerStore from '@/store/playerStore'
import type { Track } from '@shared/index'

// ---- Web Audio API singleton for spectrum ----
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

// ---- Global controls (set by the hook, read by keyboard/media keys) ----
let _controls: {
  togglePlay: () => void
  playNext: () => void
  playPrev: () => void
  setVolume: (v: number) => void
  seek: (ratio: number) => void
} | null = null

export function getPlayerControls() { return _controls }

// ---- Track ID counter to ignore stale play() promises ----
let loadCounter = 0

/**
 * Core audio playback hook.
 * Single source of truth for all audio operations.
 */
export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Create audio element + wire events (once)
  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'auto'
    audioRef.current = audio

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
        audio.play().catch(() => {})
      } else {
        // Defer to avoid re-entrance
        setTimeout(() => _controls?.playNext(), 0)
      }
    }

    const onError = () => {
      usePlayerStore.getState().setIsPlaying(false)
      const err = audio.error
      if (err) console.error('[audio] error code', err.code, err.message)
    }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('error', onError)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('error', onError)
      audio.pause()
      audio.src = ''
      audioRef.current = null
      audioConnected = false
    }
  }, [])

  // Ensure Web Audio API connected (for spectrum)
  const ensureConnected = useCallback(() => {
    const audio = audioRef.current
    if (!audio || audioConnected) return
    try {
      connectAudioElement(audio)
      audioConnected = true
      if (audioContext?.state === 'suspended') audioContext.resume()
    } catch {}
  }, [])

  // ---- The ONE function that loads a track and plays it ----
  const loadAndPlay = useCallback((track: Track, shouldPlay: boolean) => {
    const audio = audioRef.current
    if (!audio) return

    loadCounter++
    const myLoad = loadCounter

    // Stop any current playback immediately
    audio.pause()

    // Load new source
    audio.src = `local://${encodeURIComponent(track.filePath)}`
    audio.load()

    if (!shouldPlay) {
      usePlayerStore.getState().setIsPlaying(false)
      return
    }

    ensureConnected()
    usePlayerStore.getState().setIsPlaying(true)

    // Wait for enough data, then play — but only if this is still the latest load
    const onCanPlay = () => {
      audio.removeEventListener('canplay', onCanPlay)
      if (myLoad !== loadCounter) return // stale — a newer load superseded us
      audio.play().catch((e) => {
        if (myLoad === loadCounter) {
          console.warn('[audio] play() failed:', e.message)
          usePlayerStore.getState().setIsPlaying(false)
        }
      })
    }

    // If audio is already ready, play immediately
    if (audio.readyState >= 3) {
      audio.play().catch((e) => {
        if (myLoad === loadCounter) {
          console.warn('[audio] play() failed:', e.message)
          usePlayerStore.getState().setIsPlaying(false)
        }
      })
    } else {
      audio.addEventListener('canplay', onCanPlay)
      // Safety timeout — remove listener if it never fires
      setTimeout(() => audio.removeEventListener('canplay', onCanPlay), 10000)
    }
  }, [ensureConnected])

  // ---- Public API ----

  const playTrack = useCallback((track: Track, queue?: Track[]) => {
    if (queue) {
      const idx = queue.findIndex(t => t.id === track.id)
      usePlayerStore.getState().setQueue(queue, idx >= 0 ? idx : 0)
    } else {
      usePlayerStore.getState().setCurrentTrack(track)
    }
    loadAndPlay(track, true)
  }, [loadAndPlay])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    const { currentTrack, isPlaying } = usePlayerStore.getState()
    if (!currentTrack) return

    if (isPlaying) {
      audio.pause()
      usePlayerStore.getState().setIsPlaying(false)
    } else {
      ensureConnected()
      if (audio.readyState >= 2) {
        // Already loaded — just resume
        if (audioContext?.state === 'suspended') audioContext.resume()
        audio.play().then(() => {
          usePlayerStore.getState().setIsPlaying(true)
        }).catch(e => {
          console.warn('[audio] resume failed:', e.message)
        })
      } else {
        // Need to reload
        loadAndPlay(currentTrack, true)
      }
    }
  }, [ensureConnected, loadAndPlay])

  const seek = useCallback((ratio: number) => {
    const audio = audioRef.current
    if (!audio || !audio.duration || !isFinite(audio.duration)) return
    audio.currentTime = ratio * audio.duration
    usePlayerStore.getState().setCurrentTime(audio.currentTime)
    usePlayerStore.getState().setProgress(ratio)
  }, [])

  const setVolume = useCallback((vol: number) => {
    const v = Math.max(0, Math.min(1, vol))
    usePlayerStore.getState().setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
  }, [])

  // Sync volume from store
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = usePlayerStore.getState().volume
    const unsub = usePlayerStore.subscribe(s => {
      if (audioRef.current) audioRef.current.volume = s.volume
    })
    return unsub
  }, [])

  const playNext = useCallback(() => {
    usePlayerStore.getState().playNext()
    // read the new currentTrack after store update
    requestAnimationFrame(() => {
      const { currentTrack } = usePlayerStore.getState()
      if (currentTrack) loadAndPlay(currentTrack, true)
    })
  }, [loadAndPlay])

  const playPrev = useCallback(() => {
    const audio = audioRef.current
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    usePlayerStore.getState().playPrev()
    requestAnimationFrame(() => {
      const { currentTrack } = usePlayerStore.getState()
      if (currentTrack) loadAndPlay(currentTrack, true)
    })
  }, [loadAndPlay])

  // Register global controls
  useEffect(() => {
    _controls = { togglePlay, playNext, playPrev, setVolume, seek }
    return () => { _controls = null }
  }, [togglePlay, playNext, playPrev, setVolume, seek])

  return { playTrack, togglePlay, seek, setVolume, playNext, playPrev, audioRef }
}
