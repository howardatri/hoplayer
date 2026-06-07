import { useEffect, useCallback } from 'react'
import usePlayerStore from '@/store/playerStore'
import useSettingsStore from '@/store/settingsStore'
import type { Track } from '@shared/index'

// =============================================
// Dual Audio elements for crossfade support
// =============================================
const audio: [HTMLAudioElement, HTMLAudioElement] = [new Audio(), new Audio()]
audio[0].preload = 'auto'
audio[1].preload = 'auto'
let activeIdx = 0 // which audio element is "current"

// ---- Web Audio API: EQ + crossfade gain + spectrum ----
let audioContext: AudioContext | null = null
let analyserNode: AnalyserNode | null = null
let eqFilters: BiquadFilterNode[][] = [[], []] // per-audio-element EQ chains
let gainNodes: [GainNode, GainNode] | null = null
let webAudioReady = false

const EQ_FREQUENCIES = [60, 230, 910, 3600, 14000]

// Track whether EQ is bypassed (all bands at 0)
let eqBypassed = true
// Store source nodes so we can reconnect when toggling bypass
let sourceNodes: [MediaElementAudioSourceNode, MediaElementAudioSourceNode] | null = null

function ensureWebAudio() {
  if (webAudioReady) {
    // Even if already set up, resume if suspended (browser autoplay policy)
    if (audioContext?.state === 'suspended') audioContext.resume()
    return
  }
  try {
    audioContext = new AudioContext()
    analyserNode = audioContext.createAnalyser()
    analyserNode.fftSize = 256
    analyserNode.smoothingTimeConstant = 0.8
    analyserNode.connect(audioContext.destination)

    gainNodes = [audioContext.createGain(), audioContext.createGain()]
    gainNodes[0].gain.value = 1
    gainNodes[1].gain.value = 0

    // Build separate EQ chains for each audio element
    // audio[0] -> source[0] -> eq[0] -> gain[0] --\
    //                                                analyser -> destination
    // audio[1] -> source[1] -> eq[1] -> gain[1] --/
    const sources: MediaElementAudioSourceNode[] = []
    for (let i = 0; i < 2; i++) {
      const sourceNode = audioContext.createMediaElementSource(audio[i])
      sources.push(sourceNode)
      const filters = EQ_FREQUENCIES.map((freq) => {
        const filter = audioContext!.createBiquadFilter()
        filter.type = 'peaking'
        filter.frequency.value = freq
        filter.Q.value = 1.4
        filter.gain.value = 0
        return filter
      })
      eqFilters[i] = filters

      // Default: bypass EQ (source -> gain directly)
      sourceNode.connect(gainNodes[i])
      gainNodes[i].connect(analyserNode)
    }
    sourceNodes = sources as [MediaElementAudioSourceNode, MediaElementAudioSourceNode]

    // Apply current store EQ bands — if any non-zero, enable EQ chain
    const bands = usePlayerStore.getState().eqBands
    eqFilters.forEach(chain => chain.forEach((f, i) => { f.gain.value = bands[i] ?? 0 }))
    if (bands.some(g => g !== 0)) {
      enableEqChain()
    }

    // Resume context if suspended (autoplay policy)
    if (audioContext.state === 'suspended') audioContext.resume()

    webAudioReady = true
  } catch (e) {
    console.warn('[webAudio] setup failed:', e)
  }
}

/** Route audio through the EQ filter chain (when any band is non-zero) */
function enableEqChain() {
  if (!audioContext || !sourceNodes || !gainNodes || !eqBypassed) return
  for (let i = 0; i < 2; i++) {
    sourceNodes[i].disconnect()
    let current: AudioNode = sourceNodes[i]
    for (const f of eqFilters[i]) {
      current.connect(f)
      current = f
    }
    current.connect(gainNodes[i])
  }
  eqBypassed = false
}

/** Bypass EQ filter chain (when all bands are 0) — saves CPU */
function disableEqChain() {
  if (!audioContext || !sourceNodes || !gainNodes || eqBypassed) return
  for (let i = 0; i < 2; i++) {
    // Disconnect the EQ chain
    sourceNodes[i].disconnect()
    for (const f of eqFilters[i]) f.disconnect()
    // Reconnect source -> gain directly
    sourceNodes[i].connect(gainNodes[i])
  }
  eqBypassed = true
}

