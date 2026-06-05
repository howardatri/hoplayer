import { memo, useCallback } from 'react'
import { FixedSizeList as List } from 'react-window'
import { Play, Pause, MoreHorizontal, Clock } from 'lucide-react'
import { motion } from 'framer-motion'
import CoverArt from './CoverArt'
import type { Track } from '@shared/index'
import usePlayerStore from '@/store/playerStore'

interface TrackListProps {
  tracks: Track[]
  onPlayTrack: (track: Track) => void
  height?: number
  showIndex?: boolean
  showAlbum?: boolean
}

interface TrackRowProps {
  index: number
  style: React.CSSProperties
  data: {
    tracks: Track[]
    onPlayTrack: (track: Track) => void
    showIndex: boolean
    showAlbum: boolean
    currentTrackId: string | null
    isPlaying: boolean
  }
}

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '--:--'
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

const TrackRow = memo(function TrackRow({ index, style, data }: TrackRowProps) {
  const { tracks, onPlayTrack, showIndex, showAlbum, currentTrackId, isPlaying } = data
  const track = tracks[index]
  const isActive = track.id === currentTrackId

  return (
    <div
      style={style}
      className={`flex items-center gap-3 px-4 group cursor-pointer transition-colors ${
        isActive
          ? 'bg-white/10'
          : 'hover:bg-white/5'
      }`}
      onClick={() => onPlayTrack(track)}
    >
      {/* Index / Play indicator */}
      <div className="w-8 flex items-center justify-center text-sm">
        {isActive && isPlaying ? (
          <motion.div
            className="flex gap-0.5 items-end h-3"
            initial={false}
          >
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-0.5 bg-primary rounded-full"
                animate={{
                  height: ['4px', '12px', '4px']
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15
                }}
              />
            ))}
          </motion.div>
        ) : isActive ? (
          <Pause className="w-3.5 h-3.5 text-primary" />
        ) : (
          <span className="text-white/30 group-hover:hidden">{showIndex ? index + 1 : ''}</span>
        )}
        {!isActive && (
          <Play className="w-3.5 h-3.5 text-white/60 hidden group-hover:block" />
        )}
      </div>

      {/* Cover + Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <CoverArt filePath={track.filePath} size="sm" />
        <div className="min-w-0 flex-1">
          <div
            className={`text-sm truncate ${
              isActive ? 'text-primary font-medium' : 'text-white/90'
            }`}
          >
            {track.title}
          </div>
          <div className="text-xs text-white/40 truncate">
            {track.artist}
            {showAlbum && track.album !== 'Unknown Album' && (
              <span className="text-white/25"> · {track.album}</span>
            )}
          </div>
        </div>
      </div>

      {/* Duration */}
      <div className="flex items-center gap-2 text-xs text-white/30">
        <span>{formatDuration(track.duration)}</span>
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-white/60"
          onClick={(e) => {
            e.stopPropagation()
            // TODO: context menu
          }}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
})

export default function TrackList({
  tracks,
  onPlayTrack,
  height = 500,
  showIndex = true,
  showAlbum = true
}: TrackListProps) {
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id ?? null)
  const isPlaying = usePlayerStore((s) => s.isPlaying)

  const itemData = {
    tracks,
    onPlayTrack,
    showIndex,
    showAlbum,
    currentTrackId,
    isPlaying
  }

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/30">
        <Clock className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-sm">No tracks found</p>
      </div>
    )
  }

  return (
    <List
      height={height}
      itemCount={tracks.length}
      itemSize={56}
      width="100%"
      itemData={itemData}
      overscanCount={5}
    >
      {TrackRow}
    </List>
  )
}
