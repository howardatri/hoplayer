import { useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Volume2,
  VolumeX,
  Volume1,
  ListMusic,
  Mic2
} from 'lucide-react'
import CoverArt from './CoverArt'
import AudioSpectrum from './AudioSpectrum'
import { usePlayer } from '@/hooks/usePlayer'

interface PlayerBarProps {
  onToggleLyrics?: () => void
  lyricsOpen?: boolean
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00'
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export default function PlayerBar({ onToggleLyrics, lyricsOpen }: PlayerBarProps) {
  const {
    currentTrack,
    isPlaying,
    volume,
    progress,
    currentTime,
    duration,
    repeatMode,
    isShuffle,
    togglePlay,
    playNext,
    playPrev,
    seek,
    setVolume,
    toggleRepeat,
    toggleShuffle
  } = usePlayer()

  const progressRef = useRef<HTMLDivElement>(null)
  const volumeRef = useRef<HTMLDivElement>(null)

  const handleProgressClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = progressRef.current?.getBoundingClientRect()
      if (!rect) return
      const ratio = (e.clientX - rect.left) / rect.width
      seek(Math.max(0, Math.min(1, ratio)))
    },
    [seek]
  )

  const handleVolumeClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = volumeRef.current?.getBoundingClientRect()
      if (!rect) return
      const ratio = (e.clientX - rect.left) / rect.width
      setVolume(Math.max(0, Math.min(1, ratio)))
    },
    [setVolume]
  )

  const VolumeIcon = volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat

  return (
    <div className="h-20 glass-strong flex flex-col relative z-50">
      {/* Progress bar (clickable, above everything) */}
      <div
        ref={progressRef}
        className="h-1 w-full cursor-pointer group relative"
        onClick={handleProgressClick}
      >
        <div className="absolute inset-0 bg-white/10" />
        <motion.div
          className="absolute left-0 top-0 h-full bg-primary"
          style={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.1 }}
        />
        {/* Hover thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progress * 100}% - 6px)` }}
        />
      </div>

      {/* Controls */}
      <div className="flex-1 flex items-center px-4 gap-4">
        {/* Track info */}
        <div className="flex items-center gap-3 w-64 min-w-0">
          <AnimatePresence mode="wait">
            {currentTrack ? (
              <motion.div
                key={currentTrack.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex items-center gap-3 min-w-0"
              >
                <CoverArt
                  filePath={currentTrack.filePath}
                  size="md"
                  isPlaying={isPlaying}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white/90 truncate">
                    {currentTrack.title}
                  </div>
                  <div className="text-xs text-white/40 truncate">
                    {currentTrack.artist}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="text-sm text-white/30">No track playing</div>
            )}
          </AnimatePresence>
        </div>

        {/* Center controls */}
        <div className="flex-1 flex flex-col items-center gap-0.5">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleShuffle}
              className={`p-1.5 rounded-full transition-colors ${
                isShuffle ? 'text-primary' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={playPrev}
              className="p-2 text-white/60 hover:text-white transition-colors"
            >
              <SkipBack className="w-5 h-5" fill="currentColor" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black hover:bg-white/90 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" fill="currentColor" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
              )}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={playNext}
              className="p-2 text-white/60 hover:text-white transition-colors"
            >
              <SkipForward className="w-5 h-5" fill="currentColor" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleRepeat}
              className={`p-1.5 rounded-full transition-colors ${
                repeatMode !== 'off' ? 'text-primary' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <RepeatIcon className="w-4 h-4" />
            </motion.button>
          </div>

          {/* Audio spectrum + Time display */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/30 w-10 text-right">{formatTime(currentTime)}</span>
            <AudioSpectrum width={120} height={16} style="bars" />
            <span className="text-xs text-white/30 w-10">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-3 w-48 justify-end">
          {/* Volume */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setVolume(volume === 0 ? 0.8 : 0)}
              className="text-white/40 hover:text-white/70 transition-colors"
            >
              <VolumeIcon className="w-4 h-4" />
            </motion.button>
            <div
              ref={volumeRef}
              className="w-20 h-1 bg-white/10 rounded-full cursor-pointer relative group"
              onClick={handleVolumeClick}
            >
              <div
                className="absolute left-0 top-0 h-full bg-white/60 rounded-full"
                style={{ width: `${volume * 100}%` }}
              />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ left: `calc(${volume * 100}% - 5px)` }}
              />
            </div>
          </div>

          {/* Lyrics toggle */}
          {onToggleLyrics && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleLyrics}
              className={`p-1.5 rounded-full transition-colors ${
                lyricsOpen ? 'text-primary' : 'text-white/40 hover:text-white/70'
              }`}
            >
              <Mic2 className="w-4 h-4" />
            </motion.button>
          )}

          {/* Queue toggle (placeholder) */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className="text-white/40 hover:text-white/70 transition-colors"
          >
            <ListMusic className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