// Resume AudioContext when window becomes visible again (e.g. restored from minimize)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && audioContext?.state === 'suspended') {
      audioContext.resume()
    }
  })
}

export function getAnalyserNode(): AnalyserNode | null { return analyserNode }
export function getAudioContext(): AudioContext | null { return audioContext }
export function getAudioElement(): HTMLAudioElement { return audio[activeIdx] }

export function setEqBand(index: number, gain: number) {
  ensureWebAudio() // ensure pipeline exists before touching filters
  const clamped = Math.max(-12, Math.min(12, gain))
  eqFilters.forEach(chain => { if (chain[index]) chain[index].gain.value = clamped })
  // Toggle EQ chain based on whether any band is non-zero
  const allZero = eqFilters[0].every(f => f.gain.value === 0)
  if (allZero) disableEqChain(); else enableEqChain()
}

export function setEqBands(gains: number[]) {
  ensureWebAudio() // ensure pipeline exists before touching filters
  gains.forEach((g, i) => {
    const clamped = Math.max(-12, Math.min(12, g))
    eqFilters.forEach(chain => { if (chain[i]) chain[i].gain.value = clamped })
  })
  // Toggle EQ chain based on whether any band is non-zero
  const allZero = eqFilters[0].every(f => f.gain.value === 0)
  if (allZero) disableEqChain(); else enableEqChain()
}

// ---- Load counter to ignore stale operations ----
let loadId = 0

// ---- Seeking guard ----
let _isSeeking = false
let _seekTimeout: ReturnType<typeof setTimeout> | null = null
export function setSeeking(v: boolean) { _isSeeking = v }

// Preloaded next track for crossfade
const preloadCache = new Map<string, { idx: number; loadId: number }>()

function clearInactiveAudio() {
  const inactiveIdx = 1 - activeIdx
  if (audio[inactiveIdx].src) {
    audio[inactiveIdx].pause()
    audio[inactiveIdx].removeAttribute('src')
    audio[inactiveIdx].load()
  }
  preloadCache.clear()
}

function getLocalUrl(filePath: string): string {
  return `local://${encodeURIComponent(filePath)}`
}

// ---- Crossfade state ----
let _crossfadeTimer: ReturnType<typeof setTimeout> | null = null
let _crossfadeGainTimer: ReturnType<typeof requestAnimationFrame> | null = null

function cancelCrossfade() {
  if (_crossfadeTimer) { clearTimeout(_crossfadeTimer); _crossfadeTimer = null }
  if (_crossfadeGainTimer) { cancelAnimationFrame(_crossfadeGainTimer); _crossfadeGainTimer = null }
}

function scheduleCrossfade() {
  cancelCrossfade()
  if (!gainNodes) return

  const { crossfadeDuration, repeatMode, isShuffle } = usePlayerStore.getState()
  if (crossfadeDuration <= 0) return
  if (repeatMode === 'one') return // no crossfade for repeat-one

  const currentAudio = audio[activeIdx]
  const dur = currentAudio.duration
  if (!dur || !isFinite(dur)) return

  const fadeStart = Math.max(0, dur - crossfadeDuration)
  const timeUntilFade = (fadeStart - currentAudio.currentTime) * 1000 / Math.abs(currentAudio.playbackRate || 1)

  if (timeUntilFade <= 0) {
    startCrossfade()
    return
  }

  _crossfadeTimer = setTimeout(() => {
    // Re-check we're still playing the same thing and near the end
    const a = audio[activeIdx]
    if (a.duration && a.currentTime < a.duration - crossfadeDuration - 2) return
    startCrossfade()
  }, timeUntilFade)
}

