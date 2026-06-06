import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Maximize, Minimize, Volume2, VolumeX, X, Repeat, Repeat1, Shuffle, SkipBack, SkipForward } from 'lucide-react'
import usePlayerStore from '@/store/playerStore'
import { doPlayNext, doPlayPrev } from '@/hooks/usePlayer'
import type { Track } from '@shared/index'

const SPEED_PRESETS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0]

interface VideoPlayerProps {
  track: Track
  onClose: () => void
}

export default function VideoPlayer({ track, onClose }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [showControls, setShowControls] = useState(true)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const controlsTimeout = useRef<ReturnType<typeof setTimeout>>()
  const repeatMode = usePlayerStore(s => s.repeatMode)
  const isShuffle = usePlayerStore(s => s.isShuffle)
  const playbackSpeed = usePlayerStore(s => s.playbackSpeed)
  const setPlaybackSpeed = usePlayerStore(s => s.setPlaybackSpeed)
  const endedHandled = useRef(false)

  const cycleSpeed = useCallback(() => {
    const idx = SPEED_PRESETS.indexOf(playbackSpeed)
    const nextIdx = (idx + 1) % SPEED_PRESETS.length
    const newSpeed = SPEED_PRESETS[nextIdx]
    setPlaybackSpeed(newSpeed)
    if (videoRef.current) videoRef.current.playbackRate = newSpeed
  }, [playbackSpeed, setPlaybackSpeed])

  // Load video when track changes
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    endedHandled.current = false
    video.src = `local://${encodeURIComponent(track.filePath)}`
    video.volume = volume
    video.playbackRate = usePlayerStore.getState().playbackSpeed
    video.play().catch(() => {
      setIsPlaying(false)
      usePlayerStore.getState().setIsPlaying(false)
    })

    return () => {
      video.pause()
      video.src = ''
      usePlayerStore.getState().setIsPlaying(false)
    }
  }, [track.filePath])

  // Cleanup controls timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current)
    }
  }, [])

  // Sync video state → playerStore + handle ended
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleEnded = () => {
      if (endedHandled.current) return
      endedHandled.current = true

      const { repeatMode, queue, currentIndex } = usePlayerStore.getState()
      if (repeatMode === 'one') {
        video.currentTime = 0
        video.play().catch(() => {})
        endedHandled.current = false
      } else if (repeatMode === 'all' || currentIndex < queue.length - 1) {
        doPlayNext()
      } else {
        setIsPlaying(false)
        usePlayerStore.getState().setIsPlaying(false)
      }
    }

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      if (video.duration && isFinite(video.duration)) {
        const p = video.currentTime / video.duration
        setProgress(p)
        usePlayerStore.getState().setCurrentTime(video.currentTime)
        usePlayerStore.getState().setProgress(p)

        // Fallback: detect end if 'ended' event doesn't fire
        if (video.duration - video.currentTime < 0.3 && !endedHandled.current && !video.paused) {
          handleEnded()
        }
      }
    }

    const onLoadedMetadata = () => {
      setDuration(video.duration || 0)
      usePlayerStore.getState().setDuration(video.duration || 0)
      endedHandled.current = false
    }

    const onPlay = () => {
      setIsPlaying(true)
      usePlayerStore.getState().setIsPlaying(true)
    }

    const onPause = () => {
      setIsPlaying(false)
      usePlayerStore.getState().setIsPlaying(false)
    }

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', handleEnded)

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', handleEnded)
    }
  }, [])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
      setIsPlaying(true)
    } else {
      video.pause()
      setIsPlaying(false)
    }
  }

  const handlePrev = () => {
    const video = videoRef.current
    if (video && video.currentTime > 3) {
      video.currentTime = 0
    } else {
      doPlayPrev()
    }
  }

  const handleSeek = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    const video = videoRef.current
    if (video && video.duration && isFinite(video.duration)) {
      video.currentTime = ratio * video.duration
    }
  }

  const handleVolumeChange = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setVolume(ratio)
    if (videoRef.current) {
      videoRef.current.volume = ratio
    }
    if (ratio > 0) setIsMuted(false)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setIsMuted(!isMuted)
  }

  const toggleFullscreen = async () => {
    const container = containerRef.current
    if (!container) return
    if (!document.fullscreenElement) {
      await container.requestFullscreen()
      setIsFullscreen(true)
    } else {
      await document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const showControlsTemporarily = () => {
    setShowControls(true)
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current)
    controlsTimeout.current = setTimeout(() => {
      if (isPlaying) setShowControls(false)
    }, 3000)
  }

  const formatTime = (s: number) => {
    if (!s || !isFinite(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      onMouseMove={showControlsTemporarily}
      onClick={(e) => {
        if (e.target === e.currentTarget) togglePlay()
      }}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        onDoubleClick={toggleFullscreen}
      />

      {/* Controls overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent pointer-events-auto">
              <div>
                <h3 className="text-fg font-medium">{track.title}</h3>
                <p className="text-fg-secondary text-sm">{track.artist}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-surface-active text-fg-secondary hover:text-fg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Center play/pause */}
            {!isPlaying && (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={togglePlay}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-surface-active backdrop-blur-sm flex items-center justify-center pointer-events-auto"
              >
                <Play className="w-10 h-10 text-fg ml-1" fill="currentColor" />
              </motion.button>
            )}

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent pointer-events-auto">
              {/* Progress bar */}
              <div
                className="w-full h-1 bg-surface-active rounded-full cursor-pointer mb-3 group"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-primary rounded-full relative"
                  style={{ width: `${progress * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-fg opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrev}
                    className="text-fg-secondary hover:text-fg transition-colors"
                    title="Previous"
                  >
                    <SkipBack className="w-5 h-5" fill="currentColor" />
                  </button>
                  <button
                    onClick={togglePlay}
                    className="text-fg hover:text-fg transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" fill="currentColor" />
                    ) : (
                      <Play className="w-6 h-6" fill="currentColor" />
                    )}
                  </button>
                  <button
                    onClick={() => doPlayNext()}
                    className="text-fg-secondary hover:text-fg transition-colors"
                    title="Next"
                  >
                    <SkipForward className="w-5 h-5" fill="currentColor" />
                  </button>
                  <span className="text-fg-secondary text-sm ml-2">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                  <button
                    onClick={() => usePlayerStore.getState().toggleRepeat()}
                    className={`ml-2 ${repeatMode === 'off' ? 'text-fg-muted hover:text-fg-secondary' : 'text-primary hover:text-primary/80'} transition-colors`}
                    title={repeatMode === 'off' ? 'Repeat: off' : repeatMode === 'all' ? 'Repeat: all' : 'Repeat: one'}
                  >
                    {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => usePlayerStore.getState().toggleShuffle()}
                    className={isShuffle ? 'text-primary hover:text-primary/80' : 'text-fg-muted hover:text-fg-secondary'}
                    title="Shuffle"
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>
                  <button
                    onClick={cycleSpeed}
                    className={`${playbackSpeed !== 1 ? 'text-primary hover:text-primary/80' : 'text-fg-muted hover:text-fg-secondary'} transition-colors text-xs font-semibold`}
                    title={`Speed: ${playbackSpeed}x`}
                    style={{ fontVariantNumeric: 'tabular-nums', minWidth: 32, textAlign: 'center' }}
                  >
                    {playbackSpeed}×
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleMute}
                    className="text-fg-secondary hover:text-fg transition-colors"
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  <div
                    className="w-20 h-1 bg-surface-active rounded-full cursor-pointer"
                    onClick={handleVolumeChange}
                  >
                    <div
                      className="h-full bg-fg-secondary rounded-full"
                      style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                    />
                  </div>
                  <button
                    onClick={toggleFullscreen}
                    className="text-fg-secondary hover:text-fg transition-colors"
                  >
                    {isFullscreen ? (
                      <Minimize className="w-5 h-5" />
                    ) : (
                      <Maximize className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
