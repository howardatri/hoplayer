import { useRef, useEffect, useCallback } from 'react'
import usePlayerStore from '@/store/playerStore'
import type { Track } from '@shared/index'

// Singleton AudioContext and AnalyserNode for spectrum visualization
let audioContext: AudioContext | null = null
let analyserNode: AnalyserNode | null = null
let sourceNode: MediaElementAudioSourceNode | null = null

function getOrCreateAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
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
    if (sourceNode) {
      sourceNode.disconnect()
    }
    sourceNode = ctx.createMediaElementSource(audio)
    sourceNode.connect(analyserNode)
  }
  return analyserNode
}

/**
 * Get the AnalyserNode for spectrum visualization.
 * Returns null if AudioContext hasn't been initialized yet.
 */
export function getAnalyserNode(): AnalyserNode | null {
  return analyserNode
}

/**
 * Get the AudioContext (for resuming after user gesture).
 */
export function getAudioContext(): AudioContext | null {
  return audioContext
}

/**
 * Core audio playback hook.
 * Manages the HTMLAudioElement and syncs state with the player store.
 * Also sets up Web Audio API for spectrum visualization.
 */
export function usePlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioConnectedRef = useRef(false)
  const {
    currentTrack,
    isPlaying,
    volume,
    progress,
    repeatMode,
    setIsPlaying,
    setVolume,
    setProgress,
    setCurrentTime,
    setDuration,
    playNext,
    playPrev,
    setQueue
  } = usePlayerStore()

  // Create audio element on mount
  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audio.crossOrigin = 'anonymous'
    audioRef.current = audio

    return () => {
      audio.pause()
      audio.src = ''
      audioRef.current = null
      audioConnectedRef.current = false
    }
  }, [])

  // Connect to Web Audio API on first user interaction (play)
  const ensureAudioConnected = useCallback(() => {
    const audio = audioRef.current
    if (!audio || audioConnectedRef.current) return
    try {
      connectAudioElement(audio)
      audioConnectedRef.current = true
    } catch (e) {
      // May fail if already connected or context is suspended
      console.warn('Web Audio connection failed:', e)
    }
  }, [])

  // Load track when currentTrack changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    // Use local:// protocol for serving local files
    audio.src = `local://${encodeURIComponent(currentTrack.filePath)}`
    audio.load()

    if (isPlaying) {
      ensureAudioConnected()
      // Resume AudioContext if suspended (browser autoplay policy)
      if (audioContext?.state === 'suspended') {
        audioContext.resume()
      }
      audio.play().catch(() => setIsPlaying(false))
    }
  }, [currentTrack?.filePath])

  // Sync play/pause
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return

    if (isPlaying) {
      ensureAudioConnected()
      if (audioContext?.state === 'suspended') {
        audioContext.resume()
      }
      audio.play().catch(() => setIsPlaying(false))
    } else {
      audio.pause()
    }
  }, [isPlaying])

  // Sync volume
  useEffect(() => {
    const audio = audioRef.current
    if (audio) {
      audio.volume = volume
    }
  }, [volume])

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setCurrentTime(audio.currentTime)
        setProgress(audio.currentTime / audio.duration)
      }
    }

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0)
    }

    const onEnded = () => {
      if (repeatMode === 'one') {
        audio.currentTime = 0
        audio.play()
      } else {
        playNext()
      }
    }

    const onError = () => {
      setIsPlaying(false)
      console.error('Audio playback error:', audio.error)
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
    }
  }, [repeatMode, playNext])

  // Seek
  const seek = useCallback(
    (ratio: number) => {
      const audio = audioRef.current
      if (audio && audio.duration && isFinite(audio.duration)) {
        audio.currentTime = ratio * audio.duration
        setProgress(ratio)
      }
    },
    [setProgress]
  )

  // Play a specific track (optionally with queue)
  const playTrack = useCallback(
    (track: Track, queue?: Track[]) => {
      if (queue) {
        const index = queue.findIndex((t) => t.id === track.id)
        setQueue(queue, index >= 0 ? index : 0)
      } else {
        usePlayerStore.getState().setCurrentTrack(track)
      }
      setIsPlaying(true)
    },
    [setQueue, setIsPlaying]
  )

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (!currentTrack) return
    setIsPlaying(!isPlaying)
  }, [currentTrack, isPlaying, setIsPlaying])

  return {
    currentTrack,
    isPlaying,
    volume,
    progress,
    currentTime: usePlayerStore((s) => s.currentTime),
    duration: usePlayerStore((s) => s.duration),
    repeatMode: usePlayerStore((s) => s.repeatMode),
    isShuffle: usePlayerStore((s) => s.isShuffle),
    queue: usePlayerStore((s) => s.queue),

    togglePlay,
    playTrack,
    playNext,
    playPrev,
    seek,
    setVolume,
    toggleRepeat: usePlayerStore((s) => s.toggleRepeat),
    toggleShuffle: usePlayerStore((s) => s.toggleShuffle),
    /** Expose audio element ref for external use (e.g. lyrics sync) */
    audioRef
  }
}