function startCrossfade() {
  if (!gainNodes) return
  cancelCrossfade()

  const store = usePlayerStore.getState()
  const nextTrack = store.peekNext()
  if (!nextTrack || nextTrack.format === 'video') return

  const fadeDuration = store.crossfadeDuration
  const nextIdx = 1 - activeIdx
  const currentAudio = audio[activeIdx]
  const nextAudio = audio[nextIdx]
  const currentGain = gainNodes[activeIdx]
  const nextGain = gainNodes[nextIdx]

  // Advance the queue (this updates currentTrack in store)
  store.playNext()

  // Load next track
  nextAudio.src = getLocalUrl(nextTrack.filePath)
  nextAudio.volume = store.volume
  nextAudio.playbackRate = store.playbackSpeed
  nextAudio.load()

  const onCanPlay = () => {
    nextAudio.removeEventListener('canplay', onCanPlay)
    nextAudio.currentTime = 0
    nextAudio.play().catch(() => {})

    // Animate gain crossfade using rAF
    const startTime = performance.now()
    const fadeMs = fadeDuration * 1000

    const animate = () => {
      const elapsed = performance.now() - startTime
      const t = Math.min(1, elapsed / fadeMs)

      // Ease in-out for smooth crossfade
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

      currentGain.gain.setValueAtTime(1 - eased, audioContext!.currentTime)
      nextGain.gain.setValueAtTime(eased, audioContext!.currentTime)

      if (t < 1) {
        _crossfadeGainTimer = requestAnimationFrame(animate)
      } else {
        // Crossfade complete — stop old audio and release its buffer
        currentAudio.pause()
        currentAudio.removeAttribute('src')
        currentAudio.load()
        currentGain.gain.setValueAtTime(0, audioContext!.currentTime)
        nextGain.gain.setValueAtTime(1, audioContext!.currentTime)

        // Swap active index
        activeIdx = nextIdx
        preloadCache.clear()
        scheduleCrossfade()
        schedulePreload()
      }
    }

    _crossfadeGainTimer = requestAnimationFrame(animate)
  }

  if (nextAudio.readyState >= 3) {
    onCanPlay()
  } else {
    nextAudio.addEventListener('canplay', onCanPlay)
    setTimeout(() => nextAudio.removeEventListener('canplay', onCanPlay), 10000)
  }
}

// ---- Preload next track for faster crossfade/transition ----
function schedulePreload() {
  const { crossfadeDuration } = usePlayerStore.getState()
  if (crossfadeDuration <= 0) return

  const store = usePlayerStore.getState()
  const nextTrack = store.peekNext()
  if (!nextTrack || nextTrack.format === 'video') return

  const cacheKey = nextTrack.filePath
  const nextIdx = 1 - activeIdx

  // Already preloaded?
  const cached = preloadCache.get(cacheKey)
  if (cached && cached.idx === nextIdx && cached.loadId === loadId) return

  const nextAudio = audio[nextIdx]
  nextAudio.src = getLocalUrl(nextTrack.filePath)
  nextAudio.volume = store.volume
  nextAudio.playbackRate = store.playbackSpeed
  nextAudio.load()
  preloadCache.set(cacheKey, { idx: nextIdx, loadId })
}

// ---- Load and play a track ----
async function loadAndPlay(track: Track, shouldPlay: boolean) {
  const myLoad = ++loadId
  cancelCrossfade()
  preloadCache.clear()

  const idx = activeIdx
  audio[idx].pause()
  // Reset gain nodes
  if (gainNodes) {
    gainNodes[0].gain.setValueAtTime(0, audioContext?.currentTime || 0)
    gainNodes[1].gain.setValueAtTime(0, audioContext?.currentTime || 0)
    gainNodes[idx].gain.setValueAtTime(1, audioContext?.currentTime || 0)
  }

  usePlayerStore.getState().setCurrentTrack(track)

  // Show system notification (only when window not focused)
  if (shouldPlay) showTrackNotification(track)

  if (!shouldPlay) {
    usePlayerStore.getState().setIsPlaying(false)
    return
  }

  // Video tracks are handled by VideoPlayer component — don't play through the audio element
  if (track.format === 'video') {
    usePlayerStore.getState().setIsPlaying(true)
    return
  }

  usePlayerStore.getState().setIsPlaying(true)
  ensureWebAudio()
  if (audioContext?.state === 'suspended') audioContext.resume()

  // Track play count
  window.electronAPI.dbIncrementPlayCount(track.id).catch(() => {})

  if (myLoad !== loadId) return // superseded

  // Stream via local:// protocol (supports range requests for instant seeking)
  audio[idx].src = getLocalUrl(track.filePath)
  audio[idx].playbackRate = usePlayerStore.getState().playbackSpeed
  audio[idx].volume = usePlayerStore.getState().volume
  audio[idx].load()

  // Apply output device if user selected a non-default one
  const deviceId = useSettingsStore.getState().audioOutputDeviceId
  if (deviceId) {
    (audio[idx] as any).setSinkId(deviceId).catch(() => {})
  }

  const onCanPlay = () => {
    audio[idx].removeEventListener('canplay', onCanPlay)
    if (myLoad !== loadId) return
    audio[idx].play().then(() => {
      if (myLoad === loadId) usePlayerStore.getState().setIsPlaying(true)
      // Schedule crossfade if enabled
      scheduleCrossfade()
      schedulePreload()
    }).catch(e => {
      if (myLoad === loadId) {
        console.warn('[audio] play failed:', e.message)
        usePlayerStore.getState().setIsPlaying(false)
      }
    })
  }

  if (audio[idx].readyState >= 3) {
    onCanPlay()
  } else {
    audio[idx].addEventListener('canplay', onCanPlay)
    setTimeout(() => audio[idx].removeEventListener('canplay', onCanPlay), 15000)
  }
}

