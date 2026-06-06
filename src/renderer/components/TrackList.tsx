import { memo, useCallback } from 'react'
import { FixedSizeList as List } from 'react-window'
import { Play, Pause, MoreHorizontal, Music, ListPlus, User, Disc3, Info, Trash2 } from 'lucide-react'

import { motion } from 'framer-motion'
import { AnimatePresence } from 'framer-motion'
import CoverArt from './CoverArt'
import ContextMenu, { useContextMenu, type ContextMenuItem } from './ContextMenu'
import TrackPropertiesDialog from './TrackPropertiesDialog'
import type { Track } from '@shared/index'
import usePlayerStore from '@/store/playerStore'
import usePlaylistStore from '@/store/playlistStore'
import useLibraryStore from '@/store/libraryStore'
import useToastStore from '@/store/toastStore'
import { getFolderDisplayName } from '@/utils/paths'
import React from 'react'

interface TrackListProps {
  tracks: Track[]
  onPlayTrack: (track: Track) => void
  height?: number
  showIndex?: boolean
  showAlbum?: boolean
  showFolder?: boolean
  onNavigate?: (page: string) => void
}

interface TrackRowProps {
  index: number
  style: React.CSSProperties
  data: {
    tracks: Track[]
    onPlayTrack: (track: Track) => void
    showIndex: boolean
    showAlbum: boolean
    showFolder: boolean
    scanPaths: string[]
    currentTrackId: string | null
    isPlaying: boolean
    onContextMenu: (e: React.MouseEvent, track: Track) => void
  }
}

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '--:--'
  const min = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${min}:${sec.toString().padStart(2, '0')}`
}

// Get folder display name from filePath (use shared utility)
import { getTrackFolder as _getTrackFolder } from '@/utils/paths'

function getFolderTag(filePath: string, scanPaths: string[]): string | null {
  if (scanPaths.length <= 1) return null
  const folder = _getTrackFolder(filePath, scanPaths)
  return folder ? getFolderDisplayName(folder) : null
}

const TrackRow = memo(function TrackRow({ index, style, data }: TrackRowProps) {
  const { tracks, onPlayTrack, showIndex, showAlbum, showFolder, scanPaths, currentTrackId, isPlaying, onContextMenu } = data
  const track = tracks[index]
  const isActive = track.id === currentTrackId
  const isEven = index % 2 === 0

  return (
    <div
      style={{
        ...style,
        ...(isActive ? { borderLeft: '2px solid var(--color-primary)' } : {}),
      }}
      className={`flex items-center gap-3 px-4 group cursor-pointer transition-colors ${
        isActive
          ? 'bg-primary/10'
          : isEven
            ? 'hover:bg-surface-hover'
            : 'bg-surface/30 hover:bg-surface-hover'
      }`}
      onClick={() => onPlayTrack(track)}
      onContextMenu={(e) => onContextMenu(e, track)}
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
          <span className="text-fg-muted group-hover:hidden">{showIndex ? index + 1 : ''}</span>
        )}
        {!isActive && (
          <Play className="w-3.5 h-3.5 text-fg-secondary hidden group-hover:block" />
        )}
      </div>

      {/* Cover + Info */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <CoverArt filePath={track.filePath} size="sm" />
        <div className="min-w-0 flex-1">
          <div
            className={`text-sm truncate ${
              isActive ? 'text-primary font-medium' : 'text-fg'
            }`}
          >
            {track.title}
          </div>
          <div className="text-xs text-fg-muted truncate">
            {track.artist}
            {showAlbum && track.album !== 'Unknown Album' && (
              <span className="text-fg-muted"> · {track.album}</span>
            )}
            {showFolder && getFolderTag(track.filePath, scanPaths) && (
              <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'color-mix(in srgb, var(--color-primary) 10%, transparent)', color: 'var(--color-text-secondary)' }}>
                {getFolderTag(track.filePath, scanPaths)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Duration */}
      <div className="flex items-center gap-2 text-xs text-fg-muted">
        <span>{formatDuration(track.duration)}</span>
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-fg-secondary"
          onClick={(e) => onContextMenu(e, track)}
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
  showAlbum = true,
  showFolder = false,
  onNavigate
}: TrackListProps) {
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id ?? null)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const addToQueue = usePlayerStore((s) => s.addToQueue)
  const playlists = usePlaylistStore((s) => s.playlists)
  const addTrackToPlaylist = usePlaylistStore((s) => s.addTrackToPlaylist)
  const addToast = useToastStore((s) => s.addToast)
  const scanPaths = useLibraryStore((s) => s.scanPaths)
  const removeTrack = useLibraryStore((s) => s.removeTrack)

  const { contextMenu, openContextMenu, closeContextMenu } = useContextMenu()
  const [propertiesTrack, setPropertiesTrack] = React.useState<Track | null>(null)

  const buildMenuItems = (track: Track): ContextMenuItem[] => [
    {
      label: 'Play',
      icon: <Play size={14} />,
      onClick: () => onPlayTrack(track)
    },
    {
      label: 'Add to Queue',
      icon: <ListPlus size={14} />,
      onClick: () => { addToQueue(track); addToast(`Added "${track.title}" to queue`, 'success') }
    },
    { divider: true, label: '', onClick: () => {} },
    ...playlists.map(p => ({
      label: `Add to ${p.name}`,
      icon: <ListPlus size={14} />,
      onClick: () => {
        addTrackToPlaylist(p.id, track.id)
        addToast(`Added to "${p.name}"`, 'success')
      }
    })),
    ...(playlists.length > 0 ? [{ divider: true, label: '', onClick: () => {} }] : []),
    {
      label: 'Go to Artist',
      icon: <User size={14} />,
      onClick: () => onNavigate?.(`artist:${track.artist}`)
    },
    {
      label: 'Go to Album',
      icon: <Disc3 size={14} />,
      onClick: () => onNavigate?.(`album:${track.album}`)
    },
    { divider: true, label: '', onClick: () => {} },
    {
      label: 'Delete from Library',
      icon: <Trash2 size={14} />,
      onClick: () => { removeTrack(track.id); addToast(`Removed "${track.title}"`, 'info') },
      danger: true
    },
    {
      label: 'Properties',
      icon: <Info size={14} />,
      onClick: () => setPropertiesTrack(track)
    }
  ]

  const handleContextMenu = useCallback((e: React.MouseEvent, track: Track) => {
    openContextMenu(e, buildMenuItems(track))
  }, [playlists, onNavigate, addToQueue, addTrackToPlaylist, addToast, onPlayTrack, removeTrack])

  const itemData = {
    tracks,
    onPlayTrack,
    showIndex,
    showAlbum,
    showFolder,
    scanPaths,
    currentTrackId,
    isPlaying,
    onContextMenu: handleContextMenu
  }

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-fg-muted">
        <Music className="w-12 h-12 mb-3 opacity-40" />
        <p className="text-sm">No tracks found</p>
      </div>
    )
  }

  return (
    <>
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

      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={contextMenu.items}
            onClose={closeContextMenu}
          />
        )}
      </AnimatePresence>

      {propertiesTrack && (
        <TrackPropertiesDialog track={propertiesTrack} onClose={() => setPropertiesTrack(null)} />
      )}
    </>
  )
}
