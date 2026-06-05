import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Pause, Maximize, Minimize, Volume2, VolumeX, X } from 'lucide-react'
import usePlayerStore from '@/store/playerStore'
import type { Track } from '@shared/index'

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

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    video.src = `local://${encodeURIComponent(track.filePath)}`
    video.volume = volume
    video.play().catch(() => setIsPlaying(false))

    return () => {
      video.pause()
      video.src = ''
    }
  }, [track.filePath])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      if (video.duration && isFinite(video.duration)) {
        setProgress(video.currentTime / video.duration)
      }
    }

    const onLoadedMetadata = () => {
      setDuration(video.duration || 0)
    }

    const onEnded = () => {
      setIsPlaying(false)
    }

    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('loadedmetadata', onLoadedMetadata)
    video.addEventListener('ended', onEnded)

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('loadedmetadata', onLoadedMetadata)
      video.removeEventListener('ended', onEnded)
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
                <h3 className="text-white font-medium">{track.title}</h3>
                <p className="text-white/50 text-sm">{track.artist}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/20 text-white/70 hover:text-white transition-colors"
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
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center pointer-events-auto"
              >
                <Play className="w-10 h-10 text-white ml-1" fill="currentColor" />
              </motion.button>
            )}

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent pointer-events-auto">
              {/* Progress bar */}
              <div
                className="w-full h-1 bg-white/20 rounded-full cursor-pointer mb-3 group"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-primary rounded-full relative"
                  style={{ width: `${progress * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="text-white hover:text-white/80 transition-colors"
                  >
                    {isPlaying ? (
                      <Pause className="w-6 h-6" fill="currentColor" />
                    ) : (
                      <Play className="w-6 h-6" fill="currentColor" />
                    )}
                  </button>
                  <span className="text-white/60 text-sm">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleMute}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>
                  <div
                    className="w-20 h-1 bg-white/20 rounded-full cursor-pointer"
                    onClick={handleVolumeChange}
                  >
                    <div
                      className="h-full bg-white/60 rounded-full"
                      style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                    />
                  </div>
                  <button
                    onClick={toggleFullscreen}
                    className="text-white/60 hover:text-white transition-colors"
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