// ---- Throttled timeupdate to reduce re-render frequency ----
let _lastTimeUpdate = 0
const TIME_UPDATE_INTERVAL = 500 // 2x per second instead of 4x

// ---- Wire up audio events for BOTH elements ----
for (let i = 0; i < 2; i++) {
  audio[i].addEventListener('timeupdate', () => {
    if (i !== activeIdx) return
    if (_isSeeking) return
    // Throttle store updates to reduce re-renders
    const now = performance.now()
    if (now - _lastTimeUpdate < TIME_UPDATE_INTERVAL) return
    _lastTimeUpdate = now
    if (audio[i].duration && isFinite(audio[i].duration)) {
      usePlayerStore.getState().setCurrentTime(audio[i].currentTime)
      usePlayerStore.getState().setProgress(audio[i].currentTime / audio[i].duration)
    }
  })

  audio[i].addEventListener('loadedmetadata', () => {
    if (i !== activeIdx) return
    usePlayerStore.getState().setDuration(audio[i].duration || 0)
  })

  audio[i].addEventListener('seeked', () => {
    if (i !== activeIdx) return
    if (audio[i].duration && isFinite(audio[i].duration)) {
      usePlayerStore.getState().setCurrentTime(audio[i].currentTime)
      usePlayerStore.getState().setProgress(audio[i].currentTime / audio[i].duration)
    }
    _isSeeking = false
  })

  audio[i].addEventListener('ended', () => {
    if (i !== activeIdx) return
    if (_isSeeking) return
    // If crossfade is active, the other element is already playing
    if (_crossfadeGainTimer) return

    const { repeatMode } = usePlayerStore.getState()
    if (repeatMode === 'one') {
      audio[i].currentTime = 0
      audio[i].play().catch(() => {})
    } else {
      doPlayNext()
    }
  })

  audio[i].addEventListener('error', () => {
    if (i !== activeIdx) return
    usePlayerStore.getState().setIsPlaying(false)
    const err = audio[i].error
    if (err) console.error('[audio] error:', err.code, err.message)
  })
}

// ---- Internal next/prev ----
export function doPlayNext() {
  cancelCrossfade()
  clearInactiveAudio() // release preloaded media buffer
  const prevIndex = usePlayerStore.getState().currentIndex
  usePlayerStore.getState().playNext()
  const { currentTrack, currentIndex } = usePlayerStore.getState()
  // If playNext didn't advance (repeat off, at end of queue), stop playback
  if (currentIndex === prevIndex && usePlayerStore.getState().repeatMode !== 'one') {
    audio[activeIdx].pause()
    usePlayerStore.getState().setIsPlaying(false)
    return
  }
  if (currentTrack) loadAndPlay(currentTrack, true)
}

export function doPlayPrev() {
  if (audio[activeIdx].currentTime > 3) {
    audio[activeIdx].currentTime = 0
    return
  }
  cancelCrossfade()
  clearInactiveAudio() // release preloaded media buffer
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
  playTrack: (track: Track, queue?: Track[]) => void
} | null = null

export function getPlayerControls() { return _controls }

// ---- Output device selection (setSinkId) ----
export async function getAudioOutputDevices(): Promise<MediaDeviceInfo[]> {
  // Request permission first (needed to get device labels)
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop()))
  } catch { /* permission denied or not available — still return devices without labels */ }
  const devices = await navigator.mediaDevices.enumerateDevices()
  return devices.filter(d => d.kind === 'audiooutput')
}

