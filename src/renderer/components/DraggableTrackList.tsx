import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, GripVertical, X, Music } from 'lucide-react'
import CoverArt from './CoverArt'
import type { Track } from '@shared/index'
import usePlayerStore from '@/store/playerStore'

interface DraggableTrackListProps {
  tracks: Track[]
  onReorder: (newOrder: Track[]) => void
  onPlayTrack: (track: Track) => void
  onRemoveTrack?: (index: number) => void
}

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '--:--'
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

export default function DraggableTrackList({
  tracks,
  onReorder,
  onPlayTrack,
  onRemoveTrack
}: DraggableTrackListProps) {
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id ?? null)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const dragItemRef = useRef<HTMLDivElement>(null)

  const handleDragStart = useCallback(
    (e: React.DragEvent, index: number) => {
      setDragIndex(index)
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', index.toString())
      // Make the drag image semi-transparent
      if (dragItemRef.current) {
        e.dataTransfer.setDragImage(dragItemRef.current, 0, 0)
      }
    },
    []
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setDragOverIndex(index)
    },
    []
  )

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault()
      if (dragIndex === null || dragIndex === dropIndex) {
        setDragIndex(null)
        setDragOverIndex(null)
        return
      }

      const newTracks = [...tracks]
      const [removed] = newTracks.splice(dragIndex, 1)
      newTracks.splice(dropIndex, 0, removed)
      onReorder(newTracks)

      setDragIndex(null)
      setDragOverIndex(null)
    },
    [dragIndex, tracks, onReorder]
  )

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setDragOverIndex(null)
  }, [])

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-fg-muted">
        <Music className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">No tracks</p>
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {tracks.map((track, index) => {
        const isActive = track.id === currentTrackId
        const isDragging = dragIndex === index
        const isDragOver = dragOverIndex === index

        return (
          <div
            key={track.id}
            ref={isDragging ? dragItemRef : undefined}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg group cursor-pointer transition-all ${
              isActive
                ? 'bg-surface-hover'
                : isDragOver
                  ? 'bg-primary/10 border-t-2 border-primary'
                  : 'hover:bg-surface-hover'
            } ${isDragging ? 'opacity-50' : ''}`}
            onClick={() => onPlayTrack(track)}
          >
            {/* Drag handle */}
            <div className="w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing">
              <GripVertical className="w-4 h-4 text-fg-muted" />
            </div>

            {/* Index / Play indicator */}
            <div className="w-6 flex items-center justify-center text-xs">
              {isActive && isPlaying ? (
                <div className="flex gap-0.5 items-end h-3">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-0.5 bg-primary rounded-full"
                      animate={{ height: ['4px', '10px', '4px'] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              ) : isActive ? (
                <Pause className="w-3 h-3 text-primary" />
              ) : (
                <span className="text-fg-muted group-hover:hidden">{index + 1}</span>
              )}
              {!isActive && (
                <Play className="w-3 h-3 text-fg-secondary hidden group-hover:block" />
              )}
            </div>

            {/* Cover + Info */}
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <CoverArt filePath={track.filePath} size="sm" />
              <div className="min-w-0 flex-1">
                <div className={`text-sm truncate ${isActive ? 'text-primary font-medium' : 'text-fg'}`}>
                  {track.title}
                </div>
                <div className="text-xs text-fg-muted truncate">{track.artist}</div>
              </div>
            </div>

            {/* Duration */}
            <span className="text-xs text-fg-muted w-10 text-right">
              {formatDuration(track.duration)}
            </span>

            {/* Remove button */}
            {onRemoveTrack && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveTrack(index)
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-fg-muted transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
