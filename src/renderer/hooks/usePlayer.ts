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

// ---- Load counter to ignore stale play() promises ----
let loadId = 0

// ---- Seeking guard: when true, timeupdate events are ignored ----
let _isSeeking = false
let _seekTimeout: ReturnType<typeof setTimeout> | null = null

export function setSeeking(v: boolean) {
  _isSeeking = v
  if (v) {
    // Safety: auto-clear after 2s in case mouseup is missed
    if (_seekTimeout) clearTimeout(_seekTimeout)
    _seekTimeout = setTimeout(() => { _isSeeking = false }, 2000)
  } else {
    if (_seekTimeout) clearTimeout(_seekTimeout)
  }
}

// ---- The ONE function that loads and optionally plays ----
function loadAndPlay(track: Track, shouldPlay: boolean) {
  const myLoad = ++loadId

  audio.pause()
  audio.src = `local://${encodeURIComponent(track.filePath)}`
  audio.load()

  usePlayerStore.getState().setCurrentTrack(track)

  if (!shouldPlay) {
    usePlayerStore.getState().setIsPlaying(false)
    return
  }

  usePlayerStore.getState().setIsPlaying(true)
  ensureWebAudio()
  if (audioContext?.state === 'suspended') audioContext.resume()

  const tryPlay = () => {
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
    tryPlay()
  } else {
    const onCanPlay = () => { audio.removeEventListener('canplay', onCanPlay); tryPlay() }
    audio.addEventListener('canplay', onCanPlay)
    setTimeout(() => audio.removeEventListener('canplay', onCanPlay), 10000)
  }
}

// ---- Wire up audio events ONCE ----
audio.addEventListener('timeupdate', () => {
  if (_isSeeking) return // Don't update while user is dragging
  if (audio.duration && isFinite(audio.duration)) {
    usePlayerStore.getState().setCurrentTime(audio.currentTime)
    usePlayerStore.getState().setProgress(audio.currentTime / audio.duration)
  }
})

audio.addEventListener('loadedmetadata', () => {
  usePlayerStore.getState().setDuration(audio.duration || 0)
})

audio.addEventListener('ended', () => {
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
// Hook — thin wrapper
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
      if (audio.readyState >= 2 && audio.src) {
        audio.play().then(() => usePlayerStore.getState().setIsPlaying(true))
          .catch(e => console.warn('[audio] resume failed:', e.message))
      } else {
        loadAndPlay(currentTrack, true)
      }
    }
  }, [])

  const seek = useCallback((ratio: number) => {
    if (!audio.duration || !isFinite(audio.duration)) return
    const newTime = ratio * audio.duration
    audio.currentTime = newTime
    // Update store immediately so UI reflects the seek
    usePlayerStore.getState().setCurrentTime(newTime)
    usePlayerStore.getState().setProgress(ratio)
    // Brief guard so timeupdate doesn't overwrite with stale value
    _isSeeking = true
    setTimeout(() => { _isSeeking = false }, 200)
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