export async function setAudioOutputDevice(deviceId: string): Promise<boolean> {
  try {
    // setSinkId works on HTMLAudioElement in Chromium
    await (audio[activeIdx] as any).setSinkId(deviceId)
    // Also set on the inactive element for crossfade
    await (audio[1 - activeIdx] as any).setSinkId(deviceId)
    return true
  } catch (e) {
    console.warn('[audio] setSinkId failed:', e)
    return false
  }
}

// ---- System notification on track change ----
let _lastNotifiedPath = ''
function showTrackNotification(track: Track) {
  if (!useSettingsStore.getState().enableNotifications) return
  if (track.filePath === _lastNotifiedPath) return // same track, skip
  _lastNotifiedPath = track.filePath

  // Only notify when window is not focused
  if (typeof document !== 'undefined' && document.hasFocus()) return

  try {
    new Notification(track.title, {
      body: track.artist + (track.album !== 'Unknown Album' ? ` · ${track.album}` : ''),
      silent: true
    })
  } catch { /* Notification API not available */ }
}

// =============================================
// Hook
// =============================================
export function usePlayer() {
  useEffect(() => {
    // Sync volume (master volume via gain nodes are at 1, audio element volume handles user volume)
    const unsub1 = usePlayerStore.subscribe((s, prev) => {
      if (s.volume !== prev.volume) {
        audio[activeIdx].volume = s.volume
      }
    })
    const unsub2 = usePlayerStore.subscribe((s, prev) => {
      if (s.playbackSpeed !== prev.playbackSpeed) {
        audio[activeIdx].playbackRate = s.playbackSpeed
      }
    })
    const unsub3 = usePlayerStore.subscribe((s, prev) => {
      if (s.eqBands !== prev.eqBands) setEqBands(s.eqBands)
    })
    // Re-schedule crossfade when settings change
    const unsub4 = usePlayerStore.subscribe((s, prev) => {
      if (s.crossfadeDuration !== prev.crossfadeDuration || s.repeatMode !== prev.repeatMode) {
        if (s.isPlaying) {
          scheduleCrossfade()
          schedulePreload()
        }
      }
    })
    return () => { unsub1(); unsub2(); unsub3(); unsub4() }
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
      audio[activeIdx].pause()
      cancelCrossfade()
      usePlayerStore.getState().setIsPlaying(false)
    } else {
      ensureWebAudio()
      if (audioContext?.state === 'suspended') audioContext.resume()
      // If audio has a source loaded, just resume
      if (audio[activeIdx].src && audio[activeIdx].readyState >= 2) {
        audio[activeIdx].play().then(() => {
          usePlayerStore.getState().setIsPlaying(true)
          scheduleCrossfade()
        }).catch(e => console.warn('[audio] resume failed:', e.message))
      } else {
        // Need to reload
        loadAndPlay(currentTrack, true)
      }
    }
  }, [])

  const seek = useCallback((ratio: number) => {
    const dur = audio[activeIdx].duration
    if (!dur || !isFinite(dur)) return

    _isSeeking = true
    const newTime = ratio * dur

    audio[activeIdx].currentTime = newTime

    usePlayerStore.getState().setCurrentTime(newTime)
    usePlayerStore.getState().setProgress(ratio)

    // Re-schedule crossfade after seek
    scheduleCrossfade()

    // Clear previous seek timeout before creating a new one
    if (_seekTimeout) { clearTimeout(_seekTimeout); _seekTimeout = null }
    // seeked event will clear _isSeeking, this is a safety fallback
    _seekTimeout = setTimeout(() => { _isSeeking = false; _seekTimeout = null }, 5000)
  }, [])

  const setVolume = useCallback((vol: number) => {
    const v = Math.max(0, Math.min(1, vol))
    usePlayerStore.getState().setVolume(v)
    audio[activeIdx].volume = v
  }, [])

  const playNext = useCallback(() => doPlayNext(), [])
  const playPrev = useCallback(() => doPlayPrev(), [])

  useEffect(() => {
    _controls = { togglePlay, playNext, playPrev, setVolume, seek, playTrack }
    // No cleanup: multiple components call usePlayer() (App, PlayerBar, pages).
    // Cleanup from unmounting children would null _controls while App's effect
    // is still alive but won't re-run (stable deps), breaking tray/mini-player.
  }, [togglePlay, playNext, playPrev, setVolume, seek, playTrack])

  return { playTrack, togglePlay, seek, setVolume, playNext, playPrev }
}
