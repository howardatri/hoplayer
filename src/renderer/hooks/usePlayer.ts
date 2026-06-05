import { useEffect, useCallback } from 'react'
import usePlayerStore from '@/store/playerStore'
import type { Track } from '@shared/index'

// =============================================
// Module-level SINGLETON Audio element
// =============================================
const audio = new Audio()
audio.preload = 'auto'

// ---- Web Audio API for spectrum visualization ----
let audioContext: AudioContext | null = null
let analyserNode: AnalyserNode | null = null
let sourceNode: MediaElementAudioSourceNode | null = null
let webAudioReady = false

function ensureWebAudio() {
  if (webAudioReady) return
  try {
    audioContext = new AudioContext()
    analyserNode = audioContext.createAnalyser()
    analyserNode.fftSize = 256
    analyserNode.smoothingTimeConstant = 0.8
    analyserNode.connect(audioContext.destination)
    sourceNode = audioContext.createMediaElementSource(audio)
    sourceNode.connect(analyserNode)
    webAudioReady = true
  } catch (e) {
    console.warn('[webAudio] setup failed:', e)
  }
}

export function getAnalyserNode(): AnalyserNode | null { return analyserNode }
export function getAudioContext(): AudioContext | null { return audioContext }

// ---- Load counter to ignore stale operations ----
let loadId = 0

// ---- Seeking guard ----
let _isSeeking = false
export function setSeeking(v: boolean) { _isSeeking = v }

// Cache data URLs to avoid re-reading files from disk
const urlCache = new Map<string, string>()

// ---- Load and play a track ----
async function loadAndPlay(track: Track, shouldPlay: boolean) {
  const myLoad = ++loadId

  audio.pause()
  usePlayerStore.getState().setCurrentTrack(track)

  if (!shouldPlay) {
    usePlayerStore.getState().setIsPlaying(false)
    return
  }

  usePlayerStore.getState().setIsPlaying(true)
  ensureWebAudio()
  if (audioContext?.state === 'suspended') audioContext.resume()

  // Get data URL (cached or read from disk)
  let dataUrl = urlCache.get(track.filePath)
  if (!dataUrl) {
    const result = await window.electronAPI.readFileAsUrl(track.filePath)
    if (!result) {
      console.error('[loadAndPlay] Failed to read file:', track.filePath)
      usePlayerStore.getState().setIsPlaying(false)
      return
    }
    dataUrl = result
    urlCache.set(track.filePath, dataUrl)
  }

  if (myLoad !== loadId) return // superseded

  audio.src = dataUrl
  audio.load()

  const onCanPlay = () => {
    audio.removeEventListener('canplay', onCanPlay)
    if (myLoad !== loadId) return
    audio.play().then(() => {
      if (myLoad === loadId) usePlayerStore.getState().setIsPlaying(true)
    }).catch(e => {
      if (myLoad === loadId) {
        console.warn('[audio] play failed:', e.message)
        usePlayerStore.getState().setIsPlaying(false)
      }
    })
  }

  if (audio.readyState >= 3) {
    onCanPlay()
  } else {
    audio.addEventListener('canplay', onCanPlay)
    setTimeout(() => audio.removeEventListener('canplay', onCanPlay), 15000)
  }
}

// ---- Wire up audio events ONCE ----
audio.addEventListener('timeupdate', () => {
  if (_isSeeking) return
  if (audio.duration && isFinite(audio.duration)) {
    usePlayerStore.getState().setCurrentTime(audio.currentTime)
    usePlayerStore.getState().setProgress(audio.currentTime / audio.duration)
  }
})

audio.addEventListener('loadedmetadata', () => {
  usePlayerStore.getState().setDuration(audio.duration || 0)
})

audio.addEventListener('seeked', () => {
  if (audio.duration && isFinite(audio.duration)) {
    usePlayerStore.getState().setCurrentTime(audio.currentTime)
    usePlayerStore.getState().setProgress(audio.currentTime / audio.duration)
  }
  _isSeeking = false
})

audio.addEventListener('ended', () => {
  if (_isSeeking) return
  const { repeatMode } = usePlayerStore.getState()
  if (repeatMode === 'one') {
    audio.currentTime = 0
    audio.play().catch(() => {})
  } else {
    doPlayNext()
  }
})

audio.addEventListener('error', () => {
  usePlayerStore.getState().setIsPlaying(false)
  const err = audio.error
  if (err) console.error('[audio] error:', err.code, err.message)
})

// ---- Internal next/prev ----
function doPlayNext() {
  usePlayerStore.getState().playNext()
  const { currentTrack } = usePlayerStore.getState()
  if (currentTrack) loadAndPlay(currentTrack, true)
}

function doPlayPrev() {
  if (audio.currentTime > 3) {
    audio.currentTime = 0
    return
  }
  usePlayerStore.getState().playPrev()
  const { currentTrack } = usePlayerStore.getState()
  if (currentTrack) loadAndPlay(currentTrack, true)
}

// ---- Global controls ----
let _controls: {
  togglePlay: () => void
  playNext: () => void
  playPrev: () => void
  setVolume: (v: number) => void
  seek: (ratio: number) => void
} | null = null

export function getPlayerControls() { return _controls }

// =============================================
// Hook
// =============================================
export function usePlayer() {
  useEffect(() => {
    audio.volume = usePlayerStore.getState().volume
    const unsub = usePlayerStore.subscribe(s => { audio.volume = s.volume })
    return unsub
  }, [])

  const playTrack = useCallback((track: Track, queue?: Track[]) => {
    if (queue) {
      const idx = queue.findIndex(t => t.id === track.id)
      usePlayerStore.getState().setQueue(queue, idx >= 0 ? idx : 0)
    }
    loadAndPlay(track, true)
  }, [])

  const togglePlay = useCallback(() => {
    const { currentTrack, isPlaying } = usePlayerStore.getState()
    if (!currentTrack) return

    if (isPlaying) {
      audio.pause()
      usePlayerStore.getState().setIsPlaying(false)
    } else {
      ensureWebAudio()
      if (audioContext?.state === 'suspended') audioContext.resume()
      // If audio has a source loaded, just resume
      if (audio.src && audio.readyState >= 2) {
        audio.play().then(() => usePlayerStore.getState().setIsPlaying(true))
          .catch(e => console.warn('[audio] resume failed:', e.message))
      } else {
        // Need to reload
        loadAndPlay(currentTrack, true)
      }
    }
  }, [])

  const seek = useCallback((ratio: number) => {
    const dur = audio.duration
    if (!dur || !isFinite(dur)) return

    _isSeeking = true
    const newTime = ratio * dur

    // Set currentTime — works because audio is loaded via data URL (fully in memory)
    audio.currentTime = newTime

    // Update store for instant UI feedback
    usePlayerStore.getState().setCurrentTime(newTime)
    usePlayerStore.getState().setProgress(ratio)

    // seeked event will clear _isSeeking
    // Safety timeout
    setTimeout(() => { _isSeeking = false }, 5000)
  }, [])

  const setVolume = useCallback((vol: number) => {
    const v = Math.max(0, Math.min(1, vol))
    usePlayerStore.getState().setVolume(v)
    audio.volume = v
  }, [])

  const playNext = useCallback(() => doPlayNext(), [])
  const playPrev = useCallback(() => doPlayPrev(), [])

  useEffect(() => {
    _controls = { togglePlay, playNext, playPrev, setVolume, seek }
    return () => { _controls = null }
  }, [togglePlay, playNext, playPrev, setVolume, seek])

  return { playTrack, togglePlay, seek, setVolume, playNext, playPrev }
}
